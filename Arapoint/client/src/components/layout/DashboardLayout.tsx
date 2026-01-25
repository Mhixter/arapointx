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
  ArrowRightLeft,
  Home,
  CreditCard,
  History,
  User,
  HelpCircle,
  ChevronRight,
  X
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

  const mainNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/fund-wallet", label: "Fund Wallet", icon: CreditCard },
    { href: "/dashboard/history", label: "Transaction History", icon: History },
  ];

  const serviceNavItems = [
    { href: "/dashboard/identity", label: "NIN Services", icon: ShieldCheck, color: "text-green-500" },
    { href: "/dashboard/bvn-retrieval", label: "BVN Services", icon: ShieldCheck, color: "text-blue-500" },
    { href: "/dashboard/education", label: "Education Results", icon: GraduationCap, color: "text-purple-500" },
    { href: "/dashboard/buy-pins", label: "Buy Exam PINs", icon: Gift, color: "text-pink-500" },
    { href: "/dashboard/cac", label: "CAC Registration", icon: Building2, color: "text-orange-500" },
    { href: "/dashboard/vtu", label: "VTU Services", icon: Smartphone, color: "text-cyan-500" },
    { href: "/dashboard/airtime-to-cash", label: "Airtime to Cash", icon: ArrowRightLeft, color: "text-emerald-500" },
    { href: "/dashboard/subscriptions", label: "Subscriptions", icon: Zap, color: "text-yellow-500" },
  ];

  const accountNavItems = [
    { href: "/dashboard/profile", label: "My Profile", icon: User },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
    { href: "/dashboard/chat", label: "Help & Support", icon: HelpCircle },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2 font-heading font-bold text-xl tracking-tight cursor-pointer">
          <div className="h-10 w-10">
            <img src={arapointLogo} alt="Arapoint" className="h-9 w-9 object-contain" />
          </div>
          <span className="text-white">Arapoint</span>
        </Link>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setIsMobileOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4">
        <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-4 w-4 opacity-80" />
            <p className="text-xs opacity-90">Wallet Balance</p>
          </div>
          <p className="text-2xl font-bold">
            {isLoading ? '...' : `₦${walletBalance.toLocaleString()}`}
          </p>
          <Link href="/dashboard/fund-wallet">
            <Button size="sm" variant="secondary" className="mt-3 w-full bg-white/20 hover:bg-white/30 text-white border-0">
              <CreditCard className="h-4 w-4 mr-2" />
              Fund Wallet
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  isActive 
                    ? "bg-green-600 text-white shadow-lg shadow-green-600/30" 
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => setIsMobileOpen(false)}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-6">
          <p className="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Services</p>
          <div className="space-y-1">
            {serviceNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || location.startsWith(item.href + '/');
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isActive 
                      ? "bg-white/15 text-white" 
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <Icon className={`h-5 w-5 ${item.color}`} />
                  {item.label}
                  <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <p className="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Account</p>
          <div className="space-y-1">
            {accountNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isActive 
                      ? "bg-white/15 text-white" 
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-white/10">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      <aside className="hidden md:block w-64 bg-slate-900 fixed inset-y-0 left-0 z-30">
        <NavContent />
      </aside>

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-14 sm:h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 px-3 sm:px-4 md:px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 border-0" aria-describedby={undefined}>
                <VisuallyHidden>
                  <SheetTitle>Navigation Menu</SheetTitle>
                </VisuallyHidden>
                <NavContent />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-800 dark:text-white">
                Welcome back, <span className="text-green-600">{userName.split(' ')[0]}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link href="/dashboard/notifications">
              <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white relative h-9 w-9" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2 hover:bg-slate-100 dark:hover:bg-slate-700">
                  <Avatar className="h-8 w-8 border-2 border-green-500">
                    <AvatarFallback className="bg-green-100 text-green-700 font-semibold">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium leading-none text-slate-800 dark:text-white">{userName}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/dashboard/profile">
                  <DropdownMenuItem data-testid="menu-profile">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                </Link>
                <Link href="/dashboard/settings">
                  <DropdownMenuItem data-testid="menu-settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                </Link>
                <Link href="/dashboard/chat">
                  <DropdownMenuItem data-testid="menu-support">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Support & Chat
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
