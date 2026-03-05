import { useQuery } from "@tanstack/react-query";
import {
  Database,
  Key,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";

export default function AdminDashboard() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => api.admin.overview(),
  });

  const { data: settings } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => api.admin.settings(),
  });

  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-28"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Data Products",
      value: overview.total_products,
      sub: `${overview.active_products} active`,
      icon: Database,
      color: "text-blue-600",
      bg: "bg-blue-50",
      to: "/",
    },
    {
      label: "Credentials",
      value: overview.total_credentials,
      sub: `${overview.active_credentials} active`,
      icon: Key,
      color: "text-purple-600",
      bg: "bg-purple-50",
      to: "/admin/credentials",
    },
    {
      label: "Users",
      value: overview.total_users,
      sub: "managed roles",
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      to: "/admin/users",
    },
    {
      label: "Access Requests",
      value: overview.total_access_requests,
      sub: `${overview.pending_access_requests} pending`,
      icon: FileText,
      color: "text-amber-600",
      bg: "bg-amber-50",
      to: "/access-requests",
    },
  ];

  const statusCards = [
    {
      label: "Active",
      value: overview.active_products,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      label: "Pending",
      value: overview.pending_products,
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      label: "Failed",
      value: overview.failed_products,
      icon: XCircle,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {card.value}
                </p>
                <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}
              >
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Product Health
          </h2>
          <div className="space-y-3">
            {statusCards.map((sc) => (
              <div key={sc.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <sc.icon className={`w-4 h-4 ${sc.color}`} />
                  <span className="text-sm text-gray-700">{sc.label}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {sc.value}
                </span>
              </div>
            ))}
          </div>
          {overview.failed_products > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-700">
                {overview.failed_products} product(s) in failed state need attention.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Credentials by Platform
          </h2>
          {Object.keys(overview.credentials_by_platform).length === 0 ? (
            <p className="text-sm text-gray-500">
              No credentials configured yet.{" "}
              <Link
                to="/admin/credentials"
                className="text-brand-600 hover:underline"
              >
                Add one
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(overview.credentials_by_platform).map(
                ([platform, count]) => (
                  <div
                    key={platform}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-700 capitalize">
                      {platform}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {count}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {settings && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            System Configuration
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Environment</p>
              <p className="font-medium text-gray-900">{settings.app_env}</p>
            </div>
            <div>
              <p className="text-gray-500">Databricks App</p>
              <p className="font-medium text-gray-900">
                {settings.is_databricks_app ? "Yes" : "No (local)"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Lakebase</p>
              <p className="font-medium text-gray-900">
                {settings.has_lakebase ? "Connected" : "Not configured"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Databricks Host</p>
              <p className="font-medium text-gray-900 truncate">
                {settings.databricks_host}
              </p>
            </div>
            <div>
              <p className="text-gray-500">GitHub Repo</p>
              <p className="font-medium text-gray-900">{settings.github_repo}</p>
            </div>
            <div>
              <p className="text-gray-500">Git Branch</p>
              <p className="font-medium text-gray-900">
                {settings.github_base_branch}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
