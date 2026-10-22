resource "aws_sns_topic" "cloudwatch_alerts" {
  name = "${var.project}-${var.env}-cloudwatch-alarm"

  tags = {
    Name        = "${var.project}-${var.env}-cloudwatch-alarm"
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.cloudwatch_alerts.arn
  protocol  = "email"
  endpoint  = var.email
}


resource "aws_sns_topic" "resume_upload_notifications" {
  name = "${var.project}-${var.env}-resume-upload-notifications"

  tags = {
    Name        = "${var.project}-${var.env}-resume-upload-notifications"
    Environment = var.env
    Project     = var.project
  }
}


resource "aws_sns_topic_subscription" "resume_upload_email" {
  topic_arn = aws_sns_topic.resume_upload_notifications.arn
  protocol  = "email"
  endpoint  = var.email
}



resource "aws_cloudwatch_event_rule" "resume_upload_notification" {
  name        = "${var.project}-${var.env}-resume-upload-notifactions"
  description = "Notify by email when a resume is uploaded to s3"

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
}


# Send matching S3 events to SNS
resource "aws_cloudwatch_event_target" "resume_upload_notification" {
  rule      = aws_cloudwatch_event_rule.resume_upload_notification.name
  target_id = "ResumeUploadSNS"
  arn       = aws_sns_topic.resume_upload_notifications.arn
}

# Allow only this EventBridge rule to publish to the topic
resource "aws_sns_topic_policy" "resume_upload_notifications" {
  arn = aws_sns_topic.resume_upload_notifications.arn

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Sid    = "AllowEventBridgePublish"
      Effect = "Allow"
      Principal = {
        Service = "events.amazonaws.com"
      }
      Action   = "sns:Publish"
      Resource = aws_sns_topic.resume_upload_notifications.arn

      Condition = {
        ArnEquals = {
          "aws:SourceArn" = aws_cloudwatch_event_rule.resume_upload_notification.arn
        }
      }
    }]
  })
}