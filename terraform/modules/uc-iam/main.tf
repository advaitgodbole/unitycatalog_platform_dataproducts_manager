terraform {
  required_providers {
    databricks = {
      source = "databricks/databricks"
    }
  }
}

resource "databricks_service_principal" "owner" {
  display_name = var.service_principal_name
}

resource "databricks_group" "read" {
  display_name = var.read_group_name
}

resource "databricks_group" "write" {
  display_name = var.write_group_name
}

resource "databricks_group_member" "read_members" {
  for_each  = toset(var.read_members)
  group_id  = databricks_group.read.id
  member_id = each.value
}

resource "databricks_group_member" "write_members" {
  for_each  = toset(var.write_members)
  group_id  = databricks_group.write.id
  member_id = each.value
}
