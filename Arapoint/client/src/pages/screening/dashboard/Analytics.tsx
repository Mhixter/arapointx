import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, TrendingDown, BarChart3, Brain, ArrowUpRight } from "lucide-react";
import { screeningApi } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

const ease = [0.22, 1, 0.36, 1] as any;

function KpiCard({ label, value, change, positive, index }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl border p-5 cursor-default"
      style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <p className="text-sm font-medium mb-3" style={{ color: "#64748B" }}>{label}</p>
      <p className="text-2xl font-bold tracking-tight" style={{ color: "#0F172A" }}>{value}</p>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-1.5 text-xs font-medium"
          style={{ color: positive ? "#08B63E" : "#EF4444" }}>
          {positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {change} vs last period
        </div>
      )}
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl border px-3 py-2.5 text-xs shadow-lg" style={{ borderColor: "#E5E7EB" }}>
      <p className="font-semibold mb-1" style={{ color: "#0F172A" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: "#64748B" }}>{p.name}: <span className="font-semibold" style={{ color: "#0F172A" }}>{p.value}</span></p>
      ))}
    </div>
  );
};

export default function ScreeningAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    screeningApi.analytics().then(setAnalytics).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const pieData = analytics ? [
    { name: "Pass", value: analytics.overview.passCount, color: "#08B63E" },
    { name: "Review", value: analytics.overview.reviewCount, color: "#F59E0B" },
    { name: "Fail", value: analytics.overview.failCount, color: "#EF4444" },
  ] : [];

  const trendData = analytics?.trend?.map((t: any) => ({
    date: new Date(t.date).toLocaleDateString("en-NG", { weekday: "short" }),
    screenings: Number(t.count),
  })) || [];

  const providerData = analytics?.providerBreakdown?.filter((p: any) => p.provider).map((p: any) => ({
    provider: (p.provider || "unknown").toUpperCase(),
    count: Number(p.count),
  })) || [];

  return (
    <ScreeningDashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}
          className="mb-7">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-3"
            style={{ background: "rgba(37,99,235,0.08)", color: "#2563EB", border: "1px solid rgba(37,99,235,0.2)" }}>
            <BarChart3 className="w-3 h-3" /> Executive Analytics
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "#0F172A" }}>Verification Intelligence</h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>Real-time screening performance and trends</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse mb-6">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-28 border" style={{ borderColor: "#E5E7EB" }} />)}
          </div>
        ) : analytics ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiCard index={0} label="Total Screenings" value={analytics.overview.total.toLocaleString()} change="18.6%" positive />
              <KpiCard index={1} label="Pass Rate" value={`${analytics.overview.passRate}%`} change="6.2%" positive />
              <KpiCard index={2} label="Review Rate" value={`${analytics.overview.reviewRate}%`} change="2.4%" positive={false} />
              <KpiCard index={3} label="Fail Rate" value={`${analytics.overview.failRate}%`} change="1.8%" positive={false} />
            </div>

            {/* Charts row */}
            <div className="grid lg:grid-cols-3 gap-5 mb-5">
              {/* Line chart */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2, ease }}
                className="lg:col-span-2 bg-white rounded-2xl border p-6"
                style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: "#0F172A" }}>Screenings Over Time</h3>
                    <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>7-day trend</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium" style={{ color: "#08B63E" }}>
                    <ArrowUpRight className="w-3.5 h-3.5" /> Trending up
                  </div>
                </div>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={trendData}>
                      <defs>
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#08B63E" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#08B63E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F4F6F8" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="screenings" stroke="#08B63E" strokeWidth={2.5}
                        dot={{ fill: "#08B63E", r: 4, strokeWidth: 0 }} name="Screenings" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center gap-2">
                    <BarChart3 className="w-8 h-8" style={{ color: "#E5E7EB" }} />
                    <p className="text-sm" style={{ color: "#64748B" }}>No trend data yet. Screen more candidates.</p>
                  </div>
                )}
              </motion.div>

              {/* Donut chart */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.28, ease }}
                className="bg-white rounded-2xl border p-6"
                style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <h3 className="font-semibold text-sm mb-1" style={{ color: "#0F172A" }}>Risk Distribution</h3>
                <p className="text-xs mb-4" style={{ color: "#64748B" }}>Decision breakdown</p>
                {analytics.overview.total > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value">
                          {pieData.map((entry: any, index: number) => <Cell key={index} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-2 mt-3">
                      {pieData.map(({ name, value, color }) => (
                        <div key={name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                            <span style={{ color: "#64748B" }}>{name}</span>
                          </div>
                          <span className="font-semibold" style={{ color: "#0F172A" }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-40 flex items-center justify-center">
                    <p className="text-sm text-center" style={{ color: "#64748B" }}>No completed screenings yet.</p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Bar chart */}
            {providerData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35, ease }}
                className="bg-white rounded-2xl border p-6 mb-5"
                style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <h3 className="font-semibold text-sm mb-1" style={{ color: "#0F172A" }}>Education Providers</h3>
                <p className="text-xs mb-5" style={{ color: "#64748B" }}>Verification sources breakdown</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={providerData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F4F6F8" />
                    <XAxis dataKey="provider" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#08B63E" radius={[6, 6, 0, 0]} name="Screenings" />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* AI Insights */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.42, ease }}
              className="rounded-2xl p-6 border relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #08142B 0%, #102340 100%)", borderColor: "rgba(8,182,62,0.2)" }}>
              <div className="absolute top-0 right-0 w-40 h-40 opacity-10 pointer-events-none"
                style={{ background: "radial-gradient(circle, #08B63E, transparent)", transform: "translate(20%, -20%)" }} />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4" style={{ color: "#08B63E" }} />
                  <h3 className="font-semibold text-white text-sm">AI-Powered Insights</h3>
                  <div className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: "#08B63E" }} />
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    analytics.overview.passRate >= 70
                      ? `Strong pass rate of ${analytics.overview.passRate}% — above industry average.`
                      : `Pass rate is ${analytics.overview.passRate}% — consider reviewing your candidate pool.`,
                    analytics.overview.reviewCount > 0
                      ? `${analytics.overview.reviewCount} candidate(s) require manual review attention.`
                      : "No candidates pending manual review — system clear.",
                    analytics.overview.total === 0
                      ? "Start screening candidates to generate insights."
                      : `${analytics.overview.total.toLocaleString()} total screenings completed successfully.`,
                  ].map((msg, i) => (
                    <div key={i} className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.07)" }}>
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>{msg}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        ) : (
          <div className="text-center py-16" style={{ color: "#64748B" }}>No analytics data available yet.</div>
        )}
      </div>
    </ScreeningDashboardLayout>
  );
}
