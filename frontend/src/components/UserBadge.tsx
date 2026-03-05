import { useQuery } from "@tanstack/react-query";
import { User, Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { api } from "@/api/client";
import type { UserRole } from "@/types";

const ROLE_CONFIG: Record<
  UserRole,
  { icon: typeof Shield; color: string; bg: string }
> = {
  producer: { icon: User, color: "text-blue-300", bg: "bg-blue-500/20" },
  steward: { icon: ShieldCheck, color: "text-amber-300", bg: "bg-amber-500/20" },
  admin: { icon: ShieldAlert, color: "text-emerald-300", bg: "bg-emerald-500/20" },
};

export default function UserBadge() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.me(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading || !user) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
          <div className="h-2.5 w-16 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const config = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.producer;
  const RoleIcon = config.icon;
  const localPart = user.email.split("@")[0] ?? "";
  const initials = localPart
    .split(".")
    .map((s) => (s.length > 0 ? s[0]!.toUpperCase() : ""))
    .join("")
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold text-white shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {(user.email.split("@")[0] ?? "").replace(".", " ")}
        </p>
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${config.bg} ${config.color}`}
        >
          <RoleIcon className="w-3 h-3" />
          {user.role_display}
        </span>
      </div>
    </div>
  );
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.me(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
