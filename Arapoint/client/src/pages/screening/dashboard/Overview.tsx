import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Users, CheckCircle, Clock, AlertTriangle, XCircle, TrendingUp, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { screeningApi, getDecisionBg, getStatusBg, getScreeningSession } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function ScreeningOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const session = getScreeningSession();

  useEffect(() => {
    screeningApi.dashboard.stats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const userName = session?.user?.name || session?.org?.name || "there";

  return (
    <ScreeningDashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Hero */}
        <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] rounded-2xl p-6 mb-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-blue-200 text-sm">Welcome back,</p>
              <h1 className="text-2xl font-bold">{userName}</h1>
              {stats && <p className="text-blue-200 text-sm mt-1">You have {stats.totalScreenings.toLocaleString()} total screenings</p>}
            </div>
            <Link href="/employment-screening/dashboard/screen">
              <Button className="bg-white text-blue-700 hover:bg-blue-50 font-semibold rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Start New Screening
              </Button>
            </Link>
          </div>
          {stats && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Completed", value: stats.completed?.toLocaleString() },
                { label: "In Progress", value: stats.inProgress?.toLocaleString() },
                { label: "Under Review", value: stats.review?.toLocaleString() },
                { label: "Failed", value: stats.failed?.toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold">{value ?? "—"}</p>
                  <p className="text-blue-200 text-xs">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* KPI cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-pulse">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-28 border border-gray-100" />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Screenings" value={stats.totalScreenings?.toLocaleString() ?? "0"} icon={Users} color="bg-blue-50 text-blue-600" sub="All time" />
            <StatCard label="Pass Rate" value={`${stats.passRate ?? 0}%`} icon={TrendingUp} color="bg-green-50 text-green-600" sub="Of completed screenings" />
            <StatCard label="Wallet Balance" value={`₦${Number(stats.walletBalance || 0).toLocaleString()}`} icon={CheckCircle} color="bg-purple-50 text-purple-600" sub="Available" />
            <StatCard label="Under Review" value={stats.review?.toLocaleString() ?? "0"} icon={AlertTriangle} color="bg-yellow-50 text-yellow-600" sub="Needs attention" />
          </div>
        )}

        {/* Two columns: recent screenings + quick actions */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Recent Screenings</h2>
              <Link href="/employment-screening/dashboard/candidates">
                <a className="text-blue-700 text-sm font-medium flex items-center gap-1 hover:underline">
                  View all <ArrowRight className="w-3 h-3" />
                </a>
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {loading && [...Array(4)].map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-32" />
                    <div className="h-2 bg-gray-100 rounded w-24" />
                  </div>
                </div>
              ))}
              {!loading && stats?.recentScreenings?.length === 0 && (
                <div className="px-6 py-10 text-center">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No screenings yet. Start your first one.</p>
                  <Link href="/employment-screening/dashboard/screen">
                    <Button size="sm" className="mt-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl">Start Screening</Button>
                  </Link>
                </div>
              )}
              {!loading && stats?.recentScreenings?.map((c: any) => (
                <Link key={c.id} href={`/employment-screening/dashboard/candidates/${c.id}`}>
                  <a className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                      {c.fullName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{c.fullName}</p>
                      <p className="text-xs text-gray-400">{c.reference} · {c.position || "—"}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {c.overallScore !== null && c.overallScore !== undefined && (
                        <span className="text-sm font-bold text-gray-800">{c.overallScore}%</span>
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
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { label: "Screen a Candidate", href: "/employment-screening/dashboard/screen", color: "bg-blue-700 text-white hover:bg-blue-800" },
                  { label: "Bulk Upload CSV", href: "/employment-screening/dashboard/bulk", color: "bg-gray-900 text-white hover:bg-gray-800" },
                  { label: "View Analytics", href: "/employment-screening/dashboard/analytics", color: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
                  { label: "Fraud Center", href: "/employment-screening/dashboard/fraud", color: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
                ].map(({ label, href, color }) => (
                  <Link key={href} href={href}>
                    <a className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${color}`}>
                      {label}
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </Link>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5">
              <p className="font-semibold text-blue-900 mb-1 text-sm">Pricing</p>
              <div className="space-y-1.5">
                {[["NIN Verification", "₦130"], ["BVN Verification", "₦80"], ["Education Check", "₦120"], ["Fraud Analysis", "₦20"]].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-blue-700">{k}</span>
                    <span className="font-semibold text-blue-900">{v}</span>
                  </div>
                ))}
                <div className="border-t border-blue-200 pt-1.5 flex justify-between text-sm font-bold text-blue-900">
                  <span>Total per candidate</span><span>₦350</span>
                </div>
              </div>
              <Link href="/employment-screening/dashboard/billing">
                <a className="mt-3 block text-center text-xs text-blue-700 font-semibold hover:underline">Fund Wallet</a>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ScreeningDashboardLayout>
  );
}
