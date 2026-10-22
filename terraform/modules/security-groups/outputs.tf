output "app_sg_id" {
  value = aws_security_group.app_sg.id
}

output "alb_sg_id" {
  value = aws_security_group.alb_sg.id
}

output "rds_sg_id" {
  value = aws_security_group.rds_sg.id
}


output "lambda_sg_id" {
  value = aws_security_group.lambda_sg.id
}
