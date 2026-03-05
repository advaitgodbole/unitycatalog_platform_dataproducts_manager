variable "product_name" {
  type = string
}

variable "service_principal_name" {
  type = string
}

variable "read_group_name" {
  type = string
}

variable "write_group_name" {
  type = string
}

variable "read_members" {
  type    = list(string)
  default = []
}

variable "write_members" {
  type    = list(string)
  default = []
}
