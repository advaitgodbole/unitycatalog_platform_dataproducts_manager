terraform {
  required_providers {
    databricks = {
      source                = "databricks/databricks"
      configuration_aliases = [databricks.workspace, databricks.account]
    }
  }
}

module "uc_iam" {
  source = "../uc-iam"

  product_name           = var.product_name
  service_principal_name = var.service_principal_name
  read_group_name        = var.read_group_name
  write_group_name       = var.write_group_name
  read_members           = var.read_members
  write_members          = var.write_members

  providers = {
    databricks = databricks.account
  }
}

module "uc_schema" {
  source = "../uc-schema"

  catalog_name           = var.catalog_name
  schema_name            = var.schema_name
  owner_application_id   = module.uc_iam.service_principal_application_id
  tags                   = merge(var.tags, { "environment" = var.environment })
  comment                = var.description
  status                 = var.status

  providers = {
    databricks = databricks.workspace
  }

  depends_on = [module.uc_iam]
}

module "compute_policy" {
  source = "../compute-policy"

  product_name           = var.product_name
  service_principal_id   = module.uc_iam.service_principal_application_id
  cluster_policy_name    = var.cluster_policy
  sql_warehouse          = var.sql_warehouse
  cost_center            = var.cost_center
  classification         = var.classification

  providers = {
    databricks = databricks.workspace
  }
}

module "storage" {
  source = "../storage"

  product_name    = var.product_name
  owning_domain   = var.owning_domain
  catalog_name    = var.catalog_name
  schema_name     = var.schema_name
  classification  = var.classification
}

module "federation" {
  count  = var.target_platform != "databricks" ? 1 : 0
  source = "../federation"

  product_name          = var.product_name
  target_platform       = var.target_platform
  catalog_name          = var.catalog_name
  snowflake_account_url = var.snowflake_account_url
  glue_catalog_arn      = var.glue_catalog_arn
  read_group_name       = var.read_group_name
  write_group_name      = var.write_group_name

  providers = {
    databricks = databricks.workspace
  }
}
