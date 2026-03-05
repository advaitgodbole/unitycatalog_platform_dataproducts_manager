output "foreign_catalog_name" {
  value = var.target_platform == "snowflake" ? (
    length(databricks_catalog.snowflake_foreign) > 0 ? databricks_catalog.snowflake_foreign[0].name : null
  ) : (
    length(databricks_catalog.glue_foreign) > 0 ? databricks_catalog.glue_foreign[0].name : null
  )
}
