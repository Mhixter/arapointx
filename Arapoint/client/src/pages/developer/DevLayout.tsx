import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Key, CreditCard, FileText, Book, User, LogOut, Menu, X, Code2, ShieldCheck, Webhook
} from "lucide-react";

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
  const [location, setLocation] = useLocation();
  const [developer, setDeveloper] = useState<DevUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("dev_token");
    const devData = localStorage.getItem("dev_user");
    if (!stored || !devData) {
      setLocation("/developer/login");
      return;
    }
    try {
      setDeveloper(JSON.parse(devData));
    } catch {
      setLocation("/developer/login");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("dev_token");
    localStorage.removeItem("dev_user");
    setLocation("/developer/login");
  };

  if (!developer) return null;

  return (
    <div className="min-h-screen bg-[#080a0e] text-white flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-60 bg-[#0c0e15] border-r border-[#1a1d27] flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>

        {/* Logo */}
        <div className="px-5 py-4 border-b border-[#1a1d27] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/30">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm leading-none">Arapoint</p>
            <p className="text-xs text-indigo-400 mt-0.5">Developer Portal</p>
          </div>
          <button className="ml-auto lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wallet */}
        <div className="px-4 py-3.5 border-b border-[#1a1d27]">
          <div className="bg-gradient-to-br from-emerald-950/60 to-teal-950/60 border border-emerald-800/30 rounded-xl p-3.5">
            <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-widest mb-1">Wallet Balance</p>
            <p className="text-lg font-bold text-emerald-300 leading-none">
              ₦{developer.walletBalance?.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = location === item.path || location.startsWith(item.path + "/");
            return (
              <button
                key={item.path}
                onClick={() => { setLocation(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
                  active
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-600/30"
                    : "text-slate-400 hover:bg-[#13151e] hover:text-slate-200"
                }`}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-indigo-400" : ""}`} />
                <span className="text-sm font-medium">{item.label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-[#1a1d27]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-xs font-bold text-white shadow">
              {developer.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{developer.name}</p>
              <p className="text-xs text-slate-500 truncate">{developer.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="bg-[#0c0e15] border-b border-[#1a1d27] px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Code2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm">Arapoint Dev</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
