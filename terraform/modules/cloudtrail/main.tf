resource "aws_cloudtrail" "main" {
  name                          = "${var.project}-${var.env}-trail"
  s3_bucket_name                = var.aws_cloudtrail_logs_bucket
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_logging                = true
  enable_log_file_validation    = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }

  tags = {
    Name        = "${var.project}-${var.env}-tail"
    Environment = var.env
    Project     = var.project
  }
}