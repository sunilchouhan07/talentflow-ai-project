resource "aws_wafv2_web_acl" "cloudfront" {
  provider = aws.us_east_1

  name  = "${var.project}-${var.env}-cloudfront-waf"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-${var.env}-cloudfront-waf"
    sampled_requests_enabled   = true
  }
}