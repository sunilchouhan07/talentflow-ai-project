variable "env" {
  type = string
}

variable "project" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "alb_sub" {
  type = map(object({
    cidr = string
    az   = string
  }))
}

variable "instance_sub" {
  type = map(object({
    cidr = string
    az   = string
  }))
}


variable "rds_sub" {
  type = map(object({
    cidr = string
    az   = string
  }))
}



variable "nat_subnet_name" {
  type = string
  validation {
    condition     = contains(keys(var.alb_sub), var.nat_subnet_name)
    error_message = "nat_subnet_name must be one of the public_subnets keys"
  }
}