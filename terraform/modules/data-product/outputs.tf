output "schema_full_name" {
  value       = module.uc_schema.schema_full_name
  description = "Fully qualified schema name (catalog.schema)"
}

output "service_principal_id" {
  value       = module.uc_iam.service_principal_application_id
  description = "Application ID of the owner service principal"
}

output "read_group_id" {
  value       = module.uc_iam.read_group_id
  description = "ID of the read access group"
}

output "write_group_id" {
  value       = module.uc_iam.write_group_id
  description = "ID of the write access group"
}
