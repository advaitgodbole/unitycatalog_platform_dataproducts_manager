variable "product_name" {
  type = string
}

variable "owning_domain" {
  type = string
}

variable "catalog_name" {
  type = string
}

variable "schema_name" {
  type = string
}

variable "classification" {
  type = string
}

variable "bucket_name" {
  type    = string
  default = "dpvm-data-products"
}
