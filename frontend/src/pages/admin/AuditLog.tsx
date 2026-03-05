import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileText, Search } from "lucide-react";
import { api } from "@/api/client";

const ACTION_STYLES: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  deprecate: "bg-gray-100 text-gray-800",
  credential_create: "bg-purple-100 text-purple-800",
  credential_update: "bg-purple-100 text-purple-800",
  credential_delete: "bg-red-100 text-red-800",
  credential_test: "bg-cyan-100 text-cyan-800",
  user_create: "bg-emerald-100 text-emerald-800",
  user_role_update: "bg-amber-100 text-amber-800",
  user_delete: "bg-red-100 text-red-800",
  approve: "bg-green-100 text-green-800",
  deny: "bg-red-100 text-red-800",
};

export default function AuditLog() {
  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const params: Record<string, string> = {};
  if (actorFilter) params.actor = actorFilter;
  if (actionFilter) params.action = actionFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-log", params],
    queryFn: () => api.admin.auditLog(params),
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Track all platform actions and changes
      </p>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by actor email..."
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">All Actions</option>
          <option value="create">Product Create</option>
          <option value="update">Product Update</option>
          <option value="deprecate">Product Deprecate</option>
          <option value="credential_create">Credential Create</option>
          <option value="credential_update">Credential Update</option>
          <option value="credential_delete">Credential Delete</option>
          <option value="credential_test">Credential Test</option>
          <option value="user_create">User Create</option>
          <option value="user_role_update">User Role Update</option>
          <option value="user_delete">User Delete</option>
          <option value="approve">Access Approve</option>
          <option value="deny">Access Deny</option>
        </select>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <FileText className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p>No audit log entries found.</p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Timestamp
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Actor
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          ACTION_STYLES[entry.action] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {entry.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {entry.actor_email}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-md truncate">
                      {JSON.stringify(entry.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-500">
            Showing {data.items.length} of {data.total} entries
          </div>
        </div>
      )}
    </div>
  );
}
