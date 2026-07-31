import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard, Plus, TrendingDown, TrendingUp, Wallet, X,
  ExternalLink, CheckCircle, Loader2, ArrowUpRight, Shield, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { screeningApi, formatCurrency, PRICING } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

const ease = [0.22, 1, 0.36, 1] as any;

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md border" style={{ borderColor: "#E5E7EB" }}>
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "#F4F6F8" }}>
          <div>
            <h2 className="font-bold" style={{ color: "#0F172A" }}>Fund Wallet</h2>
            <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>Secure payment via Paystack</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" style={{ color: "#64748B" }} />
          </button>
        </div>
        <form onSubmit={handleFund} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {presets.map(p => (
              <button key={p} type="button" onClick={() => setAmount(String(p))}
                className="py-3 rounded-xl text-sm font-semibold border transition-all"
                style={amount === String(p)
                  ? { background: "linear-gradient(135deg, #08B63E, #079C36)", color: "white", borderColor: "#08B63E" }
                  : { borderColor: "#E5E7EB", color: "#0F172A", background: "#F4F6F8" }}>
                ₦{p.toLocaleString()}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" style={{ color: "#0F172A" }}>Custom Amount</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount (min ₦1,000)" min={1000}
              className="h-11 rounded-xl text-sm" style={{ borderColor: "#E5E7EB", background: "#F4F6F8" }} />
          </div>
          {amount && Number(amount) >= 1000 && (
            <div className="rounded-xl p-3 text-sm flex justify-between items-center"
              style={{ background: "rgba(8,182,62,0.08)", border: "1px solid rgba(8,182,62,0.2)" }}>
              <span style={{ color: "#64748B" }}>Candidates you can screen:</span>
              <span className="font-bold" style={{ color: "#08B63E" }}>{Math.floor(Number(amount) / PRICING.total).toLocaleString()}</span>
            </div>
          )}
          <div className="rounded-xl p-3 text-xs flex items-start gap-2" style={{ background: "#F4F6F8", border: "1px solid #E5E7EB" }}>
            <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#64748B" }} />
            <span style={{ color: "#64748B" }}>You will be redirected to Paystack. Wallet credited immediately after payment.</span>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" type="button" onClick={onClose} className="flex-1 rounded-xl h-11"
              style={{ borderColor: "#E5E7EB" }}>Cancel</Button>
            <Button type="submit" disabled={loading || !amount || Number(amount) < 1000}
              className="flex-1 text-white rounded-xl h-11 font-semibold"
              style={{ background: "linear-gradient(135deg, #08B63E, #079C36)" }}>
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Redirecting...</>
                : <>Pay ₦{Number(amount || 0).toLocaleString()}</>}
            </Button>
          </div>
        </form>
      </motion.div>
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
          toast({ title: "Wallet funded!", description: "Your payment was successful." });
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
      <div className="mb-4 rounded-xl p-4 flex items-center gap-3"
        style={{ background: "rgba(8,182,62,0.08)", border: "1px solid rgba(8,182,62,0.2)" }}>
        <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: "#08B63E" }} />
        <p className="text-sm font-medium" style={{ color: "#08B63E" }}>Verifying payment...</p>
      </div>
    );
  }
  if (status === "success") {
    return (
      <div className="mb-4 rounded-xl p-4 flex items-center gap-3"
        style={{ background: "rgba(8,182,62,0.08)", border: "1px solid rgba(8,182,62,0.2)" }}>
        <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#08B63E" }} />
        <p className="text-sm font-medium" style={{ color: "#08B63E" }}>Payment successful! Wallet credited.</p>
      </div>
    );
  }
  return (
    <div className="mb-4 rounded-xl p-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
      <p className="text-sm font-medium" style={{ color: "#EF4444" }}>Payment verification failed. If you paid, it will be credited shortly.</p>
    </div>
  );
}

