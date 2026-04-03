import { useState, useEffect } from "react";
import { DevLayout } from "./DevLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Plus, RefreshCw, ArrowDownLeft, ArrowUpRight, CreditCard, ExternalLink, CheckCircle } from "lucide-react";
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

  const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];
  const hasPaystack = true; // Paystack integration enabled

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, txRes] = await Promise.all([
        devFetch("/profile"),
        devFetch("/transactions"),
      ]);
      const [profileData, txData] = await Promise.all([profileRes.json(), txRes.json()]);
      if (profileData.status === "success") setProfile(profileData.data);
      if (txData.status === "success") setTransactions(txData.data.transactions);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Check if returning from Paystack payment
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
          toast({
            title: "Payment pending",
            description: "Your payment is being processed. Refresh in a moment.",
          });
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
        // Redirect to Paystack
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
    .filter(t => t.transaction_type === "wallet_funding")
    .reduce((s, t) => s + Math.abs(parseFloat(t.amount || "0")), 0);

  const totalSpent = transactions
    .filter(t => t.transaction_type === "api_charge")
    .reduce((s, t) => s + Math.abs(parseFloat(t.amount || "0")), 0);

  return (
    <DevLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Billing</h1>
            <p className="text-sm text-gray-400 mt-0.5">Wallet balance, funding, and transaction history</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={fetchData} disabled={loading}
              className="border-gray-700 text-gray-300 hover:bg-gray-800">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={() => setShowFund(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Fund Wallet
            </Button>
          </div>
        </div>

        {/* Pending verification notice */}
        {verifying && (
          <div className="flex items-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
            <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
            <p className="text-sm text-indigo-300">Verifying your payment... please wait</p>
          </div>
        )}

        {/* Balance cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
                <Wallet className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-xs text-gray-400">Available Balance</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                ₦{(profile?.walletBalance || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
                <ArrowDownLeft className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-xs text-gray-400">Total Funded</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                ₦{totalFunded.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
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

        {/* Paystack info banner */}
        <Card className="bg-green-950/20 border-green-800/40">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Secure payments via Paystack</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Fund your wallet using debit/credit cards, bank transfer, or USSD. Powered by Paystack — Nigeria's leading payment processor.
              </p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="bg-gray-900 border-gray-800">
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
                <p className="text-xs mt-1">Fund your wallet to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => {
                  const isCredit = tx.transaction_type === "wallet_funding";
                  const amt = Math.abs(parseFloat(tx.amount || "0"));
                  return (
                    <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-gray-800 last:border-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isCredit ? "bg-green-500/10" : "bg-red-500/10"}`}>
                        {isCredit
                          ? <ArrowDownLeft className="w-3.5 h-3.5 text-green-400" />
                          : <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate">{tx.description || tx.transaction_type}</p>
                        <p className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isCredit ? "text-green-400" : "text-red-400"}`}>
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

      {/* Fund Wallet Dialog */}
      <Dialog open={showFund} onOpenChange={setShowFund}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
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
                    className={`border-gray-700 text-sm ${amount === a.toString() ? "border-indigo-500 bg-indigo-950/40 text-indigo-300" : "text-gray-300 hover:bg-gray-800"}`}
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
            <Button onClick={initiateFunding} disabled={funding || !amount} className="bg-indigo-600 hover:bg-indigo-700">
              {funding ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <ExternalLink className="w-3.5 h-3.5 mr-2" />}
              Pay ₦{parseFloat(amount || "0").toLocaleString("en-NG")} via Paystack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DevLayout>
  );
}
