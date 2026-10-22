output "sns_topic_name" {
  value = aws_sns_topic.cloudwatch_alerts.name
}

output "sns_topic_arn" {
  value = aws_sns_topic.cloudwatch_alerts.arn
}