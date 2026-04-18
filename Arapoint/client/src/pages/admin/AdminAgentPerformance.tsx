import { useState, useEffect, useCallback } from "react";
import { tokenStorage } from "@/lib/tokenStorage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Users, TrendingUp, Clock, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, ArrowUpRight, Star, Activity, BarChart2, Wallet,
  ChevronRight, Loader2, Download
} from "lucide-react";
import AdminDashboardLayout from "@/components/layout/AdminDashboardLayout";

const getAdminToken = () => tokenStorage.getItem("adminToken");

const AGENT_TYPES = [
  { value: "all", label: "All Agents" },
  { value: "education", label: "Education Agents" },
  { value: "jamb", label: "JAMB Agents" },
  { value: "identity", label: "Identity Agents" },
  { value: "a2c", label: "A2C Agents" },
  { value: "cac", label: "CAC Agents" },
];

const AGENT_TYPE_COLORS: Record<string, string> = {
  education: "bg-blue-100 text-blue-700",
  jamb:      "bg-purple-100 text-purple-700",
  identity:  "bg-emerald-100 text-emerald-700",
  a2c:       "bg-orange-100 text-orange-700",
  cac:       "bg-rose-100 text-rose-700",
};

const SCORE_COLOR = (score: number) =>
  score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600";

const SCORE_LABEL = (score: number) =>
  score >= 75 ? "Excellent" : score >= 50 ? "Good" : score >= 25 ? "Fair" : "Needs Attention";

