import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Key, CreditCard, FileText, Book, User, LogOut, Menu, X, Code2, ShieldCheck, Webhook
} from "lucide-react";

const navigate = (path: string) => { window.location.href = path; };

interface DevUser {
  id: string;
  email: string;
  name: string;
  company?: string;
  walletBalance: number;
}

const navItems = [
  { path: "/developer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/developer/api-keys", label: "API Keys", icon: Key },
  { path: "/developer/billing", label: "Billing", icon: CreditCard },
  { path: "/developer/logs", label: "API Logs", icon: FileText },
  { path: "/developer/webhooks", label: "Webhooks & Security", icon: Webhook },
  { path: "/developer/docs", label: "Documentation", icon: Book },
  { path: "/developer/kyb", label: "Business Verification", icon: ShieldCheck },
  { path: "/developer/account", label: "Account", icon: User },
];

export function DevLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [developer, setDeveloper] = useState<DevUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("dev_token");
    const devData = localStorage.getItem("dev_user");
    if (!stored || !devData) {
      navigate("/developer/login");
      return;
    }
    try {
      setDeveloper(JSON.parse(devData));
    } catch {
      navigate("/developer/login");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("dev_token");
    localStorage.removeItem("dev_user");
    navigate("/developer/login");
  };

  if (!developer) return null;

  return (
    <div className="min-h-screen flex" style={{ background: "#0A0A0A", color: "#E5E7EB" }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ width: 240, background: "#0A0A0A", borderRight: "1px solid #1F2937" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #1F2937" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0B5FFF,#12B76A)" }}>
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm leading-none">Arapoint</p>
            <p className="text-xs mt-0.5" style={{ color: "#0B5FFF" }}>Developer Portal</p>
          </div>
          <button className="lg:hidden" style={{ color: "#6B7280" }} onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wallet balance */}
        <div className="px-4 py-4" style={{ borderBottom: "1px solid #1F2937" }}>
          <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#6B7280" }}>Wallet Balance</p>
            <p className="text-xl font-bold" style={{ color: "#12B76A" }}>
              ₦{developer.walletBalance?.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = location === item.path || location.startsWith(item.path + "/");
            return (
              <button
                key={item.path}
                onClick={() => { setSidebarOpen(false); navigate(item.path); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                style={{
                  background: active ? "#0B5FFF1A" : "transparent",
                  color: active ? "#FFFFFF" : "#6B7280",
                  border: active ? "1px solid #0B5FFF40" : "1px solid transparent",
                }}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? "#0B5FFF" : undefined }} />
                <span className="text-sm font-medium">{item.label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "#0B5FFF" }} />}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4" style={{ borderTop: "1px solid #1F2937" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#0B5FFF" }}>
              {developer.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{developer.name}</p>
              <p className="text-xs truncate" style={{ color: "#6B7280" }}>{developer.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-xs py-2 rounded-lg transition-colors"
            style={{ color: "#EF4444" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#EF44440D")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3" style={{ background: "#0A0A0A", borderBottom: "1px solid #1F2937" }}>
          <button onClick={() => setSidebarOpen(true)} style={{ color: "#6B7280" }}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0B5FFF,#12B76A)" }}>
              <Code2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-white">Arapoint Dev</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
