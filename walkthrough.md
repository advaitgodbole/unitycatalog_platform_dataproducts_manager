# DPVM User Journey Walkthrough

This document describes end-to-end user journeys for each persona that interacts with the Data Product Vending Machine.

---

## Personas

| Persona | Role in DPVM | Primary Goal |
|---|---|---|
| **Domain Data Engineer** (Producer) | `producer` | Spin up governed data product infrastructure without IT tickets |
| **Domain Data Steward** (Governance) | `steward` | Approve creations, manage classifications, control access grants |
| **Platform Admin** | `admin` | Ensure all infrastructure meets security, networking, and cost standards |
| **Data Consumer** (Analyst / Scientist) | `producer` | Discover data products, request read access |

---

## Journey 1: Domain Data Engineer Creates a Data Product

**Persona:** Clinical Data Engineer who needs a new schema for adverse event reporting.

### Step 1 — Open the Create Wizard

Navigate to the DPVM portal and click **Create Product** in the top-right corner of the Dashboard. The multi-step wizard opens.

### Step 2 — Basic Info (Step 1 of 5)

Fill in the product identity:

| Field | Value | Notes |
|---|---|---|
| Product Name | `adverse_events_curated` | Lowercase, underscores only. Becomes the UC schema name. |
| Display Name | `Adverse Events (Curated)` | Human-readable label shown in the catalog. |
| Owning Domain | `Clinical` | Determines the catalog prefix. |
| Environment | `Dev` | Catalog will be `clinical_dev`. Change to `prod` when ready for production. |
| Data Steward Email | `steward@pharma.com` | The person who must approve the PR and access requests. |

The wizard shows a live preview: catalog will be **`clinical_dev.adverse_events_curated`**.

### Step 3 — Classification (Step 2 of 5)

| Field | Value |
|---|---|
| Data Classification | `Restricted / PHI` |
| Cost Center | `CC-3401` |
| Description | Free-text description of the data product's purpose and contents. |

The classification level drives Terraform guardrails — restricted/PHI products get stricter compute policies and tagged storage.

### Step 4 — Compute (Step 3 of 5)

| Field | Value |
|---|---|
| Cluster Policy | `Default (max 10 workers, 2hr auto-stop)` |
| SQL Warehouse | Checked |

Selecting "Provision a SQL Serverless Warehouse" means Terraform will create a dedicated endpoint for BI and SQL analytics on this product.

### Step 5 — Platform (Step 4 of 5)

| Field | Value |
|---|---|
| Target Platform | `Databricks (Native UC)` |

For cross-platform products, select Snowflake or AWS Glue and provide the connection details. Terraform will create a UC foreign catalog for federation.

### Step 6 — Review & Submit (Step 5 of 5)

The review panel shows all selections. Click **Create Data Product**.

**What happens behind the scenes:**

1. The backend generates a YAML configuration file from the form inputs.
2. If GitHub is configured, a new branch is created and a Pull Request is opened with the YAML committed to `configs/clinical/adverse_events_curated.yaml`.
3. The product is persisted in Lakebase with status **`pending_approval`**.
4. An entry is written to the audit log: `create` by `engineer@pharma.com`.

### Step 7 — Track Status

Return to the Dashboard. The new product appears with a yellow **Pending Approval** badge. Click into it to see:

- A link to the GitHub PR (if configured).
- The full metadata (domain, environment, classification, steward).
- The derived catalog path: `clinical_dev.adverse_events_curated`.

The engineer's work is done. The Steward takes over from here.

---

## Journey 2: Data Steward Reviews and Approves a Product

**Persona:** Clinical Data Steward responsible for governance of all clinical-domain data products.

### Step 1 — Review the Pull Request

The Steward receives a notification (via GitHub) that a new PR has been opened: `[DPVM] Create: adverse_events_curated (clinical / restricted_phi)`.

The PR contains the full YAML configuration:

