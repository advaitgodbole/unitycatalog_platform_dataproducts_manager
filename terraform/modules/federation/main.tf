terraform {
  required_providers {
    databricks = {
      source = "databricks/databricks"
    }
  }
}

# --- Snowflake Federation ---

resource "databricks_connection" "snowflake" {
  count = var.target_platform == "snowflake" ? 1 : 0

  name            = "dpvm-sf-${var.product_name}"
  connection_type = "SNOWFLAKE"
  options = {
    host = var.snowflake_account_url
  }
  comment = "DPVM federation connection for ${var.product_name}"
}

resource "databricks_catalog" "snowflake_foreign" {
  count = var.target_platform == "snowflake" ? 1 : 0

  name            = var.catalog_name
  connection_name = databricks_connection.snowflake[0].name
  comment         = "Foreign catalog for ${var.product_name} (Snowflake)"

  options = {
    database = var.product_name
  }
}

# --- AWS Glue Federation ---

resource "databricks_catalog" "glue_foreign" {
  count = var.target_platform == "glue" ? 1 : 0

  name    = var.catalog_name
  comment = "Foreign catalog for ${var.product_name} (AWS Glue)"

  options = {
    catalog_arn = var.glue_catalog_arn
  }
}

# --- Grants on foreign catalogs ---

resource "databricks_grants" "foreign_catalog" {
  count   = var.target_platform != "databricks" ? 1 : 0
  catalog = var.target_platform == "snowflake" ? databricks_catalog.snowflake_foreign[0].name : databricks_catalog.glue_foreign[0].name

  grant {
    principal  = var.read_group_name
    privileges = ["USE_CATALOG", "USE_SCHEMA", "SELECT"]
  }

  grant {
    principal  = var.write_group_name
    privileges = ["USE_CATALOG", "USE_SCHEMA", "SELECT", "MODIFY"]
  }
}
