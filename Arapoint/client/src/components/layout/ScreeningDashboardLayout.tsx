import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, FileText, BarChart3, Shield, Bell, Settings,
  CreditCard, UserCog, LogOut, Menu, X, Search, ChevronRight,
  Upload, AlertTriangle, Plus
} from "lucide-react";
import arapointLogo from "@assets/arapoint-logo-transparent.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clearScreeningSession, getScreeningSession, screeningApi } from "@/lib/screening/api";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/employment-screening/dashboard" },
  { label: "Candidates", icon: Users, href: "/employment-screening/dashboard/candidates" },
  { label: "Bulk Screening", icon: Upload, href: "/employment-screening/dashboard/bulk" },
  { label: "Analytics", icon: BarChart3, href: "/employment-screening/dashboard/analytics" },
  { label: "Fraud Center", icon: Shield, href: "/employment-screening/dashboard/fraud" },
  { label: "Alerts", icon: Bell, href: "/employment-screening/dashboard/alerts" },
  { label: "Team", icon: UserCog, href: "/employment-screening/dashboard/team" },
  { label: "Billing", icon: CreditCard, href: "/employment-screening/dashboard/billing" },
  { label: "Settings", icon: Settings, href: "/employment-screening/dashboard/settings" },
];

export default function ScreeningDashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const { toast } = useToast();
  const session = getScreeningSession();

  useEffect(() => {
    if (!session) { setLocation('/employment-screening/login'); return; }
    screeningApi.dashboard.stats().then((d: any) => setUnread(d.unreadNotifications || 0)).catch(() => {});
  }, []);

  const handleLogout = () => {
    clearScreeningSession();
    setLocation('/employment-screening/login');
    toast({ title: "Logged out", description: "You have been logged out successfully." });
  };

  const orgName = session?.org?.name || "Organization";
  const userName = session?.user?.name || "User";
  const userRole = session?.user?.role || "recruiter";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-green-800/30">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1">
            <img src={arapointLogo} alt="Arapoint" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Arapoint</p>
            <p className="text-green-300 text-xs">Screening Platform</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-green-800/30">
        <div className="bg-green-800/40 rounded-xl px-3 py-2">
          <p className="text-white text-xs font-semibold truncate">{orgName}</p>
          <p className="text-green-300 text-xs capitalize">{userRole.replace('_', ' ')}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== '/employment-screening/dashboard' && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <a
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-green-100 hover:bg-green-700/50 hover:text-white'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-green-700' : ''}`} />
                <span>{item.label}</span>
                {item.label === 'Alerts' && unread > 0 && (
                  <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0 min-w-5 h-4 flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </Badge>
                )}
              </a>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-green-800/30">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#166534] flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-[#166534] z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top navbar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <button
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 text-sm text-gray-500 w-64">
              <Search className="w-4 h-4" />
              <span>Search candidates...</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/employment-screening/dashboard/screen">
              <Button size="sm" className="bg-green-700 hover:bg-green-800 text-white hidden sm:flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Screening
              </Button>
            </Link>
            <Link href="/employment-screening/dashboard/alerts">
              <button className="relative p-2 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100">
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
            </Link>
            <Link href="/employment-screening/dashboard/settings">
              <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 cursor-pointer">
                <div className="w-7 h-7 bg-green-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-gray-800 leading-none">{userName}</p>
                  <p className="text-xs text-gray-500 capitalize">{userRole.replace('_', ' ')}</p>
                </div>
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
