resource "aws_s3_bucket" "state_bucket" {
  bucket = "remote-state-talentflow-ai"

  tags = {
    Name = "Backend"
  }
}