resource "aws_db_subnet_group" "db_subnet_group" {
  subnet_ids = var.subnet_ids
  tags = {
    Name        = "${var.project}-${var.env}-sub-group"
    Environment = var.env
    Project     = var.project
  }
}



resource "aws_db_instance" "main" {
  allocated_storage = var.allocated_storage
  engine            = var.engine
  engine_version    = var.engine_version

  db_name             = var.db_name
  username            = var.username
  storage_encrypted   = true
  deletion_protection = true

  instance_class              = var.instance_class
  port                        = var.db_port
  identifier                  = "${var.project}-${var.env}-db"
  multi_az                    = true
  manage_master_user_password = true
  skip_final_snapshot         = true
  db_subnet_group_name        = aws_db_subnet_group.db_subnet_group.name
  vpc_security_group_ids      = [var.rds_sg_id]
  publicly_accessible         = false

  tags = {
    Name        = "${var.project}-${var.env}-postgres"
    Environment = var.env
    Project     = var.project
  }
}
