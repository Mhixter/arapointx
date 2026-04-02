import { useState, useEffect } from "react";
import { DevLayout } from "./DevLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Key, Wallet, TrendingUp, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Stats {
  walletBalance: number;
  totalRequests: number;
  successCount: number;
  totalSpent: number;
  requestsThisMonth: number;
  successRate: number;
  activeApiKeys: number;
  recentLogs: any[];
}

function devFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("dev_token");
  return fetch(`/api/v1/developer${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options?.headers },
  });
}

export default function DevDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await devFetch("/dashboard/stats");
      const data = await res.json();
      if (data.status === "success") {
        setStats(data.data);
        localStorage.setItem("dev_user", JSON.stringify({
          ...JSON.parse(localStorage.getItem("dev_user") || "{}"),
          walletBalance: data.data.walletBalance,
        }));
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const statCards = [
    { label: "Wallet Balance", value: `₦${(stats?.walletBalance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, icon: Wallet, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Total Requests", value: stats?.totalRequests?.toLocaleString() || "0", icon: Activity, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Success Rate", value: `${stats?.successRate || 0}%`, icon: TrendingUp, color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { label: "Active API Keys", value: stats?.activeApiKeys?.toString() || "0", icon: Key, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  ];

  return (
    <DevLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">API platform overview</p>
          </div>
          <Button size="sm" variant="outline" onClick={fetchStats} disabled={loading}
            className="border-gray-700 text-gray-300 hover:bg-gray-800">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-semibold">API Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { service: "NIN Verification", price: 130, color: "text-blue-400" },
                { service: "BVN Verification", price: 80, color: "text-green-400" },
                { service: "Education Verification", price: 250, color: "text-yellow-400" },
                { service: "Unified Verification", price: 400, color: "text-indigo-400" },
              ].map(item => (
                <div key={item.service} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <span className="text-sm text-gray-300">{item.service}</span>
                  <Badge variant="outline" className={`${item.color} border-current`}>₦{item.price}/request</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-semibold">Recent API Calls</CardTitle>
            </CardHeader>
            <CardContent>
              {!stats?.recentLogs?.length ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No API calls yet</p>
                  <p className="text-xs mt-1">Make your first API call to see logs here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.recentLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                      {log.status_code >= 200 && log.status_code < 300
                        ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        : log.status_code === 402
                          ? <XCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                          : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-200 font-mono truncate">{log.endpoint}</p>
                        <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleTimeString()}</p>
                      </div>
                      <Badge variant="outline" className="text-xs text-gray-400 border-gray-700">
                        {log.status_code}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold">Quick Start</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Generate API Key", desc: "Create your first API key in the API Keys section", color: "bg-indigo-600" },
                { step: "2", title: "Fund Your Wallet", desc: "Add balance to your developer wallet to make API calls", color: "bg-green-600" },
                { step: "3", title: "Make API Calls", desc: "Use X-API-Key header to authenticate your requests", color: "bg-blue-600" },
              ].map(item => (
                <div key={item.step} className="flex gap-3">
                  <div className={`w-7 h-7 rounded-full ${item.color} flex items-center justify-center flex-shrink-0 text-xs font-bold`}>
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DevLayout>
  );
}
