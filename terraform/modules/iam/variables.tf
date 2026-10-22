variable "env" {
  type = string
}

variable "project" {
  type = string
}

variable "artifact_bucket_arn" {
  type = string
}

variable "db_secret_arn" {
  type = string
}

variable "db_parameter_host" {
  type = string
}

variable "db_parameter_port" {
  type = string
}

variable "db_parameter_secret_arn" {
  type = string
}

variable "current_version" {
  type = string
}

variable "cloudwatch_agent_parameter_arn" {
  type = string
}

variable "app_artifacts_arn" {
  type = string
}

variable "frontend_build_arn" {
  type = string
}

variable "app_secret_arn" {
  type = string
}

variable "resume_bucket_arn" {
  type = string
}

variable "resume_bucket_parameter_arn" {
  type = string
}

variable "app_secret_arn_parameter_arn" {
  type = string
}

variable "db_parameter_name" {
  type = string
}