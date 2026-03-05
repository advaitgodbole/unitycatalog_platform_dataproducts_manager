terraform {
  required_providers {
    databricks = {
      source = "databricks/databricks"
    }
  }
}

resource "databricks_cluster_policy" "product" {
  name = "dpvm-${var.product_name}"

  definition = jsonencode({
    "custom_tags.cost_center" = {
      type  = "fixed"
      value = var.cost_center
    }
    "custom_tags.classification" = {
      type  = "fixed"
      value = var.classification
    }
    "custom_tags.product" = {
      type  = "fixed"
      value = var.product_name
    }
    "autotermination_minutes" = {
      type  = "range"
      maxValue = 120
      defaultValue = 30
    }
    "num_workers" = {
      type     = "range"
      maxValue = 10
    }
  })
}

resource "databricks_sql_endpoint" "product" {
  count = var.sql_warehouse ? 1 : 0

  name             = "dpvm-${var.product_name}"
  cluster_size     = "2X-Small"
  max_num_clusters = 1
  auto_stop_mins   = 15

  tags {
    custom_tags {
      key   = "product"
      value = var.product_name
    }
    custom_tags {
      key   = "cost_center"
      value = var.cost_center
    }
  }
}
