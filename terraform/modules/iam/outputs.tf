output "ec2_role_name" {
  description = "EC2 IAM role name"
  value       = aws_iam_role.ec2_role.name
}

output "ec2_role_arn" {
  description = "EC2 IAM role ARN"
  value       = aws_iam_role.ec2_role.arn
}

output "github_ci_role_arn" {
  description = "ARN of the GitHub Actions CI IAM role"
  value       = aws_iam_role.github_ci.arn
}