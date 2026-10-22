
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags = {
    Name        = "${var.project}-${var.env}-main"
    Environment = var.env
    Project     = var.project
  }
  enable_dns_hostnames = true
  enable_dns_support   = true
}

resource "aws_subnet" "alb_sub" {
  for_each = var.alb_sub
  vpc_id   = aws_vpc.main.id

  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  map_public_ip_on_launch = true


  tags = {
    Name        = "${var.project}-${var.env}-${each.key}"
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_subnet" "instance_sub" {
  for_each = var.instance_sub
  vpc_id   = aws_vpc.main.id

  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = {
    Name        = "${var.project}-${var.env}-${each.key}"
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_subnet" "rds_sub" {
  for_each = var.rds_sub
  vpc_id   = aws_vpc.main.id

  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = {
    Name        = "${var.project}-${var.env}-${each.key}"
    Environment = var.env
    Project     = var.project
  }
}


resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name        = "${var.project}-${var.env}-igw"
    Environment = var.env
    Project     = var.project
  }
}


resource "aws_eip" "main" {
  domain = "vpc"
  tags = {
    Name        = "${var.project}-${var.env}-eip"
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.main.id
  subnet_id     = aws_subnet.alb_sub[var.nat_subnet_name].id

  tags = {
    Name        = "${var.project}-${var.env}-nat"
    Environment = var.env
    Project     = var.project
  }
  depends_on = [aws_internet_gateway.main]
}


resource "aws_route_table" "alb_route" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = {
    Name        = "${var.project}-${var.env}-alb-route-table"
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_route_table" "instance_route" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
  tags = {
    Name        = "${var.project}-${var.env}-instance-route-table"
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_route_table" "rds_route" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${var.project}-${var.env}-rds-route-table"
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_route_table_association" "alb_assoc" {
  for_each       = aws_subnet.alb_sub
  subnet_id      = each.value.id
  route_table_id = aws_route_table.alb_route.id

}

resource "aws_route_table_association" "instance_assoc" {
  for_each       = aws_subnet.instance_sub
  subnet_id      = each.value.id
  route_table_id = aws_route_table.instance_route.id
}

resource "aws_route_table_association" "rds_assoc" {
  for_each       = var.rds_sub
  subnet_id      = aws_subnet.rds_sub[each.key].id
  route_table_id = aws_route_table.rds_route.id
}
