import { useEffect, useState } from "react";
import { CreditCard, Plus, TrendingDown, TrendingUp, Wallet, X, ExternalLink, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { screeningApi, formatCurrency, PRICING } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

function FundModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const presets = [5000, 10000, 25000, 50000];

  const handleFund = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (num < 1000) { toast({ title: "Minimum ₦1,000", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const data = await screeningApi.billing.initiatePaystack(num);
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        throw new Error("No payment URL returned");
      }
    } catch (err: any) {
      toast({ title: "Payment initiation failed", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Fund Wallet via Paystack</h2>
            <p className="text-xs text-gray-500 mt-0.5">Secure payment by Paystack</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleFund} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {presets.map(p => (
              <button key={p} type="button" onClick={() => setAmount(String(p))}
                className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${amount === String(p) ? "bg-blue-700 text-white border-blue-700" : "border-gray-200 text-gray-700 hover:border-blue-300"}`}>
                ₦{p.toLocaleString()}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Custom Amount</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount (min ₦1,000)" min={1000}
              className="h-11 rounded-xl border-gray-200" />
          </div>
          {amount && Number(amount) >= 1000 && (
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 flex justify-between">
              <span>Candidates you can screen:</span>
              <span className="font-bold">{Math.floor(Number(amount) / PRICING.total).toLocaleString()}</span>
            </div>
          )}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600 flex items-start gap-2">
            <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
            <span>You will be redirected to Paystack to complete payment. Your wallet will be credited immediately after.</span>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button type="submit" disabled={loading || !amount || Number(amount) < 1000}
              className="flex-1 bg-blue-700 hover:bg-blue-800 text-white rounded-xl">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Redirecting...</>
              ) : (
                <>Pay ₦{Number(amount || 0).toLocaleString()} via Paystack</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaystackReturnBanner({ reference, onVerified }: { reference: string; onVerified: () => void }) {
  const { toast } = useToast();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");

  useEffect(() => {
    screeningApi.billing.verifyPaystack(reference)
      .then(data => {
        if (data.status === "successful") {
          setStatus("success");
          toast({ title: "Wallet funded!", description: "Your payment was successful and your wallet has been credited." });
          onVerified();
          const url = new URL(window.location.href);
          url.searchParams.delete("ref");
          window.history.replaceState({}, "", url.toString());
        } else {
          setStatus("failed");
        }
      })
      .catch(() => setStatus("failed"));
  }, [reference]);

  if (status === "verifying") {
    return (
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
        <p className="text-sm text-blue-700 font-medium">Verifying your payment, please wait...</p>
      </div>
    );
  }
  if (status === "success") {
    return (
      <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <p className="text-sm text-green-700 font-medium">Payment successful! Your wallet has been credited.</p>
      </div>
    );
  }
  return (
    <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
      <p className="text-sm text-red-700 font-medium">Payment verification failed or is still pending. If you paid, it will be credited shortly.</p>
    </div>
  );
}

export default function BillingPage() {
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFund, setShowFund] = useState(false);

  const paystackRef = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("ref")
    : null;

  const load = () => {
    setLoading(true);
    screeningApi.billing.get().then(setBilling).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  return (
    <ScreeningDashboardLayout>
      {showFund && (
        <FundModal
          onClose={() => setShowFund(false)}
          onSuccess={() => { setShowFund(false); load(); }}
        />
      )}
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Billing & Wallet</h1>
            <p className="text-sm text-gray-500">Manage your wallet balance and transaction history</p>
          </div>
          <Button onClick={() => setShowFund(true)} className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Fund Wallet
          </Button>
        </div>

        {paystackRef && (
          <PaystackReturnBanner reference={paystackRef} onVerified={load} />
        )}

        {/* Wallet + Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="sm:col-span-1 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-blue-200" />
              <p className="text-blue-200 text-sm">Wallet Balance</p>
            </div>
            <p className="text-3xl font-bold">{loading ? "—" : formatCurrency(Number(billing?.walletBalance || 0))}</p>
            <p className="text-blue-200 text-xs mt-1">
              ≈ {loading ? "—" : Math.floor(Number(billing?.walletBalance || 0) / PRICING.total).toLocaleString()} screenings left
            </p>
            <button onClick={() => setShowFund(true)}
              className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium py-2 rounded-xl transition-all">
              + Fund via Paystack
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <p className="text-sm text-gray-500">This Month's Spend</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : formatCurrency(Number(billing?.monthlySpend || 0))}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-gray-500">Rate per Screening</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">₦{PRICING.total.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">NIN + BVN + Edu + Fraud</p>
          </div>
        </div>

        {/* Pricing breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Pricing Breakdown</h3>
          <div className="space-y-3">
            {[
              ["NIN Verification", PRICING.nin, "Real-time via Prembly"],
              ["BVN Verification", PRICING.bvn, "Real-time via Prembly"],
              ["Education Verification", PRICING.education, "WAEC, NECO, NABTEB, NBAIS"],
              ["Fraud & Risk Analysis", PRICING.fraud, "AI cross-check & scoring"],
            ].map(([label, price, desc]) => (
              <div key={String(label)} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <span className="text-sm font-bold text-gray-900">₦{Number(price).toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <span className="font-bold text-gray-900">Total per candidate</span>
              <span className="font-bold text-blue-700 text-lg">₦{PRICING.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Transaction history */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Transaction History</h3>
          </div>
          {loading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                  <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-48" /><div className="h-2 bg-gray-100 rounded w-32" /></div>
                  <div className="w-20 h-4 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : !billing?.transactions?.length ? (
            <div className="py-12 text-center"><p className="text-gray-400 text-sm">No transactions yet.</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {billing.transactions.map((t: any) => (
                <div key={t.id} className="flex items-center gap-4 px-6 py-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === "credit" ? "bg-green-50" : "bg-red-50"}`}>
                    {t.type === "credit" ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{t.description}</p>
                    <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString("en-NG")}</p>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${t.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                    {t.type === "credit" ? "+" : "-"}{formatCurrency(Number(t.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScreeningDashboardLayout>
  );
}
