import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DevLayout } from "./DevLayout";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, Key, Wallet, TrendingUp, CheckCircle, XCircle, RefreshCw,
  BarChart3, Clock, ArrowRight, ShieldCheck, Lock, Unlock, Zap, DollarSign
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

// ─── Shared style tokens ──────────────────────────────────────────────────────
const C = {
  bg: "#0A0A0A",
  card: "#111827",
  border: "#1F2937",
  text: "#E5E7EB",
  muted: "#6B7280",
  blue: "#0B5FFF",
  green: "#12B76A",
  amber: "#F59E0B",
  red: "#EF4444",
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}` }} className="rounded-lg p-2.5 text-xs shadow-xl">
      <p style={{ color: C.muted }} className="mb-1.5 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2" style={{ color: p.color }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent: string }) {
  return (
    <div className="rounded-xl p-4 sm:p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-3 sm:mb-4" style={{ background: `${accent}1A`, border: `1px solid ${accent}33` }}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: accent }} />
      </div>
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.muted }}>{label}</p>
      <p className="text-base sm:text-xl font-bold text-white tabular-nums truncate">{value}</p>
    </div>
  );
}

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
      const [sd, ad] = await Promise.all([statsRes.json(), analyticsRes.json()]);
      if (sd.status === "success") {
        setStats(sd.data);
        setEnvMode(sd.data.environmentMode || "sandbox");
        localStorage.setItem("dev_user", JSON.stringify({
          ...JSON.parse(localStorage.getItem("dev_user") || "{}"),
          walletBalance: sd.data.walletBalance,
        }));
      }
      if (ad.status === "success") setAnalytics(ad.data);
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
          description: newMode === "live" ? "API calls now use real identity data." : "API calls return test data.",
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
  }));

  const endpointData = (analytics?.endpoints || []).map((e: any) => ({
    endpoint: e.endpoint?.replace("/verify/", "").replace("/api/v1/developer", "") || e.endpoint,
    calls: parseInt(e.calls) || 0,
  })).slice(0, 5);

  return (
    <DevLayout>
      <div className="space-y-6">

        {/* ── Page header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm mt-0.5" style={{ color: C.muted }}>API usage and account overview</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Sandbox / Live toggle — KYB approved only */}
            {kycApproved && (
              <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <button
                  onClick={() => switchMode("sandbox")}
                  disabled={switching}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                  style={!isLive ? { background: `${C.amber}1A`, color: C.amber, border: `1px solid ${C.amber}40` } : { color: C.muted }}
                >
                  <Lock className="w-3 h-3" /> Sandbox
                </button>
                <button
                  onClick={() => switchMode("live")}
                  disabled={switching}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                  style={isLive ? { background: `${C.green}1A`, color: C.green, border: `1px solid ${C.green}40` } : { color: C.muted }}
                >
                  <Unlock className="w-3 h-3" /> Live
                </button>
              </div>
            )}

            {/* Period selector */}
            <div className="flex items-center overflow-hidden rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setPeriod(d)}
                  className="px-3 py-1.5 text-xs font-semibold transition-all"
                  style={period === d
                    ? { background: C.blue, color: "#fff" }
                    : { color: C.muted }}>
                  {d}d
                </button>
              ))}
            </div>

            <button onClick={fetchAll} disabled={loading}
              className="p-2 rounded-lg transition-colors disabled:opacity-40"
              style={{ background: C.card, border: `1px solid ${C.border}`, color: C.muted }}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Mode indicator ── */}
        {kycApproved && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium"
            style={isLive
              ? { background: `${C.green}0D`, border: `1px solid ${C.green}30`, color: C.green }
              : { background: `${C.amber}0D`, border: `1px solid ${C.amber}30`, color: C.amber }}>
            {isLive ? <Unlock className="w-4 h-4 shrink-0" /> : <Lock className="w-4 h-4 shrink-0" />}
            {isLive ? "Live Mode — API calls process real identity data and charge wallet" : "Sandbox Mode — API calls return test data and are free"}
            {switching && <RefreshCw className="w-3 h-3 ml-auto animate-spin" />}
          </div>
        )}

        {/* ── KYB Prompts ── */}
        {!kycApproved && !kycSubmitted && (
          <div className="relative overflow-hidden rounded-xl p-6" style={{ background: `${C.blue}0D`, border: `1px solid ${C.blue}30` }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${C.blue}1A`, border: `1px solid ${C.blue}33` }}>
                <ShieldCheck className="w-6 h-6" style={{ color: C.blue }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-sm font-bold text-white">Unlock Live API Access</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${C.amber}1A`, color: C.amber, border: `1px solid ${C.amber}40` }}>Sandbox Only</span>
                </div>
                <p className="text-sm" style={{ color: C.muted }}>
                  Complete business verification (KYB) to access real identity data, higher rate limits, and production API keys.
                </p>
                <button onClick={() => setLocation("/developer/kyb")}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: C.blue }}>
                  Apply for Verification <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {kycSubmitted && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl" style={{ background: `${C.amber}0D`, border: `1px solid ${C.amber}30` }}>
            <Clock className="w-5 h-5 shrink-0" style={{ color: C.amber }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: C.amber }}>KYB Application Under Review</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>Our compliance team will respond within 24–72 hours.</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: `${C.amber}1A`, color: C.amber }}>Pending</span>
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Wallet Balance"
            value={loading ? "—" : `₦${(stats?.walletBalance || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`}
            icon={Wallet} accent={C.green}
          />
          <StatCard
            label="API Requests"
            value={loading ? "—" : (analytics?.summary?.totalCalls?.toLocaleString() || "0")}
            icon={Activity} accent={C.blue}
          />
          <StatCard
            label="Success Rate"
            value={loading ? "—" : `${analytics?.summary?.successRate || stats?.successRate || 0}%`}
            icon={TrendingUp} accent="#8B5CF6"
          />
          <StatCard
            label="Active Keys"
            value={loading ? "—" : (stats?.activeApiKeys?.toString() || "0")}
            icon={Key} accent={C.amber}
          />
        </div>

        {/* ── Summary pills ── */}
        {analytics?.summary && (
          <div className="flex flex-wrap gap-2">
            {[
              { icon: CheckCircle, label: `${analytics.summary.successCalls?.toLocaleString() || 0} succeeded`, accent: C.green },
              { icon: XCircle, label: `${analytics.summary.errorCalls?.toLocaleString() || 0} failed`, accent: C.red },
              { icon: Clock, label: `avg ${analytics.summary.avgDurationMs || 0}ms`, accent: C.blue },
              { icon: DollarSign, label: `₦${parseFloat(analytics.summary.totalSpent || "0").toLocaleString("en-NG", { minimumFractionDigits: 2 })} spent`, accent: C.amber },
            ].map(({ icon: Icon, label, accent }) => (
              <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: `${accent}1A`, color: accent, border: `1px solid ${accent}33` }}>
                <Icon className="w-3 h-3" /> {label}
              </span>
            ))}
          </div>
        )}

        {/* ── Charts ── */}
        <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
            <BarChart3 className="w-4 h-4" style={{ color: C.blue }} />
            <h2 className="text-sm font-semibold text-white">API Calls — Last {period} Days</h2>
            <div className="ml-auto flex items-center gap-4 text-xs" style={{ color: C.muted }}>
              <span className="flex items-center gap-1.5"><span className="w-2 h-0.5 rounded inline-block" style={{ background: C.blue }} />Total</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-0.5 rounded inline-block" style={{ background: C.green }} />Success</span>
            </div>
          </div>
          <div className="p-5">
            {!dailyData.length ? (
              <div className="h-40 flex flex-col items-center justify-center" style={{ color: C.muted }}>
                <Zap className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No data for this period</p>
                <p className="text-xs mt-1" style={{ color: "#4B5563" }}>Make your first API call to see analytics</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="calls" stroke={C.blue} strokeWidth={2} dot={false} name="Total" />
                  <Line type="monotone" dataKey="success" stroke={C.green} strokeWidth={2} dot={false} name="Success" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Endpoints */}
          <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              <Activity className="w-4 h-4" style={{ color: C.blue }} />
              <h2 className="text-sm font-semibold text-white">Top Endpoints</h2>
            </div>
            <div className="p-5">
              {!endpointData.length ? (
                <div className="h-32 flex items-center justify-center text-sm" style={{ color: C.muted }}>No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={endpointData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
                    <XAxis type="number" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="endpoint" tick={{ fill: C.text, fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="calls" fill={C.blue} radius={[0, 4, 4, 0]} name="Calls" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent API Calls */}
          <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              <Clock className="w-4 h-4" style={{ color: "#8B5CF6" }} />
              <h2 className="text-sm font-semibold text-white">Recent API Calls</h2>
            </div>
            <div className="p-5">
              {!stats?.recentLogs?.length ? (
                <div className="h-32 flex flex-col items-center justify-center" style={{ color: C.muted }}>
                  <Activity className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No API calls yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {stats.recentLogs.map((log: any) => {
                    const code = log.statusCode ?? log.status_code ?? 0;
                    const ts = log.createdAt ?? log.created_at ?? "";
                    const ok = code >= 200 && code < 300;
                    return (
                      <div key={log.id} className="flex items-center gap-2.5 py-2.5" style={{ borderBottom: `1px solid ${C.border}60` }}>
                        {ok
                          ? <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: C.green }} />
                          : <XCircle className="w-3.5 h-3.5 shrink-0" style={{ color: C.red }} />
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono truncate text-white">
                            {log.endpoint?.replace("/api/v1/developer", "") || log.endpoint}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                            {ts ? new Date(ts).toLocaleString() : "—"}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold"
                          style={{ background: ok ? `${C.green}1A` : `${C.red}1A`, color: ok ? C.green : C.red }}>
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

        {/* ── Pricing Reference ── */}
        <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
            <DollarSign className="w-4 h-4" style={{ color: C.green }} />
            <h2 className="text-sm font-semibold text-white">API Pricing Reference</h2>
            <span className="text-xs ml-auto" style={{ color: C.muted }}>Per successful request · NGN</span>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { service: "NIN Verify", price: "₦130", accent: C.blue },
              { service: "BVN Verify", price: "₦80", accent: C.green },
              { service: "Education", price: "₦250", accent: C.amber },
              { service: "Employment", price: "₦350+", accent: "#8B5CF6" },
              { service: "Unified", price: "₦400", accent: "#EC4899" },
              { service: "Fraud Score", price: "₦50", accent: C.red },
            ].map(item => (
              <div key={item.service} className="rounded-xl p-4" style={{ background: `${item.accent}0D`, border: `1px solid ${item.accent}30` }}>
                <p className="text-xs font-medium mb-1.5" style={{ color: C.muted }}>{item.service}</p>
                <p className="text-lg font-bold" style={{ color: item.accent }}>{item.price}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DevLayout>
  );
}
