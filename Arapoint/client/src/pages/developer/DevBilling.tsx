import { useState, useEffect } from "react";
import { DevLayout } from "./DevLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Plus, RefreshCw, ArrowDownLeft, ArrowUpRight } from "lucide-react";
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

  useEffect(() => { fetchData(); }, []);

  const fundWallet = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 100) {
      toast({ title: "Minimum ₦100", variant: "destructive" });
      return;
    }
    setFunding(true);
    try {
      const res = await devFetch("/wallet/fund", {
        method: "POST",
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: `Wallet funded with ₦${amt.toLocaleString()}`, description: `New balance: ₦${data.data.newBalance.toLocaleString()}` });
        setShowFund(false);
        setAmount("");
        localStorage.setItem("dev_user", JSON.stringify({
          ...JSON.parse(localStorage.getItem("dev_user") || "{}"),
          walletBalance: data.data.newBalance,
        }));
        fetchData();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setFunding(false);
    }
  };

  const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

  return (
    <DevLayout>
      <div className="space-y-6">
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
            <Button size="sm" onClick={() => setShowFund(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Fund Wallet
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
                <Wallet className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-xs text-gray-400">Available Balance</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                ₦{(profile?.walletBalance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
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
                ₦{transactions
                  .filter(t => t.transaction_type === "wallet_funding")
                  .reduce((s, t) => s + parseFloat(t.amount || "0"), 0)
                  .toLocaleString('en-NG', { minimumFractionDigits: 2 })}
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
                ₦{transactions
                  .filter(t => t.transaction_type === "api_charge")
                  .reduce((s, t) => s + Math.abs(parseFloat(t.amount || "0")), 0)
                  .toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold">API Pricing Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: "NIN Verify", price: 130, color: "border-blue-800 bg-blue-950/40" },
                { name: "BVN Verify", price: 80, color: "border-green-800 bg-green-950/40" },
                { name: "Education", price: 250, color: "border-yellow-800 bg-yellow-950/40" },
                { name: "Unified", price: 400, color: "border-indigo-800 bg-indigo-950/40" },
              ].map(item => (
                <div key={item.name} className={`border rounded-lg p-3 ${item.color}`}>
                  <p className="text-xs text-gray-400">{item.name}</p>
                  <p className="text-base font-bold text-white mt-1">₦{item.price}</p>
                  <p className="text-xs text-gray-500">per request</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold">Transaction History</CardTitle>
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
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => {
                  const isCredit = tx.transaction_type === "wallet_funding";
                  const amount = Math.abs(parseFloat(tx.amount || "0"));
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
                      <p className={`text-sm font-semibold ${isCredit ? "text-green-400" : "text-red-400"}`}>
                        {isCredit ? "+" : "-"}₦{amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showFund} onOpenChange={setShowFund}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Fund Developer Wallet</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add balance to make API calls. Minimum ₦100.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Quick amounts</Label>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.map(a => (
                  <Button key={a} size="sm" variant="outline"
                    className={`border-gray-700 text-sm ${amount === a.toString() ? "border-indigo-500 text-indigo-400" : "text-gray-300"} hover:bg-gray-800`}
                    onClick={() => setAmount(a.toString())}>
                    ₦{a.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-gray-300 text-sm">Custom amount (₦)</Label>
              <Input
                type="number" min={100} max={1000000}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="mt-1.5 bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowFund(false)} className="text-gray-400">Cancel</Button>
            <Button onClick={fundWallet} disabled={funding || !amount} className="bg-indigo-600 hover:bg-indigo-700">
              {funding ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
              Fund ₦{parseFloat(amount || "0").toLocaleString()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DevLayout>
  );
}
