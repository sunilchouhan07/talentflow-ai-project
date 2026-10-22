# EMS OIDC for CICD 

# CI 

resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com"
  ]
}

resource "aws_iam_role" "github_ci" {
  name = "${var.project}-${var.env}-github-ci-role"

  assume_role_policy = data.aws_iam_policy_document.github_ci_assume_role.json
}




data "aws_iam_policy_document" "github_ci_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    actions = [
      "sts:AssumeRoleWithWebIdentity"
    ]

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:sunilchouhan07/employee_management_system:ref:refs/tags/v*"
      ]
    }
  }
}


data "aws_iam_policy_document" "ems_ci" {

  statement {
    effect = "Allow"

    actions = [
      "s3:PutObject"
    ]

    resources = [
      "${var.app_artifacts_arn}/backend/*",
      "${var.frontend_build_arn}/*"
    ]
  }

  statement {
    effect = "Allow"

    actions = [
      "s3:ListBucket"
    ]

    resources = [
      var.app_artifacts_arn,
      var.frontend_build_arn
    ]
  }

  statement {
    effect = "Allow"

    actions = [
      "ssm:GetParameter",
      "ssm:PutParameter",
      "ssm:SendCommand",
      "ssm:ListCommandInvocations"
    ]

    resources = ["*"]
  }

  statement {
    effect = "Allow"

    actions = [
      "cloudfront:CreateInvalidation"
    ]

    resources = ["*"]
  }

}

resource "aws_iam_role_policy" "github_ci" {
  name = "${var.project}-${var.env}-github-ci-policy"
  role = aws_iam_role.github_ci.id

  policy = data.aws_iam_policy_document.ems_ci.json
}





# EC2 IAM Role

resource "aws_iam_role" "ec2_role" {
  name = "${var.project}-${var.env}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}


resource "aws_iam_role_policy_attachment" "ssm_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}


resource "aws_iam_role_policy_attachment" "cloudwatch_agent" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}


resource "aws_iam_role_policy" "secret_manager_policy" {
  name = "${var.project}-${var.env}-secret-manager-pilicy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = [
        var.db_secret_arn,
        var.app_secret_arn
      ]
      }
    ]
  })
}


resource "aws_iam_role_policy" "s3_artifact_policy" {
  name = "${var.project}-${var.env}-s3-artifact-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]

        Resource = "${var.artifact_bucket_arn}/*"

      }
    ]
  })
}

resource "aws_iam_role_policy" "ssm_parameter_policy" {
  name = "${var.project}-${var.env}-ssm-parameter-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Action = [
          "ssm:GetParameter"
        ]

        Resource = [
          var.db_parameter_host,
          var.db_parameter_port,
          var.db_parameter_secret_arn,
          var.db_parameter_name,
          var.current_version,
          var.cloudwatch_agent_parameter_arn,
          var.resume_bucket_parameter_arn,
          var.app_secret_arn_parameter_arn
        ]
      }
    ]
  })
}




resource "aws_iam_role_policy" "resume_bucket_policy" {
  name = "${var.project}-${var.env}-resume-bucket-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = var.resume_bucket_arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${var.resume_bucket_arn}/*"
      }
    ]
  })
}
