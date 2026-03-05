import { Link } from "react-router-dom";
import { Database, Cloud, Snowflake } from "lucide-react";
import type { DataProduct } from "@/types";
import StatusBadge from "./StatusBadge";
import ClassificationTag from "./ClassificationTag";

const PLATFORM_ICON: Record<string, typeof Database> = {
  databricks: Database,
  snowflake: Snowflake,
  glue: Cloud,
};

export default function ProductCard({ product }: { product: DataProduct }) {
  const PlatformIcon = PLATFORM_ICON[product.target_platform] ?? Database;

  return (
    <Link
      to={`/products/${product.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-brand-500/30 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
            <PlatformIcon className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {product.display_name}
            </h3>
            <p className="text-xs text-gray-500 font-mono">{product.name}</p>
          </div>
        </div>
        <StatusBadge status={product.status} />
      </div>

      <p className="mt-3 text-sm text-gray-600 line-clamp-2">
        {product.description || "No description provided."}
      </p>

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <ClassificationTag classification={product.classification} />
        <span className="text-xs text-gray-500 capitalize">
          {product.owning_domain}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(product.created_at).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}
