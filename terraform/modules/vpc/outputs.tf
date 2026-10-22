output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "alb_subnet_ids" {
  description = "ALB subnet IDs"
  value       = [for subnet in aws_subnet.alb_sub : subnet.id]
}

output "instance_subnet_ids" {
  description = "Application instance subnet IDs"
  value       = [for subnet in aws_subnet.instance_sub : subnet.id]
}

output "rds_subnet_ids" {
  description = "RDS subnet IDs"
  value       = [for subnet in aws_subnet.rds_sub : subnet.id]
}

output "nat_gateway_id" {
  description = "NAT Gateway ID"
  value       = aws_nat_gateway.main.id
}

output "internet_gateway_id" {
  description = "Internet Gateway ID"
  value       = aws_internet_gateway.main.id
}