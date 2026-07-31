import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Users, AlertTriangle, TrendingUp, Plus, ArrowRight,
  Zap, Brain, Activity, ArrowUpRight, Wallet, Sparkles, CheckCircle, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { screeningApi, getDecisionBg, getStatusBg, getScreeningSession } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

const ease = [0.22, 1, 0.36, 1] as any;

function MetricCard({ label, value, icon: Icon, trend, sub, accent, index }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl p-5 border cursor-default"
      style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium" style={{ color: "#64748B" }}>{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: accent?.bg || "rgba(8,182,62,0.08)" }}>
          <Icon className="w-4 h-4" style={{ color: accent?.color || "#08B63E" }} />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight" style={{ color: "#0F172A" }}>{value}</p>
      {sub && (
        <div className="flex items-center gap-1 mt-1.5">
          {trend === "up" && <ArrowUpRight className="w-3.5 h-3.5" style={{ color: "#08B63E" }} />}
          <p className="text-xs" style={{ color: trend === "up" ? "#08B63E" : "#64748B" }}>{sub}</p>
        </div>
      )}
    </motion.div>
  );
}

export default function ScreeningOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const session = getScreeningSession();
  const userName = session?.user?.name || session?.org?.name || "there";

  useEffect(() => {
    screeningApi.dashboard.stats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <ScreeningDashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Executive Intelligence Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
          className="relative rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #08142B 0%, #102340 60%, #0A1E38 100%)" }}>
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #08B63E, transparent)", transform: "translate(30%, -30%)" }} />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full opacity-5"
            style={{ background: "radial-gradient(circle, #2563EB, transparent)", transform: "translateY(40%)" }} />

          <div className="relative p-7">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
                  style={{ background: "rgba(8,182,62,0.15)", color: "#08B63E", border: "1px solid rgba(8,182,62,0.25)" }}>
                  <Zap className="w-3 h-3" />
                  Intelligence Platform Active
                </div>
                <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Welcome back,</p>
                <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{userName}</h1>
                {stats && (
                  <p className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {stats.totalScreenings.toLocaleString()} total screenings · {stats.passRate ?? 0}% pass rate
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Link href="/employment-screening/dashboard/screen">
                  <Button className="text-white font-semibold rounded-xl shadow-lg px-5"
                    style={{ background: "linear-gradient(135deg, #08B63E, #079C36)", boxShadow: "0 4px 20px rgba(8,182,62,0.4)" }}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Screening
                  </Button>
                </Link>
                <Link href="/employment-screening/dashboard/bulk">
                  <Button variant="outline" className="rounded-xl px-5"
                    style={{ borderColor: "rgba(255,255,255,0.2)", color: "white", background: "rgba(255,255,255,0.08)" }}>
                    Bulk Upload
                  </Button>
                </Link>
              </div>
            </div>

            {stats && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Completed", value: stats.completed?.toLocaleString() ?? "0", color: "#08B63E" },
                  { label: "In Progress", value: stats.inProgress?.toLocaleString() ?? "0", color: "#2563EB" },
                  { label: "Under Review", value: stats.review?.toLocaleString() ?? "0", color: "#F59E0B" },
                  { label: "Failed", value: stats.failed?.toLocaleString() ?? "0", color: "#EF4444" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-2xl p-3.5" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <p className="text-xl font-bold text-white">{value}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</p>
                    <div className="mt-2 h-0.5 rounded-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)`, opacity: 0.6 }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-28 border" style={{ borderColor: "#E5E7EB" }} />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard index={0} label="Total Screenings" value={stats.totalScreenings?.toLocaleString() ?? "0"} icon={Users}
              sub="All time" trend="up" accent={{ bg: "rgba(8,182,62,0.08)", color: "#08B63E" }} />
            <MetricCard index={1} label="Pass Rate" value={`${stats.passRate ?? 0}%`} icon={TrendingUp}
              sub="Of completed screenings" trend="up" accent={{ bg: "rgba(37,99,235,0.08)", color: "#2563EB" }} />
            <MetricCard index={2} label="Wallet Balance" value={`₦${Number(stats.walletBalance || 0).toLocaleString()}`} icon={Wallet}
              sub="Available credit" accent={{ bg: "rgba(124,58,237,0.08)", color: "#7C3AED" }} />
            <MetricCard index={3} label="Under Review" value={stats.review?.toLocaleString() ?? "0"} icon={AlertTriangle}
              sub={stats.review > 0 ? "Needs attention" : "All clear"} accent={{ bg: "rgba(245,158,11,0.08)", color: "#F59E0B" }} />
          </div>
        )}

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Screenings */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-2 bg-white rounded-2xl border overflow-hidden"
            style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#F4F6F8" }}>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: "#08B63E" }} />
                <h2 className="font-semibold" style={{ color: "#0F172A" }}>Recent Screenings</h2>
              </div>
              <Link href="/employment-screening/dashboard/candidates">
                <a className="flex items-center gap-1 text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: "#08B63E" }}>
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </Link>
            </div>
            <div>
              {loading && [...Array(5)].map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-3 animate-pulse border-b" style={{ borderColor: "#F4F6F8" }}>
                  <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded-lg w-32" />
                    <div className="h-2 bg-gray-100 rounded-lg w-24" />
                  </div>
                  <div className="h-5 w-16 bg-gray-100 rounded-lg" />
                </div>
              ))}
              {!loading && (!stats?.recentScreenings || stats.recentScreenings.length === 0) && (
                <div className="px-6 py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(8,182,62,0.08)" }}>
                    <Users className="w-6 h-6" style={{ color: "#08B63E" }} />
                  </div>
                  <p className="font-medium mb-1" style={{ color: "#0F172A" }}>No screenings yet</p>
                  <p className="text-sm" style={{ color: "#64748B" }}>Start your first candidate screening</p>
                  <Link href="/employment-screening/dashboard/screen">
                    <Button size="sm" className="mt-3 text-white rounded-xl" style={{ background: "#08B63E" }}>Start Screening</Button>
                  </Link>
                </div>
              )}
              {!loading && stats?.recentScreenings?.map((c: any, i: number) => (
                <motion.div key={c.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                  <Link href={`/employment-screening/dashboard/candidates/${c.id}`}>
                    <a className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/80 transition-colors group border-b last:border-0"
                      style={{ borderColor: "#F4F6F8" }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
                        style={{ background: "linear-gradient(135deg, #08142B, #2563EB)" }}>
                        {c.fullName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: "#0F172A" }}>{c.fullName}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{c.reference} · {c.position || "—"}</p>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        {c.overallScore !== null && c.overallScore !== undefined && (
                          <span className="text-sm font-bold" style={{ color: "#0F172A" }}>{c.overallScore}%</span>
                        )}
                        {c.decision ? (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getDecisionBg(c.decision)}`}>
                            {c.decision}
                          </span>
                        ) : (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusBg(c.status)}`}>
                            {c.status}
                          </span>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#64748B" }} />
                      </div>
                    </a>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right column */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.28 }}
            className="space-y-4">
            {/* AI Insight Panel */}
            <div className="rounded-2xl p-5 border overflow-hidden relative"
              style={{ background: "linear-gradient(135deg, #08142B 0%, #102340 100%)", borderColor: "rgba(8,182,62,0.2)" }}>
              <div className="absolute top-0 right-0 w-24 h-24 opacity-10 pointer-events-none"
                style={{ background: "radial-gradient(circle, #08B63E, transparent)", transform: "translate(30%, -30%)" }} />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4" style={{ color: "#08B63E" }} />
                  <p className="text-sm font-semibold text-white">AI Insights</p>
                  <div className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#08B63E" }} />
                </div>
                <div className="space-y-2">
                  {[
                    { icon: Shield, text: "No new fraud signals detected", ok: true },
                    { icon: CheckCircle, text: `${stats?.passRate ?? 0}% candidates cleared`, ok: true },
                    { icon: AlertTriangle, text: `${stats?.review ?? 0} items need review`, ok: (stats?.review ?? 0) === 0 },
                  ].map(({ icon: Icon, text, ok }, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: ok ? "#08B63E" : "#F59E0B" }} />
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#E5E7EB" }}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4" style={{ color: "#08B63E" }} />
                <h3 className="font-semibold text-sm" style={{ color: "#0F172A" }}>Quick Actions</h3>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Screen a Candidate", href: "/employment-screening/dashboard/screen", primary: true },
                  { label: "Bulk Upload CSV", href: "/employment-screening/dashboard/bulk", secondary: true },
                  { label: "View Analytics", href: "/employment-screening/dashboard/analytics", muted: true },
                  { label: "Fraud Center", href: "/employment-screening/dashboard/fraud", muted: true },
                ].map(({ label, href, primary, secondary }) => (
                  <Link key={href} href={href}>
                    <a className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={primary
                        ? { background: "linear-gradient(135deg, #08B63E, #079C36)", color: "white" }
                        : secondary
                          ? { background: "#0F172A", color: "white" }
                          : { background: "#F4F6F8", color: "#0F172A" }}>
                      {label}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </Link>
                ))}
              </div>
            </div>

            {/* Pricing Widget */}
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#E5E7EB" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm" style={{ color: "#0F172A" }}>Pricing</p>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(8,182,62,0.08)", color: "#08B63E" }}>Per candidate</span>
              </div>
              <div className="space-y-2">
                {[["NIN Verification", "₦130"], ["BVN Verification", "₦80"], ["Education Check", "₦120"], ["Fraud Analysis", "₦20"]].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center text-sm">
                    <span style={{ color: "#64748B" }}>{k}</span>
                    <span className="font-semibold" style={{ color: "#0F172A" }}>{v}</span>
                  </div>
                ))}
                <div className="pt-2 mt-1 border-t flex justify-between items-center" style={{ borderColor: "#E5E7EB" }}>
                  <span className="font-semibold text-sm" style={{ color: "#0F172A" }}>Total</span>
                  <span className="font-bold" style={{ color: "#08B63E" }}>₦350</span>
                </div>
              </div>
              <Link href="/employment-screening/dashboard/billing">
                <a className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                  style={{ background: "rgba(8,182,62,0.08)", color: "#08B63E" }}>
                  <Wallet className="w-3.5 h-3.5" /> Fund Wallet
                </a>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </ScreeningDashboardLayout>
  );
}
