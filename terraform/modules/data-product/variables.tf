variable "product_name" {
  type        = string
  description = "Machine-readable product name (used as schema name)"
}

variable "display_name" {
  type        = string
  description = "Human-readable display name"
}

variable "owning_domain" {
  type        = string
  description = "Owning domain: clinical, rnd, or commercial"
}

variable "environment" {
  type        = string
  description = "Deployment environment: dev, staging, or prod"
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod"
  }
}

variable "catalog_name" {
  type        = string
  description = "UC catalog name (e.g. clinical_dev, clinical_prod)"
}

variable "schema_name" {
  type        = string
  description = "UC schema name within the catalog"
}

variable "classification" {
  type        = string
  description = "Data classification: public, internal, confidential, restricted_phi"
}

variable "cost_center" {
  type        = string
  description = "Cost center code"
}

variable "description" {
  type    = string
  default = ""
}

variable "target_platform" {
  type    = string
  default = "databricks"
}

variable "status" {
  type    = string
  default = "active"
}

variable "service_principal_name" {
  type        = string
  description = "Name of the owner service principal"
}

variable "read_group_name" {
  type        = string
  description = "UC group for read access"
}

variable "write_group_name" {
  type        = string
  description = "UC group for write access"
}

variable "read_members" {
  type    = list(string)
  default = []
}

variable "write_members" {
  type    = list(string)
  default = []
}

variable "cluster_policy" {
  type    = string
  default = "default"
}

variable "sql_warehouse" {
  type    = bool
  default = false
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "snowflake_account_url" {
  type    = string
  default = ""
}

variable "glue_catalog_arn" {
  type    = string
  default = ""
}
