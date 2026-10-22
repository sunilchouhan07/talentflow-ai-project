resource "aws_lb_target_group" "main" {
  name     = "${var.project}-${var.env}-alb-tg"
  port     = 5000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/api/health"
    interval            = var.health_interval
    timeout             = var.timeout
    healthy_threshold   = var.healthy_threshold
    unhealthy_threshold = var.unhealthy_threshold
    matcher             = "200"
  }

  tags = {
    Name        = "${var.env}-alb-tg"
    Environment = var.env
  }

}


resource "aws_lb" "main" {
  name               = "${var.project}-${var.env}-alb"
  load_balancer_type = "application"
  internal           = false

  subnets = var.alb_sub

  security_groups = [var.alb_sg_id]
  tags = {
    Name        = "${var.project}-${var.env}-tg"
    Environment = var.env
    Project     = var.project
  }

}


resource "aws_lb_listener" "http_listener" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}

# resource "aws_lb_listener" "https_listener" {
#   load_balancer_arn = aws_lb.main.arn
#   port = 443
#   protocol = "HTTPS"
  
#   default_action {
#     type = "forward"
#     target_group_arn = aws_lb_target_group.main.arn
#   }
# }

