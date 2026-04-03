import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DevLayout } from "./DevLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, Key, Wallet, TrendingUp, CheckCircle, XCircle, RefreshCw,
  BarChart3, Clock, AlertCircle, ArrowRight, ShieldCheck, Lock, Unlock,
  Zap, DollarSign
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
    <div className="bg-gray-900 border border-gray-700/80 rounded-lg p-2.5 text-xs shadow-xl">
      <p className="text-gray-400 mb-1.5 font-medium">{label}</p>
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
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

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
        localStorage.setItem("dev_user", JSON.stringify({
          ...JSON.parse(localStorage.getItem("dev_user") || "{}"),
          walletBalance: statsData.data.walletBalance,
        }));
      }
      if (analyticsData.status === "success") setAnalytics(analyticsData.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [period]);

  const kycStatus = stats?.kycStatus || "not_required";
  const envMode = stats?.environmentMode || "sandbox";
  const kycApproved = kycStatus === "approved";
  const kycSubmitted = kycStatus === "submitted";

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Overview</h1>
            <p className="text-sm text-gray-500 mt-0.5">API usage and account snapshot</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg overflow-hidden text-xs">
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setPeriod(d)}
                  className={`px-3 py-1.5 font-medium transition-colors ${period === d
                    ? "bg-indigo-600 text-white"
                    : "text-gray-500 hover:text-white hover:bg-gray-800"}`}>
                  {d}d
                </button>
              ))}
            </div>
            <button onClick={fetchAll} disabled={loading}
              className="p-1.5 rounded-lg border border-gray-800 text-gray-500 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-40">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── KYB / Sandbox Banner ── */}
        {!kycApproved && !kycSubmitted && (
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-800/50 rounded-xl p-5">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 to-purple-600/5" />
            <div className="relative flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-white">Unlock Live API Access</p>
                  <Badge className="bg-amber-900/60 text-amber-300 border-amber-700/60 text-[10px] px-1.5 py-0">
                    Sandbox Mode
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  You are currently in sandbox mode. Complete business verification (KYB) to access live identity data,
                  higher rate limits, and production API keys.
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <Button size="sm" onClick={() => setLocation("/developer/kyb")}
                    className="bg-indigo-600 hover:bg-indigo-500 h-8 px-4 text-xs font-medium">
                    Apply for Verification <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                  <span className="text-xs text-gray-600">Takes 24–72 hours to review</span>
                </div>
              </div>
              <div className="shrink-0 hidden sm:flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          </div>
        )}

        {kycSubmitted && (
          <div className="flex items-center gap-3 bg-yellow-950/40 border border-yellow-800/40 rounded-xl px-5 py-4">
            <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-300">KYB Application Under Review</p>
              <p className="text-xs text-yellow-600 mt-0.5">Our compliance team will respond within 24–72 hours.</p>
            </div>
            <Badge className="bg-yellow-900/60 text-yellow-300 border-yellow-700/50 text-xs">Pending</Badge>
          </div>
        )}

        {kycApproved && envMode === "live" && (
          <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl px-5 py-4">
            <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-300">Live Mode Active</p>
              <p className="text-xs text-emerald-700 mt-0.5">Your account has full access to production identity verification APIs.</p>
            </div>
            <Badge className="bg-emerald-900/60 text-emerald-300 border-emerald-700/50 text-xs">Live</Badge>
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
            <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className={`w-9 h-9 rounded-lg ${card.bg} border ${card.border} flex items-center justify-center mb-3`}>
                <card.icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
              <p className="text-xs text-gray-500 font-medium">{card.label}</p>
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              <DollarSign className="w-3 h-3" />
              ₦{parseFloat(analytics.summary.totalSpent || "0").toLocaleString("en-NG", { minimumFractionDigits: 2 })} spent
            </span>
          </div>
        )}

        {/* ── API Calls Chart ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-800">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">API Calls — Last {period} Days</h2>
            <div className="ml-auto flex items-center gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-indigo-500 inline-block rounded" />Total</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-emerald-500 inline-block rounded" />Success</span>
            </div>
          </div>
          <div className="p-5">
            {!dailyData.length ? (
              <div className="h-40 flex flex-col items-center justify-center text-gray-600">
                <Zap className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">No data for this period</p>
                <p className="text-xs mt-0.5 text-gray-700">Make your first API call to see analytics here</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
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
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-800">
              <Activity className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Top Endpoints</h2>
            </div>
            <div className="p-5">
              {!endpointData.length ? (
                <div className="h-32 flex items-center justify-center text-gray-600 text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={endpointData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="endpoint" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="calls" fill="#6366f1" radius={[0, 4, 4, 0]} name="Calls" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent API Calls */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-800">
              <Clock className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Recent API Calls</h2>
            </div>
            <div className="p-5">
              {!stats?.recentLogs?.length ? (
                <div className="h-32 flex flex-col items-center justify-center text-gray-600">
                  <Activity className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No API calls yet</p>
                  <p className="text-xs mt-0.5 text-gray-700">Make your first request to see activity</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {stats.recentLogs.map((log: any) => {
                    const code = log.statusCode ?? log.status_code ?? 0;
                    const ts = log.createdAt ?? log.created_at ?? "";
                    const ok = code >= 200 && code < 300;
                    return (
                      <div key={log.id} className="flex items-center gap-2.5 py-2 border-b border-gray-800/60 last:border-0">
                        {ok
                          ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-300 font-mono truncate">
                            {log.endpoint?.replace("/api/v1/developer", "") || log.endpoint}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">{ts ? new Date(ts).toLocaleString() : "—"}</p>
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-800">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-semibold text-white">API Pricing Reference</h2>
            <span className="text-xs text-gray-600 ml-auto">Per request, NGN</span>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { service: "NIN Verify", price: "₦130", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
              { service: "BVN Verify", price: "₦80", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
              { service: "Education", price: "₦250", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
              { service: "Employment", price: "₦350+", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
              { service: "Unified", price: "₦400", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
              { service: "Fraud Score", price: "₦50", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
            ].map(item => (
              <div key={item.service} className={`${item.bg} border ${item.border} rounded-lg p-3`}>
                <p className="text-xs text-gray-500 font-medium">{item.service}</p>
                <p className={`text-base font-bold mt-1 ${item.color}`}>{item.price}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DevLayout>
  );
}
