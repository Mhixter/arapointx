import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DevLayout } from "./DevLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Key, Plus, Copy, Trash2, Eye, EyeOff, RefreshCw,
  ShieldCheck, AlertCircle, Info, CheckCircle, ChevronRight,
  Lock, Unlock, Terminal
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog";

function devFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("dev_token");
  return fetch(`/api/v1/developer${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options?.headers },
  });
}

interface ApiKey {
  id: string;
  key_name: string;
  api_key: string;
  secret_key_last_four: string;
  environment: string;
  is_active: boolean;
  last_used_at: string | null;
  total_requests: number;
  created_at: string;
  secretKey?: string;
}

export default function DevApiKeys() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createEnv, setCreateEnv] = useState<"sandbox" | "live">("sandbox");
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newCreds, setNewCreds] = useState<{ apiKey: string; secretKey: string; env: string } | null>(null);
  const [visibleApiKeys, setVisibleApiKeys] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [keysRes, profileRes] = await Promise.all([
        devFetch("/api-keys"),
        devFetch("/profile"),
      ]);
      const [kd, pd] = await Promise.all([keysRes.json(), profileRes.json()]);
      if (kd.status === "success") setKeys(kd.data.keys);
      if (pd.status === "success") setProfile(pd.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createKey = async () => {
    if (!keyName.trim()) return;
    setCreating(true);
    try {
      const res = await devFetch("/api-keys", {
        method: "POST",
        body: JSON.stringify({ keyName, environment: createEnv }),
      });
      const data = await res.json();
      if (data.status === "success") {
        const k = data.data.key;
        setNewCreds({ apiKey: k.api_key, secretKey: k.secretKey, env: createEnv });
        setShowCreate(false);
        setKeyName("");
        load();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
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
        load();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
    setDeleteConfirm(null);
  };

  const copy = (text: string, label = "Copied!") => {
    navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  const maskKey = (key: string) =>
    key.slice(0, 12) + "•".repeat(Math.max(0, key.length - 16)) + key.slice(-4);

  const sandboxKeys = keys.filter(k => k.environment === "sandbox" && k.is_active);
  const liveKeys = keys.filter(k => k.environment === "live" && k.is_active);
  const revokedKeys = keys.filter(k => !k.is_active);
  const kycApproved = profile?.kycStatus === "approved";

  return (
    <DevLayout>
      <div className="max-w-2xl space-y-1">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">API Credentials</h1>
            <p className="text-sm text-gray-500 mt-0.5">Account ID, API keys, and secret keys</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={load} disabled={loading}
              className="text-gray-400 hover:text-white h-9 w-9 p-0">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={() => { setCreateEnv("sandbox"); setShowCreate(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 h-9 px-4">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Key
            </Button>
          </div>
        </div>

        {/* Account ID */}
        {profile && (
          <CredCard
            title="Account ID"
            icon={<Info className="w-4 h-4" />}
            subtitle="Your unique Arapoint developer account identifier"
          >
            <CopyField label="Account ID" value={profile.accountId || profile.id} onCopy={() => copy(profile.accountId || profile.id, "Account ID copied")} />
            <div className="flex items-center gap-2 mt-3">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                ${profile.environmentMode === "live"
                  ? "bg-emerald-950/50 border-emerald-800/60 text-emerald-400"
                  : "bg-amber-950/50 border-amber-800/60 text-amber-400"}`}>
                {profile.environmentMode === "live"
                  ? <><Unlock className="w-3 h-3" /> Live Mode</>
                  : <><Lock className="w-3 h-3" /> Sandbox Mode</>}
              </div>
              <span className="text-xs text-gray-600">
                {profile.environmentMode === "live"
                  ? "Full API access active"
                  : "Testing environment — no real data processed"}
              </span>
            </div>
          </CredCard>
        )}

        {/* New credentials reveal */}
        {newCreds && (
          <div className="bg-emerald-950 border border-emerald-800 rounded-xl p-5 mt-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-300 text-sm">Save these credentials now</p>
                <p className="text-xs text-emerald-500 mt-0.5">Your Secret Key is only shown once and cannot be retrieved again.</p>
              </div>
              <button onClick={() => setNewCreds(null)} className="ml-auto text-emerald-600 hover:text-emerald-400 text-xs">Dismiss</button>
            </div>
            <div className="space-y-3">
              <CopyField label="API Key" value={newCreds.apiKey} mono dark
                onCopy={() => copy(newCreds.apiKey, "API Key copied")} />
              <CopyField label="Secret Key" value={newCreds.secretKey} mono dark secret
                onCopy={() => copy(newCreds.secretKey, "Secret Key copied")} />
              <div className="flex items-center gap-2">
                <Badge className={newCreds.env === "live"
                  ? "bg-emerald-900 text-emerald-300 border-emerald-700 text-xs"
                  : "bg-amber-900 text-amber-300 border-amber-700 text-xs"}>
                  {newCreds.env === "live" ? "Live" : "Sandbox"}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Sandbox Keys */}
        <CredCard
          title="Sandbox Keys"
          icon={<Terminal className="w-4 h-4" />}
          subtitle="Use for development and testing — no real identity data"
          badge={<Badge className="bg-amber-950/80 text-amber-300 border-amber-800/60 text-xs ml-auto">Testing</Badge>}
        >
          {loading ? (
            <div className="flex justify-center py-6"><RefreshCw className="w-4 h-4 animate-spin text-gray-600" /></div>
          ) : sandboxKeys.length === 0 ? (
            <EmptyKeys env="sandbox" onCreate={() => { setCreateEnv("sandbox"); setShowCreate(true); }} />
          ) : (
            <div className="space-y-3">
              {sandboxKeys.map(k => (
                <KeyRow key={k.id} apiKey={k}
                  visible={visibleApiKeys.has(k.id)}
                  onToggleVisible={() => setVisibleApiKeys(s => {
                    const n = new Set(s); n.has(k.id) ? n.delete(k.id) : n.add(k.id); return n;
                  })}
                  onCopy={() => copy(k.api_key, "API Key copied")}
                  onRevoke={() => setDeleteConfirm(k.id)}
                  maskFn={maskKey}
                />
              ))}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-gray-800/60">
            <Button size="sm" variant="ghost" onClick={() => { setCreateEnv("sandbox"); setShowCreate(true); }}
              className="text-gray-400 hover:text-indigo-400 text-xs h-7 px-2">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Sandbox Key
            </Button>
          </div>
        </CredCard>

        {/* Live Keys */}
        <CredCard
          title="Live Keys"
          icon={<ShieldCheck className="w-4 h-4" />}
          subtitle="Production credentials — real identity verification"
          badge={<Badge className="bg-emerald-950/80 text-emerald-300 border-emerald-800/60 text-xs ml-auto">Production</Badge>}
        >
          {!kycApproved ? (
            <div className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <Lock className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-300 font-medium">Business verification required</p>
                <p className="text-xs text-gray-500 mt-0.5">Complete and get your KYB (Know Your Business) approved to unlock live API access.</p>
              </div>
              <Button size="sm" onClick={() => setLocation("/developer/kyb")}
                className="bg-indigo-600 hover:bg-indigo-700 h-8 px-3 text-xs shrink-0">
                Apply <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-6"><RefreshCw className="w-4 h-4 animate-spin text-gray-600" /></div>
          ) : liveKeys.length === 0 ? (
            <EmptyKeys env="live" onCreate={() => { setCreateEnv("live"); setShowCreate(true); }} />
          ) : (
            <div className="space-y-3">
              {liveKeys.map(k => (
                <KeyRow key={k.id} apiKey={k}
                  visible={visibleApiKeys.has(k.id)}
                  onToggleVisible={() => setVisibleApiKeys(s => {
                    const n = new Set(s); n.has(k.id) ? n.delete(k.id) : n.add(k.id); return n;
                  })}
                  onCopy={() => copy(k.api_key, "API Key copied")}
                  onRevoke={() => setDeleteConfirm(k.id)}
                  maskFn={maskKey}
                />
              ))}
            </div>
          )}
          {kycApproved && (
            <div className="mt-3 pt-3 border-t border-gray-800/60">
              <Button size="sm" variant="ghost" onClick={() => { setCreateEnv("live"); setShowCreate(true); }}
                className="text-gray-400 hover:text-emerald-400 text-xs h-7 px-2">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Live Key
              </Button>
            </div>
          )}
        </CredCard>

        {/* Usage example */}
        <CredCard title="How to use" icon={<Terminal className="w-4 h-4" />} subtitle="Pass your API Key in the X-API-Key header">
          <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto leading-relaxed">
{`curl -X POST https://arapoint.com.ng/api/v1/developer/verify/nin \\
  -H "X-API-Key: ara_sand_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"nin": "12345678901"}'`}
          </pre>
          <p className="text-xs text-gray-600 mt-2">
            Your <span className="text-gray-400 font-mono">Secret Key</span> is used to verify webhook signatures sent to your server — never send it in API requests.
          </p>
        </CredCard>

        {/* Revoked keys */}
        {revokedKeys.length > 0 && (
          <CredCard title={`Revoked Keys (${revokedKeys.length})`} icon={<Key className="w-4 h-4" />} subtitle="Inactive — no longer usable">
            <div className="space-y-2">
              {revokedKeys.map(k => (
                <div key={k.id} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg opacity-60">
                  <Key className="w-4 h-4 text-gray-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 font-medium">{k.key_name}</p>
                    <p className="text-xs font-mono text-gray-600">{maskKey(k.api_key)}</p>
                  </div>
                  <Badge className="text-xs bg-gray-800 text-gray-500 border-gray-700">Revoked</Badge>
                </div>
              ))}
            </div>
          </CredCard>
        )}
      </div>

      {/* Create Key Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription className="text-gray-400">
              A matching Secret Key will be generated and shown once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Environment</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCreateEnv("sandbox")}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    createEnv === "sandbox"
                      ? "border-amber-600 bg-amber-950/50 text-amber-300"
                      : "border-gray-700 text-gray-400 hover:border-gray-600"}`}>
                  <Terminal className="w-4 h-4" /> Sandbox
                </button>
                <button
                  onClick={() => kycApproved && setCreateEnv("live")}
                  disabled={!kycApproved}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    !kycApproved ? "border-gray-800 text-gray-700 cursor-not-allowed" :
                    createEnv === "live"
                      ? "border-emerald-600 bg-emerald-950/50 text-emerald-300"
                      : "border-gray-700 text-gray-400 hover:border-gray-600"}`}>
                  {kycApproved ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Live
                </button>
              </div>
              {!kycApproved && (
                <p className="text-xs text-gray-600">Live keys require approved KYB</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Key Name</Label>
              <Input value={keyName} onChange={e => setKeyName(e.target.value)}
                placeholder="e.g. Mobile App, Backend Server"
                className="bg-gray-800 border-gray-700 text-white"
                onKeyDown={e => e.key === "Enter" && createKey()} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-gray-400">Cancel</Button>
            <Button onClick={createKey} disabled={creating || !keyName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700">
              {creating ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <Key className="w-3.5 h-3.5 mr-2" />}
              Generate Keys
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Revoke this API key?</DialogTitle>
            <DialogDescription className="text-gray-400">
              This immediately invalidates the key. Any services using it will stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="text-gray-400">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && revokeKey(deleteConfirm)}>
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DevLayout>
  );
}

function CredCard({ title, icon, subtitle, badge, children }: {
  title: string; icon: React.ReactNode; subtitle?: string;
  badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mt-4">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-800">
        <span className="text-gray-400">{icon}</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function CopyField({ label, value, onCopy, mono, dark, secret }: {
  label: string; value: string; onCopy: () => void;
  mono?: boolean; dark?: boolean; secret?: boolean;
}) {
  const [shown, setShown] = useState(!secret);
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">{label}</p>
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${dark ? "bg-gray-900 border-gray-700" : "bg-gray-800/60 border-gray-700"}`}>
        <span className={`flex-1 text-xs truncate ${mono ? "font-mono" : ""} text-gray-200`}>
          {secret && !shown ? "•".repeat(Math.min(value.length, 40)) : value}
        </span>
        {secret && (
          <button onClick={() => setShown(s => !s)} className="text-gray-500 hover:text-gray-300">
            {shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
        <button onClick={onCopy} className="text-gray-500 hover:text-gray-300">
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function KeyRow({ apiKey, visible, onToggleVisible, onCopy, onRevoke, maskFn }: {
  apiKey: ApiKey; visible: boolean;
  onToggleVisible: () => void; onCopy: () => void; onRevoke: () => void;
  maskFn: (k: string) => string;
}) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-white">{apiKey.key_name}</span>
          <Badge className={apiKey.environment === "live"
            ? "bg-emerald-950 text-emerald-400 border-emerald-800/60 text-xs"
            : "bg-amber-950 text-amber-400 border-amber-800/60 text-xs"}>
            {apiKey.environment}
          </Badge>
        </div>
        <button onClick={onRevoke} className="text-gray-600 hover:text-red-400 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">API Key</p>
          <div className="flex items-center gap-2 bg-gray-900 rounded px-3 py-2 border border-gray-700">
            <code className="text-xs font-mono text-gray-300 flex-1 truncate">
              {visible ? apiKey.api_key : maskFn(apiKey.api_key)}
            </code>
            <button onClick={onToggleVisible} className="text-gray-500 hover:text-gray-300">
              {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onCopy} className="text-gray-500 hover:text-gray-300">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Secret Key</p>
          <div className="flex items-center gap-2 bg-gray-900 rounded px-3 py-2 border border-gray-700">
            <code className="text-xs font-mono text-gray-500 flex-1">
              ••••••••••••••••••••••••••••••••{apiKey.secret_key_last_four || "????"}
            </code>
            <span className="text-[10px] text-gray-600 ml-1">hidden</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span>{apiKey.total_requests?.toLocaleString() || 0} requests</span>
        {apiKey.last_used_at && <span>Last used {new Date(apiKey.last_used_at).toLocaleDateString()}</span>}
        <span>Created {new Date(apiKey.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function EmptyKeys({ env, onCreate }: { env: "sandbox" | "live"; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <Key className="w-8 h-8 text-gray-700 mb-3" />
      <p className="text-sm text-gray-500">No {env} keys yet</p>
      <p className="text-xs text-gray-600 mt-0.5">Create a {env} keypair to start making API calls</p>
      <Button size="sm" onClick={onCreate}
        className="mt-4 bg-indigo-600 hover:bg-indigo-700 h-8 px-4 text-xs">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Create {env === "live" ? "Live" : "Sandbox"} Key
      </Button>
    </div>
  );
}
