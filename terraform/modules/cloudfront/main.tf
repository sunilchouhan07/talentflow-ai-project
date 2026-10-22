resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "${var.project}-${var.env}-frontend-oac"
  description                       = "OAC for forntend S3 bucket"
  origin_access_control_origin_type = var.origin
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}


data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}





data "aws_cloudfront_origin_request_policy" "all_viewer_except_host_header" {
  name = "Managed-AllViewerExceptHostHeader"
}



resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  aliases             = var.aliases
  comment             = "${var.env} Employee Management System Frontend"
  web_acl_id          = var.web_acl_id
  price_class         = "PriceClass_100"
  is_ipv6_enabled     = true
  default_root_object = var.default_root_object

  origin {
    domain_name              = var.bucket
    origin_id                = var.bucket_id
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  origin {
    domain_name = var.alb
    origin_id   = var.alb_id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols = [
        "TLSv1.2"
      ]
    }
  }

  default_cache_behavior {
    target_origin_id       = var.bucket_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods = [
      "GET",
      "HEAD"
    ]

    cached_methods = [
      "GET",
      "HEAD"
    ]

    cache_policy_id = data.aws_cloudfront_cache_policy.caching_optimized.id
    compress        = true
  }

  ordered_cache_behavior {
    path_pattern           = var.path_pattern
    target_origin_id       = var.alb_id
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = [
      "GET",
      "HEAD",
      "OPTIONS",
      "PUT",
      "POST",
      "PATCH",
      "DELETE"
    ]

    cached_methods = [
      "GET",
      "HEAD"
    ]

    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host_header.id
    compress                 = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == null
    acm_certificate_arn            = var.acm_certificate_arn
    ssl_support_method             = var.acm_certificate_arn == null ? null : "sni-only"
    minimum_protocol_version       = var.acm_certificate_arn == null ? null : "TLSv1.2_2021"
  }

  http_version = "http2and3"

  wait_for_deployment = true

  tags = {
    Environment = var.env
    Project     = var.project
    Component   = "frontend"
  }
}
