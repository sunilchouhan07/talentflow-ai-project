resource "aws_cloudwatch_metric_alarm" "asg_instances_low" {
  alarm_name        = "${var.project}-${var.env}-asg-instances-low"
  alarm_description = "Alarm when the application ASG has fewer than 2 InService instances"

  namespace           = "AWS/AutoScaling"
  metric_name         = "GroupInServiceInstances"
  statistic           = "Minimum"
  period              = 60
  evaluation_periods  = 2
  threshold           = var.instance_capacity_threshold
  comparison_operator = "LessThanThreshold"

  dimensions = {
    AutoScalingGroupName = var.asg_name
  }

  alarm_actions = [
    var.sns_topic_arn
  ]

  treat_missing_data = "notBreaching"
}



resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name        = "${var.project}-${var.env}-alb-5xx"
  alarm_description = "Alarm when the ALB returns a high number of HTTP 5xx responses"

  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_ELB_5XX_Count"
  statistic           = "Sum"
  period              = var.period
  evaluation_periods  = 2
  threshold           = var.alb_5xx_threshold
  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = [
    var.sns_topic_arn
  ]

  treat_missing_data = "notBreaching"
}



resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_targets" {
  alarm_name        = "${var.project}-${var.env}-alb-unhealthy-targets"
  alarm_description = "Alarm when the ALB has unhealthy backend targets"

  namespace           = "AWS/ApplicationELB"
  metric_name         = "UnHealthyHostCount"
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 2
  threshold           = var.alb_threshold
  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_arn_suffix
  }

  alarm_actions = [
    var.sns_topic_arn
  ]

  treat_missing_data = "notBreaching"
}



resource "aws_cloudwatch_metric_alarm" "alb_rejected_connections" {
  alarm_name        = "${var.project}-${var.env}-alb-rejected-connections"
  alarm_description = "Alarm when the ALB rejects a high number of connection attempts"

  namespace           = "AWS/ApplicationELB"
  metric_name         = "RejectedConnectionCount"
  statistic           = "Sum"
  period              = var.period
  evaluation_periods  = 2
  threshold           = var.alb_rejected_connections
  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = [
    var.sns_topic_arn
  ]

  treat_missing_data = "notBreaching"
}



resource "aws_cloudwatch_metric_alarm" "ec2_high_cpu" {
  alarm_name        = "${var.project}-${var.env}-ec2-high-cpu"
  alarm_description = "Alarm when EC2 utilization is above 80%"

  namespace           = "TalentFlow-AI-Metrics"
  metric_name         = "cpu_usage_user"
  statistic           = "Average"
  period              = var.period
  evaluation_periods  = 2
  threshold           = var.cpu_threshold
  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    AutoScalingGroupName = var.asg_name
  }

  alarm_actions = [
    var.sns_topic_arn
  ]

  treat_missing_data = "notBreaching"
}



resource "aws_cloudwatch_metric_alarm" "asg_high_memory" {
  alarm_name        = "${var.project}-${var.env}-asg-high-memory"
  alarm_description = "Alarm when average memory utilization across the ASG exceeds 80%"

  namespace           = "TalentFlow-AI-Metrics"
  metric_name         = "mem_used_percent"
  statistic           = "Average"
  period              = var.period
  evaluation_periods  = 2
  threshold           = var.memory_threshold
  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    AutoScalingGroupName = var.asg_name
  }

  alarm_actions = [
    var.sns_topic_arn
  ]

  treat_missing_data = "notBreaching"
}


resource "aws_cloudwatch_metric_alarm" "ec2_high_disk" {
  alarm_name        = "${var.project}-${var.env}-ec2-high-disk"
  alarm_description = "Alarm when root filesystem usage exceeds 80%"

  namespace           = "TalentFlow-AI-Metrics"
  metric_name         = "disk_used_percent"
  statistic           = "Maximum"
  period              = var.period
  evaluation_periods  = 2
  threshold           = var.disk_threshold
  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    AutoScalingGroupName = var.asg_name
  }

  alarm_actions = [
    var.sns_topic_arn
  ]

  treat_missing_data = "notBreaching"
}





# RDS: high CPU utilization
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "${var.project}-${var.env}-rds-high-cpu"
  alarm_description   = "RDS CPU utilization is above 80%"
  namespace           = "AWS/RDS"
  metric_name         = "CPUUtilization"
  statistic           = "Average"
  period              = var.period
  evaluation_periods  = 2
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    DBInstanceIdentifier = var.db_identifier
  }

  alarm_actions      = [var.sns_topic_arn]
  treat_missing_data = "notBreaching"
}

