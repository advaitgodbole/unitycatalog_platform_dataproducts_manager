output "service_principal_application_id" {
  value = databricks_service_principal.owner.application_id
}

output "read_group_id" {
  value = databricks_group.read.id
}

output "write_group_id" {
  value = databricks_group.write.id
}
