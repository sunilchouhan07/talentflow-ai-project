data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}


data "aws_iam_policy_document" "assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["config.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]

  }
}


resource "aws_iam_role" "config" {
  name               = "${var.project}-${var.env}-aws-config"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json

  tags = {
    Name        = "${var.project}-${var.env}-aws-config"
    Environment = var.env
    Project     = var.project
  }
}



resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWS_ConfigRole"
}


data "aws_iam_policy_document" "bucket" {
  statement {
    sid    = "AWSConfigBucketPermissionCheck"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["config.amazonaws.com"]
    }

    actions = ["s3:GetBucketAcl", "s3:ListBucket"]

    resources = [var.config_bucket.arn]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }

  statement {
    sid    = "AWSConfigBucketDelivery"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["config.amazonaws.com"]
    }

    actions = ["s3:PutObject"]

    resources = ["${var.config_bucket.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/Config/*"]

    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}



resource "aws_s3_bucket_policy" "config" {
  bucket = var.config_bucket.id
  policy = data.aws_iam_policy_document.bucket.json
}



# Record a focused set of regional resource types initially

resource "aws_config_configuration_recorder" "main" {
  name     = "${var.project}-${var.env}-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = false
    include_global_resource_types = false

    resource_types = [
      "AWS::EC2::Instance",
      "AWS::EC2::SecurityGroup",
      "AWS::EC2::NetworkInterface",
      "AWS::EC2::Volume",
      "AWS::EC2::VPC",
      "AWS::EC2::Subnet",
      "AWS::EC2::RouteTable",
      "AWS::EC2::InternetGateway",
      "AWS::EC2::NatGateway",
      "AWS::ElasticLoadBalancingV2::LoadBalancer",
      "AWS::ElasticLoadBalancingV2::TargetGroup",
      "AWS::RDS::DBInstance",
      "AWS::RDS::DBSubnetGroup",
      "AWS::S3::Bucket",
      "AWS::Lambda::Function",
      "AWS::SQS::Queue",
      "AWS::IAM::Role"
    ]
  }
}



resource "aws_config_delivery_channel" "main" {
  name           = "${var.project}-${var.env}-channel"
  s3_bucket_name = var.config_bucket.bucket
  # s3_key_prefix  = "AWSLogs"

  snapshot_delivery_properties {
    delivery_frequency = "TwentyFour_Hours"
  }

  depends_on = [
    aws_iam_role_policy_attachment.config,
    aws_s3_bucket_policy.config
  ]
}


# Terraform starts the recorder after the delivery channel exists.
resource "aws_config_configuration_recorder_status" "main" {
  name       = aws_config_configuration_recorder.main.name
  is_enabled = true

  depends_on = [aws_config_delivery_channel.main]
}