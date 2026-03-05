output "s3_prefix" {
  value = "s3://${var.bucket_name}/${local.s3_prefix}/"
}
