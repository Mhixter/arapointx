import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Key, CreditCard, FileText, Book, User, LogOut, Menu, X, Code2, ChevronRight
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
  { path: "/developer/docs", label: "Documentation", icon: Book },
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
    <div className="min-h-screen bg-gray-950 text-white flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-5 border-b border-gray-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Arapoint</p>
            <p className="text-xs text-indigo-400">Developer Portal</p>
          </div>
          <button className="ml-auto lg:hidden text-gray-400" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4 border-b border-gray-800">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400">Wallet Balance</p>
            <p className="text-xl font-bold text-green-400">₦{developer.walletBalance?.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = location === item.path || location.startsWith(item.path + "/");
            return (
              <button
                key={item.path}
                onClick={() => { setLocation(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
                {active && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold">
              {developer.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{developer.name}</p>
              <p className="text-xs text-gray-500 truncate">{developer.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full text-red-400 hover:text-red-300 hover:bg-red-950 text-xs" onClick={handleLogout}>
            <LogOut className="w-3 h-3 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-indigo-400" />
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
