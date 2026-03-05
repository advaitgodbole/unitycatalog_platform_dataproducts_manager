locals {
  s3_prefix = "${var.owning_domain}/${var.product_name}"
}

resource "aws_s3_object" "product_prefix" {
  bucket  = var.bucket_name
  key     = "${local.s3_prefix}/"
  content = ""

  tags = {
    product        = var.product_name
    domain         = var.owning_domain
    classification = var.classification
  }
}
