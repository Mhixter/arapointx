import { useState, useEffect } from "react";
import { DevLayout } from "./DevLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { PageSkeleton } from "@/components/developer/DashboardSkeleton";

function devFetch(path: string) {
  const token = localStorage.getItem("dev_token");
  return fetch(`/api/v1/developer${path}`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
}

export default function DevLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any | null>(null);
  const [envMode, setEnvMode] = useState<"sandbox" | "live">("sandbox");

  const fetchLogs = async (p = page, env?: string) => {
    setLoading(true);
    try {
      const currentEnv = env || envMode;
      const [logsRes, profileRes] = await Promise.all([
        devFetch(`/logs?page=${p}&environment=${currentEnv}`),
        !env ? devFetch("/profile") : Promise.resolve(null),
      ]);
      const logsData = await logsRes.json();
      if (logsData.status === "success") setLogs(logsData.data.logs);
      if (profileRes) {
        const pd = await profileRes.json();
        if (pd.status === "success") {
          const mode = pd.data.environmentMode || "sandbox";
          if (mode !== currentEnv) {
            setEnvMode(mode);
            const res2 = await devFetch(`/logs?page=${p}&environment=${mode}`);
            const d2 = await res2.json();
            if (d2.status === "success") setLogs(d2.data.logs);
          } else {
            setEnvMode(mode);
          }
        }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchLogs(1); }, []);

  const getStatusIcon = (code: number) => {
    if (code >= 200 && code < 300) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (code === 402) return <XCircle className="w-4 h-4 text-yellow-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return "bg-green-900/40 text-green-300 border-green-800";
    if (code === 402) return "bg-yellow-900/40 text-yellow-300 border-yellow-800";
    return "bg-red-900/40 text-red-300 border-red-800";
  };

  if (loading && logs.length === 0) {
    return <DevLayout><PageSkeleton /></DevLayout>;
  }

  return (
    <DevLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">API Logs</h1>
            <p className="text-sm text-gray-400 mt-0.5">Request history and debugging</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => fetchLogs(1)} disabled={loading}
            className="border-gray-700 text-gray-300 hover:bg-gray-800">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-semibold">Request Log</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-500" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No logs yet</p>
                    <p className="text-xs mt-1">Make your first API call to see logs here</p>
                  </div>
                ) : (
                  <div>
                    {logs.map((log, i) => (
                      <button
                        key={log.id}
                        onClick={() => setSelected(selected?.id === log.id ? null : log)}
                        className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800 transition-colors text-left ${selected?.id === log.id ? "bg-gray-800" : ""}`}
                      >
                        {getStatusIcon(log.statusCode)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-mono text-gray-300 truncate">{log.method} {log.endpoint}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
                            {log.durationMs && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />{log.durationMs}ms
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {parseFloat(log.cost || "0") > 0 && (
                            <span className="text-xs text-gray-500">₦{parseFloat(log.cost).toFixed(0)}</span>
                          )}
                          <Badge variant="outline" className={`text-xs ${getStatusColor(log.statusCode)}`}>
                            {log.statusCode}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            {logs.length > 0 && (
              <div className="flex justify-between mt-3">
                <Button size="sm" variant="outline" disabled={page === 1 || loading}
                  onClick={() => { setPage(p => p - 1); fetchLogs(page - 1); }}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800">Previous</Button>
                <span className="text-xs text-gray-500 self-center">Page {page}</span>
                <Button size="sm" variant="outline" disabled={logs.length < 20 || loading}
                  onClick={() => { setPage(p => p + 1); fetchLogs(page + 1); }}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800">Next</Button>
              </div>
            )}
          </div>

          <div>
            {selected ? (
              <Card className="bg-gray-900 border-gray-800 sticky top-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm font-semibold">Request Detail</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Endpoint</p>
                    <code className="text-xs text-gray-200 font-mono">{selected.method} {selected.endpoint}</code>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Status</p>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(selected.statusCode)}`}>
                      {selected.statusCode}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Time</p>
                    <p className="text-xs text-gray-200">{new Date(selected.createdAt).toLocaleString()}</p>
                  </div>
                  {selected.durationMs && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Duration</p>
                      <p className="text-xs text-gray-200">{selected.durationMs}ms</p>
                    </div>
                  )}
                  {parseFloat(selected.cost || "0") > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Cost</p>
                      <p className="text-xs text-green-400">₦{parseFloat(selected.cost).toFixed(2)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Request</p>
                    <pre className="bg-gray-800 rounded p-2 text-xs text-gray-300 overflow-auto max-h-40">
                      {JSON.stringify(selected.requestBody || {}, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Response</p>
                    <pre className="bg-gray-800 rounded p-2 text-xs text-gray-300 overflow-auto max-h-40">
                      {JSON.stringify(selected.responseBody || {}, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-6 text-center text-gray-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Select a log entry to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DevLayout>
  );
}
