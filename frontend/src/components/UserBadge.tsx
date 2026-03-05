import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  User,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ChevronUp,
  Settings,
} from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

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

  const isAdmin = user.role === "admin";

  return (
    <div ref={menuRef} className="relative">
      {open && isAdmin && (
        <div className="absolute bottom-full left-0 right-0 mb-1 mx-2 bg-brand-900 border border-white/15 rounded-lg shadow-xl overflow-hidden z-50">
          <button
            onClick={() => {
              navigate("/admin");
              setOpen(false);
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Admin Console
          </button>
        </div>
      )}

      <button
        onClick={() => isAdmin && setOpen((prev) => !prev)}
        className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors ${
          isAdmin ? "hover:bg-white/5 cursor-pointer" : "cursor-default"
        }`}
      >
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
        {isAdmin && (
          <ChevronUp
            className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${
              open ? "" : "rotate-180"
            }`}
          />
        )}
      </button>
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
