variable "product_name" {
  type = string
}

variable "service_principal_id" {
  type = string
}

variable "cluster_policy_name" {
  type    = string
  default = "default"
}

variable "sql_warehouse" {
  type    = bool
  default = false
}

variable "cost_center" {
  type = string
}

variable "classification" {
  type = string
}
