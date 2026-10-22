variable "env" {
  type = string
}


variable "project" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_id" {
  type = list(string)
}

variable "tg_arn" {
  type = string
}

variable "ami_id" {
  type = string
}

variable "instance_type" {
  type = string
}

variable "root_volume_size" {
  type = number
}

variable "min_size" {
  type = number
}

variable "max_size" {
  type = number
}

variable "desired_capacity" {
  type = number
}

variable "health_check_period" {
  type = number
}


variable "ec2_role" {
  type = string
}

variable "app_sg_id" {
  type = string
}

variable "cloudwatch_agent_parameter_name" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "current_version_parameter_name" {
  type = string
}

variable "artifact_bucket_name" {
  type = string
}