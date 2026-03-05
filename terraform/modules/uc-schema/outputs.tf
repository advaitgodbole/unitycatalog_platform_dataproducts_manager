output "schema_full_name" {
  value = "${databricks_schema.product.catalog_name}.${databricks_schema.product.name}"
}

output "schema_id" {
  value = databricks_schema.product.id
}
