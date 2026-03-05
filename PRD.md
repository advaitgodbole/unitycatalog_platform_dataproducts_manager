# Product Requirements Document (PRD): Data Product Vending Machine

**Document Status:** Draft
**Product Name:** Pharma Data Product Vending Machine (DPVM)
**Target Architecture:** Databricks, Unity Catalog, Terraform, GitOps CI/CD, Developer Portal (Custom Web App hosted as Databricks App)

## 1. Executive Summary & Vision

The DPVM is an internal self-service developer portal. It provides a UI-driven, configuration-backed interface allowing Data Domains (Clinical, R&D, Commercial) to independently create, manage, and share Data Products. The system translates UI inputs into Git-backed declarative configurations (YAML/JSON), which trigger Terraform pipelines to provision Databricks and Unity Catalog (UC) resources automatically, securely, and in compliance with pharma regulations (GxP, HIPAA).

## 2. User Personas

* **Domain Data Engineer (Producer):** Needs to spin up a secure environment (compute, storage, schema) to build a new data product without waiting weeks for IT tickets.
* **Domain Data Steward (Governance):** Needs to approve the creation of products, assign metadata/tags (PHI, PII, GxP), and manage access grants.
* **Platform Admin:** Needs to ensure that all generated infrastructure adheres to centralized networking, security, and cost-control standards via standardized Terraform modules.
* **Data Consumer (Analyst/Scientist):** Needs a catalog to discover existing data products and request "read" access.

## 3. Core Functional Requirements (The CRUD Lifecycle)

### 3.1. Create (Provisioning a New Data Product)

The UI must provide a wizard to capture the data product definition.

* **Inputs Required:** Data Product Name, Owning Domain, Data Steward (Approver), Data Classification Level (Public, Internal, Confidential, Restricted/PHI), and Cost Center.
* **Automation Triggers:**
  * Generate a standard YAML/JSON config file.
  * Commit the file to a central infrastructure Git repository via an automated Pull Request (PR).
  * Upon PR merge (after automated checks and Steward approval), execute the Terraform module.
* **Terraform Outputs (What gets built):**
  * **Unity Catalog Schema:** Created under the specific Domain's Catalog (e.g., `clinical_prod.<data_product_name>`).
  * **Cloud Storage:** Dedicated ADLS Gen2 / S3 prefix for the schema's managed/external tables.
  * **Identity & Access Management (IAM):** Provision a dedicated Databricks Service Principal (SPN) as the schema owner. Create two UC groups: `<product>_read` and `<product>_write`.
  * **Compute:** Attach specific cluster policies to the workspace limiting cost/size for this product team.

### 3.2. Read (Discovery and Configuration Viewing)

Users need to see what exists without digging through Terraform state files.

* **Product Catalog:** The UI must display a dashboard of all active data products, fetching metadata either from the Git configuration files or directly from Unity Catalog `information_schema` / `system.catalog`.
* **State Visualization:** Show the current status of the product (e.g., "Provisioning", "Active", "Deprecated").
* **Lineage & Metrics:** Provide deep links directly into the Databricks UI for the specific Unity Catalog schema to view column-level lineage and data quality metrics.

### 3.3. Update (Managing Access and Evolution)

A data product is a living entity. Updates must be managed through the same UI-to-GitOps flow to prevent configuration drift.

* **Access Management:** A Consumer requests access via the UI. If approved by the Steward, the UI updates the config file to add the user/group to the `<product>_read` list. Terraform runs and executes `GRANT SELECT ON SCHEMA <schema> TO <group>`.
* **Infrastructure Scaling:** Producers can request an increase in compute quotas or attach a Databricks SQL Serverless warehouse to the product.
* **Tagging Updates:** Stewards can update compliance tags (e.g., marking a new column as PHI).

### 3.4. Delete (Deprecation and Archiving)

Pharma data is rarely deleted outright due to audit requirements, but infrastructure must be decommissioned.

* **Soft Delete:** The UI provides a "Deprecate" button.
* **Automation Triggers:**
  * Terraform revokes all user access (drops read/write groups), leaving only the Service Principal and Platform Admin with access.
  * Compute resources (jobs, DLT pipelines, clusters) associated with the Service Principal are paused or destroyed.
  * The UC Schema is tagged as `Deprecated`.
  * Physical data remains in the cloud storage bucket for legal hold/archival purposes.

## 4. Non-Functional Requirements & Governance

* **No ClickOps:** No user, not even Platform Admins, should manually create schemas or alter grants in the Databricks UI. The UI/GitOps pipeline is the single source of truth.
* **Idempotency:** The Terraform pipelines must be strictly idempotent. Rerunning the pipeline should only apply the delta between the Git config and the UC state.
* **State Management:** Terraform state files must be stored securely in a central, locked remote backend (e.g., AWS S3 + DynamoDB) accessible only by the CI/CD runner.
* **Auditability:** Every infrastructure change, access grant, and configuration update must be logged in Git commit history, mapped back to the user who initiated the change in the UI.

## 5. Architectural Components

1. **Frontend (The Portal):** A React/TypeScript custom web application hosted as a Databricks App. It hosts the forms, visualizes the YAML configs, and interacts with the backend API.
2. **Backend (The API Layer):** Python FastAPI service handling business logic, interacting with the Databricks SDK, GitHub API, and Lakebase Autoscaling Postgres for state management. Also hosted as part of the Databricks App.
3. **Git Provider (The Source of Truth):** GitHub. Stores the YAML configs and the Terraform modules.
4. **CI/CD Pipeline (The Engine):** GitHub Actions. Triggered by PR merges. Contains the secure credentials to run Terraform.
5. **Terraform (The Orchestrator):** Uses the `databricks` provider to interact with the Databricks Account and Workspace APIs. Manages Unity Catalog resources, IAM, compute policies, and cross-platform federation (Snowflake, AWS Glue).
6. **Databricks & Unity Catalog (The Target):** The physical infrastructure where data is stored, governed, and computed. Interoperable with Snowflake and AWS Glue via Unity Catalog foreign catalogs.

## 6. Tech Stack

| Layer | Technology |
|---|---|
| Infrastructure as Code | Terraform (databricks, aws, snowflake providers) |
| Backend | Python, FastAPI, Databricks SDK, PyGithub |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Application State | Lakebase Autoscaling Postgres |
| Hosting | Databricks Apps |
| Data Platform | Databricks Unity Catalog |
| Cross-Platform | Snowflake (via UC foreign catalogs), AWS Glue (via UC foreign catalogs) |
| CI/CD | GitHub Actions |
| Source of Truth | Git (YAML data product definitions) |
| Terraform State | AWS S3 + DynamoDB (remote backend with locking) |
