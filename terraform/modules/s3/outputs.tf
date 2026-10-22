output "artifact_bucket_name" {
  value = aws_s3_bucket.app_artifacts.bucket
}

output "artifact_bucket_arn" {
  value = aws_s3_bucket.app_artifacts.arn
}

output "frontend_bucket_name" {
  value = aws_s3_bucket.talentflow_build.bucket
}

output "frontend_bucket" {
  value = aws_s3_bucket.talentflow_build.bucket_regional_domain_name
}

output "frontend_bucket_arn" {
  value = aws_s3_bucket.talentflow_build.arn
}

output "frontend_bucket_id" {
  value = aws_s3_bucket.talentflow_build.id
}


output "cloudtrail_logs_bucket" {
  value = aws_s3_bucket.cloudtrail_logs.bucket
}


output "resume_bucket_name" {
  value = aws_s3_bucket.resume_bucket.bucket
}

output "resume_bucket_arn" {
  value = aws_s3_bucket.resume_bucket.arn
}

output "config_bucket" {
  value = aws_s3_bucket.config
}