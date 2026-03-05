locals {
  tfvars_files = fileset("${path.module}/data-products", "*.tfvars.json")

  products = {
    for f in local.tfvars_files :
    trimsuffix(f, ".tfvars.json") => jsondecode(file("${path.module}/data-products/${f}"))
  }
}

module "data_product" {
  source   = "./modules/data-product"
  for_each = local.products

  product_name           = each.value.product_name
  display_name           = each.value.display_name
  owning_domain          = each.value.owning_domain
  environment            = lookup(each.value, "environment", "dev")
  catalog_name           = each.value.catalog_name
  schema_name            = each.value.schema_name
  classification         = each.value.classification
  cost_center            = each.value.cost_center
  description            = lookup(each.value, "description", "")
  target_platform        = lookup(each.value, "target_platform", "databricks")
  status                 = lookup(each.value, "status", "active")
  service_principal_name = each.value.service_principal_name
  read_group_name        = each.value.read_group_name
  write_group_name       = each.value.write_group_name
  read_members           = lookup(each.value, "read_members", [])
  write_members          = lookup(each.value, "write_members", [])
  cluster_policy         = lookup(each.value, "cluster_policy", "default")
  sql_warehouse          = lookup(each.value, "sql_warehouse", false)
  tags                   = lookup(each.value, "tags", {})

  snowflake_account_url = lookup(each.value, "snowflake_account_url", "")
  glue_catalog_arn      = lookup(each.value, "glue_catalog_arn", "")

  providers = {
    databricks.workspace = databricks.workspace
    databricks.account   = databricks.account
  }
}
