import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  SkipForward,
} from "lucide-react";
import { api } from "@/api/client";
import ContractEditor from "@/components/ContractEditor";
import type { DataContractCreate, DataProduct, DataProductCreate } from "@/types";

const schema = z
  .object({
    name: z
      .string()
      .min(3)
      .max(63)
      .regex(
        /^[a-z][a-z0-9_]{2,62}$/,
        "Lowercase letters, numbers, and underscores only. Must start with a letter."
      ),
    display_name: z.string().min(3).max(128),
    owning_domain: z.enum(["clinical", "rnd", "commercial"]),
    environment: z.enum(["dev", "staging", "prod"]),
    data_steward_email: z.string().email(),
    classification: z.enum([
      "public",
      "internal",
      "confidential",
      "restricted_phi",
    ]),
    cost_center: z.string().min(1).max(32),
    description: z.string().max(1024).optional().default(""),
    target_platform: z.enum(["databricks", "snowflake", "glue"]),
    snowflake_account_url: z.string().url().optional().or(z.literal("")),
    glue_catalog_arn: z.string().optional().or(z.literal("")),
    sql_warehouse: z.boolean(),
    cluster_policy: z.string().default("default"),
  })
  .refine(
    (d) =>
      d.target_platform !== "snowflake" ||
      (d.snowflake_account_url && d.snowflake_account_url.length > 0),
    { message: "Snowflake account URL is required", path: ["snowflake_account_url"] }
  )
  .refine(
    (d) =>
      d.target_platform !== "glue" ||
      (d.glue_catalog_arn && d.glue_catalog_arn.length > 0),
    { message: "Glue Catalog ARN is required", path: ["glue_catalog_arn"] }
  );

type FormData = z.infer<typeof schema>;

const STEPS = [
  "Basic Info",
  "Classification",
  "Compute",
  "Platform",
  "Data Contract",
  "Review",
];

