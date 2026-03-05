import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  GitPullRequest,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import { api } from "@/api/client";
import StatusBadge from "@/components/StatusBadge";
import ClassificationTag from "@/components/ClassificationTag";
import ContractViewer from "@/components/ContractViewer";
import ContractEditor from "@/components/ContractEditor";
import { useState } from "react";
import type { AccessLevel, DataContractCreate } from "@/types";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("read");
  const [justification, setJustification] = useState("");
  const [showContractEditor, setShowContractEditor] = useState(false);
  const [editingContract, setEditingContract] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.products.get(id!),
    enabled: !!id,
  });

  const { data: contract, isLoading: contractLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: () => api.contracts.latest(id!).catch(() => null),
    enabled: !!id,
  });

  const deprecateMutation = useMutation({
    mutationFn: () => api.products.deprecate(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product", id] }),
  });

  const accessMutation = useMutation({
    mutationFn: () =>
      api.access.create({
        product_id: id!,
        access_level: accessLevel,
        justification,
      }),
    onSuccess: () => {
      setShowAccessForm(false);
      setJustification("");
    },
  });

  const createContractMutation = useMutation({
    mutationFn: (data: DataContractCreate) => api.contracts.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", id] });
      setShowContractEditor(false);
      setEditingContract(false);
    },
  });

  const updateContractMutation = useMutation({
    mutationFn: (data: DataContractCreate) =>
      api.contracts.update(id!, contract!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", id] });
      setEditingContract(false);
    },
  });

  const activateContractMutation = useMutation({
    mutationFn: () => api.contracts.activate(id!, contract!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contract", id] }),
  });

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12 text-gray-500">Product not found.</div>
    );
  }

  const databricksSchemaUrl = product.catalog_name && product.schema_name
    ? `#data/${product.catalog_name}/${product.schema_name}`
    : null;

  return (
    <div>
      <button
        onClick={() => navigate("/")}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {product.display_name}
            </h1>
            <p className="text-sm text-gray-500 font-mono mt-1">
              {product.catalog_name}.{product.schema_name}
            </p>
          </div>
          <StatusBadge status={product.status} />
        </div>

        {product.description && (
          <p className="text-gray-600 mt-4">{product.description}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            ["Domain", product.owning_domain],
            ["Steward", product.data_steward_email],
            ["Cost Center", product.cost_center],
            ["Platform", product.target_platform],
            ["Created By", product.created_by],
            ["Created", new Date(product.created_at).toLocaleDateString()],
            ["Updated", new Date(product.updated_at).toLocaleDateString()],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-xs text-gray-500">{label}</dt>
              <dd className="text-sm font-medium text-gray-900 capitalize">
                {value as string}
              </dd>
            </div>
          ))}
          <div>
            <dt className="text-xs text-gray-500">Classification</dt>
            <dd className="mt-0.5">
              <ClassificationTag classification={product.classification} />
            </dd>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
          {product.git_pr_url && (
            <a
              href={product.git_pr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
            >
              <GitPullRequest className="w-4 h-4" /> View PR
            </a>
          )}
          {databricksSchemaUrl && (
            <a
              href={databricksSchemaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
            >
              <ExternalLink className="w-4 h-4" /> View in Databricks
            </a>
          )}
        </div>
      </div>

      {/* Data Contract Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        {contractLoading ? (
          <div className="text-center py-6 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          </div>
        ) : showContractEditor || editingContract ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingContract ? "Edit Contract" : "Create Data Contract"}
              </h2>
              <button
                onClick={() => { setShowContractEditor(false); setEditingContract(false); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
            <ContractEditor
              initial={editingContract && contract ? {
                version: contract.version,
                description_purpose: contract.description_purpose,
                description_usage: contract.description_usage,
                description_limitations: contract.description_limitations,
                description_custom_properties: contract.description_custom_properties,
                description_authoritative_definitions: contract.description_authoritative_definitions,
                schema_definition: contract.schema_definition,
                servers: contract.servers,
                sla_properties: contract.sla_properties,
                quality_rules: contract.quality_rules,
                price: contract.price ?? undefined,
                custom_properties: contract.custom_properties,
              } : undefined}
              onSave={(data) => {
                if (editingContract && contract) {
                  updateContractMutation.mutate(data);
                } else {
                  createContractMutation.mutate(data);
                }
              }}
              saving={createContractMutation.isPending || updateContractMutation.isPending}
            />
          </div>
        ) : contract ? (
          <ContractViewer
            contract={contract}
            product={product}
            onEdit={contract.status === "draft" ? () => setEditingContract(true) : undefined}
            onNewVersion={() => setShowContractEditor(true)}
            onActivate={contract.status === "draft" ? () => activateContractMutation.mutate() : undefined}
            activating={activateContractMutation.isPending}
            onExport={() => {
              api.contracts.exportYaml(id!, contract.id).then((yaml) => {
                const blob = new Blob([yaml], { type: "application/x-yaml" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${product.name}_contract_v${contract.version}.yaml`;
                a.click();
                URL.revokeObjectURL(url);
              });
            }}
          />
        ) : (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              No Data Contract
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Define an ODCS v3.1.0 data contract to document schema, quality, SLAs, and terms of use.
            </p>
            <button
              onClick={() => setShowContractEditor(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            >
              <Plus className="w-4 h-4" /> Create Contract
            </button>
          </div>
        )}
      </div>

      {/* Access Management */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Access</h2>
          <button
            onClick={() => setShowAccessForm(!showAccessForm)}
            className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            <UserPlus className="w-4 h-4" /> Request Access
          </button>
        </div>

        {showAccessForm && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Level
              </label>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              >
                <option value="read">Read</option>
                <option value="write">Write</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Justification
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                rows={2}
                placeholder="Why do you need access?"
              />
            </div>
            <button
              onClick={() => accessMutation.mutate()}
              disabled={accessMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {accessMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Submit Request
            </button>
            {accessMutation.isSuccess && (
              <p className="text-sm text-green-600">
                Access request submitted. A steward will review it.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Deprecate */}
      {product.status !== "deprecated" && (
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            Danger Zone
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Deprecating will revoke all access and mark the schema. Physical
            data is preserved for audit.
          </p>
          <button
            onClick={() => {
              if (window.confirm("Deprecate this data product? This will revoke all user access.")) {
                deprecateMutation.mutate();
              }
            }}
            disabled={deprecateMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {deprecateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Deprecate Product
          </button>
        </div>
      )}
    </div>
  );
}
