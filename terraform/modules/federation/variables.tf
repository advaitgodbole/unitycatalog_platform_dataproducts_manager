variable "product_name" {
  type = string
}

variable "target_platform" {
  type        = string
  description = "snowflake or glue"
}

variable "catalog_name" {
  type = string
}

variable "snowflake_account_url" {
  type    = string
  default = ""
}

variable "glue_catalog_arn" {
  type    = string
  default = ""
}

variable "read_group_name" {
  type = string
}

variable "write_group_name" {
  type = string
}
