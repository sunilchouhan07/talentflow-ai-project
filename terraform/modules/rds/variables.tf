variable "allocated_storage" {
  type = number
}

variable "engine" {
  type = string
}

variable "engine_version" {
  type = string
}

variable "db_name" {
  type = string
}


variable "username" {
  type = string
}

variable "instance_class" {
  type = string
}

variable "env" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "project" {
  type = string
}

variable "db_port" {
  type = number
}

variable "rds_sg_id" {
  type = string
}