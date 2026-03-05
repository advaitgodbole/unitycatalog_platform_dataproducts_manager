import type { Classification } from "@/types";
import { Shield, ShieldAlert, ShieldCheck, ShieldOff } from "lucide-react";

const CONFIG: Record<
  Classification,
  { label: string; className: string; icon: typeof Shield }
> = {
  public: {
    label: "Public",
    className: "text-green-700 bg-green-50 border-green-200",
    icon: ShieldOff,
  },
  internal: {
    label: "Internal",
    className: "text-blue-700 bg-blue-50 border-blue-200",
    icon: ShieldCheck,
  },
  confidential: {
    label: "Confidential",
    className: "text-orange-700 bg-orange-50 border-orange-200",
    icon: Shield,
  },
  restricted_phi: {
    label: "Restricted / PHI",
    className: "text-red-700 bg-red-50 border-red-200",
    icon: ShieldAlert,
  },
};

export default function ClassificationTag({
  classification,
}: {
  classification: Classification;
}) {
  const config = CONFIG[classification];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${config.className}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
