import { Routes, Route, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Plus,
  ShieldCheck,
  Database,
} from "lucide-react";
import Dashboard from "./pages/Dashboard";
import CreateWizard from "./pages/CreateWizard";
import ProductDetail from "./pages/ProductDetail";
import AccessRequests from "./pages/AccessRequests";
import UserBadge, { useCurrentUser } from "./components/UserBadge";
import type { UserRole } from "./types";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/create", label: "Create Product", icon: Plus, roles: ["producer", "steward", "admin"] },
  { to: "/access-requests", label: "Access Requests", icon: ShieldCheck, roles: ["steward", "admin"] },
];

export default function App() {
  const location = useLocation();
  const { data: user } = useCurrentUser();

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.roles || !user || item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-brand-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-brand-100" />
            <span className="text-lg font-semibold tracking-tight">DPVM</span>
          </div>
          <p className="text-xs text-brand-100 mt-1">
            Data Product Vending Machine
          </p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map(({ to, label, icon: Icon }) => {
            const active =
              to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10">
          <UserBadge />
        </div>
        <div className="px-6 py-3 text-xs text-white/50">
          v0.1.0
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<CreateWizard />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/access-requests" element={<AccessRequests />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
