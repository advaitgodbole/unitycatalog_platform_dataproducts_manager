output "cluster_policy_id" {
  value = databricks_cluster_policy.product.id
}

output "sql_warehouse_id" {
  value = var.sql_warehouse ? databricks_sql_endpoint.product[0].id : null
}
