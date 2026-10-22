
output "db_host_arn" {
  value = aws_ssm_parameter.db_host.arn
}

output "db_port_arn" {
  value = aws_ssm_parameter.db_port.arn
}

output "db_secret_arn" {
  value = aws_ssm_parameter.db_secret_arn.arn
}

output "db_name_arn" {
  value = aws_ssm_parameter.db_name.arn
}

output "resume_bucket_parameter_arn" {
  value = aws_ssm_parameter.resume_bucket.arn
}

output "app_secret_arn_parameter_arn" {
  value = aws_ssm_parameter.app_secret_arn.arn
}

output "backend_current_version_arn" {
  value = aws_ssm_parameter.backend_current_version.arn
}

output "cloudwatch_agent_parameter_arn" {
  value = aws_ssm_parameter.cloudwatch_agent_config.arn
}

output "cloudwatch_agent_parameter_name" {
  value = aws_ssm_parameter.cloudwatch_agent_config.name
}

output "backend_current_version_name" {
  value = aws_ssm_parameter.backend_current_version.name
}

output "db_host_parameter_name" {
  value = aws_ssm_parameter.db_host.name
}

output "db_port_parameter_name" {
  value = aws_ssm_parameter.db_port.name
}

output "db_name_parameter_name" {
  value = aws_ssm_parameter.db_name.name
}

output "db_secret_arn_parameter_name" {
  value = aws_ssm_parameter.db_secret_arn.name
}

output "resume_bucket_parameter_name" {
  value = aws_ssm_parameter.resume_bucket.name
}

output "app_secret_arn_parameter_name" {
  value = aws_ssm_parameter.app_secret_arn.name
}

output "cloudfront_distribution_id_parameter_name" {
  value = aws_ssm_parameter.cloudfront_distribution_id.name
}
