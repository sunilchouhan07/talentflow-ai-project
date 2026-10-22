data "aws_ami" "amazon_linux" {

  most_recent = true

  owners = ["137112412989"] # Amazon

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]

  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}



data "aws_iam_policy_document" "frontend_bucket_policy" {

  statement {
    sid    = "AllowCloudFrontServicePrincipalReadOnly"
    effect = "Allow"
    principals {
      type = "Service"
      identifiers = [
        "cloudfront.amazonaws.com"
      ]
    }
    actions = [
      "s3:GetObject"
    ]

    resources = [
      "${module.s3.frontend_bucket_arn}/*"
    ]
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values = [
        module.cloudfront.distribution_arn
      ]
    }
  }
}


resource "aws_s3_bucket_policy" "frontend" {

  bucket = module.s3.frontend_bucket_name

  policy = data.aws_iam_policy_document.frontend_bucket_policy.json
}