import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Star, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  RefreshCw, Wallet, XCircle, ArrowLeft, Loader2
} from "lucide-react";

interface AgentPerformancePageProps {
  apiBase: string;
  getToken: () => string | null;
  agentLabel: string;
  backPath: string;
}

function formatHours(h: number | null | undefined) {
  if (h == null) return "—";
  if (Number(h) < 1) return `${Math.round(Number(h) * 60)}m`;
  return `${Math.round(Number(h) * 10) / 10}h`;
}

function formatNaira(n: number) {
  return `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

const SCORE_COLOR = (s: number) =>
  s >= 75 ? "text-emerald-600" : s >= 50 ? "text-amber-500" : "text-red-500";

const SCORE_LABEL = (s: number) =>
  s >= 75 ? "Excellent" : s >= 50 ? "Good" : s >= 25 ? "Fair" : "Needs Improvement";

const SCORE_BG = (s: number) =>
  s >= 75 ? "from-emerald-500 to-emerald-600" :
  s >= 50 ? "from-amber-500 to-amber-600" :
  "from-red-500 to-red-600";

const SCORE_BORDER = (s: number) =>
  s >= 75 ? "border-emerald-200 bg-emerald-50" :
  s >= 50 ? "border-amber-200 bg-amber-50" :
  "border-red-200 bg-red-50";

const SCORE_BADGE = (s: number) =>
  s >= 75 ? "bg-emerald-100 text-emerald-700 border-emerald-300" :
  s >= 50 ? "bg-amber-100 text-amber-700 border-amber-300" :
  "bg-red-100 text-red-700 border-red-300";

const RING_COLOR = (s: number) =>
  s >= 75 ? "#10b981" : s >= 50 ? "#f59e0b" : "#ef4444";

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={RING_COLOR(score)}
          strokeWidth="10"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-4xl font-black ${SCORE_COLOR(score)}`}>{score}</span>
        <span className="text-xs text-muted-foreground font-medium">/ 100</span>
      </div>
    </div>
  );
}

export default function AgentPerformancePage({ apiBase, getToken, agentLabel, backPath }: AgentPerformancePageProps) {
  const [, setLocation] = useLocation();
  const [perf, setPerf] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${apiBase}/performance?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.status === "success") setPerf(data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchPerformance(); }, [days]);

  const score = perf?.performanceScore ?? 0;

  const statCards = perf ? [
    {
      label: "Completed",
      value: perf.completed,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
    },
    {
      label: "Pending",
      value: perf.pending,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
    },
    {
      label: "Rejected",
      value: perf.rejected,
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-50 border-red-200",
    },
    {
      label: "Total Assigned",
      value: perf.totalRequests,
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-200",
    },
    {
      label: "Avg. Resolution",
      value: formatHours(perf.avgResolutionHours),
      icon: Clock,
      color: "text-purple-600",
      bg: "bg-purple-50 border-purple-200",
    },
    {
      label: "SLA Breaches",
      value: perf.slaBreaches,
      icon: AlertTriangle,
      color: perf.slaBreaches > 0 ? "text-red-600" : "text-emerald-600",
      bg: perf.slaBreaches > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200",
    },
    {
      label: "Completion Rate",
      value: `${perf.completionRate}%`,
      icon: Star,
      color: perf.completionRate >= 75 ? "text-emerald-600" : perf.completionRate >= 50 ? "text-amber-600" : "text-red-600",
      bg: perf.completionRate >= 75 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200",
    },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation(backPath)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              My Performance — {agentLabel}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            {[7, 30, 90].map(d => (
              <Button
                key={d}
                size="sm"
                variant={days === d ? "default" : "outline"}
                className="h-8 px-3 text-xs"
                onClick={() => setDays(d)}
              >
                {d} days
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={fetchPerformance} disabled={loading} className="h-8 w-8 p-0 ml-1">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !perf ? (
          <div className="text-center py-24 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No performance data yet</p>
            <p className="text-sm">Start completing requests to see your scores here.</p>
          </div>
        ) : (
          <>
            {/* Score Hero Card */}
            <Card className={`border ${SCORE_BORDER(score)}`}>
              <CardContent className="pt-8 pb-8">
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className="flex flex-col items-center gap-3">
                    <ScoreRing score={score} />
                    <Badge className={`text-sm px-4 py-1 ${SCORE_BADGE(score)}`}>
                      {SCORE_LABEL(score)}
                    </Badge>
                  </div>
                  <div className="flex-1 space-y-5">
                    <div>
                      <h2 className="text-xl font-bold mb-1">Performance Score</h2>
                      <p className="text-sm text-muted-foreground">
                        Based on your last {days} days of activity across {perf.totalRequests} assigned request{perf.totalRequests !== 1 ? "s" : ""}.
                      </p>
                    </div>

                    {/* Score breakdown bars */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground font-medium">Completion Rate (40%)</span>
                          <span className="font-bold">{perf.completionRate}%</span>
                        </div>
                        <Progress value={perf.completionRate} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground font-medium">SLA Compliance (30%)</span>
                          <span className="font-bold">{Math.max(0, 100 - perf.slaBreaches * 10)}%</span>
                        </div>
                        <Progress value={Math.max(0, 100 - perf.slaBreaches * 10)} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground font-medium">Speed Score (20%)</span>
                          <span className="font-bold">
                            {perf.avgResolutionHours != null
                              ? `${Math.round(Math.max(0, 100 - Math.min(100, perf.avgResolutionHours * 5)))}%`
                              : "—"}
                          </span>
                        </div>
                        <Progress
                          value={perf.avgResolutionHours != null ? Math.max(0, 100 - Math.min(100, perf.avgResolutionHours * 5)) : 0}
                          className="h-2"
                        />
                      </div>
                    </div>

                    {/* Alerts */}
                    {perf.slaBreaches > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">
                          You have <strong>{perf.slaBreaches}</strong> open request{perf.slaBreaches > 1 ? "s" : ""} past 24 hours. Action them to avoid further SLA breaches.
                        </p>
                      </div>
                    )}
                    {score >= 75 && perf.slaBreaches === 0 && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-emerald-700">
                          Excellent work! You're a top performer. Keep maintaining this level of service.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Detailed Metrics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {statCards.map(({ label, value, icon: Icon, color, bg }) => (
                  <Card key={label} className={`border ${bg}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`h-4 w-4 ${color}`} />
                        <span className="text-xs text-muted-foreground font-medium">{label}</span>
                      </div>
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Tips */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Improvement Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {perf.completionRate < 75 && (
                  <div className="flex gap-2">
                    <span className="text-amber-500">•</span>
                    <p>Your completion rate is below 75%. Try to action and close requests faster to improve your score.</p>
                  </div>
                )}
                {perf.slaBreaches > 0 && (
                  <div className="flex gap-2">
                    <span className="text-red-500">•</span>
                    <p>SLA breaches hurt your score significantly (each breach costs 10 points). Prioritise open requests older than 24 hours.</p>
                  </div>
                )}
                {perf.avgResolutionHours != null && Number(perf.avgResolutionHours) > 8 && (
                  <div className="flex gap-2">
                    <span className="text-amber-500">•</span>
                    <p>Your average resolution time is {formatHours(perf.avgResolutionHours)}. Aim to resolve requests within 8 hours for a better speed score.</p>
                  </div>
                )}
                {score >= 75 && perf.slaBreaches === 0 && (
                  <div className="flex gap-2">
                    <span className="text-emerald-500">•</span>
                    <p>You're performing excellently! Maintain quick response times and zero SLA breaches to stay at the top.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