```yaml
data_product:
  name: adverse_events_curated
  display_name: Adverse Events (Curated)
  owning_domain: clinical
  environment: dev
  catalog: clinical_dev
  schema: adverse_events_curated
  classification: restricted_phi
  cost_center: CC-3401
  iam:
    owner_service_principal: spn-adverse_events_curated
    groups:
      read: adverse_events_curated_read
      write: adverse_events_curated_write
  compute:
    cluster_policy: default
    sql_warehouse: true
  tags:
    domain: clinical
    classification: restricted_phi
    cost_center: CC-3401
  status: active
```

### Step 2 — Terraform Plan Review

GitHub Actions automatically runs `terraform plan` on the PR. The plan output is posted as a PR comment showing exactly what will be provisioned:

- `databricks_schema.product` — the UC schema
- `databricks_service_principal` — `spn-adverse_events_curated`
- `databricks_group` — `adverse_events_curated_read` and `_write`
- `databricks_grants` — permissions on the schema
- `databricks_cluster_policy` — compute guardrails
- `databricks_sql_endpoint` — serverless SQL warehouse
- `aws_s3_object` — dedicated storage prefix

The Steward validates that the classification, compute limits, and access groups are correct.

### Step 3 — Merge the PR

The Steward approves and merges the PR into `main`.

**What happens behind the scenes:**

1. GitHub Actions triggers the `terraform-apply` workflow.
2. `yaml_to_tf.py` converts the YAML into `.tfvars.json`.
3. `terraform apply -auto-approve` provisions all resources in Databricks and AWS.
4. On success, the workflow calls back to `/api/webhooks/github` which updates the product status in Lakebase from `pending_approval` → `active`.

### Step 4 — Verify in the Portal

Back in the DPVM Dashboard, the product now shows a green **Active** badge. The detail page shows:

- **View in Databricks** link pointing to the live UC schema.
- **View PR** link to the merged GitHub PR for audit trail.

### Step 5 — Manage Access Requests (ongoing)

Navigate to **Access Requests** in the sidebar. The Steward sees a table of all pending requests with columns:

| Product | Requester | Level | Status | Date | Actions |
|---|---|---|---|---|---|
| adverse_events_curated | analyst@pharma.com | read | pending | 2026-03-05 | ✓ ✗ |

Click the **✓** (approve) button. Behind the scenes:

1. The product's YAML config is updated to add the requester to `iam.members.read`.
2. A new PR is opened: `[DPVM] Grant read on adverse_events_curated to analyst@pharma.com`.
3. On merge, Terraform runs `GRANT SELECT ON SCHEMA` for the requester's group.
4. The access request status updates to **approved** in the table.

Click **✗** to deny with an optional reason, which is recorded in the audit log.

---

## Journey 3: Data Steward Deprecates a Product

**Persona:** The same Clinical Data Steward, decommissioning an obsolete product.

### Step 1 — Navigate to the Product

From the Dashboard, find the product to deprecate (e.g., `legacy_trial_data`). Click into its detail page.

### Step 2 — Deprecate

Scroll to the **Danger Zone** section at the bottom (red border). Click **Deprecate Product**. A confirmation dialog appears:

> "Deprecate this data product? This will revoke all user access."

Click OK.

**What happens behind the scenes:**

1. The product's YAML config is updated:
   - `status` changes to `deprecated`.
   - `iam.members.read` and `iam.members.write` are emptied.
2. A PR is opened: `[DPVM] Deprecate: legacy_trial_data`.
3. On merge, Terraform:
   - Drops all grants from the read/write groups.
   - Tags the UC schema with `dpvm_status = deprecated`.
   - Removes the SQL warehouse (if any).
4. Physical data in S3 is **preserved** for legal hold and audit requirements.
5. The product status in the portal changes to **Deprecated** (gray badge).

The product remains visible in the Dashboard (filterable by "Deprecated" status) but can no longer receive new access requests.

---

## Journey 4: Data Consumer Discovers and Requests Access

**Persona:** A pharmacovigilance analyst who needs clinical trial data for a safety report.

### Step 1 — Browse the Dashboard

