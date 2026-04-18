import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle2, Clock, AlertTriangle, TrendingUp, RefreshCw, Wallet } from "lucide-react";

interface AgentPerformanceWidgetProps {
  apiBase: string;
  getToken: () => string | null;
}

function formatHours(h: number | null | undefined) {
  if (h == null) return "—";
  if (Number(h) < 1) return `${Math.round(Number(h) * 60)}m`;
  return `${Math.round(Number(h) * 10) / 10}h`;
}

function formatNaira(n: number) {
  return `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

const scoreColor = (s: number) =>
  s >= 75 ? "text-emerald-600" : s >= 50 ? "text-amber-500" : "text-red-500";

const scoreLabel = (s: number) =>
  s >= 75 ? "Excellent" : s >= 50 ? "Good" : s >= 25 ? "Fair" : "Needs Improvement";

const scoreBg = (s: number) =>
  s >= 75
    ? "from-emerald-50 to-emerald-100 border-emerald-200"
    : s >= 50
    ? "from-amber-50 to-amber-100 border-amber-200"
    : "from-red-50 to-red-100 border-red-200";

const scoreBorder = (s: number) =>
  s >= 75 ? "border-emerald-400 bg-emerald-50" : s >= 50 ? "border-amber-400 bg-amber-50" : "border-red-400 bg-red-50";

const scoreBadge = (s: number) =>
  s >= 75 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
  s >= 50 ? "bg-amber-100 text-amber-700 border-amber-200" :
  "bg-red-100 text-red-700 border-red-200";

export default function AgentPerformanceWidget({ apiBase, getToken }: AgentPerformanceWidgetProps) {
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

  return (
    <Card className={`border bg-gradient-to-br ${scoreBg(score)}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            My Performance
          </CardTitle>
          <div className="flex items-center gap-1">
            {[7, 30, 90].map(d => (
              <Button
                key={d}
                size="sm"
                variant={days === d ? "default" : "ghost"}
                className="h-6 px-2 text-xs"
                onClick={() => setDays(d)}
              >
                {d}d
              </Button>
            ))}
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={fetchPerformance} disabled={loading}>
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !perf ? (
          <p className="text-xs text-muted-foreground text-center py-4">No performance data yet</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 ${scoreBorder(score)} shrink-0`}>
                <Star className={`h-4 w-4 ${scoreColor(score)}`} />
                <span className={`text-xl font-bold leading-none mt-0.5 ${scoreColor(score)}`}>{score}</span>
              </div>
              <div>
                <Badge className={`mb-1 ${scoreBadge(score)}`}>{scoreLabel(score)}</Badge>
                <p className="text-xs text-muted-foreground">Score — last {days} days</p>
                <p className="text-xs text-muted-foreground">{perf.totalRequests} total requests assigned</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground font-medium">Completion Rate</span>
                <span className={`font-bold ${perf.completionRate >= 75 ? "text-emerald-600" : perf.completionRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {perf.completionRate}%
                </span>
              </div>
              <Progress value={perf.completionRate} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/70 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">Completed</span>
                </div>
                <p className="text-lg font-bold text-emerald-600">{perf.completed}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Avg. Time</span>
                </div>
                <p className="text-lg font-bold text-amber-600">{formatHours(perf.avgResolutionHours)}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs text-muted-foreground">SLA Breaches</span>
                </div>
                <p className={`text-lg font-bold ${perf.slaBreaches > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {perf.slaBreaches}
                </p>
              </div>
              <div className="bg-white/70 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Wallet className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Revenue</span>
                </div>
                <p className="text-sm font-bold text-purple-600">{formatNaira(perf.revenueGenerated)}</p>
              </div>
            </div>

            {perf.slaBreaches > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
                ⚠ {perf.slaBreaches} request{perf.slaBreaches > 1 ? "s" : ""} open beyond 24h — please action them urgently.
              </div>
            )}
            {score >= 75 && perf.slaBreaches === 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs text-emerald-700">
                ✓ Top performer — keep it up!
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
