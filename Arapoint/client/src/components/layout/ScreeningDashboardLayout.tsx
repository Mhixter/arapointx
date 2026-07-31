import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, BarChart3, Shield, Bell, Settings,
  CreditCard, UserCog, LogOut, Menu, Search,
  Upload, Plus, Zap, ChevronDown, Command
} from "lucide-react";
import arapointLogo from "@assets/arapoint-logo-transparent.png";
import { Button } from "@/components/ui/button";
import { clearScreeningSession, getScreeningSession, screeningApi } from "@/lib/screening/api";
import { useToast } from "@/hooks/use-toast";

const NAV_GROUPS = [
  {
    label: "Intelligence",
    items: [
      { label: "Command Center", icon: LayoutDashboard, href: "/employment-screening/dashboard" },
      { label: "Candidates", icon: Users, href: "/employment-screening/dashboard/candidates" },
      { label: "Bulk Screening", icon: Upload, href: "/employment-screening/dashboard/bulk" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Analytics", icon: BarChart3, href: "/employment-screening/dashboard/analytics" },
      { label: "Fraud Center", icon: Shield, href: "/employment-screening/dashboard/fraud" },
      { label: "Alerts", icon: Bell, href: "/employment-screening/dashboard/alerts", badge: true },
    ],
  },
  {
    label: "Organization",
    items: [
      { label: "Team", icon: UserCog, href: "/employment-screening/dashboard/team" },
      { label: "Billing", icon: CreditCard, href: "/employment-screening/dashboard/billing" },
      { label: "Settings", icon: Settings, href: "/employment-screening/dashboard/settings" },
    ],
  },
];

export default function ScreeningDashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
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
  const userInitial = userName.charAt(0).toUpperCase();

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: "linear-gradient(180deg, #08142B 0%, #102340 100%)" }}>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/15 p-1">
            <img src={arapointLogo} alt="Arapoint" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none tracking-tight">Arapoint</p>
            <p className="text-[11px] font-medium leading-none mt-1" style={{ color: "#08B63E" }}>Screening Platform</p>
          </div>
        </div>
      </div>

      {/* Glass Profile Card */}
      <div className="px-4 py-3">
        <div className="rounded-2xl p-3 border border-white/10 backdrop-blur-md"
          style={{ background: "linear-gradient(135deg, rgba(8,182,62,0.15) 0%, rgba(37,99,235,0.1) 100%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #08B63E, #2563EB)" }}>
              {orgName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate leading-none">{orgName}</p>
              <p className="text-xs capitalize mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
                {userRole.replace(/_/g, ' ')}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-1 overflow-y-auto space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href || (item.href !== '/employment-screening/dashboard' && location.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative group ${
                      isActive ? 'text-white' : 'hover:text-white'
                    }`}
                    style={isActive ? {
                      background: "linear-gradient(135deg, rgba(8,182,62,0.25) 0%, rgba(8,182,62,0.1) 100%)",
                      color: "#FFFFFF",
                      boxShadow: "inset 0 0 0 1px rgba(8,182,62,0.3)"
                    } : { color: "rgba(255,255,255,0.6)" }}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: "#08B63E" }} />
                    )}
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && unread > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "#ef4444" }}>
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom user strip */}
      <div className="px-3 py-3 border-t border-white/8">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #08B63E, #2563EB)" }}>
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate leading-none">{userName}</p>
            <p className="text-[10px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{session?.user?.email || "—"}</p>
          </div>
          <button onClick={handleLogout} className="p-1 rounded-lg transition-colors hover:bg-white/10" title="Sign Out">
            <LogOut className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen" style={{ background: "#F4F6F8" }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 flex-shrink-0 shadow-2xl">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              className="relative flex flex-col w-72 z-10"
              initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <SidebarContent />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Command Center Top Nav */}
        <header className="bg-white/80 backdrop-blur-xl border-b px-4 lg:px-6 py-3 flex items-center gap-4 flex-shrink-0 z-10"
          style={{ borderColor: "#E5E7EB" }}>
          <button
            className="lg:hidden p-2 rounded-xl transition-colors hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" style={{ color: "#64748B" }} />
          </button>

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm transition-all hover:border-gray-300 w-64"
            style={{ background: "#F4F6F8", border: "1px solid #E5E7EB", color: "#64748B" }}
          >
            <Search className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">Search candidates...</span>
            <div className="flex items-center gap-0.5 opacity-60">
              <Command className="w-3 h-3" /><span className="text-xs">K</span>
            </div>
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Link href="/employment-screening/dashboard/screen">
              <Button size="sm" className="hidden sm:flex items-center gap-2 text-white rounded-xl font-semibold shadow-lg"
                style={{ background: "linear-gradient(135deg, #08B63E, #079C36)", boxShadow: "0 4px 14px rgba(8,182,62,0.35)" }}>
                <Plus className="w-4 h-4" />
                New Screening
              </Button>
            </Link>

            {/* Alerts */}
            <Link href="/employment-screening/dashboard/alerts">
              <button className="relative p-2.5 rounded-xl transition-colors hover:bg-gray-100" style={{ border: "1px solid #E5E7EB", background: "white" }}>
                <Bell className="w-4 h-4" style={{ color: "#64748B" }} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
            </Link>

            {/* AI Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(8,182,62,0.08)", color: "#079C36", border: "1px solid rgba(8,182,62,0.2)" }}>
              <Zap className="w-3 h-3" />
              AI Active
            </div>

            {/* User */}
            <Link href="/employment-screening/dashboard/settings">
              <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl transition-colors hover:bg-gray-100" style={{ border: "1px solid #E5E7EB", background: "white" }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #08142B, #2563EB)" }}>
                  {userInitial}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold leading-none" style={{ color: "#0F172A" }}>{userName}</p>
                  <p className="text-[10px] capitalize mt-0.5" style={{ color: "#64748B" }}>{userRole.replace(/_/g, ' ')}</p>
                </div>
              </button>
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
