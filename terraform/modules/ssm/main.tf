
resource "aws_ssm_parameter" "db_host" {
  name  = "/app/${var.project}-${var.env}/db/host"
  type  = "String"
  value = var.db_host

  tags = {
    Name        = "${var.project}-${var.env}-db-host"
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_ssm_parameter" "db_port" {
  name  = "/app/${var.project}-${var.env}/db/port"
  type  = "String"
  value = var.db_port

  tags = {
    Name        = "${var.project}-${var.env}-db-port"
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_ssm_parameter" "db_name" {
  name  = "/app/${var.project}-${var.env}/db/name"
  type  = "String"
  value = var.db_name

  tags = {
    Name        = "${var.project}-${var.env}-db-name"
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_ssm_parameter" "db_secret_arn" {
  name  = "/app/${var.project}-${var.env}/db/secret-arn"
  type  = "String"
  value = var.db_secret_arn

  tags = {
    Name        = "${var.project}-${var.env}-db-secret-arn"
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_ssm_parameter" "resume_bucket" {
  name  = "/app/${var.project}-${var.env}/s3/resume-bucket"
  type  = "String"
  value = var.resume_bucket_name

  tags = {
    Name        = "${var.project}-${var.env}-resume-bucket"
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_ssm_parameter" "app_secret_arn" {
  name  = "/app/${var.project}-${var.env}/app/secret-arn"
  type  = "String"
  value = var.app_secret_arn

  tags = {
    Name        = "${var.project}-${var.env}-app-secret-arn"
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_ssm_parameter" "backend_current_version" {
  name  = "/app/${var.project}-${var.env}/backend/current-version"
  type  = "String"
  value = var.current_version

  tags = {
    Name        = "${var.project}-${var.env}-backend-current-version"
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_ssm_parameter" "cloudwatch_agent_config" {
  name        = "/app/${var.project}-${var.env}/monitoring/cloudwatch-agent"
  description = "CloudWatch Agent configuration for ${var.project}-${var.env} EC2 instances"
  type        = "String"
  tier        = "Standard"
  value       = file("${path.module}/cloudwatch-agent-config.json")

  tags = {
    Name        = "${var.project}-${var.env}-cloudwatch-agent"
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_ssm_parameter" "cloudfront_distribution_id" {
  name  = "/app/${var.project}-${var.env}/cloudfront/distribution-id"
  type  = "String"
  value = var.cloudfront_distribution_id

  tags = {
    Name        = "${var.project}-${var.env}-cloudfront-distribution-id"
    Environment = var.env
    Project     = var.project
  }
}


