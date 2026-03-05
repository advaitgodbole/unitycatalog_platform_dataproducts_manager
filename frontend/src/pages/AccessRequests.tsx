import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, X } from "lucide-react";
import { api } from "@/api/client";
import { useState } from "react";
import type { AccessRequest } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
};

export default function AccessRequests() {
  const [filter, setFilter] = useState<string>("");
  const queryClient = useQueryClient();

  const params: Record<string, string> = {};
  if (filter) params.status = filter;

  const { data, isLoading } = useQuery({
    queryKey: ["access-requests", params],
    queryFn: () => api.access.list(params),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Access Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and manage access to data products
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
        </select>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          No access requests found.
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Product
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Requester
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Level
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Date
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((req) => (
                <AccessRequestRow
                  key={req.id}
                  request={req}
                  queryClient={queryClient}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AccessRequestRow({
  request: req,
  queryClient,
}: {
  request: AccessRequest;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const approveMutation = useMutation({
    mutationFn: (approved: boolean) =>
      api.access.decide(req.id, { approved, reason: "" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["access-requests"] }),
  });

  return (
    <tr>
      <td className="px-4 py-3 font-medium">{req.product_name ?? req.product_id}</td>
      <td className="px-4 py-3 text-gray-600">{req.requester_email}</td>
      <td className="px-4 py-3 capitalize">{req.access_level}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[req.status] ?? "bg-gray-100 text-gray-700"}`}
        >
          {req.status}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-500">
        {new Date(req.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        {req.status === "pending" && (
          <div className="inline-flex items-center gap-1">
            <button
              onClick={() => approveMutation.mutate(true)}
              disabled={approveMutation.isPending}
              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"
              title="Approve"
            >
              {approveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => approveMutation.mutate(false)}
              disabled={approveMutation.isPending}
              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
              title="Deny"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {req.status !== "pending" && req.approved_by && (
          <span className="text-xs text-gray-500">by {req.approved_by}</span>
        )}
      </td>
    </tr>
  );
}
