import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Shield, AlertTriangle, CheckCircle, RefreshCw, TrendingUp, ArrowRight, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { screeningApi } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

const ease = [0.22, 1, 0.36, 1] as any;

function RiskBadge({ level }: { level: string }) {
  if (level === "High Risk") return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
      High Risk
    </span>
  );
  if (level === "Medium Risk") return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
      Medium Risk
    </span>
  );
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(8,182,62,0.1)", color: "#08B63E" }}>
      Low Risk
    </span>
  );
}

function CandidateRow({ c, index }: { c: any; index: number }) {
  const fraud = c.fraudResult as any;
  const score = fraud?.score;
  const scoreColor = score === undefined ? "#64748B" : score < 60 ? "#EF4444" : score < 80 ? "#F59E0B" : "#08B63E";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }}>
      <Link href={`/employment-screening/dashboard/candidates/${c.id}`}>
        <a className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/80 transition-colors group border-b last:border-0"
          style={{ borderColor: "#F4F6F8" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED, #EF4444)" }}>
            {c.fullName?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: "#0F172A" }}>{c.fullName}</p>
            <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{c.reference}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {score !== undefined && (
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 rounded-full" style={{ background: "#F4F6F8" }}>
                  <div className="h-full rounded-full" style={{ width: `${score}%`, background: scoreColor }} />
                </div>
                <span className="text-xs font-bold" style={{ color: scoreColor }}>{score}%</span>
              </div>
            )}
            <RiskBadge level={fraud?.level || "Unknown"} />
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#64748B" }} />
          </div>
        </a>
      </Link>
    </motion.div>
  );
}

export default function FraudCenter() {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"high" | "medium">("high");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    screeningApi.fraud().then(setData).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const candidates = tab === "high" ? data?.highRiskCandidates || [] : data?.mediumRiskCandidates || [];

  return (
    <ScreeningDashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}
          className="flex items-center justify-between mb-7">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-3"
              style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
              <Shield className="w-3 h-3" /> Fraud Intelligence
            </div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "#0F172A" }}>Fraud Intelligence Center</h1>
            <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>AI-powered risk analysis across all screenings</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="rounded-xl h-9 gap-1.5"
            style={{ borderColor: "#E5E7EB", color: "#64748B" }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </motion.div>

        {/* Risk Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "High Risk", value: data?.overview?.highRisk ?? "—", icon: AlertTriangle, bg: "rgba(239,68,68,0.08)", color: "#EF4444", border: "rgba(239,68,68,0.2)", index: 0 },
            { label: "Medium Risk", value: data?.overview?.mediumRisk ?? "—", icon: TrendingUp, bg: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "rgba(245,158,11,0.2)", index: 1 },
            { label: "Review Queue", value: data?.overview?.reviewQueue ?? "—", icon: Shield, bg: "rgba(8,182,62,0.08)", color: "#08B63E", border: "rgba(8,182,62,0.2)", index: 2 },
          ].map(({ label, value, icon: Icon, bg, color, border, index }) => (
            <motion.div key={label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.07, ease }}
              whileHover={{ y: -2 }}
              className="bg-white rounded-2xl border p-5 flex items-center gap-4"
              style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: bg, border: `1px solid ${border}` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight" style={{ color: "#0F172A" }}>{value}</p>
                <p className="text-sm" style={{ color: "#64748B" }}>{label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2, ease }}
          className="rounded-2xl p-5 mb-6 relative overflow-hidden border"
          style={{ background: "linear-gradient(135deg, #08142B 0%, #102340 100%)", borderColor: "rgba(8,182,62,0.2)" }}>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle, #08B63E, transparent)", transform: "translate(20%, -20%)" }} />
          <div className="relative flex items-start gap-3">
            <Brain className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#08B63E" }} />
            <div>
              <p className="font-semibold text-white text-sm mb-1.5">How Fraud Scoring Works</p>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                Each candidate is cross-checked for identity consistency. We compare NIN and BVN name similarity (threshold 70%), date-of-birth match,
                and check against watchlists. Scores below 60% indicate High Risk, 60–79% is Medium Risk, and 80%+ is Low Risk.
              </p>
              <div className="flex items-center gap-4 mt-3">
                {[["< 60%", "High Risk", "#EF4444"], ["60–79%", "Medium Risk", "#F59E0B"], ["≥ 80%", "Low Risk", "#08B63E"]].map(([range, label, color]) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>{range}</span>
                    <span className="font-semibold" style={{ color }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Candidate table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.28, ease }}
          className="bg-white rounded-2xl border overflow-hidden"
          style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div className="flex border-b" style={{ borderColor: "#F4F6F8" }}>
            {[
              { key: "high", label: "High Risk", count: data?.overview?.highRisk || 0, activeColor: "#EF4444", activeBg: "rgba(239,68,68,0.1)" },
              { key: "medium", label: "Medium Risk", count: data?.overview?.mediumRisk || 0, activeColor: "#F59E0B", activeBg: "rgba(245,158,11,0.1)" },
            ].map(({ key, label, count, activeColor, activeBg }) => (
              <button key={key} onClick={() => setTab(key as any)}
                className="flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all"
                style={tab === key
                  ? { borderColor: activeColor, color: activeColor }
                  : { borderColor: "transparent", color: "#64748B" }}>
                {label}
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={tab === key ? { background: activeBg, color: activeColor } : { background: "#F4F6F8", color: "#64748B" }}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b animate-pulse" style={{ borderColor: "#F4F6F8" }}>
                  <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded-lg w-32" />
                    <div className="h-2 bg-gray-100 rounded-lg w-24" />
                  </div>
                  <div className="w-20 h-5 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(8,182,62,0.08)" }}>
                <CheckCircle className="w-6 h-6" style={{ color: "#08B63E" }} />
              </div>
              <p className="font-medium" style={{ color: "#0F172A" }}>No {tab === "high" ? "high" : "medium"} risk candidates</p>
              <p className="text-sm mt-1" style={{ color: "#64748B" }}>Your candidates look clean — great news.</p>
            </div>
          ) : (
            <div>
              {candidates.map((c: any, i: number) => <CandidateRow key={c.id} c={c} index={i} />)}
            </div>
          )}
        </motion.div>
      </div>
    </ScreeningDashboardLayout>
  );
}
