
resource "aws_secretsmanager_secret" "app_secret" {
  name        = "/app/${var.project}-${var.env}/app/credentials"
  description = "TalentFlow AI backend application secrets"

  # lifecycle {
  #   prevent_destroy = true
  # }

  tags = {
    Name        = "${var.project}-${var.env}-app-secret"
    Project     = var.project
    Environment = var.env
  }
}

resource "aws_secretsmanager_secret_version" "app_secret_version" {
  secret_id = aws_secretsmanager_secret.app_secret.id

  secret_string = jsonencode({
    jwt_secret   = var.jwt_secret
    groq_api_key = var.groq_api_key
  })
}
