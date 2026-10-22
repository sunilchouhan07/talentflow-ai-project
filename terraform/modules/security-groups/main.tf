resource "aws_security_group" "alb_sg" {
  name        = "${var.env}-alb-sg"
  vpc_id      = var.vpc_id
  description = "Security group for Application Load Balancer"
  tags = {
    Name        = "${var.project}-${var.env}-alb-sg"
    Environment = var.env
    Project     = var.project
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}





#Security Group
resource "aws_security_group" "app_sg" {
  vpc_id = var.vpc_id
  name   = "${var.project}-${var.env}-app-sg"
  tags = {
    Name        = "${var.project}-${var.env}-app-sg"
    Environment = var.env
    Project     = var.project
  }

  ingress {
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}



resource "aws_security_group" "lambda_sg" {
  name        = "${var.project}-${var.env}-resume-lambda-sg"
  description = "Security group for resume processing Lambda"
  vpc_id      = var.vpc_id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project}-${var.env}-resume-lambda-sg"
    Environment = var.env
    Project     = var.project
  }
}



resource "aws_security_group" "rds_sg" {
  vpc_id = var.vpc_id
  name   = "database-sg"
  tags = {
    Name        = "${var.project}-${var.env}-rds-sg"
    Environment = var.env
    Project     = var.project
  }

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}


resource "aws_security_group_rule" "rds_from_lambda" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds_sg.id
  source_security_group_id = aws_security_group.lambda_sg.id
  description              = "Allow resume processor Lambda to access PostgreSQL"
}