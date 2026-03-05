terraform {
  required_providers {
    databricks = {
      source = "databricks/databricks"
    }
  }
}

resource "databricks_schema" "product" {
  catalog_name = var.catalog_name
  name         = var.schema_name
  owner        = var.owner_application_id
  comment      = var.comment
  properties   = merge(var.tags, { "dpvm_status" = var.status })
}
