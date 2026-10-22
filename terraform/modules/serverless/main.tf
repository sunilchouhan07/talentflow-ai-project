data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}


resource "aws_sqs_queue" "resume_dlq" {
  name                      = "${var.project}-${var.env}-resume-events-dlq"
  message_retention_seconds = 1209600

  tags = {
    Project     = var.project
    Environment = var.env
  }
}

resource "aws_sqs_queue" "resume_events" {
  name                       = "${var.project}-${var.env}-resume-events"
  visibility_timeout_seconds = 180
  message_retention_seconds  = 345600
  receive_wait_time_seconds  = 10

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.resume_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Project     = var.project
    Environment = var.env
  }
}

resource "aws_cloudwatch_event_rule" "resume_upload" {
  name        = "${var.project}-${var.env}-resume-upload"
  description = "Detect new resume uploads"

  event_pattern = jsonencode({
    source        = ["aws.s3"]
    "detail-type" = ["Object Created"]

    detail = {
      bucket = {
        name = [var.resume_bucket_name]
      }

      object = {
        key = [{
          prefix = var.resume_prefix
        }]
      }
    }
  })

  tags = {
    Project     = var.project
    Environment = var.env
  }
}

resource "aws_sqs_queue_policy" "allow_eventbridge" {
  queue_url = aws_sqs_queue.resume_events.url

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Sid    = "AllowEventBridgeSendMessage"
        Effect = "Allow"

        Principal = {
          Service = "events.amazonaws.com"
        }

        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.resume_events.arn

        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_cloudwatch_event_rule.resume_upload.arn
          }
        }
      }
    ]
  })
}

resource "aws_cloudwatch_event_target" "resume_queue" {
  rule      = aws_cloudwatch_event_rule.resume_upload.name
  target_id = "ResumeEventQueue"
  arn       = aws_sqs_queue.resume_events.arn

  depends_on = [
    aws_sqs_queue_policy.allow_eventbridge
  ]
}



resource "aws_iam_role_policy" "lambda_s3" {
  name = "read-resume-objects"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${var.resume_bucket_arn}/${var.resume_prefix}*"
      }
    ]
  })
}

resource "aws_iam_role" "lambda_execution" {
  name               = "${var.project}-${var.env}-resume-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Project     = var.project
    Environment = var.env
  }
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_sqs" {
  name = "read-resume-event-queue"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.resume_events.arn
      }
    ]
  })
}



resource "aws_iam_role_policy" "lambda_database_secret" {
  name = "read-rds-credentials"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = var.db_secret_arn
      }
    ]
  })
}


resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}



resource "aws_lambda_function" "resume_processor" {
  function_name = "${var.project}-${var.env}-resume-processor"
  description   = "Process S3 resume upload events from SQS"
  role          = aws_iam_role.lambda_execution.arn
  runtime       = "python3.12"
  handler       = "lambda_function.lambda_handler"

  filename         = "${path.module}/lambda_function.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_function.zip")
  timeout          = 30
  memory_size      = 128

  vpc_config {
    subnet_ids         = var.vpc_subnet_ids
    security_group_ids = [var.lambda_sg_id]
  }

  environment {
    variables = {
      DB_HOST       = var.db_host
      DB_PORT       = tostring(var.db_port)
      DB_NAME       = var.db_name
      DB_SECRET_ARN = var.db_secret_arn
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_vpc,
    aws_iam_role_policy.lambda_database_secret,
    aws_iam_role_policy_attachment.lambda_logs
  ]

  tags = {
    Project     = var.project
    Environment = var.env
  }
}

resource "aws_lambda_event_source_mapping" "resume_queue" {
  event_source_arn = aws_sqs_queue.resume_events.arn
  function_name    = aws_lambda_function.resume_processor.arn

  batch_size                         = 1
  enabled                            = true
  function_response_types            = ["ReportBatchItemFailures"]
  maximum_batching_window_in_seconds = 0

  depends_on = [
    aws_iam_role_policy.lambda_sqs
  ]
}