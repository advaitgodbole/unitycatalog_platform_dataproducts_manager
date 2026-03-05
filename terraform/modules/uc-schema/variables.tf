variable "catalog_name" {
  type = string
}

variable "schema_name" {
  type = string
}

variable "owner_application_id" {
  type        = string
  description = "Application ID of the owning service principal"
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "comment" {
  type    = string
  default = ""
}

variable "status" {
  type    = string
  default = "active"
}
