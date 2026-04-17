import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { tokenStorage } from "@/lib/tokenStorage";
import {
  Loader2, RefreshCw, Brain, CheckCircle, XCircle, Clock,
  ShieldCheck, AlertTriangle, ChevronRight, Zap, Send, RotateCcw
} from "lucide-react";

interface AISuggestion {
  selectors?: Record<string, string>;
  alternativeSelectors?: Record<string, string[]>;
  navigationSteps?: string[];
  analysis?: string;
  confidence?: number;
}

interface RecoverySuggestion {
  id: string;
  provider: string;
  serviceType: string;
  failedJobId: string | null;
  failureError: string;
  failureStep: string | null;
  aiAnalysis: string | null;
  aiSuggestions: AISuggestion | null;
  status: 'pending' | 'otp_pending' | 'approved' | 'deployed' | 'rejected';
  adminNotes: string | null;
  deployedAt: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  pending: number;
  otpPending: number;
  deployed: number;
}

function authHeaders() {
  return { Authorization: `Bearer ${tokenStorage.getItem('accessToken')}`, 'Content-Type': 'application/json' };
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, { headers: authHeaders(), ...options });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
    case 'otp_pending':
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><ShieldCheck className="h-3 w-3 mr-1" />OTP Sent</Badge>;
    case 'deployed':
      return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Deployed</Badge>;
    case 'rejected':
      return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
  }
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round((confidence || 0) * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-muted-foreground">{pct}% confidence</span>
    </div>
  );
}

