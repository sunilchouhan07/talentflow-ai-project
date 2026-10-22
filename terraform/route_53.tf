
resource "aws_route53_zone" "main" {
  name = "sunilchouhan.site"

  tags = {
    Name = "${local.project}-${local.env}-hosted-zone"
  }
}

locals {
  route53_domain_names = [
    "sunilchouhan.site",
    "www.sunilchouhan.site"
  ]

  cloudfront_hosted_zone_id = module.cloudfront.cloudfront_hosted_zone_id
}

resource "aws_route53_record" "cloudfront_a" {
  for_each = toset(local.route53_domain_names)

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = module.cloudfront.distribution_domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cloudfront_aaaa" {
  for_each = toset(local.route53_domain_names)

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value
  type    = "AAAA"

  alias {
    name                   = module.cloudfront.distribution_domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}


resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "_dmarc.sunilchouhan.site"
  type    = "TXT"
  ttl     = 300

  records = [
    "v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;"
  ]
}