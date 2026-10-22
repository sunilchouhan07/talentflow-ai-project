output "resume_queue_name" {
  value = aws_sqs_queue.resume_events.name
}

output "resume_queue_arn" {
  value = aws_sqs_queue.resume_events.arn
}

output "resume_dlq_name" {
  value = aws_sqs_queue.resume_dlq.name
}

output "resume_lambda_name" {
  value = aws_lambda_function.resume_processor.function_name
}

output "resume_eventbridge_rule_arn" {
  value = aws_cloudwatch_event_rule.resume_upload.arn
}