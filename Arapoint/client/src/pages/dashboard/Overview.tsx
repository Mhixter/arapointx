import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, CreditCard, ArrowUpRight, ArrowDownRight, ShieldCheck, GraduationCap, Loader2, Copy, Building2, AlertTriangle, Smartphone, Zap, Tv, Banknote, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { walletApi } from "@/lib/api/wallet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [generatingAccount, setGeneratingAccount] = useState(false);
  const [showNinDialog, setShowNinDialog] = useState(false);
  const [ninInput, setNinInput] = useState("");
  const [verifyingNin, setVerifyingNin] = useState(false);

  const getAuthToken = () => localStorage.getItem('accessToken');

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

  const handleOpenNinDialog = () => {
    setNinInput("");
    setShowNinDialog(true);
  };

  const handleNinSubmit = async () => {
    if (!ninInput || ninInput.length !== 11) {
      toast({
        title: "Invalid NIN",
        description: "Please enter a valid 11-digit NIN.",
        variant: "destructive",
      });
      return;
    }

    setVerifyingNin(true);
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Please login to continue");
      }

      const response = await fetch('/api/wallet/virtual-account/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ nin: ninInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Account generation failed');
      }

      setShowNinDialog(false);
      setNinInput("");

      if (data.data?.account) {
        setVirtualAccount(data.data.account);
        toast({
          title: "Account Generated",
          description: "Your virtual bank account has been created successfully via PayVessel.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Account Generation Failed",
        description: error.message || "PayVessel could not verify your NIN. Please check and try again.",
        variant: "destructive",
      });
    } finally {
      setVerifyingNin(false);
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const walletBalance = stats?.user?.walletBalance || 0;
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
                  <div key={ver.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                        ver.type === 'NIN' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' :
                        ver.type === 'BVN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' :
                        'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400'
                      }`}>
                        <span className="font-bold text-xs">{ver.type}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{ver.reference}</p>
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
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${tx.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {tx.type === 'credit' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm truncate max-w-[150px]">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-slate-800 dark:text-white'}`}>
                      {tx.type === 'credit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showNinDialog} onOpenChange={setShowNinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Verify Your NIN
            </DialogTitle>
            <DialogDescription>
              PayVessel requires NIN verification to generate your virtual bank account. Enter your 11-digit NIN below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nin">NIN (11 digits)</Label>
              <Input
                id="nin"
                type="text"
                placeholder="Enter your 11-digit NIN"
                value={ninInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setNinInput(value);
                }}
                maxLength={11}
                className="font-mono text-lg tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                {ninInput.length}/11 digits entered
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>Powered by PayVessel:</strong> Your NIN will be verified directly by PayVessel to create your dedicated virtual bank account.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNinDialog(false)} disabled={verifyingNin}>
              Cancel
            </Button>
            <Button onClick={handleNinSubmit} disabled={verifyingNin || ninInput.length !== 11}>
              {verifyingNin ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Verify & Generate Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
