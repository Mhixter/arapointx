import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { screeningApi } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

const TABS = ["Overview", "Trends", "Geography", "Source"];

function KpiCard({ label, value, change, positive }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${positive ? "text-green-600" : "text-red-500"}`}>
          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change}
        </div>
      )}
    </div>
  );
}

export default function ScreeningAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [tab, setTab] = useState("Overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    screeningApi.analytics().then(setAnalytics).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const pieData = analytics ? [
    { name: "Pass", value: analytics.overview.passCount, color: "#16a34a" },
    { name: "Review", value: analytics.overview.reviewCount, color: "#d97706" },
    { name: "Fail", value: analytics.overview.failCount, color: "#dc2626" },
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
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Verification Intelligence Analytics</h1>
            <p className="text-sm text-gray-500">Track screening performance and trends</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-white text-green-700 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-28 border border-gray-100" />)}
          </div>
        ) : analytics ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiCard label="Total Screenings" value={analytics.overview.total.toLocaleString()} change="18.6%" positive />
              <KpiCard label="Pass Rate" value={`${analytics.overview.passRate}%`} change="6.2%" positive />
              <KpiCard label="Review Rate" value={`${analytics.overview.reviewRate}%`} change="2.4%" positive={false} />
              <KpiCard label="Fail Rate" value={`${analytics.overview.failRate}%`} change="1.8%" positive={false} />
            </div>

            <div className="grid lg:grid-cols-3 gap-5 mb-5">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">Screenings Over Time</h3>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="screenings" stroke="#16a34a" strokeWidth={2} dot={{ fill: "#16a34a", r: 4 }} name="This Week" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center">
                    <p className="text-gray-400 text-sm">No trend data yet. Screen more candidates to see trends.</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">Risk Distribution</h3>
                {analytics.overview.total > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {pieData.map((entry: any, index: number) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [v, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-40 flex items-center justify-center"><p className="text-gray-400 text-sm text-center">No completed screenings yet.</p></div>
                )}
                <div className="flex justify-center gap-4 mt-2">
                  {[["Pass", "#16a34a"], ["Review", "#d97706"], ["Fail", "#dc2626"]].map(([k, c]) => (
                    <div key={k} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                      {k}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {providerData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">Education Providers Used</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={providerData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="provider" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#16a34a" radius={[6, 6, 0, 0]} name="Screenings" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100 p-5">
              <h3 className="font-semibold text-green-900 mb-3 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Insights
              </h3>
              <div className="space-y-2">
                {[
                  analytics.overview.passRate >= 70 ? `✓ Strong pass rate of ${analytics.overview.passRate}% — above industry average.` : `⚠ Pass rate is ${analytics.overview.passRate}% — consider reviewing your candidate pool.`,
                  analytics.overview.reviewCount > 0 ? `${analytics.overview.reviewCount} candidate(s) require manual review.` : "No candidates pending manual review.",
                  analytics.overview.total === 0 ? "Start screening candidates to generate insights." : `${analytics.overview.total.toLocaleString()} total screenings completed.`,
                ].map((msg, i) => <p key={i} className="text-sm text-green-800">{msg}</p>)}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-gray-400">No analytics data available yet.</div>
        )}
      </div>
    </ScreeningDashboardLayout>
  );
}
