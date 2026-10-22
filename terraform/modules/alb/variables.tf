variable "env" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "alb_sub" {
  type = list(string)
}

variable "health_interval" {
  type = number
}

variable "timeout" {
  type = number
}

variable "healthy_threshold" {
  type = number
}

variable "unhealthy_threshold" {
  type = number
}

variable "project" {
  type = string
}

variable "alb_sg_id" {
  type = string
}