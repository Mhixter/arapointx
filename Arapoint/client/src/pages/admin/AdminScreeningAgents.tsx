import { useEffect, useState } from "react";
import { UserPlus, RefreshCw, CheckCircle, XCircle, Wifi, WifiOff, RotateCcw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import { tokenStorage } from "@/lib/tokenStorage";

const API = "/api/admin/screening";

function adminHeaders() {
  // Use tokenStorage (sessionStorage) — same store the admin login uses
  const token = tokenStorage.getItem("adminToken") || localStorage.getItem("adminToken") || "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  const h = Math.floor(diff / 3600000);
  return h > 0 ? `${h}h ago` : "Just now";
}

export default function AdminScreeningAgents() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<any[]>([]);
  const [portals, setPortals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", notes: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, pRes] = await Promise.all([
        fetch(`${API}/reviewer-agents`, { headers: adminHeaders() }),
        fetch(`${API}/portal-health`, { headers: adminHeaders() }),
      ]);
      const [aData, pData] = await Promise.all([aRes.json(), pRes.json()]);
      setAgents(aData.data || []);
      setPortals(pData.data || []);
    } catch { toast({ title: "Failed to load", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createAgent = async () => {
    if (!form.name || !form.email || !form.password) {
      toast({ title: "Name, email, and password are required", variant: "destructive" }); return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API}/reviewer-agents`, {
        method: "POST", headers: adminHeaders(), body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      toast({ title: "✓ Agent created", description: `${form.name} can now log in at /screening/reviewer/login` });
      setShowCreate(false);
      setForm({ name: "", email: "", password: "", notes: "" });
      await load();
    } catch (e: any) {
      toast({ title: "Create failed", description: e.message, variant: "destructive" });
    } finally { setCreating(false); }
  };

  const toggleAgent = async (id: string, name: string, active: boolean) => {
    try {
      await fetch(`${API}/reviewer-agents/${id}/toggle`, { method: "PUT", headers: adminHeaders() });
      toast({ title: `${name} ${active ? "deactivated" : "activated"}` });
      await load();
    } catch { toast({ title: "Update failed", variant: "destructive" }); }
  };

  const resetPortal = async (portal: string) => {
    try {
      await fetch(`${API}/portal-health/${portal}/reset`, { method: "POST", headers: adminHeaders() });
      toast({ title: `✓ ${portal.toUpperCase()} circuit reset` });
      await load();
    } catch { toast({ title: "Reset failed", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Screening Review Agents</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage manual review agents and monitor portal circuit breakers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="rounded-xl">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl gap-2">
            <UserPlus className="w-4 h-4" /> New Agent
          </Button>
        </div>
      </div>

      {/* Portal Circuit Breaker Status */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Portal Health — Circuit Breakers</h2>
        <p className="text-xs text-gray-500 mb-4">
          A portal's circuit opens after 3 consecutive RPA failures and auto-pauses new jobs for 30 minutes.
          All paused jobs route to manual review automatically.
        </p>
        {portals.length === 0 ? (
          <p className="text-sm text-gray-400">No portal data yet — circuit breakers activate after first RPA job.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {portals.map((p: any) => (
              <div key={p.portal} className={`rounded-xl border p-4 flex items-start justify-between gap-4
                ${p.circuit_open ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                <div className="flex items-center gap-3">
                  {p.circuit_open
                    ? <WifiOff className="w-5 h-5 text-red-600 flex-shrink-0" />
                    : <Wifi className="w-5 h-5 text-green-600 flex-shrink-0" />}
                  <div>
                    <p className={`font-bold text-sm uppercase ${p.circuit_open ? "text-red-700" : "text-green-700"}`}>
                      {p.portal}
                      {p.circuit_open && <span className="ml-2 text-xs font-normal text-red-500">PAUSED</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {p.consecutive_failures} consecutive fail(s) ·{" "}
                      {p.total_successes || 0} total successes ·{" "}
                      {p.total_failures || 0} total failures
                    </p>
                    {p.circuit_open && p.circuit_open_until && (
                      <p className="text-xs text-red-600 mt-0.5">
                        Paused until {new Date(p.circuit_open_until).toLocaleTimeString("en-NG")}
                      </p>
                    )}
                    {p.last_success_at && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Last success: {timeAgo(p.last_success_at)}
                      </p>
                    )}
                  </div>
                </div>
                {p.circuit_open && (
                  <Button size="sm" variant="outline" onClick={() => resetPortal(p.portal)}
                    className="rounded-lg border-red-300 text-red-700 hover:bg-red-100 flex-shrink-0 gap-1 text-xs">
                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agent list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">Reviewer Agents ({agents.length})</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Agents log in at <a href="/screening/reviewer/login" target="_blank" className="text-blue-600 underline">/screening/reviewer/login</a>
          </p>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4 px-6 py-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-100 rounded-full" />
                <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-40" /><div className="h-2 bg-gray-100 rounded w-56" /></div>
              </div>
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <UserPlus className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No agents yet</p>
            <p className="text-sm mt-1">Create an agent to handle manual review escalations.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {agents.map((a: any) => (
              <div key={a.id} className="flex items-center gap-4 px-6 py-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                  ${a.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                  {a.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-gray-900">{a.name}</p>
                    {a.is_active
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                      : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                  </div>
                  <p className="text-xs text-gray-400">{a.email} · {a.reviews_completed || 0} reviews · Joined {timeAgo(a.created_at)}</p>
                  {a.notes && <p className="text-xs text-gray-400 italic mt-0.5">{a.notes}</p>}
                </div>
                <Button size="sm" variant="outline" onClick={() => toggleAgent(a.id, a.name, a.is_active)}
                  className={`rounded-lg text-xs flex-shrink-0 gap-1 ${a.is_active ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}>
                  {a.is_active ? <><XCircle className="w-3.5 h-3.5" />Deactivate</> : <><CheckCircle className="w-3.5 h-3.5" />Activate</>}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Agent Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" /> Create Reviewer Agent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label className="text-sm mb-1.5 block">Full Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Chidi Okafor" className="rounded-xl" />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="chidi@arapoint.com.ng" className="rounded-xl" />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Password</Label>
              <div className="relative">
                <Input type={showPw ? "text" : "password"} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Strong password" className="rounded-xl pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Internal Notes (optional)</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. WAEC specialist — handles Lagos region screenings"
                rows={2} className="rounded-xl resize-none text-sm" />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl">Cancel</Button>
              <Button onClick={createAgent} disabled={creating}
                className="flex-1 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold">
                {creating ? "Creating..." : "Create Agent"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