export default function BillingPage() {
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFund, setShowFund] = useState(false);

  const paystackRef = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("ref") : null;

  const load = () => {
    setLoading(true);
    screeningApi.billing.get().then(setBilling).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  return (
    <ScreeningDashboardLayout>
      {showFund && <FundModal onClose={() => setShowFund(false)} onSuccess={() => { setShowFund(false); load(); }} />}
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}
          className="flex items-center justify-between mb-7">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-3"
              style={{ background: "rgba(124,58,237,0.08)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.2)" }}>
              <CreditCard className="w-3 h-3" /> Billing
            </div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "#0F172A" }}>Billing & Wallet</h1>
            <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>Manage your wallet balance and screening credits</p>
          </div>
          <Button onClick={() => setShowFund(true)}
            className="text-white rounded-xl font-semibold shadow-md"
            style={{ background: "linear-gradient(135deg, #08B63E, #079C36)" }}>
            <Plus className="w-4 h-4 mr-2" /> Fund Wallet
          </Button>
        </motion.div>

        {paystackRef && <PaystackReturnBanner reference={paystackRef} onVerified={load} />}

        {/* Wallet + Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Wallet card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #08142B 0%, #102340 100%)" }}>
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none"
              style={{ background: "radial-gradient(circle, #08B63E, transparent)", transform: "translate(20%, -20%)" }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Wallet Balance</p>
              </div>
              <p className="text-3xl font-bold text-white">
                {loading ? "—" : formatCurrency(Number(billing?.walletBalance || 0))}
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                ≈ {loading ? "—" : Math.floor(Number(billing?.walletBalance || 0) / PRICING.total).toLocaleString()} screenings left
              </p>
              <button onClick={() => setShowFund(true)}
                className="mt-4 w-full py-2 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-1.5"
                style={{ background: "rgba(8,182,62,0.25)", border: "1px solid rgba(8,182,62,0.3)" }}>
                <Plus className="w-3.5 h-3.5" /> Fund via Paystack
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.07, ease }}
            className="bg-white rounded-2xl border p-5"
            style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.08)" }}>
                <TrendingDown className="w-4 h-4" style={{ color: "#EF4444" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "#64748B" }}>This Month</p>
            </div>
            <p className="text-2xl font-bold tracking-tight" style={{ color: "#0F172A" }}>
              {loading ? "—" : formatCurrency(Number(billing?.monthlySpend || 0))}
            </p>
            <p className="text-xs mt-1.5" style={{ color: "#64748B" }}>Total spend</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.14, ease }}
            className="bg-white rounded-2xl border p-5"
            style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(8,182,62,0.08)" }}>
                <Zap className="w-4 h-4" style={{ color: "#08B63E" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "#64748B" }}>Per Screening</p>
            </div>
            <p className="text-2xl font-bold tracking-tight" style={{ color: "#0F172A" }}>₦{PRICING.total.toLocaleString()}</p>
            <p className="text-xs mt-1.5" style={{ color: "#64748B" }}>NIN + BVN + Edu + Fraud</p>
          </motion.div>
        </div>

        {/* Pricing breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2, ease }}
          className="bg-white rounded-2xl border p-6 mb-6"
          style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-4 h-4" style={{ color: "#08B63E" }} />
            <h3 className="font-semibold text-sm" style={{ color: "#0F172A" }}>Pricing Breakdown</h3>
          </div>
          <div className="space-y-3">
            {[
              ["NIN Verification", PRICING.nin, "Real-time via Prembly"],
              ["BVN Verification", PRICING.bvn, "Real-time via Prembly"],
              ["Education Verification", PRICING.education, "WAEC, NECO, NABTEB, NBAIS"],
              ["Fraud & Risk Analysis", PRICING.fraud, "AI cross-check & scoring"],
            ].map(([label, price, desc]) => (
              <div key={String(label)} className="flex items-center justify-between py-2 border-b last:border-0"
                style={{ borderColor: "#F4F6F8" }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#0F172A" }}>{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{desc}</p>
                </div>
                <span className="text-sm font-bold" style={{ color: "#0F172A" }}>₦{Number(price).toLocaleString()}</span>
              </div>
            ))}
            <div className="pt-2 flex items-center justify-between">
              <span className="font-bold" style={{ color: "#0F172A" }}>Total per candidate</span>
              <span className="font-bold text-lg" style={{ color: "#08B63E" }}>₦{PRICING.total.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.28, ease }}
          className="bg-white rounded-2xl border overflow-hidden"
          style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#F4F6F8" }}>
            <h3 className="font-semibold text-sm" style={{ color: "#0F172A" }}>Transaction History</h3>
          </div>
          {loading ? (
            <div>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b animate-pulse" style={{ borderColor: "#F4F6F8" }}>
                  <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded-lg w-48" />
                    <div className="h-2 bg-gray-100 rounded-lg w-32" />
                  </div>
                  <div className="w-20 h-4 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : !billing?.transactions?.length ? (
            <div className="py-12 text-center">
              <p className="text-sm" style={{ color: "#64748B" }}>No transactions yet.</p>
            </div>
          ) : (
            <div>
              {billing.transactions.map((t: any, i: number) => (
                <motion.div key={t.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 px-6 py-3.5 border-b last:border-0"
                  style={{ borderColor: "#F4F6F8" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: t.type === "credit" ? "rgba(8,182,62,0.08)" : "rgba(239,68,68,0.08)" }}>
                    {t.type === "credit"
                      ? <TrendingUp className="w-4 h-4" style={{ color: "#08B63E" }} />
                      : <TrendingDown className="w-4 h-4" style={{ color: "#EF4444" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#0F172A" }}>{t.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{new Date(t.createdAt).toLocaleString("en-NG")}</p>
                  </div>
                  <span className="text-sm font-bold flex-shrink-0"
                    style={{ color: t.type === "credit" ? "#08B63E" : "#EF4444" }}>
                    {t.type === "credit" ? "+" : "-"}{formatCurrency(Number(t.amount))}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </ScreeningDashboardLayout>
  );
}
