import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Key, CreditCard, FileText, Book, User, LogOut, Menu, X,
  ShieldCheck, Webhook, Search, Bell
} from "lucide-react";
import arapointLogo from "@assets/arapoint-logo-transparent.png";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem("dev_token");
    const devData = localStorage.getItem("dev_user");
    if (!stored || !devData) { navigate("/developer/login"); return; }
    try { setDeveloper(JSON.parse(devData)); } catch { navigate("/developer/login"); }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("dev_token");
    localStorage.removeItem("dev_user");
    navigate("/developer/login");
  }, []);

  useIdleTimeout({
    timeoutMs: 300000,
    onTimeout: () => {
      localStorage.removeItem("dev_token");
      localStorage.removeItem("dev_user");
      toast({ title: "Session Expired", description: "You were logged out due to inactivity.", variant: "destructive" });
      navigate("/developer/login");
    },
  });

  if (!developer) return null;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-blue-800/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 p-1">
            <img src={arapointLogo} alt="Arapoint" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Arapoint</p>
            <p className="text-blue-100 text-xs mt-0.5">Developer Portal</p>
          </div>
        </div>
      </div>

      {/* Wallet balance */}
      <div className="px-4 py-3 border-b border-blue-800/30">
        <div className="bg-blue-800/40 rounded-xl px-3 py-2.5">
          <p className="text-blue-100 text-xs font-medium">Wallet Balance</p>
          <p className="text-white text-base font-bold mt-0.5">
            ₦{developer.walletBalance?.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active = location === item.path || location.startsWith(item.path + "/");
          return (
            <button
              key={item.path}
              onClick={() => { setSidebarOpen(false); navigate(item.path); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                active
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-blue-100 hover:bg-blue-700/50 hover:text-white"
              }`}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-blue-700" : ""}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-blue-800/30">
        <div className="flex items-center gap-3 px-3 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-blue-700 flex-shrink-0">
            {developer.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{developer.name}</p>
            <p className="text-xs text-blue-100 truncate">{developer.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#1E3A8A] flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-60 bg-[#1E3A8A] z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <button className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 text-sm text-gray-500 w-64">
            <Search className="w-4 h-4" />
            <span>Search docs, logs...</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button className="p-2 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100">
              <Bell className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/developer/account")}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 cursor-pointer"
            >
              <div className="w-7 h-7 bg-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {developer.name?.[0]?.toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-gray-800 leading-none">{developer.name}</p>
                <p className="text-xs text-gray-500">{developer.company || "Developer"}</p>
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
