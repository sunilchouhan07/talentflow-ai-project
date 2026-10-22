variable "env" {
  type = string
}

variable "project" {
  type = string
}

variable "email" {
  type = string
}


variable "resume_bucket_name" {
  type = string
}

variable "resume_prefix" {
  type    = string
  default = "resumes/"
}
