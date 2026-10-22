resource "aws_s3_bucket" "app_artifacts" {
  bucket = "${var.project}-${var.env}-artifacts-bucket"

  tags = {
    Name        = "${var.project}-${var.env}-artifacts-bucket"
    Environment = var.env
    Project     = var.project
    Purpose     = "Application Artifact"
  }
}


resource "aws_s3_bucket" "talentflow_build" {
  bucket = "${var.project}-${var.env}-static-bucket"

  tags = {
    Name        = "${var.project}-${var.env}-static-bucket"
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.talentflow_build.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.talentflow_build.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.talentflow_build.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

}


resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.talentflow_build.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}





## Cloudtrail Logs Bucket


resource "aws_s3_bucket" "cloudtrail_logs" {
  bucket = "${var.project}-${var.env}-cloudtrail-logs"
  tags = {
    Name        = "${var.project}-${var.env}-trail"
    Environment = var.env
    Project     = var.project
  }
}


resource "aws_s3_bucket_public_access_block" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

}


resource "aws_s3_bucket_ownership_controls" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}


resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}


data "aws_iam_policy_document" "cloudtrail_logs" {
  statement {
    sid    = "AWSCloudTrailAclCheck"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    actions = ["s3:GetBucketAcl"]

    resources = [
      aws_s3_bucket.cloudtrail_logs.arn
    ]

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = [var.cloudtrail_arn]
    }
  }

  statement {
    sid    = "AWSCloudTrailWrite"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    actions = ["s3:PutObject"]

    resources = [
      "${aws_s3_bucket.cloudtrail_logs.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
    ]

    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = [var.cloudtrail_arn]
    }
  }
}


data "aws_caller_identity" "current" {}

resource "aws_s3_bucket_policy" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id
  policy = data.aws_iam_policy_document.cloudtrail_logs.json
}





#Resume Bucket 

resource "aws_s3_bucket" "resume_bucket" {
  bucket = "${var.project}-${var.env}-resumes"

  tags = {
    Name        = "${var.project}-${var.env}-resumes"
    Project     = var.project
    Environment = var.env
  }
}

resource "aws_s3_bucket_public_access_block" "resume_bucket" {
  bucket = aws_s3_bucket.resume_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "resume_bucket" {
  bucket = aws_s3_bucket.resume_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "resume_bucket" {
  bucket = aws_s3_bucket.resume_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_notification" "resume_events" {
  bucket      = aws_s3_bucket.resume_bucket.id
  eventbridge = true
}






# AWS Config Bucket
resource "aws_s3_bucket" "config" {
  bucket        = "${var.project}-${var.env}-config-${var.account_id}-${var.region}"
  force_destroy = false

  tags = {
    Name        = "${var.project}-${var.env}-config"
    Environment = var.env
    Project     = var.project
  }
}



resource "aws_s3_bucket_public_access_block" "config" {
  bucket = aws_s3_bucket.config.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

}


resource "aws_s3_bucket_versioning" "config" {
  bucket = aws_s3_bucket.config.id

  versioning_configuration {
    status = "Enabled"
  }
}


resource "aws_s3_bucket_server_side_encryption_configuration" "config" {
  bucket = aws_s3_bucket.config.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

