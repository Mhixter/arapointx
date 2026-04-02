import { useState, useEffect } from "react";
import { DevLayout } from "./DevLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, AlertCircle, RefreshCw } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";

function devFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("dev_token");
  return fetch(`/api/v1/developer${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options?.headers },
  });
}

export default function DevApiKeys() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await devFetch("/api-keys");
      const data = await res.json();
      if (data.status === "success") setKeys(data.data.keys);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, []);

  const createKey = async () => {
    if (!keyName.trim()) return;
    setCreating(true);
    try {
      const res = await devFetch("/api-keys", {
        method: "POST",
        body: JSON.stringify({ keyName }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setNewKey(data.data.key.api_key);
        setShowCreate(false);
        setKeyName("");
        fetchKeys();
        toast({ title: "API key created!", description: "Copy it now — it won't be shown again in full." });
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    try {
      const res = await devFetch(`/api-keys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: "API key revoked" });
        fetchKeys();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
    setDeleteConfirm(null);
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Copied!", description: "API key copied to clipboard" });
  };

  const maskKey = (key: string) => key.slice(0, 8) + "•".repeat(Math.max(0, key.length - 12)) + key.slice(-4);

  return (
    <DevLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">API Keys</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage your API credentials</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={fetchKeys} disabled={loading}
              className="border-gray-700 text-gray-300 hover:bg-gray-800">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Key
            </Button>
          </div>
        </div>

        {newKey && (
          <Card className="bg-green-950 border-green-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-300">Save your API key now!</p>
                  <p className="text-xs text-green-400 mb-3">This is the only time you'll see the full key.</p>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-green-900 border border-green-700 rounded px-3 py-2 text-xs text-green-200 font-mono break-all">
                      {newKey}
                    </code>
                    <Button size="sm" onClick={() => copyKey(newKey)} className="bg-green-700 hover:bg-green-600 flex-shrink-0">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <button onClick={() => setNewKey(null)} className="text-green-500 hover:text-green-300 text-xs">Dismiss</button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold">Your API Keys</CardTitle>
            <CardDescription className="text-gray-400 text-xs">
              Use the <code className="bg-gray-800 px-1 rounded">X-API-Key</code> header to authenticate requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            ) : keys.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Key className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No API keys yet</p>
                <p className="text-xs mt-1">Create your first key to start making API calls</p>
                <Button size="sm" onClick={() => setShowCreate(true)} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Key
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {keys.map(key => (
                  <div key={key.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                      <Key className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">{key.key_name}</span>
                        <Badge variant={key.is_active ? "default" : "secondary"}
                          className={key.is_active ? "bg-green-900 text-green-300 text-xs" : "text-xs"}>
                          {key.is_active ? "Active" : "Revoked"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-gray-400 font-mono">
                          {visibleKeys.has(key.id) ? key.api_key : maskKey(key.api_key)}
                        </code>
                        <button
                          className="text-gray-600 hover:text-gray-400"
                          onClick={() => setVisibleKeys(s => {
                            const n = new Set(s);
                            n.has(key.id) ? n.delete(key.id) : n.add(key.id);
                            return n;
                          })}>
                          {visibleKeys.has(key.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">{key.total_requests?.toLocaleString() || 0} requests</span>
                        {key.last_used_at && (
                          <span className="text-xs text-gray-500">
                            Last used {new Date(key.last_used_at).toLocaleDateString()}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          Created {new Date(key.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => copyKey(key.api_key)}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-white">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      {key.is_active && (
                        <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(key.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-300 hover:bg-red-950">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold">Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-800 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">
{`curl -X POST https://arapoint.com.ng/api/v1/developer/verify/nin \\
  -H "X-API-Key: ara_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"nin": "12345678901"}'`}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription className="text-gray-400">Give your key a descriptive name</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-gray-300 text-sm">Key Name</Label>
            <Input
              value={keyName}
              onChange={e => setKeyName(e.target.value)}
              placeholder="e.g. Production Key, Mobile App"
              className="bg-gray-800 border-gray-700 text-white"
              onKeyDown={e => e.key === "Enter" && createKey()}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-gray-400">Cancel</Button>
            <Button onClick={createKey} disabled={creating || !keyName.trim()} className="bg-indigo-600 hover:bg-indigo-700">
              {creating ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Revoke API Key?</DialogTitle>
            <DialogDescription className="text-gray-400">
              This will immediately invalidate the key. Any applications using it will stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="text-gray-400">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && revokeKey(deleteConfirm)}>
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DevLayout>
  );
}
