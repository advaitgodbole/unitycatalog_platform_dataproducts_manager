import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search, Filter } from "lucide-react";
import { api } from "@/api/client";
import ProductCard from "@/components/ProductCard";
import type { Domain, Environment, ProductStatus, TargetPlatform } from "@/types";

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState<Domain | "">("");
  const [environment, setEnvironment] = useState<Environment | "">("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [platform, setPlatform] = useState<TargetPlatform | "">("");

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (domain) params.domain = domain;
  if (environment) params.environment = environment;
  if (status) params.status = status;
  if (platform) params.platform = platform;

  const { data, isLoading, error } = useQuery({
    queryKey: ["products", params],
    queryFn: () => api.products.list(params),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data ? `${data.total} product${data.total !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </div>
        <Link
          to="/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Product
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value as Domain | "")}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Domains</option>
              <option value="clinical">Clinical</option>
              <option value="rnd">R&D</option>
              <option value="commercial">Commercial</option>
            </select>

            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as Environment | "")}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Envs</option>
              <option value="dev">Dev</option>
              <option value="staging">Staging</option>
              <option value="prod">Prod</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatus | "")}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="provisioning">Provisioning</option>
              <option value="active">Active</option>
              <option value="deprecated">Deprecated</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as TargetPlatform | "")}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Platforms</option>
              <option value="databricks">Databricks</option>
              <option value="snowflake">Snowflake</option>
              <option value="glue">AWS Glue</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-500">Loading products...</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Failed to load products: {(error as Error).message}
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">No data products found.</p>
          <Link
            to="/create"
            className="text-brand-600 font-medium hover:underline"
          >
            Create your first data product
          </Link>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
