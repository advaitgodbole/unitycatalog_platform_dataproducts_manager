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

// Admin types

export type CredentialPlatform = "databricks" | "snowflake" | "glue";

export interface PlatformCredential {
  id: string;
  platform: CredentialPlatform;
  environment: Environment;
  credential_name: string;
  config: Record<string, string>;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformCredentialCreate {
  platform: CredentialPlatform;
  environment: Environment;
  credential_name: string;
  config: Record<string, string>;
}

export interface PlatformCredentialListResponse {
  items: PlatformCredential[];
  total: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  granted_by: string;
  created_at: string;
  updated_at: string;
}

export interface AdminUserCreate {
  email: string;
  role: UserRole;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
}

export interface AuditLogEntry {
  id: string;
  product_id: string | null;
  action: string;
  actor_email: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface AuditLogListResponse {
  items: AuditLogEntry[];
  total: number;
}

export interface SystemOverview {
  total_products: number;
  active_products: number;
  pending_products: number;
  failed_products: number;
  total_access_requests: number;
  pending_access_requests: number;
  total_credentials: number;
  active_credentials: number;
  total_users: number;
  credentials_by_platform: Record<string, number>;
}

export interface TestCredentialResult {
  success: boolean;
  errors: string[];
}

export interface AppSettings {
  app_env: string;
  app_title: string;
  is_databricks_app: boolean;
  has_lakebase: boolean;
  databricks_host: string;
  github_repo: string;
  github_base_branch: string;
  cors_origins: string[];
}
