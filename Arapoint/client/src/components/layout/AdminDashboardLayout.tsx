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
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MOCK_USER } from "@/lib/mockData";
import { useState } from "react";
import arapointLogo from "@assets/generated_images/arapoint_solution_logo.png";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/identity", label: "Identity Services", icon: ShieldCheck },
    { href: "/admin/bvn", label: "BVN Services", icon: ShieldCheck },
    { href: "/admin/education", label: "Education Services", icon: GraduationCap },
    { href: "/admin/education-pins", label: "Education PINs", icon: Package },
    { href: "/admin/vtu", label: "VTU Services", icon: Smartphone },
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <Link href="/admin">
          <a className="flex items-center gap-2 font-heading font-bold text-xl text-sidebar-primary tracking-tight">
            <div className="h-10 w-10 logo-cycle">
              <img src={arapointLogo} alt="Arapoint" className="h-9 w-9 object-contain" />
            </div>
            <span className="text-sidebar-foreground">Arapoint Admin</span>
          </a>
        </Link>
      </div>
      <div className="flex-1 py-6 px-3 space-y-1">
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
      <div className="p-4 border-t border-sidebar-border">
        <div className="bg-sidebar-accent/50 rounded-lg p-4 mb-4">
          <p className="text-xs text-sidebar-foreground/60 mb-1">Admin Account</p>
          <p className="text-sm font-bold text-sidebar-foreground">{MOCK_USER.name}</p>
          <p className="text-xs text-sidebar-foreground/60 capitalize mt-1">{MOCK_USER.role}</p>
        </div>
        <Link href="/auth/login">
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </Link>
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
