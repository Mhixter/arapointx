import { tokenStorage } from '@/lib/tokenStorage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, CreditCard, ArrowUpRight, ArrowDownRight, ShieldCheck, GraduationCap, Loader2, Copy, Building2, AlertTriangle, Smartphone, Zap, Tv, Banknote, FileText, ChevronRight, Wifi, History, RotateCw, Gift, ArrowRightLeft, Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { walletApi } from "@/lib/api/wallet";
import { useQuery, useQueryClient } from "@tanstack/react-query";


interface DashboardStats {
  user: {
    name: string;
    email: string;
    walletBalance: number;
  };
  stats: {
    totalTransactions: number;
    totalVerifications: number;
    ninVerifications: number;
    bvnVerifications: number;
    educationVerifications: number;
  };
}

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  description: string;
  amount: number;
  status: string;
  date: string;
  reference: string;
}

interface Verification {
  id: string;
  type: string;
  reference: string;
  status: string;
  details: string;
  date: string;
}

interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export default function Overview() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [generatingAccount, setGeneratingAccount] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [appInstalled, setAppInstalled] = useState(false);
  const [installBannerDismissed, setInstallBannerDismissed] = useState(
    () => localStorage.getItem('arapoint_install_dismissed') === 'true'
  );

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;

  const getAuthToken = () => tokenStorage.getItem('accessToken');

  const fetchDashboardStats = async (): Promise<DashboardStats | null> => {
    const token = getAuthToken();
    if (!token) return null;
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    const res = await fetch('/api/dashboard/stats', { headers, cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  };

  const fetchTransactions = async (): Promise<Transaction[]> => {
    const token = getAuthToken();
    if (!token) return [];
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    const res = await fetch('/api/dashboard/transactions?limit=5', { headers, cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.transactions || [];
  };

  const fetchVerifications = async (): Promise<Verification[]> => {
    const token = getAuthToken();
    if (!token) return [];
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    const res = await fetch('/api/dashboard/verifications?limit=5', { headers, cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.verifications || [];
  };

  const token = getAuthToken();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
    staleTime: 5000,
    enabled: !!token,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['dashboard', 'transactions'],
    queryFn: fetchTransactions,
    refetchOnWindowFocus: true,
    staleTime: 5000,
    enabled: !!token,
  });

  const { data: verifications = [] } = useQuery({
    queryKey: ['dashboard', 'verifications'],
    queryFn: fetchVerifications,
    refetchOnWindowFocus: true,
    staleTime: 5000,
    enabled: !!token,
  });

  const { data: commissionData, refetch: refetchCommission } = useQuery({
    queryKey: ['dashboard', 'commission'],
    queryFn: async () => {
      const headers = { Authorization: `Bearer ${getAuthToken()}`, 'Content-Type': 'application/json' };
      const res = await fetch('/api/dashboard/commission', { headers });
      if (!res.ok) return { commissionBalance: 0 };
      const data = await res.json();
      return data.data || { commissionBalance: 0 };
    },
    enabled: !!token,
    staleTime: 10000,
  });

  const [converting, setConverting] = useState(false);

  const handleConvertCommission = async () => {
    setConverting(true);
    try {
      const headers = { Authorization: `Bearer ${getAuthToken()}`, 'Content-Type': 'application/json' };
      const res = await fetch('/api/dashboard/commission/convert', { method: 'POST', headers });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Commission Converted!", description: data.message, variant: "success" });
        refetchCommission();
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      } else {
        toast({ title: "Error", description: data.message || "Failed to convert commission", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to convert commission", variant: "destructive" });
    } finally {
      setConverting(false);
    }
  };

  const loading = statsLoading;

  useEffect(() => {
    const fetchVirtualAccount = async () => {
      try {
        const response = await walletApi.getVirtualAccount();
        if (response?.account) {
          setVirtualAccount(response.account);
        }
      } catch (error) {
        console.error('Failed to fetch virtual account:', error);
      } finally {
        setAccountLoading(false);
      }
    };

    fetchVirtualAccount();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setAppInstalled(true));
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setAppInstalled(true);
        setInstallPrompt(null);
      }
    }
  };

  const dismissBanner = () => {
    setInstallBannerDismissed(true);
    localStorage.setItem('arapoint_install_dismissed', 'true');
  };

  const handleOpenNinDialog = async () => {
    setGeneratingAccount(true);
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Please login to continue");
      const response = await fetch('/api/wallet/virtual-account/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Account generation failed');
      if (data.data?.account) {
        setVirtualAccount(data.data.account);
        toast({ title: "Account Generated", description: "Your virtual bank account has been created successfully." });
      }
    } catch (error: any) {
      toast({ title: "Account Generation Failed", description: error.message || "Could not generate your account. Please try again.", variant: "destructive" });
    } finally {
      setGeneratingAccount(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Copied",
          description: "Account number copied to clipboard.",
        });
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast({
          title: "Copied",
          description: "Account number copied to clipboard.",
        });
      }
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the account number.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 border-0 shadow-xl">
            <CardContent className="pt-6 pb-6">
              <Skeleton className="h-4 w-28 bg-white/10 mb-3" />
              <Skeleton className="h-10 w-48 bg-white/10 mb-3" />
              <Skeleton className="h-3 w-56 bg-white/10" />
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="shadow-md">
              <CardContent className="pt-5 pb-4">
                <Skeleton className="h-3 w-20 mb-3" />
                <Skeleton className="h-7 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="pt-5 pb-4">
                <Skeleton className="h-10 w-10 rounded-xl mb-3" />
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const walletBalance = stats?.user?.walletBalance || 0;
  const commissionBalance = commissionData?.commissionBalance || 0;
  const totalTransactions = stats?.stats?.totalTransactions || 0;
  const totalVerifications = stats?.stats?.totalVerifications || 0;

  const services = [
    { href: "/dashboard/identity", title: "NIN Slip Printing", description: "Print your NIN slip (Premium & Standard)", icon: ShieldCheck, color: "from-green-500 to-green-600", bgColor: "bg-green-50 dark:bg-green-900/20" },
    { href: "/dashboard/bvn-retrieval", title: "BVN Details", description: "Retrieve and print your BVN details", icon: ShieldCheck, color: "from-blue-500 to-blue-600", bgColor: "bg-blue-50 dark:bg-blue-900/20" },
    { href: "/dashboard/identity", title: "NIN Validation", description: "Validate and verify NIN records", icon: CheckCircle2, color: "from-emerald-500 to-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-900/20" },
    { href: "/dashboard/identity", title: "IPE Clearance", description: "Submit IPE clearance requests", icon: FileText, color: "from-teal-500 to-teal-600", bgColor: "bg-teal-50 dark:bg-teal-900/20" },
    { href: "/dashboard/cac", title: "CAC Registration", description: "Register your business with CAC", icon: Building2, color: "from-orange-500 to-orange-600", bgColor: "bg-orange-50 dark:bg-orange-900/20" },
    { href: "/dashboard/education", title: "JAMB Services", description: "JAMB result checking & services", icon: GraduationCap, color: "from-purple-500 to-purple-600", bgColor: "bg-purple-50 dark:bg-purple-900/20" },
    { href: "/dashboard/education", title: "WAEC/NECO Results", description: "Check examination results", icon: GraduationCap, color: "from-indigo-500 to-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-900/20" },
    { href: "/dashboard/buy-pins", title: "Exam PINs", description: "Buy WAEC, NECO, NABTEB scratch cards", icon: CreditCard, color: "from-pink-500 to-pink-600", bgColor: "bg-pink-50 dark:bg-pink-900/20" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0 shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
          <CardContent className="pt-6 pb-6 relative">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-white/70 mb-1">Available Balance</p>
                <h3 className="text-3xl md:text-4xl font-bold">{`₦${walletBalance.toLocaleString()}`}</h3>
                <p className="text-sm text-white/60 mt-2">Fund your wallet to access all services</p>
              </div>
              <Link href="/dashboard/fund-wallet">
                <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white border-0 shadow-lg">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Fund Wallet
                </Button>
              </Link>
            </div>
            {commissionBalance > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-xs text-white/60">Commission Balance</p>
                    <p className="text-lg font-bold text-amber-400">₦{commissionBalance.toLocaleString()}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleConvertCommission}
                  disabled={converting}
                  className="border-amber-400/50 text-amber-300 hover:bg-amber-400/10 hover:text-amber-200 bg-transparent text-xs"
                >
                  {converting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />}
                  Convert to Wallet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Bank Transfer</CardTitle>
            </div>
            <CardDescription className="text-xs">Transfer to fund your wallet instantly</CardDescription>
          </CardHeader>
          <CardContent>
            {accountLoading || generatingAccount ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-green-600 mb-2" />
                <p className="text-xs text-muted-foreground">
                  {generatingAccount ? "Generating..." : "Loading..."}
                </p>
              </div>
            ) : virtualAccount ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
                  <span className="text-muted-foreground text-xs">Bank</span>
                  <span className="font-medium text-xs">{virtualAccount.bankName}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <span className="text-muted-foreground text-xs">Account No.</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-green-700 dark:text-green-400">{virtualAccount.accountNumber}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(virtualAccount.accountNumber)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
                  <span className="text-muted-foreground text-xs">Name</span>
                  <span className="font-medium text-xs truncate max-w-[120px]">{virtualAccount.accountName}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4">
                <Building2 className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground mb-2">No virtual account</p>
                <Button size="sm" onClick={handleOpenNinDialog}>Generate Account</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {[
            { label: "Fund Wallet", icon: <CreditCard className="h-5 w-5" />, href: "/dashboard/fund-wallet", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
            { label: "NIN Lookup", icon: <ShieldCheck className="h-5 w-5" />, href: "/dashboard/identity", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
            { label: "BVN Lookup", icon: <FileText className="h-5 w-5" />, href: "/dashboard/bvn-retrieval", color: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400" },
            { label: "Buy PINs", icon: <Zap className="h-5 w-5" />, href: "/dashboard/buy-pins", color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500" },
            { label: "JAMB", icon: <GraduationCap className="h-5 w-5" />, href: "/dashboard/jamb", color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" },
            { label: "Results", icon: <CheckCircle2 className="h-5 w-5" />, href: "/dashboard/education", color: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400" },
            { label: "VTU", icon: <Wifi className="h-5 w-5" />, href: "/dashboard/vtu", color: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400" },
            { label: "History", icon: <History className="h-5 w-5" />, href: "/dashboard/history", color: "bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300" },
          ].map(({ label, icon, href, color }) => (
            <Link key={href} href={href}>
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 hover:shadow-md transition-all cursor-pointer group">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
                  {icon}
                </div>
                <span className="text-xs font-medium text-center leading-tight">{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Verifications</p>
                <p className="text-2xl font-bold">{totalVerifications}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Our Services</h2>
            <p className="text-sm text-muted-foreground">Choose a service to get started</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Link key={index} href={service.href}>
                <Card className={`${service.bgColor} border-0 hover:shadow-lg transition-all duration-300 cursor-pointer group h-full`}>
                  <CardContent className="pt-5 pb-5">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-1">{service.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Android install banner */}
      {!isIos && !isInStandaloneMode && !appInstalled && !installBannerDismissed && installPrompt && (
        <Card className="border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center shadow">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-white text-sm sm:text-base">Get the Arapoint App</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Install on your Android phone — no Play Store needed</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  className="bg-green-700 hover:bg-green-800 text-white text-xs sm:text-sm gap-1.5"
                  onClick={handleInstall}
                >
                  <Download className="h-3.5 w-3.5" />
                  Install
                </Button>
                <button
                  onClick={dismissBanner}
                  className="text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {appInstalled && (
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>Arapoint is installed on your device! Open it from your home screen anytime.</span>
        </div>
      )}

      {/* iOS sticky bottom banner */}
      {isIos && !isInStandaloneMode && !installBannerDismissed && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-2">
          {/* Arrow pointing down toward Safari toolbar */}
          <div className="flex justify-center mb-[-1px]">
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderTop: '10px solid #fff',
                filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.08))',
              }}
            />
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4">
            <div className="flex items-center gap-3">
              <img src="/arapoint-logo.png" alt="Arapoint" className="h-12 w-12 rounded-xl object-contain flex-shrink-0 border border-slate-100" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-white text-sm">Add Arapoint to Home Screen</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Tap <Share className="inline h-3.5 w-3.5 text-blue-500 mx-0.5" /> <strong>Share</strong> below, then <strong>"Add to Home Screen"</strong>
                </p>
              </div>
              <button
                onClick={dismissBanner}
                className="flex-shrink-0 text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Recent Verifications</CardTitle>
              <CardDescription>Your latest identity checks</CardDescription>
            </div>
            <Link href="/dashboard/identity">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {verifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No verifications yet</p>
                <p className="text-sm">Start by verifying a NIN or BVN</p>
              </div>
            ) : (
              <div className="space-y-3">
                {verifications.map((ver) => (
                  <div key={ver.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-9 w-9 flex-shrink-0 rounded-lg flex items-center justify-center ${
                        ver.type === 'NIN' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' :
                        ver.type === 'BVN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' :
                        'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400'
                      }`}>
                        <span className="font-bold text-xs">{ver.type}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{ver.reference}</p>
                        <p className="text-xs text-muted-foreground">{new Date(ver.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                      ver.status === 'verified' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' :
                      ver.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                    }`}>
                      {ver.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <CardDescription>Your wallet activity</CardDescription>
            </div>
            <Link href="/dashboard/history">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No transactions yet</p>
                <p className="text-sm">Fund your wallet to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-9 w-9 flex-shrink-0 rounded-lg flex items-center justify-center ${tx.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {tx.type === 'credit' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`font-semibold flex-shrink-0 text-sm tabular-nums ${tx.type === 'credit' ? 'text-green-600' : 'text-slate-800 dark:text-white'}`}>
                      {tx.type === 'credit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function StatsCard({ title, value, icon: Icon, trend, trendUp, className }: any) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-muted-foreground ${className}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={`text-xs mt-1 ${trendUp ? 'text-green-600' : 'text-muted-foreground'}`}>
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}