export default function CreateWizard() {
  const [step, setStep] = useState(0);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [createdProduct, setCreatedProduct] = useState<DataProduct | null>(null);
  const [contractData, setContractData] = useState<DataContractCreate | null>(null);
  const [skipContract, setSkipContract] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      environment: "dev",
      target_platform: "databricks",
      sql_warehouse: false,
      cluster_policy: "default",
      description: "",
      snowflake_account_url: "",
      glue_catalog_arn: "",
    },
  });

  const values = watch();

  const productMutation = useMutation({
    mutationFn: (data: DataProductCreate) => api.products.create(data),
    onSuccess: async (product) => {
      setCreatedProduct(product);
      setPrUrl(product.git_pr_url);
      if (contractData) {
        try {
          await api.contracts.create(product.id, contractData);
        } catch {
          // Contract creation is non-blocking
        }
      }
    },
  });

  const fieldsByStep: (keyof FormData)[][] = [
    ["name", "display_name", "owning_domain", "environment", "data_steward_email"],
    ["classification", "cost_center", "description"],
    ["sql_warehouse", "cluster_policy"],
    ["target_platform", "snowflake_account_url", "glue_catalog_arn"],
    [], // Data Contract step (no form fields to validate)
    [], // Review step
  ];

  async function nextStep() {
    if (step < 4) {
      const valid = await trigger(fieldsByStep[step]);
      if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } else {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function onSubmit(data: FormData) {
    productMutation.mutate(data as DataProductCreate);
  }

  if (prUrl || (createdProduct && !createdProduct.git_pr_url)) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Data Product Created!
        </h2>
        <p className="text-gray-600 mb-2">
          {prUrl
            ? "A Pull Request has been opened. Once approved and merged, Terraform will provision the infrastructure."
            : "The data product has been created successfully."}
        </p>
        {contractData && (
          <p className="text-sm text-green-600 mb-4">
            A draft data contract (v{contractData.version}) has been attached.
          </p>
        )}
        {prUrl && (
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-brand-600 hover:underline font-medium"
          >
            View Pull Request <ExternalLink className="w-4 h-4" />
          </a>
        )}
        <div className="mt-6 flex items-center justify-center gap-4">
          {createdProduct && (
            <button
              onClick={() => navigate(`/products/${createdProduct.id}`)}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              View Product Details
            </button>
          )}
          <button
            onClick={() => navigate("/")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const errorClass = "text-xs text-red-600 mt-1";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Create Data Product
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Define a new data product. A PR will be created for steward approval.
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                i === step
                  ? "bg-brand-600 text-white"
                  : i < step
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-xs hidden sm:inline ${
                i === step ? "text-gray-900 font-medium" : "text-gray-400"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px bg-gray-300" />
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Product Name</label>
              <input {...register("name")} className={inputClass} placeholder="adverse_events" />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Display Name</label>
              <input {...register("display_name")} className={inputClass} placeholder="Adverse Events" />
              {errors.display_name && <p className={errorClass}>{errors.display_name.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Owning Domain</label>
              <select {...register("owning_domain")} className={inputClass}>
                <option value="clinical">Clinical</option>
                <option value="rnd">R&D</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Environment</label>
              <select {...register("environment")} className={inputClass}>
                <option value="dev">Development</option>
                <option value="staging">Staging</option>
                <option value="prod">Production</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Catalog will be named <span className="font-mono font-medium text-gray-700">{values.owning_domain}_{values.environment}</span>
              </p>
            </div>
            <div>
              <label className={labelClass}>Data Steward Email</label>
              <input {...register("data_steward_email")} className={inputClass} type="email" placeholder="steward@company.com" />
              {errors.data_steward_email && <p className={errorClass}>{errors.data_steward_email.message}</p>}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Data Classification</label>
              <select {...register("classification")} className={inputClass}>
                <option value="public">Public</option>
                <option value="internal">Internal</option>
                <option value="confidential">Confidential</option>
                <option value="restricted_phi">Restricted / PHI</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Cost Center</label>
              <input {...register("cost_center")} className={inputClass} placeholder="CC-1234" />
              {errors.cost_center && <p className={errorClass}>{errors.cost_center.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea {...register("description")} className={inputClass} rows={3} placeholder="Describe the data product..." />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Cluster Policy</label>
              <select {...register("cluster_policy")} className={inputClass}>
                <option value="default">Default (max 10 workers, 2hr auto-stop)</option>
                <option value="small">Small (max 4 workers)</option>
                <option value="large">Large (max 20 workers)</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input {...register("sql_warehouse")} type="checkbox" className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              <label className="text-sm text-gray-700">
                Provision a SQL Serverless Warehouse
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Target Platform</label>
              <select {...register("target_platform")} className={inputClass}>
                <option value="databricks">Databricks (Native UC)</option>
                <option value="snowflake">Snowflake (UC Foreign Catalog)</option>
                <option value="glue">AWS Glue (UC Foreign Catalog)</option>
              </select>
            </div>
            {values.target_platform === "snowflake" && (
              <div>
                <label className={labelClass}>Snowflake Account URL</label>
                <input {...register("snowflake_account_url")} className={inputClass} placeholder="https://abc123.snowflakecomputing.com" />
                {errors.snowflake_account_url && <p className={errorClass}>{errors.snowflake_account_url.message}</p>}
              </div>
            )}
            {values.target_platform === "glue" && (
              <div>
                <label className={labelClass}>AWS Glue Catalog ARN</label>
                <input {...register("glue_catalog_arn")} className={inputClass} placeholder="arn:aws:glue:us-east-1:123456789:catalog" />
                {errors.glue_catalog_arn && <p className={errorClass}>{errors.glue_catalog_arn.message}</p>}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            {skipContract ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-2">
                  Data contract skipped. You can add one later from the product detail page.
                </p>
                <button
                  type="button"
                  onClick={() => setSkipContract(false)}
                  className="text-sm text-brand-600 hover:underline"
                >
                  Go back and define a contract
                </button>
              </div>
            ) : contractData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-green-800">Contract Defined</h3>
                    <p className="text-xs text-gray-500">
                      v{contractData.version} with {contractData.schema_definition.length} table(s)
                      and {contractData.sla_properties.length} SLA(s)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContractData(null)}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Edit Contract
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Define Data Contract (Optional)
                    </h3>
                    <p className="text-xs text-gray-500">
                      Document schema, quality, SLAs, and terms of use per ODCS v3.1.0
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSkipContract(true)}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <SkipForward className="w-3 h-3" /> Skip
                  </button>
                </div>
                <ContractEditor
                  onSave={(data) => setContractData(data)}
                  saving={false}
                />
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 mb-4">Review</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {[
                ["Name", values.name],
                ["Display Name", values.display_name],
                ["Domain", values.owning_domain],
                ["Environment", values.environment],
                ["Catalog", `${values.owning_domain}_${values.environment}`],
                ["Steward", values.data_steward_email],
                ["Classification", values.classification],
                ["Cost Center", values.cost_center],
                ["Platform", values.target_platform],
                ["SQL Warehouse", values.sql_warehouse ? "Yes" : "No"],
                ["Cluster Policy", values.cluster_policy],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900">{value as string}</dd>
                </div>
              ))}
            </dl>
            {values.description && (
              <div className="text-sm mt-2">
                <span className="text-gray-500">Description: </span>
                <span className="text-gray-900">{values.description}</span>
              </div>
            )}
            {contractData && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="text-sm font-semibold text-green-800 mb-1">Data Contract Attached</h4>
                <p className="text-xs text-green-700">
                  v{contractData.version} -- {contractData.schema_definition.length} table(s),
                  {" "}{contractData.sla_properties.length} SLA(s)
                  {contractData.description_purpose && ` -- ${contractData.description_purpose.slice(0, 60)}...`}
                </p>
              </div>
            )}
            {!contractData && !skipContract && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-500">No data contract. You can add one later.</p>
              </div>
            )}
          </div>
        )}

        {productMutation.error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {(productMutation.error as Error).message}
          </div>
        )}

        <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 0}
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={productMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {productMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Data Product
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
