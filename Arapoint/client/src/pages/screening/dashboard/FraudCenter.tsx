import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Shield, AlertTriangle, CheckCircle, RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { screeningApi } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

function RiskBadge({ level }: { level: string }) {
  if (level === "High Risk") return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">High Risk</span>;
  if (level === "Medium Risk") return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700">Medium Risk</span>;
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Low Risk</span>;
}

function CandidateRow({ c }: { c: any }) {
  const fraud = c.fraudResult as any;
  return (
    <Link href={`/employment-screening/dashboard/candidates/${c.id}`}>
      <a className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
        <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 font-bold text-sm flex-shrink-0">
          {c.fullName?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{c.fullName}</p>
          <p className="text-xs text-gray-400">{c.reference}</p>
        </div>
        <div className="flex items-center gap-3">
          {fraud?.score !== undefined && (
            <span className="text-sm font-bold text-gray-700">{fraud.score}%</span>
          )}
          <RiskBadge level={fraud?.level || "Unknown"} />
        </div>
      </a>
    </Link>
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
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Fraud Intelligence Center</h1>
            <p className="text-sm text-gray-500">AI-powered risk analysis across all screenings</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="rounded-xl">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "High Risk", value: data?.overview?.highRisk ?? "—", icon: AlertTriangle, color: "bg-red-50 text-red-600", border: "border-red-100" },
            { label: "Medium Risk", value: data?.overview?.mediumRisk ?? "—", icon: TrendingUp, color: "bg-yellow-50 text-yellow-600", border: "border-yellow-100" },
            { label: "Review Queue", value: data?.overview?.reviewQueue ?? "—", icon: Shield, color: "bg-green-50 text-green-600", border: "border-green-100" },
          ].map(({ label, value, icon: Icon, color, border }) => (
            <div key={label} className={`bg-white rounded-2xl border ${border} shadow-sm p-5 flex items-center gap-4`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Info card */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-green-700 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900 text-sm mb-1">How Fraud Scoring Works</p>
              <p className="text-green-700 text-xs leading-relaxed">
                Each candidate is cross-checked for identity consistency. We compare NIN and BVN name similarity (threshold 70%), date-of-birth match, and check against watchlists. Scores below 60% indicate High Risk, 60–79% is Medium Risk, and 80%+ is Low Risk.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs + Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex border-b border-gray-100">
            {[
              { key: "high", label: "High Risk", count: data?.overview?.highRisk || 0, color: "text-red-600 border-red-600" },
              { key: "medium", label: "Medium Risk", count: data?.overview?.mediumRisk || 0, color: "text-yellow-600 border-yellow-600" },
            ].map(({ key, label, count, color }) => (
              <button key={key} onClick={() => setTab(key as any)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all ${tab === key ? color : "text-gray-500 border-transparent hover:text-gray-700"}`}>
                {label}
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tab === key ? (key === "high" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700") : "bg-gray-100 text-gray-500"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-full" />
                  <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-32" /><div className="h-2 bg-gray-100 rounded w-24" /></div>
                  <div className="w-20 h-5 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No {tab === "high" ? "high" : "medium"} risk candidates</p>
              <p className="text-gray-400 text-sm mt-1">Great news — your candidates look clean.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {candidates.map((c: any) => <CandidateRow key={c.id} c={c} />)}
            </div>
          )}
        </div>
      </div>
    </ScreeningDashboardLayout>
  );
}
