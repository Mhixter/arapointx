import { useState, useEffect, useCallback } from "react";
import { tokenStorage } from "@/lib/tokenStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, Search, CheckCircle, XCircle, Clock, Loader2,
  AlertTriangle, Eye, RotateCcw, Trash2, ChevronDown, ChevronUp,
  Activity, Users, ListTodo, Filter
} from "lucide-react";

function adminFetch(path: string, options?: RequestInit) {
  const token = tokenStorage.getItem("adminToken");
  return fetch(`/api/v1/developer${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options?.headers },
  });
}

const STATUS_CONFIG = {
  queued:     { label: "Queued",     bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500",   icon: Clock },
  processing: { label: "Processing", bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500",    icon: Loader2 },
  completed:  { label: "Completed",  bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", icon: CheckCircle },
  failed:     { label: "Failed",     bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-500",     icon: XCircle },
} as Record<string, { label: string; bg: string; text: string; dot: string; icon: any }>;

const DECISION_COLOR: Record<string, string> = {
  PASS:   "bg-emerald-100 text-emerald-700",
  REVIEW: "bg-amber-100 text-amber-700",
  FAIL:   "bg-red-100 text-red-700",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.queued;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <Icon className={`w-3 h-3 ${status === "processing" ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

interface QueueItem {
  id: string;
  developer_email: string;
  developer_name: string;
  nin: string;
  bvn: string;
  employment_year: number;
  level: string;
  ssce_provider: string | null;
  queue_status: string;
  decision: string | null;
  initial_score: number | null;
  final_score: number | null;
  nin_score: number;
  bvn_score: number;
  name_match_score: string;
  dob_match: boolean;
  timeline_valid: boolean;
  flags: any[];
  error_message: string | null;
  ssce_job_id: string | null;
  rpa_status: string | null;
  created_at: string;
  completed_at: string | null;
}

interface Stats {
  queued: number; processing: number; completed: number; failed: number;
  total: number; with_ssce: number; last_24h: number;
  providerBreakdown: { ssce_provider: string; count: number }[];
}

export default function AdminQueueMonitor() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(providerFilter ? { provider: providerFilter } : {}),
        ...(search ? { search } : {}),
      });
      const [statsRes, itemsRes] = await Promise.all([
        adminFetch("/admin/queue/stats"),
        adminFetch(`/admin/queue/employment?${qs}`),
      ]);
      const [sd, id] = await Promise.all([statsRes.json(), itemsRes.json()]);
      if (sd.status === "success") setStats(sd.data);
      if (id.status === "success") {
        setItems(id.data.items);
        setTotalPages(id.data.pages || 1);
      }
    } catch {}
    setLoading(false);
  }, [page, statusFilter, providerFilter, search]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(loadData, 15000);
    return () => clearInterval(t);
  }, [autoRefresh, loadData]);

  const handleRetry = async (id: string) => {
    setRetrying(id);
    try {
      const res = await adminFetch(`/admin/queue/employment/${id}/retry`, { method: "PATCH" });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: "Job requeued", description: `${id} has been requeued for processing.` });
        loadData();
      } else {
        toast({ title: data.message || "Retry failed", variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    setRetrying(null);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await adminFetch(`/admin/queue/employment/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: "Entry removed", description: `${id} removed from queue.` });
        loadData();
      } else {
        toast({ title: data.message || "Delete failed", variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    setDeleting(null);
  };

  const statCards = stats ? [
    { label: "Queued",     value: stats.queued,     color: "text-amber-600",   bg: "bg-amber-50",   icon: Clock },
    { label: "Processing", value: stats.processing, color: "text-blue-600",    bg: "bg-blue-50",    icon: Loader2 },
    { label: "Completed",  value: stats.completed,  color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
    { label: "Failed",     value: stats.failed,     color: "text-red-600",     bg: "bg-red-50",     icon: XCircle },
    { label: "Total",      value: stats.total,      color: "text-gray-700",    bg: "bg-gray-50",    icon: Activity },
    { label: "With SSCE",  value: stats.with_ssce,  color: "text-purple-600",  bg: "bg-purple-50",  icon: ListTodo },
    { label: "Last 24h",   value: stats.last_24h,   color: "text-indigo-600",  bg: "bg-indigo-50",  icon: Users },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employment Queue Monitor</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track employment verification requests — NIN + BVN via Prembly, SSCE via RPA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(v => !v)}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto (15s)" : "Manual"}
          </Button>
          <Button size="sm" variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {statCards.map(s => (
            <Card key={s.label} className={`${s.bg} border-0`}>
              <CardContent className="p-3 flex flex-col items-center text-center">
                <s.icon className={`w-4 h-4 mb-1 ${s.color}`} />
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Provider breakdown */}
      {stats?.providerBreakdown && stats.providerBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">SSCE Provider Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex flex-wrap gap-2">
              {stats.providerBreakdown.map(p => (
                <button key={p.ssce_provider}
                  onClick={() => setProviderFilter(prev => prev === p.ssce_provider ? "" : p.ssce_provider)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    providerFilter === p.ssce_provider
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-muted text-muted-foreground border-border hover:bg-indigo-50"
                  }`}>
                  {p.ssce_provider} · {p.count}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by request ID, email, or name…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["", "queued", "processing", "completed", "failed"].map(s => (
            <Button key={s || "all"} size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={statusFilter === s ? "" : "text-muted-foreground"}>
              {s ? STATUS_CONFIG[s]?.label : "All"}
            </Button>
          ))}
        </div>
        {(statusFilter || providerFilter || search) && (
          <Button size="sm" variant="ghost" onClick={() => { setStatusFilter(""); setProviderFilter(""); setSearch(""); setPage(1); }}>
            <Filter className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Queue Table */}
      <Card>
        <CardContent className="p-0">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-sm">No queue items found</p>
              <p className="text-xs text-muted-foreground mt-1">Try removing filters or submit an employment verification</p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map(item => {
                const expanded = expandedId === item.id;
                const score = item.final_score ?? item.initial_score;
                return (
                  <div key={item.id} className="hover:bg-muted/20 transition-colors">
                    {/* Row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
                          <StatusBadge status={item.queue_status} />
                          {item.decision && (
                            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${DECISION_COLOR[item.decision] || "bg-gray-100 text-gray-600"}`}>
                              {item.decision}
                            </span>
                          )}
                          {item.level === "higher" && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">Higher</span>
                          )}
                          {item.ssce_provider && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                              {item.ssce_provider}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-sm text-foreground truncate">{item.developer_name || "—"}</span>
                          <span className="text-xs text-muted-foreground truncate">{item.developer_email || "—"}</span>
                          <span className="text-xs text-muted-foreground">Year: {item.employment_year}</span>
                          {score != null && (
                            <span className={`text-xs font-semibold ${score >= 85 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                              Score: {score}%
                            </span>
                          )}
                        </div>
                        {item.error_message && (
                          <p className="text-xs text-red-500 mt-1 truncate">⚠ {item.error_message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(item.created_at).toLocaleString()}
                          {item.completed_at && ` → ${new Date(item.completed_at).toLocaleString()}`}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.queue_status === "failed" && (
                          <Button size="sm" variant="outline"
                            disabled={retrying === item.id}
                            onClick={() => handleRetry(item.id)}
                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                            {retrying === item.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <RotateCcw className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost"
                          disabled={deleting === item.id}
                          onClick={() => handleDelete(item.id)}
                          className="text-red-500 hover:bg-red-50">
                          {deleting === item.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost"
                          onClick={() => setExpandedId(expanded ? null : item.id)}>
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {expanded && (
                      <div className="px-4 pb-4 bg-muted/30 border-t">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                          <DetailBox label="NIN (masked)" value={item.nin || "—"} />
                          <DetailBox label="BVN (masked)" value={item.bvn || "—"} />
                          <DetailBox label="NIN Score" value={`${item.nin_score ?? 0} pts`} />
                          <DetailBox label="BVN Score" value={`${item.bvn_score ?? 0} pts`} />
                          <DetailBox label="Name Match" value={item.name_match_score ? `${(parseFloat(item.name_match_score) * 100).toFixed(0)}%` : "—"} />
                          <DetailBox label="DOB Match" value={item.dob_match ? "✓ Yes" : "✗ No"} />
                          <DetailBox label="Timeline" value={item.timeline_valid ? "✓ Valid" : "✗ Flagged"} />
                          <DetailBox label="Initial Score" value={item.initial_score != null ? `${item.initial_score}%` : "—"} />
                          {item.ssce_provider && (
                            <>
                              <DetailBox label="SSCE Provider" value={item.ssce_provider} />
                              <DetailBox label="SSCE RPA Status" value={item.rpa_status || "—"} />
                              <DetailBox label="SSCE Job ID" value={item.ssce_job_id ? item.ssce_job_id.substring(0, 8) + "…" : "—"} mono />
                            </>
                          )}
                        </div>
                        {Array.isArray(item.flags) && item.flags.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Flags</p>
                            <div className="space-y-1">
                              {item.flags.map((f: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded px-2.5 py-1.5">
                                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                  {f}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {item.error_message && (
                          <div className="mt-3 text-xs text-red-600 bg-red-50 rounded px-3 py-2">
                            <span className="font-semibold">Error: </span>{item.error_message}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailBox({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-background rounded-lg p-2.5 border">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
