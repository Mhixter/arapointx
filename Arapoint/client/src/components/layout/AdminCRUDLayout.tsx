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
  Headset,
  Settings,
  DollarSign,
  Shield,
  Bell,
  Search,
  ChevronDown,
  X,
  ChevronLeft,
  Building2,
  IdCard,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState, useEffect } from "react";
import arapointLogo from "@assets/generated_images/arapoint_solution_logo.png";

const ADMIN_ROLES: Record<string, { name: string; permissions: string[]; color: string }> = {
  super_admin: {
    name: "Super Admin",
    permissions: ["users", "identity", "bvn", "education", "vtu", "cac", "pricing", "analytics", "settings", "roles", "support"],
    color: "bg-red-500"
  },
  admin: {
    name: "Admin",
    permissions: ["users", "identity", "bvn", "education", "vtu", "cac", "analytics", "support"],
    color: "bg-blue-500"
  },
  operator: {
    name: "Operator",
    permissions: ["identity", "bvn", "education", "vtu", "cac"],
    color: "bg-green-500"
  },
  viewer: {
    name: "Viewer",
    permissions: ["analytics"],
    color: "bg-gray-500"
  },
  support_agent: {
    name: "Support Agent",
    permissions: ["support"],
    color: "bg-teal-500"
  }
};

const ALL_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: null },
  { href: "/admin/users", label: "User Management", icon: Users, permission: "users" },
  { href: "/admin/identity", label: "Identity Services", icon: ShieldCheck, permission: "identity" },
  { href: "/admin/bvn", label: "BVN Services", icon: ShieldCheck, permission: "bvn" },
  { href: "/admin/education", label: "Education Services", icon: GraduationCap, permission: "education" },
  { href: "/admin/vtu", label: "VTU Services", icon: Smartphone, permission: "vtu" },
  { href: "/admin/cac", label: "CAC Services", icon: Building2, permission: "cac" },
  { href: "/admin/identity-agents", label: "Identity Agents", icon: IdCard, permission: "identity" },
  { href: "/admin/education-agents", label: "Education Agents", icon: GraduationCap, permission: "education" },
  { href: "/admin/a2c-agents", label: "A2C Agents", icon: DollarSign, permission: "vtu" },
  { href: "/admin/jamb-agents", label: "JAMB Agents", icon: BookOpen, permission: "education" },
  { href: "/admin/pricing", label: "Pricing Management", icon: DollarSign, permission: "pricing" },
  { href: "/admin/support", label: "Support Chat", icon: Headset, permission: "support" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, permission: "analytics" },
  { href: "/admin/roles", label: "Role Management", icon: Shield, permission: "roles" },
  { href: "/admin/settings", label: "Settings", icon: Settings, permission: "settings" },
];

interface AdminCRUDLayoutProps {
  children: React.ReactNode;
  currentRole?: string;
}

