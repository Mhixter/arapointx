import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DevLayout } from "./DevLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, Key, Wallet, TrendingUp, CheckCircle, XCircle, RefreshCw,
  BarChart3, Clock, AlertCircle, ArrowRight, ShieldCheck, Lock, Unlock,
  Zap, DollarSign, ToggleLeft, ToggleRight
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";

function devFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("dev_token");
  return fetch(`/api/v1/developer${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options?.headers },
  });
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg p-2.5 text-xs shadow-xl">
      <p className="text-slate-400 mb-1.5 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2" style={{ color: p.color }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function DevDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [envMode, setEnvMode] = useState<"sandbox" | "live">("sandbox");
  const [switching, setSwitching] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        devFetch("/dashboard/stats"),
        devFetch(`/analytics?days=${period}`),
      ]);
      const [statsData, analyticsData] = await Promise.all([statsRes.json(), analyticsRes.json()]);
      if (statsData.status === "success") {
        setStats(statsData.data);
        setEnvMode(statsData.data.environmentMode || "sandbox");
        localStorage.setItem("dev_user", JSON.stringify({
          ...JSON.parse(localStorage.getItem("dev_user") || "{}"),
          walletBalance: statsData.data.walletBalance,
        }));
      }
      if (analyticsData.status === "success") setAnalytics(analyticsData.data);
    } catch {}
    setLoading(false);
  };

  const switchMode = async (newMode: "sandbox" | "live") => {
    if (switching || newMode === envMode) return;
    setSwitching(true);
    try {
      const res = await devFetch("/mode", { method: "PATCH", body: JSON.stringify({ mode: newMode }) });
      const data = await res.json();
      if (data.status === "success") {
        setEnvMode(newMode);
        toast({
          title: `Switched to ${newMode === "live" ? "Live" : "Sandbox"} Mode`,
          description: newMode === "live"
            ? "Your API calls now use real identity data."
            : "Your API calls now return test data.",
        });
      } else {
        toast({ title: "Cannot switch mode", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to switch mode", variant: "destructive" });
    }
    setSwitching(false);
  };

  useEffect(() => { fetchAll(); }, [period]);

  const kycStatus = stats?.kycStatus || "not_required";
  const kycApproved = kycStatus === "approved";
  const kycSubmitted = kycStatus === "submitted";
  const isLive = envMode === "live";

  const dailyData = (analytics?.daily || []).map((d: any) => ({
    day: new Date(d.day).toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
    calls: parseInt(d.calls) || 0,
    success: parseInt(d.success) || 0,
    spent: parseFloat(d.spent) || 0,
  }));

  const endpointData = (analytics?.endpoints || []).map((e: any) => ({
    endpoint: e.endpoint?.replace("/verify/", "").replace("/api/v1/developer", "") || e.endpoint,
    calls: parseInt(e.calls) || 0,
  })).slice(0, 5);

  return (
    <DevLayout>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Overview</h1>
            <p className="text-sm text-slate-500 mt-0.5">API usage and account snapshot</p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap justify-end">

            {/* Sandbox / Live toggle — only visible when KYB approved */}
            {kycApproved && (
              <div className="flex items-center gap-1.5 bg-[#0f1117] border border-[#1e2230] rounded-lg p-1">
                <button
                  onClick={() => switchMode("sandbox")}
                  disabled={switching}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    !isLive
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Lock className="w-3 h-3" /> Sandbox
                </button>
                <button
                  onClick={() => switchMode("live")}
                  disabled={switching}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    isLive
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {isLive ? <Unlock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />} Live
                </button>
              </div>
            )}

            {/* Period filter */}
            <div className="flex items-center bg-[#0f1117] border border-[#1e2230] rounded-lg overflow-hidden text-xs">
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setPeriod(d)}
                  className={`px-3 py-1.5 font-medium transition-colors ${period === d
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:text-white hover:bg-[#1a1d27]"}`}>
                  {d}d
                </button>
              ))}
            </div>

            <button onClick={fetchAll} disabled={loading}
              className="p-1.5 rounded-lg border border-[#1e2230] text-slate-500 hover:text-white hover:bg-[#1a1d27] transition-colors disabled:opacity-40">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Mode indicator strip ── */}
        {kycApproved && (
          <div className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-medium border ${
            isLive
              ? "bg-emerald-950/30 border-emerald-800/30 text-emerald-300"
              : "bg-amber-950/30 border-amber-800/30 text-amber-300"
          }`}>
            {isLive ? <Unlock className="w-3.5 h-3.5 shrink-0" /> : <Lock className="w-3.5 h-3.5 shrink-0" />}
            {isLive
              ? "Live Mode — API calls use real identity data and deduct from wallet"
              : "Sandbox Mode — API calls return test data and are free"}
            {switching && <RefreshCw className="w-3 h-3 ml-auto animate-spin" />}
          </div>
        )}

        {/* ── KYB prompts ── */}
        {!kycApproved && !kycSubmitted && (
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950/70 to-violet-950/70 border border-indigo-800/40 rounded-xl p-5">
            <div className="relative flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-white">Unlock Live API Access</p>
                  <Badge className="bg-amber-900/60 text-amber-300 border-amber-700/60 text-[10px] px-1.5 py-0">Sandbox Only</Badge>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Complete business verification (KYB) to access live identity data, higher rate limits, and production API keys.
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <Button size="sm" onClick={() => setLocation("/developer/kyb")}
                    className="bg-indigo-600 hover:bg-indigo-500 h-8 px-4 text-xs font-medium">
                    Apply for Verification <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                  <span className="text-xs text-slate-600">Takes 24–72 hours</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {kycSubmitted && (
          <div className="flex items-center gap-3 bg-amber-950/30 border border-amber-800/30 rounded-xl px-5 py-3.5">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-300">KYB Application Under Review</p>
              <p className="text-xs text-amber-700 mt-0.5">Our compliance team will respond within 24–72 hours.</p>
            </div>
            <Badge className="bg-amber-900/50 text-amber-300 border-amber-700/50 text-xs">Pending</Badge>
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Wallet Balance",
              value: loading ? "—" : `₦${(stats?.walletBalance || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
              icon: Wallet, iconColor: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20"
            },
            {
              label: "API Requests",
              value: loading ? "—" : (analytics?.summary?.totalCalls?.toLocaleString() || "0"),
              icon: Activity, iconColor: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20"
            },
            {
              label: "Success Rate",
              value: loading ? "—" : `${analytics?.summary?.successRate || stats?.successRate || 0}%`,
              icon: TrendingUp, iconColor: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20"
            },
            {
              label: "Active Keys",
              value: loading ? "—" : (stats?.activeApiKeys?.toString() || "0"),
              icon: Key, iconColor: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20"
            },
          ].map(card => (
            <div key={card.label} className="bg-[#0f1117] border border-[#1e2230] rounded-xl p-4">
              <div className={`w-9 h-9 rounded-lg ${card.bg} border ${card.border} flex items-center justify-center mb-3`}>
                <card.icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
              <p className="text-xs text-slate-500 font-medium">{card.label}</p>
              <p className="text-xl font-bold text-white mt-0.5 tracking-tight">{card.value}</p>
            </div>
          ))}
        </div>

        {/* ── Summary Badges ── */}
        {analytics?.summary && (
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="w-3 h-3" />
              {analytics.summary.successCalls?.toLocaleString() || 0} succeeded
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
              <XCircle className="w-3 h-3" />
              {analytics.summary.errorCalls?.toLocaleString() || 0} failed
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Clock className="w-3 h-3" />
              avg {analytics.summary.avgDurationMs || 0}ms
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <DollarSign className="w-3 h-3" />
              ₦{parseFloat(analytics.summary.totalSpent || "0").toLocaleString("en-NG", { minimumFractionDigits: 2 })} spent
            </span>
          </div>
        )}

        {/* ── API Calls Chart ── */}
        <div className="bg-[#0f1117] border border-[#1e2230] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#1e2230]">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">API Calls — Last {period} Days</h2>
            <div className="ml-auto flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-indigo-500 inline-block rounded" />Total</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-emerald-500 inline-block rounded" />Success</span>
            </div>
          </div>
          <div className="p-5">
            {!dailyData.length ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-600">
                <Zap className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">No data for this period</p>
                <p className="text-xs mt-0.5 text-slate-700">Make your first API call to see analytics here</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1d27" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="calls" stroke="#6366f1" strokeWidth={2} dot={false} name="Total" />
                  <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} dot={false} name="Success" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Endpoints */}
          <div className="bg-[#0f1117] border border-[#1e2230] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#1e2230]">
              <Activity className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Top Endpoints</h2>
            </div>
            <div className="p-5">
              {!endpointData.length ? (
                <div className="h-32 flex items-center justify-center text-slate-600 text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={endpointData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1d27" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="endpoint" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="calls" fill="#6366f1" radius={[0, 4, 4, 0]} name="Calls" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent API Calls */}
          <div className="bg-[#0f1117] border border-[#1e2230] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#1e2230]">
              <Clock className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Recent API Calls</h2>
            </div>
            <div className="p-5">
              {!stats?.recentLogs?.length ? (
                <div className="h-32 flex flex-col items-center justify-center text-slate-600">
                  <Activity className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No API calls yet</p>
                  <p className="text-xs mt-0.5 text-slate-700">Make your first request to see activity</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {stats.recentLogs.map((log: any) => {
                    const code = log.statusCode ?? log.status_code ?? 0;
                    const ts = log.createdAt ?? log.created_at ?? "";
                    const ok = code >= 200 && code < 300;
                    return (
                      <div key={log.id} className="flex items-center gap-2.5 py-2 border-b border-[#1e2230]/60 last:border-0">
                        {ok
                          ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-300 font-mono truncate">
                            {log.endpoint?.replace("/api/v1/developer", "") || log.endpoint}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">{ts ? new Date(ts).toLocaleString() : "—"}</p>
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-medium ${ok ? "text-emerald-400 bg-emerald-900/30" : "text-red-400 bg-red-900/30"}`}>
                          {code}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* API Pricing Reference */}
        <div className="bg-[#0f1117] border border-[#1e2230] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#1e2230]">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">API Pricing Reference</h2>
            <span className="text-xs text-slate-600 ml-auto">Per request, NGN</span>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { service: "NIN Verify", price: "₦130", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
              { service: "BVN Verify", price: "₦80", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
              { service: "Education", price: "₦250", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
              { service: "Employment", price: "₦350+", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
              { service: "Unified", price: "₦400", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
              { service: "Fraud Score", price: "₦50", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
            ].map(item => (
              <div key={item.service} className={`${item.bg} border ${item.border} rounded-lg p-3`}>
                <p className="text-xs text-slate-500 font-medium">{item.service}</p>
                <p className={`text-base font-bold mt-1 ${item.color}`}>{item.price}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DevLayout>
  );
}
