import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Edit2,
  TestTube2,
  Loader2,
  CheckCircle,
  XCircle,
  Key,
  X,
} from "lucide-react";
import { api } from "@/api/client";
import type {
  CredentialPlatform,
  Environment,
  PlatformCredential,
  PlatformCredentialCreate,
} from "@/types";

const PLATFORM_CONFIGS: Record<
  CredentialPlatform,
  { label: string; color: string; bg: string; fields: string[] }
> = {
  databricks: {
    label: "Databricks",
    color: "text-red-700",
    bg: "bg-red-50",
    fields: ["host", "token", "warehouse_id"],
  },
  snowflake: {
    label: "Snowflake",
    color: "text-blue-700",
    bg: "bg-blue-50",
    fields: [
      "account_url",
      "username",
      "password",
      "warehouse",
      "database",
      "role",
    ],
  },
  glue: {
    label: "AWS Glue",
    color: "text-amber-700",
    bg: "bg-amber-50",
    fields: [
      "aws_region",
      "aws_access_key_id",
      "aws_secret_access_key",
      "catalog_id",
    ],
  },
};

export default function CredentialsManager() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterEnv, setFilterEnv] = useState("");
  const queryClient = useQueryClient();

  const params: Record<string, string> = {};
  if (filterPlatform) params.platform = filterPlatform;
  if (filterEnv) params.environment = filterEnv;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "credentials", params],
    queryFn: () => api.admin.credentials.list(params),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.credentials.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "credentials"] }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.admin.credentials.test(id),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Manage connection credentials for Databricks, Snowflake, and AWS Glue
        </p>
        <button
          onClick={() => {
            setEditId(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Credential
        </button>
      </div>

      <div className="flex gap-3">
        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">All Platforms</option>
          <option value="databricks">Databricks</option>
          <option value="snowflake">Snowflake</option>
          <option value="glue">AWS Glue</option>
        </select>
        <select
          value={filterEnv}
          onChange={(e) => setFilterEnv(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">All Environments</option>
          <option value="dev">Dev</option>
          <option value="staging">Staging</option>
          <option value="prod">Prod</option>
        </select>
      </div>

      {showForm && (
        <CredentialForm
          editId={editId}
          onClose={() => {
            setShowForm(false);
            setEditId(null);
          }}
        />
      )}

      {isLoading && (
        <div className="text-center py-12 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      )}

      {data && data.items.length === 0 && !showForm && (
        <div className="text-center py-16 text-gray-500">
          <Key className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p>No platform credentials configured yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 text-brand-600 font-medium hover:underline text-sm"
          >
            Add your first credential
          </button>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Platform
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Environment
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Created
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((cred) => (
                <CredentialRow
                  key={cred.id}
                  cred={cred}
                  onEdit={(id) => {
                    setEditId(id);
                    setShowForm(true);
                  }}
                  onDelete={(id) => {
                    if (confirm("Delete this credential? This cannot be undone.")) {
                      deleteMutation.mutate(id);
                    }
                  }}
                  onTest={(id) => testMutation.mutate(id)}
                  testResult={
                    testMutation.variables === cred.id
                      ? {
                          isPending: testMutation.isPending,
                          data: testMutation.data,
                        }
                      : undefined
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CredentialRow({
  cred,
  onEdit,
  onDelete,
  onTest,
  testResult,
}: {
  cred: PlatformCredential;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  testResult?: { isPending: boolean; data?: { success: boolean; errors: string[] } };
}) {
  const pConfig = PLATFORM_CONFIGS[cred.platform];

  return (
    <tr>
      <td className="px-4 py-3 font-medium text-gray-900">
        {cred.credential_name}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${pConfig.bg} ${pConfig.color}`}
        >
          {pConfig.label}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-600 uppercase text-xs font-medium">
        {cred.environment}
      </td>
      <td className="px-4 py-3">
        {cred.is_active ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
            <CheckCircle className="w-3.5 h-3.5" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
            <XCircle className="w-3.5 h-3.5" />
            Inactive
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs">
        {new Date(cred.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-1">
          <button
            onClick={() => onTest(cred.id)}
            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
            title="Test Connection"
          >
            {testResult?.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <TestTube2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onEdit(cred.id)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(cred.id)}
            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        {testResult?.data && !testResult.isPending && (
          <div className="mt-1">
            {testResult.data.success ? (
              <span className="text-xs text-green-600">Validation passed</span>
            ) : (
              <span className="text-xs text-red-600">
                {testResult.data.errors[0]}
              </span>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

function CredentialForm({
  editId,
  onClose,
}: {
  editId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState<CredentialPlatform>("databricks");
  const [environment, setEnvironment] = useState<Environment>("dev");
  const [name, setName] = useState("");
  const [configFields, setConfigFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["admin", "credentials", editId],
    queryFn: () => api.admin.credentials.get(editId!),
    enabled: !!editId,
  });

  const isEdit = !!editId;

  if (existing && !initialized) {
    setPlatform(existing.platform);
    setEnvironment(existing.environment);
    setName(existing.credential_name);
    setConfigFields(existing.config);
    setInitialized(true);
  }

  const createMutation = useMutation({
    mutationFn: (data: PlatformCredentialCreate) =>
      api.admin.credentials.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "credentials"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<PlatformCredential>) =>
      api.admin.credentials.update(editId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "credentials"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const fields = PLATFORM_CONFIGS[platform].fields;
  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Credential name is required");
      return;
    }

    if (isEdit) {
      updateMutation.mutate({
        credential_name: name,
        config: configFields,
      });
    } else {
      createMutation.mutate({
        platform,
        environment,
        credential_name: name,
        config: configFields,
      });
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEdit ? "Edit Credential" : "New Platform Credential"}
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value as CredentialPlatform);
                setConfigFields({});
              }}
              disabled={isEdit}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
            >
              <option value="databricks">Databricks</option>
              <option value="snowflake">Snowflake</option>
              <option value="glue">AWS Glue</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Environment
            </label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as Environment)}
              disabled={isEdit}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
            >
              <option value="dev">Dev</option>
              <option value="staging">Staging</option>
              <option value="prod">Prod</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credential Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. prod-snowflake-main"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Configuration ({PLATFORM_CONFIGS[platform].label})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map((field) => (
              <div key={field}>
                <label className="block text-xs text-gray-500 mb-1">
                  {field.replace(/_/g, " ")}
                </label>
                <input
                  type={
                    field.includes("password") ||
                    field.includes("secret") ||
                    field.includes("token") ||
                    field.includes("key")
                      ? "password"
                      : "text"
                  }
                  value={configFields[field] ?? ""}
                  onChange={(e) =>
                    setConfigFields((prev) => ({
                      ...prev,
                      [field]: e.target.value,
                    }))
                  }
                  placeholder={field}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

