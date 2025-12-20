import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  ShieldCheck, 
  GraduationCap, 
  Smartphone, 
  Wifi,
  Zap,
  Wallet, 
  Settings, 
  LogOut, 
  Menu, 
  Bell,
  Search,
  Users,
  Gift,
  BookOpen,
  Building2,
  ArrowRightLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import arapointLogo from "@assets/generated_images/arapoint_solution_logo.png";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const accessToken = localStorage.getItem('accessToken');
  
  const { data: user, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: authApi.getProfile,
    staleTime: 30000,
    retry: 1,
    enabled: !!accessToken,
  });

  const walletBalance = user?.walletBalance ? parseFloat(user.walletBalance) : 0;
  const userName = user?.name || 'User';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setLocation('/auth/login');
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setLocation('/auth/login');
    }
  };

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/identity", label: "Identity Verification", icon: ShieldCheck },
    { href: "/dashboard/bvn-retrieval", label: "BVN Services", icon: ShieldCheck },
    { href: "/dashboard/education", label: "Education Services", icon: GraduationCap },
    { href: "/dashboard/buy-pins", label: "Buy Exam PINs", icon: Gift },
    { href: "/dashboard/vtu", label: "VTU Services", icon: Smartphone },
    { href: "/dashboard/airtime-to-cash", label: "Airtime to Cash", icon: ArrowRightLeft },
    { href: "/dashboard/subscriptions", label: "Subscriptions", icon: Zap },
    { href: "/dashboard/cac", label: "CAC Registration", icon: Building2 },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2 font-heading font-bold text-xl text-sidebar-primary tracking-tight cursor-pointer">
          <div className="h-10 w-10 logo-cycle">
            <img src={arapointLogo} alt="Arapoint" className="h-9 w-9 object-contain" />
          </div>
          <span className="text-sidebar-foreground">Arapoint</span>
        </Link>
      </div>
      <div className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}
              onClick={() => setIsMobileOpen(false)}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-sidebar-border">
        <div className="bg-sidebar-accent/50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-sidebar-foreground/60" />
            <p className="text-xs text-sidebar-foreground/60">Wallet Balance</p>
          </div>
          <p className="text-xl font-bold text-sidebar-foreground">
            {isLoading ? '...' : `₦${walletBalance.toLocaleString()}`}
          </p>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20 flex">
      <aside className="hidden md:block w-64 bg-sidebar border-r border-sidebar-border fixed inset-y-0 left-0 z-30 text-sidebar-foreground">
        <NavContent />
      </aside>

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-14 sm:h-16 bg-background border-b border-border sticky top-0 z-20 px-3 sm:px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 bg-sidebar text-sidebar-foreground w-64 border-r border-sidebar-border" aria-describedby={undefined}>
                <VisuallyHidden>
                  <SheetTitle>Navigation Menu</SheetTitle>
                </VisuallyHidden>
                <NavContent />
              </SheetContent>
            </Sheet>
            <h1 className="text-base sm:text-lg font-semibold hidden md:block text-foreground">
              {navItems.find(i => i.href === location)?.label || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
             <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8 sm:h-10 sm:w-10">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Link href="/dashboard/notifications">
              <Button variant="ghost" size="icon" className="text-muted-foreground relative h-8 w-8 sm:h-10 sm:w-10" data-testid="button-notifications">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 h-1.5 w-1.5 sm:h-2 sm:w-2 bg-destructive rounded-full"></span>
              </Button>
            </Link>
            <div className="h-6 sm:h-8 w-px bg-border mx-0.5 sm:mx-1"></div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1.5 sm:gap-2 px-1.5 sm:px-2">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-border">
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs sm:text-sm font-medium leading-none">{userName}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground capitalize">user</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/dashboard/profile">
                  <DropdownMenuItem data-testid="menu-profile">Profile</DropdownMenuItem>
                </Link>
                <Link href="/dashboard/settings">
                  <DropdownMenuItem data-testid="menu-settings">Settings</DropdownMenuItem>
                </Link>
                <Link href="/dashboard/chat">
                  <DropdownMenuItem data-testid="menu-support">Support & Chat</DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleLogout}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
