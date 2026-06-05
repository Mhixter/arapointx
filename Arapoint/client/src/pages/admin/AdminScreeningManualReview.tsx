import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, XCircle, RefreshCw, ClipboardList, Building2, GraduationCap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const API = "/api/admin/screening";

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
  };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ago`;
  if (h > 0) return `${h}h ${m}m ago`;
  return `${m}m ago`;
}

function ProviderBadge({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    waec: "bg-blue-100 text-blue-700",
    neco: "bg-purple-100 text-purple-700",
    nabteb: "bg-indigo-100 text-indigo-700",
    nbais: "bg-teal-100 text-teal-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${colors[provider?.toLowerCase()] || "bg-gray-100 text-gray-600"}`}>
      {provider || "N/A"}
    </span>
  );
}

export default function AdminScreeningManualReview() {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [queueStats, setQueueStats] = useState<any>(null);

  const [form, setForm] = useState({
    found: true,
    nameMatch: true,
    dobMatch: false,
    decision: "PASS",
    overallScore: 80,
    notes: "",
    subjectGrades: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [qRes, sRes] = await Promise.all([
        fetch(`${API}/manual-review/queue`, { headers: adminHeaders() }),
        fetch(`${API}/queue/stats`, { headers: adminHeaders() }),
      ]);
      const qData = await qRes.json();
      const sData = await sRes.json();
      setCandidates(qData.data?.candidates || []);
      setQueueStats(sData.data?.candidates || null);
    } catch {
      toast({ title: "Failed to load queue", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openReview = (c: any) => {
    setSelected(c);
    const ninOk = c.nin_result?.success || (c.nin_result as any)?.success;
    const bvnOk = c.bvn_result?.success || (c.bvn_result as any)?.success;
    const autoScore = ninOk && bvnOk ? 80 : ninOk || bvnOk ? 65 : 45;
    setForm({
      found: true,
      nameMatch: true,
      dobMatch: false,
      decision: "PASS",
      overallScore: autoScore,
      notes: "",
      subjectGrades: "",
    });
  };

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      let parsedGrades = {};
      if (form.subjectGrades.trim()) {
        try { parsedGrades = JSON.parse(form.subjectGrades); } catch {
          const lines = form.subjectGrades.split("\n").filter(Boolean);
          parsedGrades = Object.fromEntries(lines.map(l => {
            const [subj, ...rest] = l.split(":");
            return [subj.trim(), rest.join(":").trim()];
          }));
        }
      }

      const res = await fetch(`${API}/manual-review/${selected.id}/submit`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          found: form.found,
          nameMatch: form.nameMatch,
          dobMatch: form.dobMatch,
          decision: form.decision,
          overallScore: Number(form.overallScore),
          notes: form.notes,
          subjectGrades: parsedGrades,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");

      toast({
        title: `✓ Manual review submitted — ${data.data?.decision}`,
        description: `${selected.full_name} scored ${data.data?.score}%`,
      });
      setSelected(null);
      await load();
    } catch (e: any) {
      toast({ title: "Submit failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const eduData = selected?.education_data as any;
  const rpaFailReason = selected?.education_result?.failureReason
    || selected?.rpa_error
    || "Portal automation failed after all retries.";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-orange-600" />
            Manual Review Queue
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Education checks that RPA could not complete — review and submit results manually
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="rounded-xl gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats bar */}
      {queueStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Awaiting Manual Review", value: queueStats.manual_review ?? 0, color: "text-orange-600" },
            { label: "In Progress (RPA)", value: queueStats.processing ?? 0, color: "text-blue-600" },
            { label: "Completed Today", value: queueStats.last_24h ?? 0, color: "text-green-600" },
            { label: "Failed", value: queueStats.failed ?? 0, color: "text-red-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{Number(s.value).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Queue table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 px-6 py-5 animate-pulse">
                <div className="w-10 h-10 bg-gray-100 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-48" />
                  <div className="h-2 bg-gray-100 rounded w-32" />
                </div>
                <div className="w-20 h-8 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">All caught up!</p>
            <p className="text-sm text-gray-400 mt-1">No candidates are waiting for manual review.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {candidates.map((c: any) => (
              <div key={c.id} className="flex items-start gap-4 px-6 py-5 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-bold text-sm flex-shrink-0">
                  {c.full_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-gray-900">{c.full_name}</p>
                    <span className="text-xs text-gray-400">{c.reference}</span>
                    <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-xs">
                      Manual Review
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {c.organization_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      <ProviderBadge provider={c.education_provider} />
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {timeAgo(c.created_at)}
                    </span>
                  </div>
                  {(c.rpa_error || c.education_result?.failureReason) && (
                    <p className="text-xs text-red-500 flex items-start gap-1 mt-1">
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

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-orange-600" />
              Manual Education Verification
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              {/* Candidate summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{selected.full_name}</p>
                    <p className="text-xs text-gray-500">{selected.reference} · {selected.organization_name}</p>
                  </div>
                  <ProviderBadge provider={selected.education_provider} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                  <div className="bg-white rounded-lg p-2 border border-gray-100">
                    <p className="text-gray-400">NIN Check</p>
                    <p className={`font-semibold ${selected.nin_result?.success ? "text-green-600" : "text-red-500"}`}>
                      {selected.nin_result?.success ? "✓ Verified" : "✗ Failed"}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-gray-100">
                    <p className="text-gray-400">BVN Check</p>
                    <p className={`font-semibold ${selected.bvn_result?.success ? "text-green-600" : "text-red-500"}`}>
                      {selected.bvn_result?.success ? "✓ Verified" : "✗ Failed"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Education data requested */}
              {eduData && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 mb-2">Education Details Submitted by Org</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {Object.entries(eduData).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, " $1")}: </span>
                        <span className="font-medium text-gray-800">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RPA failure reason */}
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">RPA Failure Reason</p>
                  <p className="mt-0.5 text-red-600">{rpaFailReason}</p>
                </div>
              </div>

              {/* Manual verification form */}
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-800">Submit Manual Verification</p>

                {/* Toggles */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "found", label: "Record Found?" },
                    { key: "nameMatch", label: "Name Match?" },
                    { key: "dobMatch", label: "DOB Match?" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <Label className="text-xs text-gray-600 mb-1 block">{label}</Label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setForm(f => ({ ...f, [key]: true }))}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${(form as any)[key] ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-500 border-gray-200"}`}>
                          Yes
                        </button>
                        <button
                          onClick={() => setForm(f => ({ ...f, [key]: false }))}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${!(form as any)[key] ? "bg-red-500 text-white border-red-500" : "bg-white text-gray-500 border-gray-200"}`}>
                          No
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Decision */}
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Decision</Label>
                  <div className="flex gap-2">
                    {(["PASS", "REVIEW", "FAIL"] as const).map(d => (
                      <button key={d} onClick={() => setForm(f => ({ ...f, decision: d }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                          form.decision === d
                            ? d === "PASS" ? "bg-green-600 text-white border-green-600"
                              : d === "REVIEW" ? "bg-yellow-500 text-white border-yellow-500"
                              : "bg-red-600 text-white border-red-600"
                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                        }`}>
                        {d === "PASS" ? <><CheckCircle className="w-3 h-3 inline mr-1" />PASS</>
                          : d === "REVIEW" ? <><AlertCircle className="w-3 h-3 inline mr-1" />REVIEW</>
                          : <><XCircle className="w-3 h-3 inline mr-1" />FAIL</>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Score */}
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Overall Score (0–100)</Label>
                  <Input
                    type="number" min={0} max={100}
                    value={form.overallScore}
                    onChange={e => setForm(f => ({ ...f, overallScore: Number(e.target.value) }))}
                    className="h-9 rounded-lg text-sm"
                  />
                </div>

                {/* Subject grades */}
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">
                    Subject Grades (optional — one per line: Subject: Grade, or paste JSON)
                  </Label>
                  <Textarea
                    value={form.subjectGrades}
                    onChange={e => setForm(f => ({ ...f, subjectGrades: e.target.value }))}
                    placeholder={"English: B2\nMathematics: C4\nPhysics: B3"}
                    rows={4}
                    className="text-sm rounded-lg resize-none"
                  />
                </div>

                {/* Admin notes */}
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Admin Notes (internal)</Label>
                  <Textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="e.g. Verified manually on WAEC portal. Result confirmed."
                    rows={2}
                    className="text-sm rounded-lg resize-none"
                  />
                </div>
              </div>

              {/* Submit / Cancel */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setSelected(null)} className="flex-1 rounded-xl">
                  Cancel
                </Button>
                <Button
                  onClick={submit} disabled={submitting}
                  className={`flex-1 rounded-xl font-semibold ${
                    form.decision === "PASS" ? "bg-green-600 hover:bg-green-700"
                      : form.decision === "REVIEW" ? "bg-yellow-500 hover:bg-yellow-600"
                      : "bg-red-600 hover:bg-red-700"
                  } text-white`}>
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
