import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  LogOut, RefreshCw, ClipboardList, CheckCircle, XCircle, AlertCircle,
  Building2, GraduationCap, Clock, Wifi, WifiOff, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const BASE = "/api/screening-reviewer";

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("reviewerToken")}`,
  };
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ago`;
  if (h > 0) return `${h}h ${m}m ago`;
  return `${m}m ago`;
}

function PortalPill({ portal }: { portal: string }) {
  const map: Record<string, string> = {
    waec: "bg-blue-100 text-blue-700", neco: "bg-purple-100 text-purple-700",
    nabteb: "bg-indigo-100 text-indigo-700", nbais: "bg-teal-100 text-teal-700",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${map[portal?.toLowerCase()] || "bg-gray-100 text-gray-600"}`}>
      {portal || "N/A"}
    </span>
  );
}

export default function ScreeningReviewerDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [agent] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem("reviewerAgent") || "{}"); } catch { return {}; }
  });
  const [stats, setStats] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [portalHealth, setPortalHealth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ found: true, nameMatch: true, dobMatch: false, decision: "PASS", overallScore: 80, notes: "", subjectGrades: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, sRes, pRes] = await Promise.all([
        fetch(`${BASE}/queue`, { headers: headers() }),
        fetch(`${BASE}/stats`, { headers: headers() }),
        fetch(`${BASE}/portal-health`, { headers: headers() }),
      ]);
      if (qRes.status === 401 || qRes.status === 403) { logout(); return; }
      const [qData, sData, pData] = await Promise.all([qRes.json(), sRes.json(), pRes.json()]);
      setQueue(qData.data?.candidates || []);
      setStats(sData.data || null);
      setPortalHealth(pData.data || []);
    } catch {
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("reviewerToken")) { setLocation("/screening/reviewer/login"); return; }
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const logout = () => {
    localStorage.removeItem("reviewerToken");
    localStorage.removeItem("reviewerAgent");
    setLocation("/screening/reviewer/login");
  };

  const openReview = (c: any) => {
    setSelected(c);
    const ninOk = (c.nin_result as any)?.success;
    const bvnOk = (c.bvn_result as any)?.success;
    setForm({ found: true, nameMatch: true, dobMatch: false, decision: "PASS", overallScore: ninOk && bvnOk ? 80 : 65, notes: "", subjectGrades: "" });
  };

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      let parsedGrades = {};
      if (form.subjectGrades.trim()) {
        try { parsedGrades = JSON.parse(form.subjectGrades); } catch {
          parsedGrades = Object.fromEntries(
            form.subjectGrades.split("\n").filter(Boolean).map(l => {
              const [k, ...v] = l.split(":");
              return [k.trim(), v.join(":").trim()];
            })
          );
        }
      }
      const res = await fetch(`${BASE}/queue/${selected.id}/submit`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ ...form, overallScore: Number(form.overallScore), subjectGrades: parsedGrades }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submit failed");
      toast({ title: `✓ Submitted — ${data.data?.decision}`, description: `${selected.full_name} · Score: ${data.data?.score}%` });
      setSelected(null);
      await load();
    } catch (e: any) {
      toast({ title: "Submit failed", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const eduData = selected?.education_data as any;
  const failReason = selected?.education_result?.failureReason || selected?.rpa_error || "Portal automation failed.";
  const isCircuitBreaker = selected?.education_result?.circuitBreaker;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Manual Review Queue</p>
            <p className="text-xs text-gray-400">Arapoint · Reviewer Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4 text-gray-400" />
            <span>{agent.name || "Reviewer"}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="rounded-xl">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={logout} className="rounded-xl gap-1.5">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "In Queue", value: stats.pending_queue ?? 0, color: "text-orange-600", bg: "bg-orange-50" },
              { label: "New (1h)", value: stats.new_last_hour ?? 0, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Completed Today", value: stats.completed_today ?? 0, color: "text-green-600", bg: "bg-green-50" },
              { label: "My Reviews", value: stats.myReviews ?? 0, color: "text-purple-600", bg: "bg-purple-50" },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-4 ${s.bg}`}>
                <p className={`text-2xl font-bold ${s.color}`}>{Number(s.value).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Portal health */}
        {portalHealth.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Portal Status</p>
            <div className="flex flex-wrap gap-3">
              {portalHealth.map((p: any) => (
                <div key={p.portal} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium
                  ${p.circuit_open ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
                  {p.circuit_open ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                  <span className="uppercase">{p.portal}</span>
                  {p.circuit_open && <span className="text-red-500 font-normal">— PAUSED</span>}
                  {!p.circuit_open && p.consecutive_failures > 0 && (
                    <span className="text-yellow-600 font-normal">{p.consecutive_failures} fail(s)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Queue */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Manual Review Queue
              {queue.length > 0 && <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{queue.length}</span>}
            </h2>
          </div>

          {loading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4 px-6 py-5 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-full" />
                  <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-48" /><div className="h-2 bg-gray-100 rounded w-32" /></div>
                  <div className="w-20 h-8 bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>
          ) : queue.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="font-semibold text-gray-700">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">No candidates awaiting manual review.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {queue.map((c: any) => (
                <div key={c.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-bold text-sm flex-shrink-0">
                    {c.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900">{c.full_name}</p>
                      <span className="text-xs text-gray-400">{c.reference}</span>
                      {c.education_result?.circuitBreaker && (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">Circuit Breaker</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{c.organization_name}</span>
                      <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /><PortalPill portal={c.education_provider} /></span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(c.created_at)}</span>
                    </div>
                    {(c.education_result?.failureReason || c.rpa_error) && (
                      <p className="text-xs text-red-500 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        {c.education_result?.failureReason || c.rpa_error}
                      </p>
                    )}
                  </div>
                  <Button size="sm" onClick={() => openReview(c)}
                    className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs flex-shrink-0">
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-orange-600" />
              Submit Verification — {selected?.full_name}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              {/* Candidate summary */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{selected.full_name}</p>
                    <p className="text-xs text-gray-500">{selected.reference} · {selected.organization_name}</p>
                  </div>
                  <PortalPill portal={selected.education_provider} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                  <div className="bg-white rounded-lg p-2 border border-gray-100">
                    <p className="text-gray-400">NIN</p>
                    <p className={`font-semibold ${(selected.nin_result as any)?.success ? "text-green-600" : "text-red-500"}`}>
                      {(selected.nin_result as any)?.success ? "✓ Verified" : "✗ Failed"}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-gray-100">
                    <p className="text-gray-400">BVN</p>
                    <p className={`font-semibold ${(selected.bvn_result as any)?.success ? "text-green-600" : "text-red-500"}`}>
                      {(selected.bvn_result as any)?.success ? "✓ Verified" : "✗ Failed"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Education data */}
              {eduData && (
                <div className="bg-blue-50 rounded-xl p-4 text-xs">
                  <p className="font-semibold text-blue-700 mb-2">Education Details</p>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(eduData).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, " $1")}: </span>
                        <span className="font-medium text-gray-800">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failure reason */}
              <div className={`rounded-xl p-3 text-xs flex gap-2 ${isCircuitBreaker ? "bg-yellow-50 border border-yellow-100" : "bg-red-50 border border-red-100"}`}>
                <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isCircuitBreaker ? "text-yellow-600" : "text-red-500"}`} />
                <div>
                  <p className={`font-semibold ${isCircuitBreaker ? "text-yellow-700" : "text-red-700"}`}>
                    {isCircuitBreaker ? "Circuit Breaker — Portal Paused" : "RPA Failure"}
                  </p>
                  <p className={`mt-0.5 ${isCircuitBreaker ? "text-yellow-600" : "text-red-600"}`}>{failReason}</p>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-800">Verification Result</p>

                <div className="grid grid-cols-3 gap-3">
                  {([["found", "Record Found?"], ["nameMatch", "Name Match?"], ["dobMatch", "DOB Match?"]] as const).map(([key, label]) => (
                    <div key={key}>
                      <Label className="text-xs text-gray-600 mb-1 block">{label}</Label>
                      <div className="flex gap-1.5">
                        {(["Yes", "No"] as const).map((opt) => {
                          const val = opt === "Yes";
                          const active = (form as any)[key] === val;
                          return (
                            <button key={opt} onClick={() => setForm(f => ({ ...f, [key]: val }))}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${active ? (val ? "bg-green-600 text-white border-green-600" : "bg-red-500 text-white border-red-500") : "bg-white text-gray-500 border-gray-200"}`}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Decision</Label>
                  <div className="flex gap-2">
                    {(["PASS", "REVIEW", "FAIL"] as const).map(d => (
                      <button key={d} onClick={() => setForm(f => ({ ...f, decision: d }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${form.decision === d
                          ? d === "PASS" ? "bg-green-600 text-white border-green-600"
                            : d === "REVIEW" ? "bg-yellow-500 text-white border-yellow-500"
                            : "bg-red-600 text-white border-red-600"
                          : "bg-white text-gray-500 border-gray-200"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Score (0–100)</Label>
                  <Input type="number" min={0} max={100} value={form.overallScore}
                    onChange={e => setForm(f => ({ ...f, overallScore: Number(e.target.value) }))}
                    className="h-9 rounded-lg text-sm" />
                </div>

                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Subject Grades (Subject: Grade, one per line)</Label>
                  <Textarea value={form.subjectGrades}
                    onChange={e => setForm(f => ({ ...f, subjectGrades: e.target.value }))}
                    placeholder={"English: B2\nMathematics: C4\nPhysics: B3"}
                    rows={4} className="text-sm rounded-lg resize-none" />
                </div>

                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Notes</Label>
                  <Textarea value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="e.g. Verified on WAEC portal — result confirmed."
                    rows={2} className="text-sm rounded-lg resize-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => setSelected(null)} className="flex-1 rounded-xl">Cancel</Button>
                <Button onClick={submit} disabled={submitting}
                  className={`flex-1 rounded-xl font-semibold text-white ${form.decision === "PASS" ? "bg-green-600 hover:bg-green-700" : form.decision === "REVIEW" ? "bg-yellow-500 hover:bg-yellow-600" : "bg-red-600 hover:bg-red-700"}`}>
                  {submitting ? "Submitting..." : `Submit — ${form.decision}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