# RDS: low free storage (2 GiB)
resource "aws_cloudwatch_metric_alarm" "rds_low_storage" {
  alarm_name          = "${var.project}-${var.env}-rds-low-storage"
  alarm_description   = "RDS free storage is below 2 GiB"
  namespace           = "AWS/RDS"
  metric_name         = "FreeStorageSpace"
  statistic           = "Minimum"
  period              = var.period
  evaluation_periods  = 2
  threshold           = 2147483648
  comparison_operator = "LessThanThreshold"

  dimensions = {
    DBInstanceIdentifier = var.db_identifier
  }

  alarm_actions      = [var.sns_topic_arn]
  treat_missing_data = "notBreaching"
}

# Lambda: function errors
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project}-${var.env}-resume-lambda-errors"
  alarm_description   = "Resume processor Lambda reported an error"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = var.period
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    FunctionName = var.lambda_function_name
  }

  alarm_actions      = [var.sns_topic_arn]
  treat_missing_data = "notBreaching"
}

# Lambda: throttled invocations
resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  alarm_name          = "${var.project}-${var.env}-resume-lambda-throttles"
  alarm_description   = "Resume processor Lambda invocations were throttled"
  namespace           = "AWS/Lambda"
  metric_name         = "Throttles"
  statistic           = "Sum"
  period              = var.period
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    FunctionName = var.lambda_function_name
  }

  alarm_actions      = [var.sns_topic_arn]
  treat_missing_data = "notBreaching"
}

# SQS: messages waiting in the resume queue
resource "aws_cloudwatch_metric_alarm" "resume_queue_backlog" {
  alarm_name          = "${var.project}-${var.env}-resume-queue-backlog"
  alarm_description   = "More than 10 resume events are waiting in the queue"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Maximum"
  period              = var.period
  evaluation_periods  = 2
  threshold           = 10
  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    QueueName = var.resume_queue_name
  }

  alarm_actions      = [var.sns_topic_arn]
  treat_missing_data = "notBreaching"
}

# SQS: any messages in the dead-letter queue
resource "aws_cloudwatch_metric_alarm" "resume_dlq_messages" {
  alarm_name          = "${var.project}-${var.env}-resume-dlq-messages"
  alarm_description   = "Messages reached the resume processor dead-letter queue"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Maximum"
  period              = var.period
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    QueueName = var.resume_dlq_name
  }

  alarm_actions      = [var.sns_topic_arn]
  treat_missing_data = "notBreaching"
}




resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project}-${var.env}-central-monitoring"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "ALB: Requests and HTTP 5xx"
          region = "ap-south-1"
          stat   = "Sum"
          period = var.period
          metrics = [
            ["AWS/ApplicationELB", "RequestCount",
            "LoadBalancer", var.alb_arn_suffix],
            [".", "HTTPCode_ELB_5XX_Count",
            ".", var.alb_arn_suffix]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Auto Scaling: In-Service Instances"
          region = "ap-south-1"
          stat   = "Minimum"
          period = var.period
          metrics = [
            ["AWS/AutoScaling", "GroupInServiceInstances",
            "AutoScalingGroupName", var.asg_name]
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "RDS: CPU and Free Storage"
          region = "ap-south-1"
          period = var.period
          metrics = [
            ["AWS/RDS", "CPUUtilization",
            "DBInstanceIdentifier", var.db_identifier],
            [".", "FreeStorageSpace",
            ".", var.db_identifier]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Resume Lambda: Errors and Throttles"
          region = "ap-south-1"
          stat   = "Sum"
          period = var.period
          metrics = [
            ["AWS/Lambda", "Errors",
            "FunctionName", var.lambda_function_name],
            [".", "Throttles",
            ".", var.lambda_function_name]
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "Resume Queue: Visible Messages"
          region = "ap-south-1"
          stat   = "Maximum"
          period = var.period
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible",
            "QueueName", var.resume_queue_name]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "Resume Dead-Letter Queue"
          region = "ap-south-1"
          stat   = "Maximum"
          period = var.period
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible",
            "QueueName", var.resume_dlq_name]
          ]
        }
      }
    ]
  })
}
