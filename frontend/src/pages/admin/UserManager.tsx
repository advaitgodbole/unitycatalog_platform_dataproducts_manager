import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Loader2,
  Users,
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/api/client";
import type { AdminUser, UserRole } from "@/types";

const ROLE_STYLES: Record<
  UserRole,
  { label: string; icon: typeof Shield; color: string; bg: string }
> = {
  producer: {
    label: "Data Engineer",
    icon: Shield,
    color: "text-blue-700",
    bg: "bg-blue-50",
  },
  steward: {
    label: "Data Steward",
    icon: ShieldCheck,
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
  admin: {
    label: "Platform Admin",
    icon: ShieldAlert,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
  },
};

export default function UserManager() {
  const [showForm, setShowForm] = useState(false);
  const [filterRole, setFilterRole] = useState("");
  const queryClient = useQueryClient();

  const params: Record<string, string> = {};
  if (filterRole) params.role = filterRole;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => api.admin.users.list(params),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.users.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Assign roles and manage platform access
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="flex gap-3">
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">All Roles</option>
          <option value="producer">Data Engineer</option>
          <option value="steward">Data Steward</option>
          <option value="admin">Platform Admin</option>
        </select>
      </div>

      {showForm && (
        <UserForm onClose={() => setShowForm(false)} />
      )}

      {isLoading && (
        <div className="text-center py-12 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      )}

      {data && data.items.length === 0 && !showForm && (
        <div className="text-center py-16 text-gray-500">
          <Users className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p>No users configured yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 text-brand-600 font-medium hover:underline text-sm"
          >
            Add your first user
          </button>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Email
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Role
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Granted By
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Since
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onDelete={(id) => {
                    if (confirm("Remove this user's role assignment?")) {
                      deleteMutation.mutate(id);
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  onDelete,
}: {
  user: AdminUser;
  onDelete: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>(user.role);

  const updateMutation = useMutation({
    mutationFn: () => api.admin.users.update(user.id, { role: newRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setEditing(false);
    },
  });

  const roleStyle = ROLE_STYLES[user.role];
  const RoleIcon = roleStyle.icon;

  return (
    <tr>
      <td className="px-4 py-3 font-medium text-gray-900">{user.email}</td>
      <td className="px-4 py-3">
        {editing ? (
          <div className="inline-flex items-center gap-2">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="producer">Data Engineer</option>
              <option value="steward">Data Steward</option>
              <option value="admin">Platform Admin</option>
            </select>
            <button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="text-xs text-brand-600 font-medium hover:underline"
            >
              {updateMutation.isPending ? "..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-gray-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleStyle.bg} ${roleStyle.color} hover:opacity-80`}
            title="Click to change role"
          >
            <RoleIcon className="w-3 h-3" />
            {roleStyle.label}
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs">{user.granted_by}</td>
      <td className="px-4 py-3 text-gray-500 text-xs">
        {new Date(user.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onDelete(user.id)}
          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
          title="Remove user"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

function UserForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("producer");
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: () => api.admin.users.create({ email, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    createMutation.mutate();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Add User</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="producer">Data Engineer</option>
              <option value="steward">Data Steward</option>
              <option value="admin">Platform Admin</option>
            </select>
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
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {createMutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            Add User
          </button>
        </div>
      </form>
    </div>
  );
}
