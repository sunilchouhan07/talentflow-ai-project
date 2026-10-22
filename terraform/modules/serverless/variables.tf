variable "project" {
  type    = string
  default = "talentflow-ai"
}

variable "env" {
  type    = string
  default = "dev"
}

variable "resume_bucket_arn" {

}

variable "resume_bucket_name" {
  description = "Name of the existing resume bucket"
  type        = string
}

variable "resume_prefix" {
  type    = string
  default = "resumes/"
}

variable "aws_region" {
  type    = string
  default = "ap-south-1"
}


variable "vpc_subnet_ids" {
  type = list(string)
}

variable "lambda_sg_id" {
  type = string
}

variable "db_host" {
  type = string
}

variable "db_port" {
  type = number
}

variable "db_name" {
  type = string
}

variable "db_secret_arn" {
  type = string
}