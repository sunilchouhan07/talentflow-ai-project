variable "current_version" {
  type = string
}


variable "jwt_secret" {
  description = "JWT signing secret"
  sensitive   = true
}

variable "groq_api_key" {
  description = "Groq API key"
  sensitive   = true
}
