variable "env" {
  type = string
}

variable "project" {
  type = string
}

variable "origin" {
  type = string
}

variable "bucket" {
  type = string
}

variable "alb" {
  type = string
}

variable "path_pattern" {
  type = string
}

variable "web_acl_id" {
  type = string
}

variable "default_root_object" {
  type = string
}

variable "alb_id" {
  type = string
}

variable "bucket_id" {
  type = string
}


variable "aliases" {
  type = list(string)
}

variable "acm_certificate_arn" {

}