output "cloudfront_distribution_dns" {
  value = module.cloudfront.distribution_domain_name
}

output "artifact_bucket_name" {
  value = module.s3.artifact_bucket_name
}

output "frontend_bucket_name" {
  value = module.s3.frontend_bucket_name
}

output "github_ci_role_arn" {
  description = "GitHub Actions CI role ARN"
  value       = module.iam_role.github_ci_role_arn
}


# output "db_identifier" {
#   value = module.rds.db_identifier
# }