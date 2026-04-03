import { useState, useEffect } from "react";
import { DevLayout } from "./DevLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Webhook, Copy, Trash2, CheckCircle, XCircle, RefreshCw,
  ShieldCheck, AlertTriangle, Send, Clock, Globe
} from "lucide-react";

function devFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("dev_token");
  return fetch(`/api/v1/developer${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options?.headers },
  });
}

export default function DevWebhooks() {
  const { toast } = useToast();
  const [config, setConfig] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [removingIp, setRemovingIp] = useState<string | null>(null);

  const [ipList, setIpList] = useState<string[]>([]);
  const [newIp, setNewIp] = useState("");
  const [addingIp, setAddingIp] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cfgRes, logsRes, ipRes] = await Promise.all([
        devFetch("/webhook"),
        devFetch("/webhook/logs"),
        devFetch("/security/ip-allowlist"),
      ]);
      const [cfgData, logsData, ipData] = await Promise.all([cfgRes.json(), logsRes.json(), ipRes.json()]);
      if (cfgData.status === "success") {
        setConfig(cfgData.data);
        setWebhookUrl(cfgData.data.webhookUrl || "");
      }
      if (logsData.status === "success") setLogs(logsData.data.logs || []);
      if (ipData.status === "success") setIpList(ipData.data.ipAllowlist || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const saveWebhook = async () => {
    if (webhookUrl && !webhookUrl.startsWith("https://")) {
      toast({ title: "URL must use HTTPS", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await devFetch("/webhook", {
        method: "POST",
        body: JSON.stringify({ webhookUrl, enabled: true }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setNewSecret(data.data.webhookSecret);
        setConfig(data.data);
        toast({ title: "Webhook configured", description: "Save your secret key — it won't be shown again." });
      } else {
        toast({ title: data.message, variant: "destructive" });
      }
    } catch {}
    setSaving(false);
  };

  const removeWebhook = async () => {
    try {
      await devFetch("/webhook", { method: "DELETE" });
      setConfig({ webhookUrl: null, webhookEnabled: false, hasSecret: false });
      setWebhookUrl("");
      setNewSecret(null);
      toast({ title: "Webhook removed" });
    } catch {}
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const res = await devFetch("/webhook/test", { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: "Test webhook sent", description: "Check your server for delivery." });
        setTimeout(fetchAll, 3000);
      } else {
        toast({ title: data.message, variant: "destructive" });
      }
    } catch {}
    setTesting(false);
  };

  const addIp = async () => {
    setAddingIp(true);
    try {
      const res = await devFetch("/security/ip-allowlist", {
        method: "POST",
        body: JSON.stringify({ ip: newIp }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setIpList(data.data.ipAllowlist);
        setNewIp("");
        toast({ title: "IP added to allowlist" });
      } else {
        toast({ title: data.message, variant: "destructive" });
      }
    } catch {}
    setAddingIp(false);
  };

  const removeIp = async (ip: string) => {
    setRemovingIp(ip);
    try {
      const res = await devFetch("/security/ip-allowlist", {
        method: "DELETE",
        body: JSON.stringify({ ip }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setIpList(data.data.ipAllowlist);
        toast({ title: "IP removed" });
      }
    } catch {}
    setRemovingIp(null);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied" });
  };

  const eventColor = (eventType: string) => {
    if (eventType?.includes("completed")) return "text-green-400 bg-green-500/10";
    if (eventType?.includes("failed")) return "text-red-400 bg-red-500/10";
    return "text-blue-400 bg-blue-500/10";
  };

  return (
    <DevLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Webhooks & Security</h1>
            <p className="text-sm text-gray-400 mt-0.5">Real-time delivery notifications and IP access controls</p>
          </div>
          <Button size="sm" variant="outline" onClick={fetchAll} disabled={loading}
            className="border-gray-700 text-gray-300 hover:bg-gray-800">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Webhook Setup */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0B5FFF1A] flex items-center justify-center">
                <Webhook className="w-4 h-4 text-[#0B5FFF]" />
              </div>
              <div>
                <CardTitle className="text-white text-sm font-semibold">Webhook Endpoint</CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Arapoint POSTs signed events to your server when async verifications complete.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {newSecret && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-300 font-semibold">Save your webhook secret — it won't be shown again</p>
                </div>
                <div className="flex items-center gap-2 bg-gray-950/50 rounded p-2 font-mono text-xs text-yellow-200 break-all">
                  <span className="flex-1">{newSecret}</span>
                  <button onClick={() => copy(newSecret)} className="flex-shrink-0 text-yellow-400 hover:text-yellow-200">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Badge variant="outline" className={config?.webhookEnabled ? "text-green-400 border-green-500/50" : "text-gray-500 border-gray-700"}>
                {config?.webhookEnabled ? "Active" : "Inactive"}
              </Badge>
              {config?.hasSecret && (
                <Badge variant="outline" className="text-[#0B5FFF] border-[#0B5FFF]/50">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Signed
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Your HTTPS Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://yourserver.com/webhooks/arapoint"
                  className="bg-gray-950 border-gray-700 text-white font-mono text-xs"
                />
                <Button onClick={saveWebhook} disabled={saving} size="sm" className="bg-[#0B5FFF] hover:opacity-90 flex-shrink-0">
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                </Button>
              </div>
              <p className="text-xs text-gray-500">Must use HTTPS. A new signing secret will be generated each time you save.</p>
            </div>

            {config?.webhookUrl && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={sendTest} disabled={testing || !config?.webhookEnabled}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800">
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {testing ? "Sending..." : "Send Test Event"}
                </Button>
                <Button size="sm" variant="outline" onClick={removeWebhook}
                  className="border-red-900/50 text-red-400 hover:bg-red-950">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Remove Webhook
                </Button>
              </div>
            )}

            <div className="mt-4 p-3 bg-gray-950 rounded-lg">
              <p className="text-xs text-gray-400 font-semibold mb-2">Verifying signatures (Node.js)</p>
              <pre className="text-xs text-green-300 overflow-x-auto">{`const crypto = require('crypto');
const sig = req.headers['x-arapoint-signature'];
const hash = crypto.createHmac('sha256', YOUR_WEBHOOK_SECRET)
  .update(JSON.stringify(req.body)).digest('hex');
if (hash !== sig) throw new Error('Invalid signature');`}</pre>
            </div>

            <div className="p-3 bg-gray-950 rounded-lg">
              <p className="text-xs text-gray-400 font-semibold mb-1">Events delivered</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {["verification.completed", "verification.failed", "verification.test"].map(e => (
                  <span key={e} className="text-xs font-mono bg-gray-800 text-gray-300 px-2 py-0.5 rounded">{e}</span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Arapoint retries failed deliveries at: 1 min → 5 min → 15 min → 1 hour</p>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Logs */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold">Delivery History</CardTitle>
            <CardDescription className="text-xs text-gray-500">Recent webhook delivery attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {!logs.length ? (
              <div className="text-center py-8 text-gray-500">
                <Webhook className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No delivery attempts yet</p>
                <p className="text-xs mt-1">Webhook events appear here once deliveries are attempted</p>
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                    {log.success
                      ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${eventColor(log.event_type)}`}>{log.event_type}</span>
                        {log.attempt > 1 && (
                          <span className="text-xs text-yellow-500">Attempt {log.attempt}</span>
                        )}
                      </div>
                      {log.error_message && (
                        <p className="text-xs text-red-400 mt-0.5 truncate">{log.error_message}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">{log.response_status ? `HTTP ${log.response_status}` : "No response"}</p>
                      <p className="text-xs text-gray-600 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* IP Allowlist */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <CardTitle className="text-white text-sm font-semibold">IP Allowlist</CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Restrict API key usage to specific IP addresses. Leave empty to allow all IPs.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newIp}
                onChange={e => setNewIp(e.target.value)}
                placeholder="192.168.1.100"
                className="bg-gray-950 border-gray-700 text-white font-mono text-xs"
              />
              <Button onClick={addIp} disabled={addingIp || !newIp} size="sm" className="bg-teal-600 hover:bg-teal-700 flex-shrink-0">
                {addingIp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Add IP"}
              </Button>
            </div>

            {ipList.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <p className="text-xs text-blue-300">All IPs are currently allowed. Add IPs above to restrict access.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ipList.map(ip => (
                  <div key={ip} className="flex items-center justify-between p-2.5 bg-gray-800 rounded-lg">
                    <span className="text-sm font-mono text-gray-200">{ip}</span>
                    <button onClick={() => removeIp(ip)} disabled={removingIp === ip}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-amber-400 mt-2">
                  ⚠ Only these {ipList.length} IP{ipList.length > 1 ? "s" : ""} can use your API keys. Make sure your server IP is included.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DevLayout>
  );
}
