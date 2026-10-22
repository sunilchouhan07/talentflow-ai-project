output "target_group_arn" {
  value = aws_lb_target_group.main.arn
}

output "alb_dns" {
  value = aws_lb.main.dns_name
}

output "target_group_suffix" {
  value = aws_lb_target_group.main.arn_suffix
}

output "lb_suffix" {
  value = aws_lb.main.arn_suffix
}