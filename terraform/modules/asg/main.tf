resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.project}-${var.env}-ec2-profile"
  role = var.ec2_role
}


# Launch Template

resource "aws_launch_template" "main" {
  name                   = "${var.project}-${var.env}-launch-tmp"
  image_id               = var.ami_id
  instance_type          = var.instance_type
  vpc_security_group_ids = [var.app_sg_id]

  user_data = base64encode(
    templatefile("${path.module}/userdata/bootstrap.sh", {
      deploy_script                   = file("${path.module}/userdata/deploy.sh")
      cloudwatch_agent_parameter_name = var.cloudwatch_agent_parameter_name
      current_version_parameter_name  = var.current_version_parameter_name
      Environment                     = var.env
      Project                         = var.project
      aws_region                      = var.aws_region
      artifact_bucket_name            = var.artifact_bucket_name
    })
  )

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = var.root_volume_size
      volume_type = "gp3"
      encrypted   = true
    }

  }

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${var.project}-${var.env}-ec2-asg"
      Environment = var.env
      Project     = var.project
    }
  }
}




#Auto-Scaling Group
resource "aws_autoscaling_group" "main" {
  name = "${var.project}-${var.env}-asg"

  vpc_zone_identifier = var.subnet_id
  min_size            = var.min_size
  max_size            = var.max_size
  desired_capacity    = var.desired_capacity

  launch_template {
    id      = aws_launch_template.main.id
    version = "$Latest"
  }


  target_group_arns = [
    var.tg_arn
  ]

  health_check_type         = "ELB"
  health_check_grace_period = var.health_check_period

  enabled_metrics = [
    "GroupMinSize",
    "GroupMaxSize",
    "GroupDesiredCapacity",
    "GroupInServiceInstances",
    "GroupPendingInstances",
    "GroupStandbyInstances",
    "GroupTerminatingInstances",
    "GroupTotalInstances"
  ]

  tag {
    key                 = "Role"
    value               = "application-server"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.env
    propagate_at_launch = true
  }
}
