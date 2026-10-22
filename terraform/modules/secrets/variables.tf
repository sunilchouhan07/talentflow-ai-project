
output "app_secret_arn" {
  description = "ARN of the application secret"
  value       = aws_secretsmanager_secret.app_secret.arn
}

output "app_secret_name" {
  description = "Name of the application secret"
  value       = aws_secretsmanager_secret.app_secret.name
}


variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "groq_api_key" {
  description = "Groq API Key"
  type        = string
  sensitive   = true
}