function fmtDate(d: string | null) {
  if (!d) return 'N/A';
  try {
    const date = new Date(d);
    const diff = Date.now() - date.getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
}

export default function AdminRPARecovery() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<RecoverySuggestion | null>(null);
  const [otp, setOtp] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-rpa-recovery'],
    queryFn: () => apiFetch('/api/admin/rpa-recovery'),
    refetchInterval: 30_000,
  });

  const suggestions: RecoverySuggestion[] = data?.data?.suggestions || [];
  const stats: Stats = data?.data?.stats || { total: 0, pending: 0, otpPending: 0, deployed: 0 };

  const requestApprovalMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/rpa-recovery/${id}/request-approval`, { method: 'POST' }),
    onSuccess: () => {
      toast({ title: 'OTP Sent', description: 'Check your admin email for the 6-digit approval code.' });
      qc.invalidateQueries({ queryKey: ['admin-rpa-recovery'] });
      if (selected) setSelected({ ...selected, status: 'otp_pending' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/rpa-recovery/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ otp, adminNotes }),
    }),
    onSuccess: () => {
      toast({ title: 'Fix Deployed!', description: 'New selectors are now active. RPA workers will use them immediately.' });
      setOtp('');
      setAdminNotes('');
      qc.invalidateQueries({ queryKey: ['admin-rpa-recovery'] });
      if (selected) setSelected({ ...selected, status: 'deployed' });
    },
    onError: (e: any) => toast({ title: 'Confirmation Failed', description: e.message, variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/rpa-recovery/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ adminNotes: rejectNotes }),
    }),
    onSuccess: () => {
      toast({ title: 'Suggestion Rejected', description: 'The AI fix has been dismissed.' });
      setShowRejectDialog(false);
      setRejectNotes('');
      qc.invalidateQueries({ queryKey: ['admin-rpa-recovery'] });
      if (selected) setSelected({ ...selected, status: 'rejected' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const analyzeMutation = useMutation({
    mutationFn: (jobId: string) => apiFetch(`/api/admin/rpa-recovery/analyze/${jobId}`, { method: 'POST' }),
    onSuccess: () => {
      toast({ title: 'Analysis Triggered', description: 'AI is analyzing the failure. Refresh in a moment.' });
      setTimeout(() => qc.invalidateQueries({ queryKey: ['admin-rpa-recovery'] }), 3000);
    },
    onError: (e: any) => toast({ title: 'Analysis Failed', description: e.message, variant: 'destructive' }),
  });

  const isActionable = selected && (selected.status === 'pending' || selected.status === 'otp_pending');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />AI RPA Recovery
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            When an RPA job permanently fails, AI analyzes the error and suggests new selectors. You review and approve with OTP before anything goes live.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Total</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-amber-600 uppercase tracking-wider">Pending Review</div>
          <div className="text-2xl font-bold mt-1 text-amber-600">{stats.pending}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-blue-600 uppercase tracking-wider">Awaiting OTP</div>
          <div className="text-2xl font-bold mt-1 text-blue-600">{stats.otpPending}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-green-600 uppercase tracking-wider">Deployed</div>
          <div className="text-2xl font-bold mt-1 text-green-600">{stats.deployed}</div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recovery Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />Loading suggestions...
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Brain className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                No recovery suggestions yet. They appear automatically when RPA jobs exhaust all retries.
              </div>
            ) : (
              <div className="divide-y">
                {suggestions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelected(s); setOtp(''); setAdminNotes(''); setShowRejectDialog(false); }}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3 ${selected?.id === s.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{s.provider.toUpperCase()}</span>
                        <span className="text-xs text-muted-foreground">{s.serviceType}</span>
                        <StatusBadge status={s.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{s.failureError}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">{fmtDate(s.createdAt)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selected ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-600" />
                    AI Analysis — {selected.provider.toUpperCase()}
                  </CardTitle>
                  <StatusBadge status={selected.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="font-semibold text-red-700 text-xs uppercase tracking-wide mb-1">Failure Error</div>
                  <p className="text-red-800 text-xs font-mono">{selected.failureError}</p>
                  {selected.failureStep && <p className="text-red-600 text-xs mt-1">Step: {selected.failureStep}</p>}
                </div>

                {selected.aiAnalysis && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="font-semibold text-blue-700 text-xs uppercase tracking-wide mb-1">AI Diagnosis</div>
                    <p className="text-blue-900 text-xs leading-relaxed">{selected.aiAnalysis}</p>
                  </div>
                )}

                {selected.aiSuggestions?.confidence !== undefined && (
                  <ConfidenceBar confidence={selected.aiSuggestions.confidence} />
                )}

                {selected.aiSuggestions?.selectors && Object.keys(selected.aiSuggestions.selectors).length > 0 && (
                  <div>
                    <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Suggested Selectors</div>
                    <div className="space-y-1.5">
                      {Object.entries(selected.aiSuggestions.selectors).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2 bg-gray-50 rounded p-2">
                          <span className="text-xs font-mono text-muted-foreground w-32 flex-shrink-0">{key}:</span>
                          <code className="text-xs font-mono text-emerald-700 break-all">{value}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selected.aiSuggestions?.navigationSteps && selected.aiSuggestions.navigationSteps.length > 0 && (
                  <div>
                    <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Navigation Steps</div>
                    <ol className="space-y-1">
                      {selected.aiSuggestions.navigationSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <span className="bg-blue-100 text-blue-700 rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {selected.failedJobId && (
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    Failed Job ID: <code className="font-mono">{selected.failedJobId}</code>
                  </div>
                )}
              </CardContent>
            </Card>

            {isActionable && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />Approval — OTP Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selected.status === 'pending' && (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Review the AI suggestion above. If you approve, click below to receive a 6-digit OTP on your admin email.
                      </p>
                      <Button
                        className="w-full"
                        onClick={() => requestApprovalMutation.mutate(selected.id)}
                        disabled={requestApprovalMutation.isPending}
                      >
                        {requestApprovalMutation.isPending
                          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending OTP...</>
                          : <><Send className="h-4 w-4 mr-2" />Send Approval OTP to My Email</>
                        }
                      </Button>
                    </>
                  )}

                  {selected.status === 'otp_pending' && (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                        <ShieldCheck className="h-4 w-4 inline mr-1" />
                        OTP sent to your admin email. Enter it below to deploy this fix.
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">6-Digit OTP</label>
                        <Input
                          placeholder="123456"
                          value={otp}
                          onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          maxLength={6}
                          className="mt-1 text-center text-xl font-mono tracking-widest"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Notes (optional)</label>
                        <Textarea
                          placeholder="Add any notes about this approval..."
                          value={adminNotes}
                          onChange={e => setAdminNotes(e.target.value)}
                          rows={2}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => confirmMutation.mutate(selected.id)}
                          disabled={otp.length < 6 || confirmMutation.isPending}
                        >
                          {confirmMutation.isPending
                            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deploying...</>
                            : <><Zap className="h-4 w-4 mr-2" />Confirm & Deploy Fix</>
                          }
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => requestApprovalMutation.mutate(selected.id)}
                          disabled={requestApprovalMutation.isPending}
                          title="Resend OTP"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-3">
                    {!showRejectDialog ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full"
                        onClick={() => setShowRejectDialog(true)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />Reject This Suggestion
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Reason for rejection (optional)..."
                          value={rejectNotes}
                          onChange={e => setRejectNotes(e.target.value)}
                          rows={2}
                          className="text-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => rejectMutation.mutate(selected.id)}
                            disabled={rejectMutation.isPending}
                          >
                            {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Rejection'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {selected.status === 'deployed' && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                    <CheckCircle className="h-4 w-4" />Fix Successfully Deployed
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    New selectors for <strong>{selected.provider.toUpperCase()}</strong> are stored in the database and active. RPA workers will use them on the next job.
                  </p>
                  {selected.deployedAt && <p className="text-xs text-green-500 mt-1">Deployed {fmtDate(selected.deployedAt)}</p>}
                  {selected.adminNotes && <p className="text-xs text-green-700 mt-2 italic">"{selected.adminNotes}"</p>}
                </CardContent>
              </Card>
            )}

            {selected.status === 'rejected' && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                    <XCircle className="h-4 w-4" />Suggestion Rejected
                  </div>
                  {selected.adminNotes && <p className="text-xs text-red-600 mt-1 italic">"{selected.adminNotes}"</p>}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-xl text-center text-muted-foreground">
            <div>
              <Brain className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm">Select a suggestion from the list to review the AI analysis and approve or reject the fix.</p>
            </div>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />How This Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p><strong>1. Detection</strong> — When an RPA job (WAEC, NECO, NABTEB, NBAIS, JAMB) fails all its retry attempts, the system automatically captures the error and triggers AI analysis.</p>
          <p><strong>2. AI Analysis</strong> — OpenAI examines the failure, the portal context, and previous working selectors to generate new CSS selectors and navigation steps.</p>
          <p><strong>3. Admin Review</strong> — You review the AI suggestion here. You can see the old error, the AI's diagnosis, suggested selectors, and its confidence level.</p>
          <p><strong>4. OTP Approval</strong> — Clicking "Approve" sends a one-time code to your admin email. You enter it to confirm deployment — no code changes, no redeployment needed.</p>
          <p><strong>5. Live Deployment</strong> — The new selectors are written to the database. RPA workers read them on the next job execution, making recovery instant.</p>
        </CardContent>
      </Card>
    </div>
  );
}