function getAdminUser() {
  try {
    const stored = tokenStorage.getItem('adminUser');
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

export default function AdminCRUDLayout({ children, currentRole }: AdminCRUDLayoutProps) {
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const adminUser = getAdminUser();
  const resolvedRole = currentRole || adminUser?.role || 'super_admin';
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (resolvedRole === 'support_agent' && location !== '/admin/support') {
      setLocation('/admin/support');
    }
  }, [resolvedRole, location, setLocation]);
  
  const role = ADMIN_ROLES[resolvedRole] || ADMIN_ROLES['super_admin'];
  const permissions = role?.permissions || [];
  
  const navItems = ALL_NAV_ITEMS.filter(item => 
    item.permission === null || permissions.includes(item.permission)
  );

  const currentPageTitle = navItems.find(i => location === i.href || (i.href !== "/admin" && location.startsWith(i.href)))?.label || "Dashboard";

  const NavContent = ({ showClose = false }: { showClose?: boolean }) => (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      <div className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-4 border-b border-slate-700 flex-shrink-0">
        <Link href="/admin" className="flex items-center gap-2 font-heading font-bold text-base sm:text-lg tracking-tight cursor-pointer">
          <div className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0">
            <img src={arapointLogo} alt="Arapoint" className="h-8 w-8 sm:h-9 sm:w-9 object-contain" />
          </div>
          {(!isCollapsed || isMobile) && (
            <span className="text-white whitespace-nowrap">Arapoint</span>
          )}
        </Link>
        {showClose && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-slate-800 h-9 w-9"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      {(!isCollapsed || isMobile) && (
        <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-700 flex-shrink-0">
          <Badge className={`${role.color} text-white text-xs`}>
            {role.name}
          </Badge>
        </div>
      )}
      
      <div className="flex-1 py-3 sm:py-4 px-2 sm:px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 sm:py-3 rounded-lg text-sm font-medium transition-all cursor-pointer touch-manipulation ${
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg" 
                  : "text-slate-300 hover:bg-slate-800 hover:text-white active:bg-slate-700"
              } ${isCollapsed && !isMobile ? "justify-center px-2" : ""}`}
              onClick={() => setIsMobileOpen(false)}
              title={isCollapsed && !isMobile ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {(!isCollapsed || isMobile) && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </div>
      
      <div className="p-3 sm:p-4 border-t border-slate-700 flex-shrink-0">
        {(!isCollapsed || isMobile) && (
          <div className="bg-slate-800 rounded-lg p-2.5 sm:p-3 mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-primary flex-shrink-0">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-white text-xs sm:text-sm">
                  {(adminUser?.name || 'SA').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-white truncate">{adminUser?.name || 'Admin'}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 truncate">{adminUser?.email || ''}</p>
              </div>
            </div>
          </div>
        )}
        <Button 
          variant="ghost" 
          className={`w-full text-slate-300 hover:text-white hover:bg-slate-800 active:bg-slate-700 ${
            isCollapsed && !isMobile ? "justify-center px-2" : "justify-start"
          }`}
          title={isCollapsed && !isMobile ? "Sign Out" : undefined}
          onClick={() => {
            tokenStorage.removeItem('adminToken');
            tokenStorage.removeItem('adminRefreshToken');
            tokenStorage.removeItem('adminUser');
            window.location.href = "/admin/login";
          }}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {(!isCollapsed || isMobile) && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-50 dark:bg-slate-950 flex">
      <aside className={`hidden md:block ${isCollapsed ? "w-16" : "w-56 lg:w-64"} bg-slate-900 fixed inset-y-0 left-0 z-30 transition-all duration-300`}>
        <NavContent />
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 bg-slate-900 border border-slate-700 rounded-full p-1.5 text-white hover:bg-slate-800 transition-colors hidden lg:flex items-center justify-center"
        >
          <ChevronLeft className={`h-3 w-3 transition-transform ${isCollapsed ? "rotate-180" : ""}`} />
        </button>
      </aside>

      <div className={`flex-1 ${isCollapsed ? "md:ml-16" : "md:ml-56 lg:md:ml-64"} flex flex-col min-h-screen min-h-[100dvh] transition-all duration-300`}>
        <header className="h-14 sm:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-3 sm:px-4 md:px-6 flex items-center justify-between safe-area-inset-top">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[280px] max-w-[85vw] border-r-0">
                <NavContent showClose />
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm sm:text-base md:text-lg font-semibold text-slate-900 dark:text-white truncate">
                {currentPageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg px-2 sm:px-3 py-1.5">
              <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none text-xs sm:text-sm w-20 sm:w-24 md:w-32 lg:w-48 text-slate-600 dark:text-slate-300 placeholder:text-slate-400"
              />
            </div>
            
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 md:hidden">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            
            <ThemeToggle />
            
            <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 h-2 w-2 sm:h-2.5 sm:w-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1 sm:gap-2 px-1.5 sm:px-2 h-8 sm:h-9">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-slate-200 dark:border-slate-700">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-white text-[10px] sm:text-xs">
                      {(adminUser?.name || 'SA').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-medium">{adminUser?.name || 'Admin'}</p>
                  </div>
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{adminUser?.name || 'Admin'}</span>
                    <span className="text-xs text-muted-foreground font-normal">{adminUser?.email || ''}</span>
                    <Badge className={`${role.color} text-white text-[10px] mt-1 w-fit`}>{role.name}</Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">Profile Settings</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Activity Log</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => {
                  tokenStorage.removeItem('adminToken');
                  tokenStorage.removeItem('adminRefreshToken');
                  tokenStorage.removeItem('adminUser');
                  window.location.href = "/admin/login";
                }}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 sm:py-4 px-3 sm:px-4 md:px-6 safe-area-inset-bottom">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500">
            <p className="text-center sm:text-left">© 2024 Arapoint Admin Panel</p>
            <div className="flex items-center gap-3 sm:gap-4">
              <a href="#" className="hover:text-slate-700 dark:hover:text-slate-300 touch-manipulation">Docs</a>
              <a href="#" className="hover:text-slate-700 dark:hover:text-slate-300 touch-manipulation">Support</a>
              <span className="text-slate-300 dark:text-slate-600">v1.0.0</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
