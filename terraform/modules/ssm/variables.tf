variable "env" {
  type = string
}

variable "project" {
  type = string
}

variable "db_host" {
  type = string
}

variable "db_port" {
  type = number
}

variable "db_secret_arn" {
  type = string
}

variable "current_version" {
  type = string
}

variable "db_name" {
  type = string
}

variable "cloudfront_distribution_id" {
  type = string
}


variable "resume_bucket_name" {
  description = "Private S3 bucket used to store candidate resumes"
  type        = string
}

variable "app_secret_arn" {
  description = "ARN of the Secrets Manager secret containing application credentials"
  type        = string
}
