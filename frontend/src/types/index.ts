export type Domain = "clinical" | "rnd" | "commercial";
export type Environment = "dev" | "staging" | "prod";
export type Classification =
  | "public"
  | "internal"
  | "confidential"
  | "restricted_phi";
export type TargetPlatform = "databricks" | "snowflake" | "glue";
export type ProductStatus =
  | "pending_approval"
  | "provisioning"
  | "active"
  | "update_in_progress"
  | "deprecated"
  | "failed";
export type UserRole = "producer" | "steward" | "admin";

export interface CurrentUser {
  email: string;
  role: UserRole;
  role_display: string;
}

export type AccessLevel = "read" | "write";
export type AccessRequestStatus = "pending" | "approved" | "denied";

export interface DataProduct {
  id: string;
  name: string;
  display_name: string;
  owning_domain: Domain;
  environment: Environment;
  data_steward_email: string;
  classification: Classification;
  cost_center: string;
  description: string;
  target_platform: TargetPlatform;
  status: ProductStatus;
  catalog_name: string | null;
  schema_name: string | null;
  git_pr_url: string | null;
  terraform_run_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  snowflake_account_url: string | null;
  glue_catalog_arn: string | null;
  sql_warehouse: boolean;
  cluster_policy: string;
}

export interface DataProductCreate {
  name: string;
  display_name: string;
  owning_domain: Domain;
  environment: Environment;
  data_steward_email: string;
  classification: Classification;
  cost_center: string;
  description: string;
  target_platform: TargetPlatform;
  snowflake_account_url?: string;
  glue_catalog_arn?: string;
  sql_warehouse: boolean;
  cluster_policy: string;
}

export interface DataProductListResponse {
  items: DataProduct[];
  total: number;
}

export interface AccessRequest {
  id: string;
  product_id: string;
  product_name: string | null;
  requester_email: string;
  access_level: AccessLevel;
  status: AccessRequestStatus;
  justification: string;
  approved_by: string | null;
  reason: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface AccessRequestListResponse {
  items: AccessRequest[];
  total: number;
}