function formatHours(h: number | null) {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${Math.round(h * 10) / 10}h`;
}

function formatNaira(n: number) {
  return `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

function KPICard({ title, value, sub, icon: Icon, color }: { title: string; value: string | number; sub?: string; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-lg ${color.replace("text-", "bg-").replace("-600", "-100").replace("-500", "-100")}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const bg =
    score >= 75 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    score >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
    "bg-red-50 text-red-700 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${bg}`}>
      <Star className="h-3 w-3" />{score}
    </span>
  );
}

function AgentDetailModal({ agentType, agentId, onClose }: { agentType: string; agentId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      const r = await fetch(`/api/admin/agents/performance/${agentType}/${agentId}?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.status === "success") setData(d.data);
    } catch {}
    setLoading(false);
  }, [agentType, agentId, days]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const m = data?.metrics;
  const agent = data?.agent;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div>
              <DialogTitle className="text-xl">{agent?.name || "Agent Detail"}</DialogTitle>
              <p className="text-sm text-muted-foreground">{agent?.email} &bull; {agent?.employee_id || "No Employee ID"}</p>
            </div>
            <Badge className={AGENT_TYPE_COLORS[agentType] || "bg-gray-100 text-gray-700"}>
              {agentType.toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex gap-2 mt-2">
          {["7", "14", "30", "90"].map(d => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>
              {d}d
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : !m ? (
          <div className="text-center py-16 text-muted-foreground">No data available</div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Status Row */}
            <div className="flex flex-wrap gap-3">
              <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${agent?.is_available ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                {agent?.is_available ? "● Available" : "○ Unavailable"}
              </div>
              <div className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                Load: {m.loadPercent}% ({agent?.current_active_requests}/{agent?.max_active_requests})
              </div>
              {m.slaBreaches > 0 && (
                <div className="px-3 py-1.5 rounded-full text-sm font-medium bg-red-50 text-red-700">
                  ⚠ {m.slaBreaches} SLA Breach{m.slaBreaches > 1 ? "es" : ""}
                </div>
              )}
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/40 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Completed</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{m.completed}</p>
                <p className="text-xs text-muted-foreground">of {m.totalRequests} total</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Completion Rate</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{m.completionRate}%</p>
                <Progress value={m.completionRate} className="mt-2 h-1.5" />
              </div>
              <div className="bg-muted/40 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. Handle Time</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{formatHours(m.avgResolutionHours)}</p>
                <p className="text-xs text-muted-foreground">per request</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Revenue Generated</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{formatNaira(m.revenueGenerated)}</p>
                <p className="text-xs text-muted-foreground">last {days} days</p>
              </div>
            </div>

            {/* Daily Trend Table */}
            {data?.dailyTrend?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BarChart2 className="h-4 w-4" /> Daily Activity (last {days} days)</h4>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Completed</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.dailyTrend.slice(-14).reverse().map((row: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{new Date(row.date).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}</TableCell>
                          <TableCell className="text-right text-xs">{row.total}</TableCell>
                          <TableCell className="text-right text-xs text-emerald-600">{row.completed}</TableCell>
                          <TableCell className="text-right text-xs">{formatNaira(parseFloat(row.revenue || "0"))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Recent Requests */}
            {data?.requests?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Activity className="h-4 w-4" /> Recent Requests</h4>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tracking ID</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead className="text-right">Fee</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.requests.slice(0, 15).map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.tracking_id || r.id?.slice(0, 8)}</TableCell>
                          <TableCell className="text-xs">{r.service_type || "—"}</TableCell>
                          <TableCell>
                            <Badge className={
                              r.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                              r.status === "rejected"  ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700"
                            }>{r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.assigned_at ? new Date(r.assigned_at).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.completed_at ? new Date(r.completed_at).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs">{formatNaira(parseFloat(r.fee || "0"))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Activity Log */}
            {data?.activityLog?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Clock className="h-4 w-4" /> Activity Log</h4>
                <div className="space-y-1.5">
                  {data.activityLog.slice(0, 20).map((log: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-muted/30">
                      <span className={`px-2 py-0.5 rounded font-medium ${
                        log.action === "login" ? "bg-blue-100 text-blue-700" :
                        log.action === "logout" ? "bg-gray-100 text-gray-600" :
                        log.action === "task_completed" ? "bg-emerald-100 text-emerald-700" :
                        log.action === "sla_breach" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>{log.action.replace(/_/g, " ")}</span>
                      {log.service_type && <span className="text-muted-foreground">{log.service_type}</span>}
                      <span className="ml-auto text-muted-foreground">{new Date(log.created_at).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminAgentPerformance() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [days, setDays] = useState("30");
  const [selectedAgent, setSelectedAgent] = useState<{ agentType: string; agentId: string } | null>(null);
  const [sortBy, setSortBy] = useState("performanceScore");

  const fetchPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      const typeParam = filterType !== "all" ? `&type=${filterType}` : "";
      const r = await fetch(`/api/admin/agents/performance?days=${days}${typeParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.status === "success") setAgents(d.data.agents || []);
    } catch {}
    setLoading(false);
  }, [filterType, days]);

  useEffect(() => { fetchPerformance(); }, [fetchPerformance]);

  const sorted = [...agents].sort((a, b) => {
    if (sortBy === "performanceScore") return b.performanceScore - a.performanceScore;
    if (sortBy === "completed_count") return Number(b.completed_count) - Number(a.completed_count);
    if (sortBy === "revenue_generated") return Number(b.revenue_generated) - Number(a.revenue_generated);
    if (sortBy === "sla_breaches") return Number(b.sla_breaches) - Number(a.sla_breaches);
    return 0;
  });

  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.is_available).length;
  const totalCompleted = agents.reduce((s, a) => s + Number(a.completed_count), 0);
  const totalRevenue = agents.reduce((s, a) => s + Number(a.revenue_generated), 0);
  const totalSLABreaches = agents.reduce((s, a) => s + Number(a.sla_breaches), 0);
  const avgScore = agents.length > 0 ? Math.round(agents.reduce((s, a) => s + a.performanceScore, 0) / agents.length) : 0;

  const exportCSV = () => {
    const headers = ["Name", "Email", "Agent Type", "Employee ID", "Status", "Score", "Total Requests", "Completed", "Completion Rate", "Avg Handle Time (h)", "SLA Breaches", "Revenue (₦)"];
    const rows = sorted.map(a => [
      a.name, a.email, a.agent_type, a.employee_id || "",
      a.is_available ? "Available" : "Unavailable",
      a.performanceScore, a.total_requests, a.completed_count,
      `${Number(a.total_requests) > 0 ? Math.round((a.completed_count / a.total_requests) * 100) : 0}%`,
      a.avg_resolution_hours ?? "",
      a.sla_breaches,
      a.revenue_generated,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arapoint_agent_performance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agent Performance</h1>
            <p className="text-muted-foreground text-sm">Monitor all agent activity, KPIs, and service quality across teams</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchPerformance} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={loading || agents.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Agent Type" />
            </SelectTrigger>
            <SelectContent>
              {AGENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="performanceScore">Sort: Score</SelectItem>
              <SelectItem value="completed_count">Sort: Completed</SelectItem>
              <SelectItem value="revenue_generated">Sort: Revenue</SelectItem>
              <SelectItem value="sla_breaches">Sort: SLA Breaches</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard title="Total Agents" value={totalAgents} icon={Users} color="text-blue-600" />
          <KPICard title="Active Now" value={activeAgents} sub={`of ${totalAgents} agents`} icon={Activity} color="text-emerald-600" />
          <KPICard title="Tasks Completed" value={totalCompleted.toLocaleString()} sub={`last ${days} days`} icon={CheckCircle2} color="text-emerald-600" />
          <KPICard title="Revenue Generated" value={formatNaira(totalRevenue)} sub={`last ${days} days`} icon={Wallet} color="text-purple-600" />
          <KPICard title="SLA Breaches" value={totalSLABreaches} sub="open > 24h" icon={AlertTriangle} color={totalSLABreaches > 0 ? "text-red-600" : "text-emerald-600"} />
          <KPICard title="Avg. Score" value={avgScore} sub={SCORE_LABEL(avgScore)} icon={Star} color={SCORE_COLOR(avgScore)} />
        </div>

        {/* Leaderboard Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Agent Leaderboard
            </CardTitle>
            <CardDescription>Ranked by performance score across all agent types for the last {days} days</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No agents found for the selected filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Avg. Time</TableHead>
                      <TableHead className="text-right">SLA Breach</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Load</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((agent, i) => {
                      const rate = Number(agent.total_requests) > 0
                        ? Math.round((Number(agent.completed_count) / Number(agent.total_requests)) * 100) : 0;
                      return (
                        <TableRow
                          key={agent.id}
                          className="cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => setSelectedAgent({ agentType: agent.agent_type, agentId: agent.id })}
                        >
                          <TableCell className="text-muted-foreground text-sm font-medium">{i + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{agent.name}</p>
                              <p className="text-xs text-muted-foreground">{agent.email}</p>
                              {agent.employee_id && <p className="text-xs text-muted-foreground font-mono">{agent.employee_id}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={AGENT_TYPE_COLORS[agent.agent_type] || "bg-gray-100 text-gray-700"}>
                              {agent.agent_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${agent.is_available ? "text-emerald-600" : "text-gray-500"}`}>
                              <span className={`h-2 w-2 rounded-full ${agent.is_available ? "bg-emerald-500" : "bg-gray-400"}`} />
                              {agent.is_available ? "Available" : "Offline"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <ScoreBadge score={agent.performanceScore} />
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-emerald-600">{Number(agent.completed_count).toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground ml-1">/ {Number(agent.total_requests)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              <span className={`text-sm font-semibold ${rate >= 80 ? "text-emerald-600" : rate >= 50 ? "text-amber-600" : "text-red-600"}`}>{rate}%</span>
                              <Progress value={rate} className="h-1 mt-1 w-16 ml-auto" />
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatHours(Number(agent.avg_resolution_hours) || null)}</TableCell>
                          <TableCell className="text-right">
                            {Number(agent.sla_breaches) > 0 ? (
                              <span className="text-red-600 font-semibold flex items-center justify-end gap-1">
                                <AlertTriangle className="h-3 w-3" />{agent.sla_breaches}
                              </span>
                            ) : (
                              <span className="text-emerald-600"><CheckCircle2 className="h-4 w-4 inline" /></span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatNaira(Number(agent.revenue_generated))}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className={`text-xs font-medium ${agent.loadPercent >= 80 ? "text-red-600" : agent.loadPercent >= 50 ? "text-amber-600" : "text-emerald-600"}`}>
                                {agent.loadPercent}%
                              </span>
                              <Progress value={agent.loadPercent} className="h-1.5 w-12" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Tiers Summary */}
        {!loading && agents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Top Performers", min: 75, max: 100, color: "border-emerald-200 bg-emerald-50", badge: "bg-emerald-100 text-emerald-700" },
              { label: "Good Performance", min: 50, max: 74, color: "border-amber-200 bg-amber-50", badge: "bg-amber-100 text-amber-700" },
              { label: "Needs Attention", min: 0, max: 49, color: "border-red-200 bg-red-50", badge: "bg-red-100 text-red-700" },
            ].map(tier => {
              const group = agents.filter(a => a.performanceScore >= tier.min && a.performanceScore <= tier.max);
              return (
                <Card key={tier.label} className={`border ${tier.color}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">{tier.label}</h3>
                      <Badge className={tier.badge}>{group.length} agent{group.length !== 1 ? "s" : ""}</Badge>
                    </div>
                    <div className="space-y-1.5">
                      {group.length === 0 ? (
                        <p className="text-xs text-muted-foreground">None in this tier</p>
                      ) : group.slice(0, 5).map((a, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs cursor-pointer hover:opacity-70"
                          onClick={() => setSelectedAgent({ agentType: a.agent_type, agentId: a.id })}
                        >
                          <span className="font-medium truncate">{a.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <Badge className={AGENT_TYPE_COLORS[a.agent_type] || ""}>{a.agent_type}</Badge>
                            <ScoreBadge score={a.performanceScore} />
                          </div>
                        </div>
                      ))}
                      {group.length > 5 && <p className="text-xs text-muted-foreground">+{group.length - 5} more</p>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {selectedAgent && (
        <AgentDetailModal
          agentType={selectedAgent.agentType}
          agentId={selectedAgent.agentId}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </AdminDashboardLayout>
  );
}
