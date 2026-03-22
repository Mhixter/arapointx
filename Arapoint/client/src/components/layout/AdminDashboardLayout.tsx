import { tokenStorage } from '@/lib/tokenStorage';
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  ShieldCheck, 
  GraduationCap, 
  Smartphone, 
  LogOut, 
  Menu,
  Users,
  BarChart3,
  Package,
  Headset,
  MessageSquare,
  Settings as SettingsIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useMemo } from "react";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { useToast } from "@/hooks/use-toast";
import arapointLogo from "@assets/generated_images/arapoint_solution_logo.png";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { toast } = useToast();

  const adminUser = useMemo(() => {
    try {
      const stored = tokenStorage.getItem('adminUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const adminName = adminUser?.name || adminUser?.email || 'Admin';
  const adminEmail = adminUser?.email || '';

  useIdleTimeout({
    timeoutMs: 300000,
    onTimeout: () => {
      tokenStorage.removeItem('adminToken');
      tokenStorage.removeItem('adminRefreshToken');
      tokenStorage.removeItem('adminUser');
      toast({
        title: "Session Expired",
        description: "You were logged out due to inactivity.",
        variant: "destructive",
      });
      setLocation('/admin/login');
    },
  });

  const handleSignOut = () => {
    tokenStorage.removeItem('adminToken');
    tokenStorage.removeItem('adminRefreshToken');
    tokenStorage.removeItem('adminUser');
    setLocation('/admin/login');
  };

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/identity", label: "Identity Services", icon: ShieldCheck },
    { href: "/admin/bvn", label: "BVN Services", icon: ShieldCheck },
    { href: "/admin/education", label: "Education Services", icon: GraduationCap },
    { href: "/admin/vtu", label: "VTU Services", icon: Smartphone },
    { href: "/admin/cac", label: "CAC Services", icon: ShieldCheck },
    { href: "/admin/identity-agents", label: "Identity Agents", icon: Users },
    { href: "/admin/education-agents", label: "Education Agents", icon: GraduationCap },
    { href: "/admin/a2c-agents", label: "A2C Agents", icon: Smartphone },
    { href: "/admin/pricing", label: "Pricing Management", icon: BarChart3 },
    { href: "/admin/support", label: "Support Chat", icon: Headset },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/transactions", label: "Transactions", icon: BarChart3 },
    { href: "/admin/roles", label: "Role Management", icon: ShieldCheck },
    { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
    { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageSquare },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <Link href="/admin">
          <a className="flex items-center gap-2 font-heading font-bold text-xl text-sidebar-primary tracking-tight">
            <div className="h-10 w-10">
              <img src={arapointLogo} alt="Arapoint" className="h-9 w-9 object-contain" />
            </div>
            <span className="text-sidebar-foreground">Arapoint Admin</span>
          </a>
        </Link>
      </div>
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <a className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}
                 onClick={() => setIsMobileOpen(false)}>
                <Icon className="h-5 w-5" />
                {item.label}
              </a>
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="bg-sidebar-accent/50 rounded-lg p-4 mb-4">
          <p className="text-xs text-sidebar-foreground/60 mb-1">Admin Account</p>
          <p className="text-sm font-bold text-sidebar-foreground truncate">{adminName}</p>
          <p className="text-xs text-sidebar-foreground/60 mt-1 truncate">{adminEmail}</p>
        </div>
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 bg-sidebar border-r border-sidebar-border fixed inset-y-0 left-0 z-30 text-sidebar-foreground">
        <NavContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile Menu */}
        <div className="md:hidden h-14 bg-background border-b border-border sticky top-0 z-20 px-4 flex items-center">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-sidebar text-sidebar-foreground w-64 border-r border-sidebar-border">
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
