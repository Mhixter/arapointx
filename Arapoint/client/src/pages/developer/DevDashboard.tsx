import { useState, useEffect } from "react";
import { DevLayout } from "./DevLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, Key, Wallet, TrendingUp, CheckCircle, XCircle, RefreshCw,
  BarChart3, Clock, AlertCircle
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function DevDashboard() {
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

  const statCards = [
    { label: "Wallet Balance", value: `₦${(stats?.walletBalance || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`, icon: Wallet, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Total Requests", value: analytics?.summary?.totalCalls?.toLocaleString() || "0", icon: Activity, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Success Rate", value: `${analytics?.summary?.successRate || 0}%`, icon: TrendingUp, color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { label: "Active API Keys", value: stats?.activeApiKeys?.toString() || "0", icon: Key, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  ];

  const dailyData = (analytics?.daily || []).map((d: any) => ({
    day: new Date(d.day).toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
    calls: parseInt(d.calls) || 0,
    success: parseInt(d.success) || 0,
    spent: parseFloat(d.spent) || 0,
  }));

  const endpointData = (analytics?.endpoints || []).map((e: any) => ({
    endpoint: e.endpoint?.replace("/verify/", "") || e.endpoint,
    calls: parseInt(e.calls) || 0,
    spent: parseFloat(e.spent) || 0,
  })).slice(0, 6);

  return (
    <DevLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">API platform overview and usage analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setPeriod(d)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${period === d ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                  {d}d
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={fetchAll} disabled={loading}
              className="border-gray-700 text-gray-300 hover:bg-gray-800">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map(card => (
            <Card key={card.label} className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <p className="text-xs text-gray-400">{card.label}</p>
                <p className={`text-lg font-bold mt-0.5 ${card.color}`}>{loading ? "—" : card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary badges */}
        {analytics?.summary && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/5">
              <CheckCircle className="w-3 h-3 mr-1" />
              {analytics.summary.successCalls?.toLocaleString()} succeeded
            </Badge>
            <Badge variant="outline" className="text-red-400 border-red-500/30 bg-red-500/5">
              <XCircle className="w-3 h-3 mr-1" />
              {analytics.summary.errorCalls?.toLocaleString()} failed
            </Badge>
            <Badge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/5">
              <Clock className="w-3 h-3 mr-1" />
              Avg {analytics.summary.avgDurationMs}ms
            </Badge>
            <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 bg-yellow-500/5">
              ₦{parseFloat(analytics.summary.totalSpent || "0").toLocaleString("en-NG", { minimumFractionDigits: 2 })} spent
            </Badge>
          </div>
        )}

        {/* API Calls Chart */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              API Calls — Last {period} Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!dailyData.length ? (
              <div className="h-40 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No data for this period</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="calls" stroke="#6366f1" strokeWidth={2} dot={false} name="Total" />
                  <Line type="monotone" dataKey="success" stroke="#22c55e" strokeWidth={2} dot={false} name="Success" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Endpoint Breakdown */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm font-semibold">Top Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              {!endpointData.length ? (
                <div className="h-32 flex items-center justify-center text-gray-500 text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={endpointData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="endpoint" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="calls" fill="#6366f1" radius={[0, 4, 4, 0]} name="Calls" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent API Calls */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm font-semibold">Recent API Calls</CardTitle>
            </CardHeader>
            <CardContent>
              {!stats?.recentLogs?.length ? (
                <div className="text-center py-6 text-gray-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No API calls yet</p>
                  <p className="text-xs mt-1">Make your first call to see logs here</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {stats.recentLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center gap-2.5 py-1.5 border-b border-gray-800 last:border-0">
                      {log.status_code >= 200 && log.status_code < 300
                        ? <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        : <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-200 font-mono truncate">{log.endpoint}</p>
                        <p className="text-xs text-gray-600">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant="outline" className="text-xs text-gray-400 border-gray-700">{log.status_code}</Badge>
                        {log.cost > 0 && <p className="text-xs text-green-400 mt-0.5">₦{log.cost}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* API Pricing */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold">API Pricing Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { service: "NIN Verification", price: 130, color: "text-blue-400", bg: "bg-blue-500/10" },
                { service: "BVN Verification", price: 80, color: "text-green-400", bg: "bg-green-500/10" },
                { service: "Education Check", price: 250, color: "text-yellow-400", bg: "bg-yellow-500/10" },
                { service: "Employment Check", price: "350–450", color: "text-indigo-400", bg: "bg-indigo-500/10" },
                { service: "Unified Check", price: 400, color: "text-purple-400", bg: "bg-purple-500/10" },
                { service: "Fraud Score", price: 50, color: "text-red-400", bg: "bg-red-500/10" },
              ].map(item => (
                <div key={item.service} className={`${item.bg} rounded-lg p-3`}>
                  <p className="text-xs text-gray-400">{item.service}</p>
                  <p className={`text-sm font-bold mt-1 ${item.color}`}>₦{item.price}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DevLayout>
  );
}
