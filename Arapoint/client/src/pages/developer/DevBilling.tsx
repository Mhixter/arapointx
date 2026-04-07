import { useState, useEffect } from "react";
import { DevLayout } from "./DevLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet, Plus, RefreshCw, ArrowDownLeft, ArrowUpRight,
  CreditCard, ExternalLink, CheckCircle, Info, AlertTriangle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";

function devFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("dev_token");
  return fetch(`/api/v1/developer${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options?.headers },
  });
}

export default function DevBilling() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFund, setShowFund] = useState(false);
  const [amount, setAmount] = useState("");
  const [funding, setFunding] = useState(false);
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<{
    paystackConfigured: boolean;
    developerMode: string;
  } | null>(null);

  const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

  const isSandbox = !gatewayStatus || gatewayStatus.developerMode === "sandbox";
  const paystackReady = gatewayStatus?.paystackConfigured === true;

  const fetchData = async () => {
    setLoading(true);
    try {
      const profileRes = await devFetch("/profile");
      const profileData = await profileRes.json();
      const currentEnv = profileData?.data?.environmentMode || "sandbox";
      const [txRes, gatewayRes] = await Promise.all([
        devFetch(`/transactions?environment=${currentEnv}`),
        devFetch("/billing/gateway-status"),
      ]);
      const [txData, gatewayData] = await Promise.all([
        txRes.json(), gatewayRes.json(),
      ]);
      if (profileData.status === "success") setProfile(profileData.data);
      if (txData.status === "success") setTransactions(txData.data.transactions);
      if (gatewayData.status === "success") setGatewayStatus(gatewayData.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    if (ref) {
      setPendingRef(ref);
      verifyPayment(ref);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const verifyPayment = async (reference: string) => {
    setVerifying(true);
    try {
      const res = await devFetch(`/billing/verify/${reference}`);
      const data = await res.json();
      if (data.status === "success") {
        const tx = data.data;
        if (tx.status === "successful") {
          toast({
            title: `₦${parseFloat(tx.amount_ngn).toLocaleString("en-NG", { minimumFractionDigits: 2 })} added to wallet!`,
            description: "Your wallet has been funded successfully.",
          });
          fetchData();
        } else if (tx.status === "pending") {
          toast({ title: "Payment pending", description: "Your payment is being processed. Refresh in a moment." });
        }
      }
    } catch {}
    setVerifying(false);
    setPendingRef(null);
  };

  const initiateFunding = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 100) {
      toast({ title: "Minimum ₦100", variant: "destructive" });
      return;
    }
    setFunding(true);
    try {
      const res = await devFetch("/billing/initiate", {
        method: "POST",
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setShowFund(false);
        setAmount("");
        window.location.href = data.data.authorizationUrl;
      } else {
        toast({ title: "Payment setup failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
    setFunding(false);
  };

  const totalFunded = transactions
    .filter(t => t.transactionType === "wallet_funding")
    .reduce((s, t) => s + Math.abs(parseFloat(t.amount || "0")), 0);

  const totalSpent = transactions
    .filter(t => t.transactionType === "api_charge")
    .reduce((s, t) => s + Math.abs(parseFloat(t.amount || "0")), 0);

  return (
    <DevLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Billing</h1>
            <p className="text-sm text-gray-400 mt-0.5">Wallet balance and transaction history</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={fetchData} disabled={loading}
              className="border-gray-700 text-gray-300 hover:bg-gray-800">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            {/* Fund Wallet button — only shown in live mode with Paystack configured */}
            {!isSandbox && paystackReady && (
              <Button size="sm" onClick={() => setShowFund(true)} className="bg-[#0B5FFF] hover:opacity-90">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Fund Wallet
              </Button>
            )}
          </div>
        </div>

        {/* Pending verification notice */}
        {verifying && (
          <div className="flex items-center gap-3 p-4 bg-[#0B5FFF1A] border border-[#0B5FFF]/30 rounded-xl">
            <RefreshCw className="w-4 h-4 text-[#0B5FFF] animate-spin flex-shrink-0" />
            <p className="text-sm text-[#0B5FFF]">Verifying your payment… please wait</p>
          </div>
        )}

        {/* ── SANDBOX mode banner ── */}
        {isSandbox && (
          <Card className="bg-amber-950/20 border border-amber-700/30">
            <CardContent className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Info className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-300">Sandbox Mode — Admin-Funded Testing</p>
                <p className="text-xs text-amber-200/70 mt-1 leading-relaxed">
                  In sandbox mode your wallet is funded directly by the Arapoint admin team for testing purposes.
                  No real payments are processed. Contact support or the admin portal to request a sandbox credit so you can test API calls.
                </p>
                <p className="text-xs text-amber-200/50 mt-2">
                  When you are ready to go live, complete KYB verification and your account will be upgraded to production mode where you can fund your wallet via Paystack.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── LIVE mode, Paystack NOT yet configured ── */}
        {!isSandbox && !paystackReady && (
          <Card className="bg-orange-950/20 border border-orange-700/30">
            <CardContent className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-orange-300">Payment Gateway Not Yet Configured</p>
                <p className="text-xs text-orange-200/70 mt-1 leading-relaxed">
                  The Paystack payment gateway has not been configured by the admin yet. Once configured, you will be able to fund your wallet here using debit/credit cards, bank transfer, or USSD.
                  Please check back shortly or contact support.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── LIVE mode, Paystack configured — info banner ── */}
        {!isSandbox && paystackReady && (
          <Card className="bg-[#12B76A0D] border-[#12B76A30]">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#12B76A1A] flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-[#12B76A]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Secure payments via Paystack</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Fund your wallet using debit/credit cards, bank transfer, or USSD. Powered by Paystack — Nigeria's leading payment processor.
                </p>
              </div>
              <CheckCircle className="w-5 h-5 text-[#12B76A] flex-shrink-0" />
            </CardContent>
          </Card>
        )}

        {/* Balance cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#111827] border border-[#1F2937]">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-xl bg-[#12B76A1A] flex items-center justify-center mb-3">
                <Wallet className="w-5 h-5 text-[#12B76A]" />
              </div>
              <p className="text-xs text-gray-400">Available Balance</p>
              <p className="text-2xl font-bold text-[#12B76A] mt-1">
                ₦{(profile?.walletBalance || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </p>
              {isSandbox && (
                <p className="text-xs text-amber-400/70 mt-1">Sandbox balance</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#111827] border border-[#1F2937]">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
                <ArrowDownLeft className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-xs text-gray-400">Total Credited</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                ₦{totalFunded.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#111827] border border-[#1F2937]">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
                <ArrowUpRight className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-xs text-gray-400">Total API Spend</p>
              <p className="text-2xl font-bold text-red-400 mt-1">
                ₦{totalSpent.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card className="bg-[#111827] border border-[#1F2937]">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold">Transaction History</CardTitle>
            <CardDescription className="text-xs text-gray-500">All wallet credits and API charges</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No transactions yet</p>
                <p className="text-xs mt-1">
                  {isSandbox
                    ? "Contact the admin to credit your sandbox wallet"
                    : "Fund your wallet to get started"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => {
                  const isCredit = tx.transactionType === "wallet_funding";
                  const amt = Math.abs(parseFloat(tx.amount || "0"));
                  const isAdminCredit = (tx.referenceId || "").startsWith("ADMIN-SANDBOX-");
                  return (
                    <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-gray-800 last:border-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isCredit ? "bg-[#12B76A1A]" : "bg-red-500/10"}`}>
                        {isCredit
                          ? <ArrowDownLeft className="w-3.5 h-3.5 text-[#12B76A]" />
                          : <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate">{tx.description || tx.transactionType}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p>
                          {isAdminCredit && (
                            <span className="text-xs text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded">Admin Credit</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isCredit ? "text-[#12B76A]" : "text-red-400"}`}>
                          {isCredit ? "+" : "-"}₦{amt.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                        </p>
                        <Badge variant="outline" className="text-xs border-gray-700 text-gray-500">
                          {tx.status || "successful"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fund Wallet Dialog — only rendered in live mode */}
      {!isSandbox && paystackReady && (
        <Dialog open={showFund} onOpenChange={setShowFund}>
          <DialogContent className="bg-[#111827] border border-[#1F2937] text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#0B5FFF]" />
                Fund Developer Wallet
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Pay securely via Paystack. You'll be redirected to complete payment, then returned here automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300 text-sm mb-2 block">Quick amounts</Label>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_AMOUNTS.map(a => (
                    <Button key={a} size="sm" variant="outline"
                      className={`border-gray-700 text-sm ${amount === a.toString() ? "border-[#0B5FFF] bg-[#0B5FFF0D] text-[#0B5FFF]" : "text-gray-300 hover:bg-gray-800"}`}
                      onClick={() => setAmount(a.toString())}>
                      ₦{a.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Custom amount (₦)</Label>
                <Input
                  type="number" min={100}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Enter amount (min ₦100)"
                  className="mt-1.5 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg">
                <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <p className="text-xs text-gray-400">Card, Bank Transfer, USSD — all payment methods supported via Paystack</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowFund(false)} className="text-gray-400">Cancel</Button>
              <Button onClick={initiateFunding} disabled={funding || !amount} className="bg-[#0B5FFF] hover:opacity-90">
                {funding ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <ExternalLink className="w-3.5 h-3.5 mr-2" />}
                Pay ₦{parseFloat(amount || "0").toLocaleString("en-NG")} via Paystack
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DevLayout>
  );
}