Open the DPVM portal. The Dashboard shows all data products as cards with:

- Product name and description
- Status badge (Active / Deprecated / etc.)
- Classification tag (Public / Restricted-PHI / etc.)
- Domain and target platform

### Step 2 — Filter and Search

Use the filter bar to narrow results:

| Filter | Selection |
|---|---|
| Search | `adverse` |
| Domain | `Clinical` |
| Environment | `Prod` |
| Status | `Active` |
| Platform | `Databricks` |

The list narrows to show matching active production products.

### Step 3 — View Product Details

Click on **Adverse Events (Curated)**. The detail page shows:

- **Catalog path:** `clinical_prod.adverse_events_curated`
- **Classification:** Restricted / PHI
- **Steward:** `steward@pharma.com`
- **View in Databricks** link to explore the schema, tables, and column-level lineage directly in the Databricks UI.

### Step 4 — Request Access

Click **Request Access** to expand the access form:

| Field | Value |
|---|---|
| Access Level | `Read` |
| Justification | `Need read access for Q1 2026 pharmacovigilance safety report (PSUR-2026-Q1)` |

Click **Submit Request**.

**What happens behind the scenes:**

1. An access request record is created in Lakebase with status `pending`.
2. An audit log entry records the request.
3. The request appears in the Steward's **Access Requests** queue.

### Step 5 — Wait for Approval

The consumer sees a confirmation: *"Access request submitted. A steward will review it."*

Once the Steward approves (Journey 2, Step 5), the consumer's email is added to the `adverse_events_curated_read` UC group via Terraform. They can now query the schema:

```sql
SELECT * FROM clinical_prod.adverse_events_curated.events LIMIT 10;
```

---

## Journey 5: Platform Admin Monitors and Governs

**Persona:** Central platform team member responsible for infrastructure standards.

### Step 1 — Review All Products

The Admin has the `admin` role, which grants unrestricted access to all endpoints. From the Dashboard, they can see every product across all domains and environments.

### Step 2 — Audit Trail

For any product, the detail page shows:

- Who created it and when.
- The GitHub PR link — every infrastructure change is traceable to a Git commit.
- The Terraform run ID — links to the GitHub Actions run that provisioned it.

The `dpvm.audit_log` table in Lakebase provides a complete, queryable record:

```sql
SELECT timestamp, action, actor_email, details
FROM dpvm.audit_log
WHERE product_id = '<uuid>'
ORDER BY timestamp DESC;
```

Every action is logged: `create`, `update`, `access_request`, `access_approved`, `access_denied`, `deprecate`.

### Step 3 — Terraform Module Governance

The Admin maintains the Terraform modules in `terraform/modules/`. All products go through the same modules, ensuring:

- **Compute policies** enforce auto-termination and worker limits.
- **Storage tags** are consistent (domain, classification, cost center).
- **IAM patterns** are standardized (service principal as owner, read/write groups).
- **Federation modules** use approved connection patterns for Snowflake and Glue.

No one can bypass these guardrails because the UI → YAML → Terraform pipeline is the only path to provisioning.

### Step 4 — Update Product Metadata

The Admin can use `PATCH /api/products/{id}` (or the UI once the edit form is built) to update:

- `classification` (e.g., upgrading from Internal to Restricted/PHI)
- `cost_center` (re-allocation)
- `cluster_policy` (scaling up or down)
- `environment` (promoting from dev to prod)

Each update is recorded in the audit log.

### Step 5 — Cross-Environment Promotion

A typical promotion flow managed by the Admin:

1. Engineer creates product in `dev` → catalog `clinical_dev.adverse_events_curated`.
2. After validation, the Admin (or Steward) creates the same product in `staging` via the wizard, selecting Environment = `Staging` → catalog `clinical_staging.adverse_events_curated`.
3. After UAT, create in `prod` → catalog `clinical_prod.adverse_events_curated`.

Each environment is an independent Terraform-managed deployment with its own IAM, compute, and storage.

---

## Journey 6: Cross-Platform Federation (Snowflake / AWS Glue)

