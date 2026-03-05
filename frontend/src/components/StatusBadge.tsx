import type { ProductStatus } from "@/types";

const STATUS_CONFIG: Record<
  ProductStatus,
  { label: string; className: string }
> = {
  pending_approval: {
    label: "Pending Approval",
    className: "bg-yellow-100 text-yellow-800",
  },
  provisioning: {
    label: "Provisioning",
    className: "bg-blue-100 text-blue-800",
  },
  active: {
    label: "Active",
    className: "bg-green-100 text-green-800",
  },
  update_in_progress: {
    label: "Updating",
    className: "bg-indigo-100 text-indigo-800",
  },
  deprecated: {
    label: "Deprecated",
    className: "bg-gray-200 text-gray-600",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-800",
  },
};

export default function StatusBadge({ status }: { status: ProductStatus }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
