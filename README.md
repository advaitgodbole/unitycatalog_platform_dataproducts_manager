# Data Product Vending Machine (DPVM)

A self-service portal for creating, managing, and governing Data Products across Databricks Unity Catalog, Snowflake, and AWS Glue. Built for pharmaceutical Data Mesh architectures with GxP/HIPAA compliance in mind.

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS (Vite)
- **Backend**: Python FastAPI + Databricks SDK + PyGithub
- **State Store**: Lakebase Autoscaling Postgres
- **IaC**: Terraform (databricks, aws providers)
- **CI/CD**: GitHub Actions (plan on PR, apply on merge)
- **Hosting**: Databricks Apps

## Unity Catalog Layout

Each data product maps to a **schema** inside a domain-and-environment-scoped **catalog**. The naming convention is `{domain}_{environment}.{product_name}`:

```
Unity Catalog
├── clinical_dev                             ← catalog (domain × environment)
│   ├── clinical_trials_raw                  ← schema (= one data product)
│   │   └── <tables/views created by domain team>
│   └── ...
├── clinical_staging
│   ├── clinical_trials_raw
│   └── ...
├── clinical_prod
│   ├── clinical_trials_raw
│   ├── adverse_events_curated
│   └── ...
├── rnd_dev
│   └── ...
├── rnd_prod
│   ├── molecule_screening_results
│   └── ...
├── commercial_prod
│   ├── sales_territory_metrics
│   └── ...
```

Environments (`dev`, `staging`, `prod`) are selected at product creation time. The same product name can exist in multiple environments, each provisioned with its own catalog, IAM, and compute resources.

The vending machine provisions the **container and governance**, not the data itself:

| Resource | What DPVM creates | Naming pattern |
|---|---|---|
| Catalog | Domain-level catalog | `{domain}_prod` |
| Schema | Data product container | `{product_name}` |
| Service Principal | Schema owner | `spn-{product_name}` |
| Groups | Read / write access | `{product_name}_read`, `{product_name}_write` |
| Grants | UC permissions on schema | Tied to groups above |
| Compute Policy | Cluster guardrails | Per-product or `default` |
| SQL Warehouse | Optional serverless endpoint | Per-product if requested |
| Foreign Catalog | Cross-platform federation | Snowflake / AWS Glue via UC |

Domain teams then populate their schemas with tables, views, and volumes. Lakebase Autoscaling Postgres is used **only** as the DPVM application's transactional state store (product metadata, access requests, audit log) — it does not hold any data product content.

## Quick Start

### Backend (local dev)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in credentials
uvicorn backend.main:app --reload --port 8000
```

### Frontend (local dev)

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to `localhost:8000`.

### Deploy to Databricks Apps

```bash
cd frontend && npm run build && cd ..
databricks apps deploy dpvm --source-code-path .
```

## Project Structure

```
backend/          Python FastAPI application
  models/         Pydantic request/response models
  routers/        API route handlers (products, access, catalog, webhooks)
  services/       Business logic (git, terraform, UC, config generation)
  db/             Lakebase connection and migrations
  middleware.py   Auth + RBAC middleware
frontend/         React/TypeScript SPA
terraform/        Terraform modules for UC provisioning
  modules/        Reusable sub-modules (uc-schema, uc-iam, compute, storage, federation)
configs/          Git-backed YAML data product definitions
scripts/          Utility scripts (yaml_to_tf.py)
.github/          GitHub Actions CI/CD workflows
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABRICKS_HOST` | Databricks workspace URL |
| `DATABRICKS_TOKEN` | Databricks PAT or OAuth token |
| `DATABRICKS_WAREHOUSE_ID` | SQL warehouse ID (injected by Databricks Apps) |
| `GITHUB_TOKEN` | GitHub PAT for PR automation |
| `GITHUB_REPO` | GitHub repo (e.g. `org/repo`) |
| `LAKEBASE_DSN` | Postgres connection string for Lakebase |

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/products` | POST | Create a data product (generates YAML, opens PR) |
| `/api/products` | GET | List all products (filterable) |
| `/api/products/{id}` | GET | Get product details |
| `/api/products/{id}` | PATCH | Update product metadata |
| `/api/products/{id}/deprecate` | POST | Soft-delete / deprecate |
| `/api/access` | POST | Request access to a product |
| `/api/access` | GET | List access requests |
| `/api/access/{id}/approve` | POST | Approve or deny access |
| `/api/catalog/catalogs` | GET | List UC catalogs |
| `/api/catalog/schemas` | GET | List UC schemas |
| `/api/webhooks/github` | POST | Terraform completion callback |
| `/api/health` | GET | Health check |