**Persona:** An R&D Data Engineer whose team's data lives in Snowflake but needs to be governed in Unity Catalog.

### Step 1 — Create with Snowflake Target

In the Create Wizard, on the Platform step (Step 4), select:

| Field | Value |
|---|---|
| Target Platform | `Snowflake (UC Foreign Catalog)` |
| Snowflake Account URL | `https://abc123.snowflakecomputing.com` |

### Step 2 — What Terraform Provisions

Instead of a native UC schema, the federation module creates:

- `databricks_connection` — a UC connection to the Snowflake account.
- `databricks_catalog` (type `FOREIGN`) — a foreign catalog that mirrors Snowflake schemas in Unity Catalog.
- `databricks_grants` — read/write permissions on the foreign catalog, using the same group-based pattern.

### Step 3 — Unified Discovery

The federated product appears in the DPVM Dashboard alongside native Databricks products. Consumers can discover it, request access, and query it through UC — even though the data physically resides in Snowflake.

The same flow applies for **AWS Glue**: select "AWS Glue" as the target platform and provide the Glue Catalog ARN. Terraform creates a Glue-backed foreign catalog in Unity Catalog.

---

## Summary: End-to-End Flow

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│  Producer    │    │   Steward    │    │  GitHub       │    │  Terraform   │
│  (Engineer)  │    │  (Governance)│    │  Actions      │    │  + Databricks│
└──────┬───── ┘    └──────┬───────┘    └──────┬────────┘    └──────┬───────┘
       │                   │                   │                    │
       │  Fill wizard      │                   │                    │
       │  Submit form      │                   │                    │
       │──────────────────>│                   │                    │
       │  YAML generated   │  Review PR        │                    │
       │  PR opened ──────>│  (plan comment)   │                    │
       │                   │──────────────────>│                    │
       │                   │  Merge PR         │  terraform apply   │
       │                   │──────────────────>│───────────────────>│
       │                   │                   │                    │  Provision:
       │                   │                   │                    │  - UC Schema
       │                   │                   │  Webhook callback  │  - IAM Groups
       │                   │                   │<───────────────────│  - Compute
       │                   │                   │                    │  - Storage
       │  Status: Active   │                   │                    │
       │<──────────────────│                   │                    │
       │                   │                   │                    │
       │                   │                   │                    │
┌──────┴──────┐            │                   │                    │
│  Consumer   │            │                   │                    │
│  (Analyst)  │            │                   │                    │
└──────┬──────┘            │                   │                    │
       │  Request access   │                   │                    │
       │──────────────────>│  Approve          │                    │
       │                   │──────────────────>│  terraform apply   │
       │                   │                   │───────────────────>│
       │                   │                   │                    │  GRANT SELECT
       │  Access granted   │                   │                    │
       │<──────────────────│                   │                    │
       │                   │                   │                    │
       │  SELECT * FROM    │                   │                    │
       │  clinical_prod.   │                   │                    │
       │  adverse_events   │                   │                    │
       │  ────────────────────────────────────────────────────────>│
```

---

## API Endpoints by Persona

| Endpoint | Producer | Steward | Admin | Consumer |
|---|:---:|:---:|:---:|:---:|
| `POST /api/products` (create) | ✓ | ✓ | ✓ | — |
| `GET /api/products` (list) | ✓ | ✓ | ✓ | ✓ |
| `GET /api/products/{id}` (detail) | ✓ | ✓ | ✓ | ✓ |
| `PATCH /api/products/{id}` (update) | ✓ | ✓ | ✓ | — |
| `POST /api/products/{id}/deprecate` | — | ✓ | ✓ | — |
| `POST /api/access` (request) | ✓ | ✓ | ✓ | ✓ |
| `GET /api/access` (list requests) | ✓ | ✓ | ✓ | ✓ |
| `POST /api/access/{id}/approve` | — | ✓ | ✓ | — |
| `GET /api/catalog/*` (UC discovery) | ✓ | ✓ | ✓ | — |
