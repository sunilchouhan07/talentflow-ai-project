locals {
  env = terraform.workspace
}

locals {
  project = "talentflow-ai"
}

locals {
  email = "sunilchouhanw@gmail.com"
}

locals {
  region = "ap-south-1"
}

locals {
  instance_type_map = {
    dev  = "t3.micro"
    stg  = "t3.micro"
    prod = "t3.small"
  }

  rbd_size_map = {
    dev  = 10
    stg  = 10
    prod = 20
  }

  allocated_storage_map = {
    dev  = 10
    stg  = 10
    prod = 20
  }

  instance_class_map = {
    dev  = "db.t3.micro"
    stg  = "db.t3.micro"
    prod = "db.t4g.micro"
  }

  db_name_map = {
    dev  = "dev_db"
    stg  = "stg_db"
    prod = "prod_db"
  }

  username_map = {
    dev  = "dev_admin"
    stg  = "stg_admin"
    prod = "prod_admin"
  }

  common_tags = {
    Project = "Talentflow-AI"
    Owner   = "Sunil"
    Env     = terraform.workspace
    Managed = "Terraform"
  }

  root_volume_size  = local.rbd_size_map[terraform.workspace]
  username          = local.username_map[terraform.workspace]
  db_name           = local.db_name_map[terraform.workspace]
  instance_class    = local.instance_class_map[terraform.workspace]
  allocated_storage = local.allocated_storage_map[terraform.workspace]
  tags              = local.common_tags
  instance_type     = local.instance_type_map[terraform.workspace]
}
