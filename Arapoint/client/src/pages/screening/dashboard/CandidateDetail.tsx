import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  CheckCircle, XCircle, AlertTriangle, Loader2, Download, RefreshCw,
  ArrowLeft, Shield, GraduationCap, User, TrendingUp, Clock, Brain,
  Zap, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { screeningApi, getDecisionBg } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

const ease = [0.22, 1, 0.36, 1] as any;

/** Mirror the server-side DOB normalisation so the frontend comparison is format-agnostic. */
function normalizeDobFE(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(s)) return s.substring(0, 10).replace(/\//g, '-');
  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const namedMatch = s.match(/^(\d{1,2})[-/\s]([a-zA-Z]{3})[-/\s](\d{4})/);
  if (namedMatch) {
    const mm = monthNames[namedMatch[2].toLowerCase()];
    if (mm) return `${namedMatch[3]}-${mm}-${namedMatch[1].padStart(2, '0')}`;
  }
  const parts = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (parts) {
    const d = parseInt(parts[1], 10);
    const m = parseInt(parts[2], 10);
    const y = parts[3];
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

function CircleScore({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#08B63E" : score >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={8} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease }}
          strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold" style={{ color: "#0F172A" }}>{score}%</span>
      </div>
    </div>
  );
}

function ConfidenceMeter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: "#64748B" }}>{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: "#F4F6F8" }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${value}%` }}
          transition={{ duration: 0.9, ease }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
    </div>
  );
}

function CheckRow({ label, status, detail }: { label: string; status: "verified" | "failed" | "pending" | "low_risk" | "medium_risk" | "high_risk"; detail?: string }) {
  const cfg: Record<string, { icon: any; label: string; color: string; bg: string; border: string }> = {
    verified:     { icon: CheckCircle,   label: "Verified",      color: "#08B63E", bg: "rgba(8,182,62,0.08)",   border: "rgba(8,182,62,0.2)" },
    failed:       { icon: XCircle,       label: "Failed",        color: "#EF4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)" },
    pending:      { icon: Loader2,       label: "In Progress",   color: "#2563EB", bg: "rgba(37,99,235,0.08)",  border: "rgba(37,99,235,0.2)" },
    low_risk:     { icon: CheckCircle,   label: "Low Risk",      color: "#08B63E", bg: "rgba(8,182,62,0.08)",   border: "rgba(8,182,62,0.2)" },
    medium_risk:  { icon: AlertTriangle, label: "Medium Risk",   color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
    high_risk:    { icon: AlertTriangle, label: "High Risk",     color: "#EF4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)" },
  };
  const c = cfg[status] || cfg.pending;
  const Icon = c.icon;
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: "#F4F6F8" }}>
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}>
          <Icon className={`w-3.5 h-3.5 ${status === "pending" ? "animate-spin" : ""}`} style={{ color: c.color }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "#0F172A" }}>{label}</p>
          {detail && <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{detail}</p>}
        </div>
      </div>
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: c.bg, color: c.color }}>{c.label}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, accent }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
      className="bg-white rounded-2xl border mb-5 overflow-hidden"
      style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center gap-2.5 px-6 py-4 border-b" style={{ borderColor: "#F4F6F8" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: accent?.bg || "rgba(8,182,62,0.08)" }}>
          <Icon className="w-3.5 h-3.5" style={{ color: accent?.color || "#08B63E" }} />
        </div>
        <h3 className="font-semibold text-sm" style={{ color: "#0F172A" }}>{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  );
}

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const load = async () => {
    try {
      const data = await screeningApi.candidates.get(id);
      setCandidate(data);
    } catch { } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [id]);

  const downloadPdf = async () => {
    if (!candidate || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const token = localStorage.getItem("screeningToken");
      const res = await fetch(`/api/screening/candidates/${candidate.id}/pdf`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${candidate.reference || candidate.id}-screening-report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("PDF download failed: " + (e.message || "Unknown error"));
    } finally {
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    if (candidate?.status === "processing") {
      const t = setTimeout(() => { setRefreshing(true); load(); }, 8000);
      return () => clearTimeout(t);
    }
  }, [candidate?.status]);

  if (loading) return (
    <ScreeningDashboardLayout>
      <div className="p-6 flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(8,182,62,0.08)" }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#08B63E" }} />
          </div>
          <p className="text-sm" style={{ color: "#64748B" }}>Loading report...</p>
        </div>
      </div>
    </ScreeningDashboardLayout>
  );

  if (!candidate) return (
    <ScreeningDashboardLayout>
      <div className="p-6 text-center">
        <p style={{ color: "#64748B" }}>Candidate not found.</p>
      </div>
    </ScreeningDashboardLayout>
  );

  const nin = candidate.ninResult as any;
  const bvn = candidate.bvnResult as any;
  const rawFraud = candidate.fraudResult as any;
  const edu = candidate.educationResult as any;

  const ninSuccess = nin?.success;
  const bvnSuccess = bvn?.success;
  const ninData = nin?.data;
  const bvnData = bvn?.data;

  const liveDobMatch = ninData?.dateOfBirth && bvnData?.dateOfBirth
    ? normalizeDobFE(ninData.dateOfBirth) === normalizeDobFE(bvnData.dateOfBirth)
    : null;

  const fraud = rawFraud ? {
    ...rawFraud,
    flags: (rawFraud.flags || []).filter((f: string) =>
      !(liveDobMatch === true && /date of birth mismatch/i.test(f))
    ),
  } : rawFraud;

  const isProcessing = candidate.status === "processing" || candidate.status === "pending";
  const score = candidate.overallScore;
  const scoreColor = score >= 80 ? "#08B63E" : score >= 60 ? "#F59E0B" : "#EF4444";

  const decisionConfig: Record<string, { label: string; bg: string; color: string; border: string; text: string }> = {
    PASS: {
      label: "Pass",
      bg: "rgba(8,182,62,0.08)", color: "#08B63E", border: "rgba(8,182,62,0.25)",
      text: "Candidate meets all verification requirements and is cleared for onboarding under standard HR review.",
    },
    REVIEW: {
      label: "Review Required",
      bg: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "rgba(245,158,11,0.25)",
      text: "Candidate has some inconsistencies. Manual review is recommended before proceeding with hiring.",
    },
    FAIL: {
      label: "Failed",
      bg: "rgba(239,68,68,0.08)", color: "#EF4444", border: "rgba(239,68,68,0.25)",
      text: "Candidate failed key verification checks. High risk detected. Do not proceed without thorough manual investigation.",
    },
  };
  const decision = candidate.decision ? decisionConfig[candidate.decision] : null;

  return (
    <ScreeningDashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Back nav */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease }}
          className="flex items-center gap-3 mb-6">
          <Link href="/employment-screening/dashboard/candidates">
            <button className="p-2 rounded-xl hover:bg-white transition-colors border" style={{ borderColor: "#E5E7EB" }}>
              <ArrowLeft className="w-4 h-4" style={{ color: "#64748B" }} />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight" style={{ color: "#0F172A" }}>Candidate Report</h1>
            <p className="text-xs" style={{ color: "#64748B" }}>{candidate.reference}</p>
          </div>
          <div className="flex items-center gap-2">
            {decision && (
              <span className="text-sm font-bold px-4 py-1.5 rounded-full"
                style={{ background: decision.bg, color: decision.color, border: `1px solid ${decision.border}` }}>
                {decision.label}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); load(); }}
              className="rounded-xl h-9" style={{ borderColor: "#E5E7EB" }}>
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </motion.div>

        {/* Hero candidate card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
          className="rounded-2xl p-6 mb-6 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #08142B 0%, #102340 100%)", boxShadow: "0 4px 24px rgba(8,20,43,0.2)" }}>
          <div className="absolute top-0 right-0 w-48 h-48 opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle, #08B63E, transparent)", transform: "translate(20%, -20%)" }} />
          <div className="relative flex flex-col sm:flex-row gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #08B63E, #2563EB)" }}>
                {candidate.fullName?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{candidate.fullName}</h2>
                <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{candidate.reference}</p>
                {candidate.position && <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{candidate.position}</p>}
                <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {new Date(candidate.createdAt).toLocaleString("en-NG")}
                </p>
              </div>
            </div>

            <div className="sm:ml-auto flex items-center gap-6">
              {/* Verification timeline */}
              <div className="hidden md:flex flex-col gap-2">
                {[
                  { label: "NIN", ok: ninSuccess, pending: !nin },
                  { label: "BVN", ok: bvnSuccess, pending: !bvn },
                  { label: "Education", ok: edu?.found, pending: !edu },
                  { label: "Fraud", ok: fraud?.score >= 80, pending: !fraud },
                ].map(({ label, ok, pending }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: pending ? "rgba(255,255,255,0.1)" : ok ? "rgba(8,182,62,0.3)" : "rgba(239,68,68,0.3)" }}>
                      {pending
                        ? <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                        : ok
                          ? <CheckCircle className="w-2.5 h-2.5" style={{ color: "#08B63E" }} />
                          : <XCircle className="w-2.5 h-2.5" style={{ color: "#EF4444" }} />}
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Score ring */}
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ border: "3px solid rgba(255,255,255,0.1)" }}>
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#08B63E" }} />
                  </div>
                  <p className="text-xs" style={{ color: "#08B63E" }}>Processing...</p>
                </div>
              ) : score !== null && score !== undefined ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="relative w-20 h-20">
                    <svg width={80} height={80} className="-rotate-90">
                      <circle cx={40} cy={40} r={32} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={8} />
                      <motion.circle cx={40} cy={40} r={32} fill="none" stroke={scoreColor} strokeWidth={8}
                        strokeDasharray={2 * Math.PI * 32}
                        strokeDashoffset={2 * Math.PI * 32}
                        animate={{ strokeDashoffset: 2 * Math.PI * 32 - (score / 100) * 2 * Math.PI * 32 }}
                        transition={{ duration: 1, ease }}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-white">{score}%</span>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Verification Score</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* NIN/BVN Confidence Meters */}
          {(ninSuccess || bvnSuccess) && (
            <div className="relative mt-5 grid grid-cols-2 gap-4 pt-5 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
              {ninSuccess && (
                <ConfidenceMeter label="NIN Confidence" value={ninData?.confidence || 95} color="#08B63E" />
              )}
              {bvnSuccess && (
                <ConfidenceMeter label="BVN Confidence" value={bvnData?.confidence || 92} color="#2563EB" />
              )}
            </div>
          )}
        </motion.div>

        {/* Processing state */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }}
            className="rounded-2xl p-5 mb-5"
            style={{ background: "rgba(8,182,62,0.05)", border: "1px solid rgba(8,182,62,0.2)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4" style={{ color: "#08B63E" }} />
              <p className="font-semibold text-sm" style={{ color: "#0F172A" }}>Verification in Progress</p>
            </div>
            <div className="space-y-2">
              {[
                { label: "NIN Verification", done: ninSuccess },
                { label: "BVN Verification", done: bvnSuccess },
                { label: "Education Verification", done: !!edu },
                { label: "Fraud Analysis", done: !!fraud },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  {done
                    ? <CheckCircle className="w-4 h-4" style={{ color: "#08B63E" }} />
                    : <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#2563EB" }} />}
                  <span style={{ color: "#0F172A" }}>{label}</span>
                  <span className="ml-auto text-xs" style={{ color: done ? "#08B63E" : "#64748B" }}>
                    {done ? "Complete" : "Processing..."}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: "#64748B" }}>Page refreshes automatically. Estimated: 3–5 min.</p>
          </motion.div>
        )}

        {!isProcessing && (
          <>
            {/* Identity Verification */}
            <SectionCard title="Identity Verification" icon={User}>
              <CheckRow label="NIN Verification" status={ninSuccess ? "verified" : "failed"}
                detail={ninData ? `${ninData.firstName || ""} ${ninData.lastName || ""}`.trim() || undefined : undefined} />
              <CheckRow label="BVN Verification" status={bvnSuccess ? "verified" : "failed"}
                detail={bvnData ? `${bvnData.firstName || ""} ${bvnData.lastName || ""}`.trim() || undefined : undefined} />
              {ninData && bvnData && ninData.dateOfBirth && bvnData.dateOfBirth && (
                <CheckRow label="Date of Birth Match"
                  status={normalizeDobFE(ninData.dateOfBirth) === normalizeDobFE(bvnData.dateOfBirth) ? "verified" : "failed"} />
              )}

              {/* Photos */}
              {(ninData?.photo || bvnData?.photo) && (
                <div className="mt-5 flex gap-4">
                  {ninData?.photo && (
                    <div className="flex flex-col items-center gap-2">
                      <img src={`data:image/jpeg;base64,${ninData.photo}`} alt="NIN Photo"
                        className="w-20 h-24 object-cover rounded-xl border shadow-sm"
                        style={{ borderColor: "rgba(8,182,62,0.3)" }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <span className="text-xs font-medium" style={{ color: "#64748B" }}>NIN Photo</span>
                    </div>
                  )}
                  {bvnData?.photo && (
                    <div className="flex flex-col items-center gap-2">
                      <img src={`data:image/jpeg;base64,${bvnData.photo}`} alt="BVN Photo"
                        className="w-20 h-24 object-cover rounded-xl border shadow-sm"
                        style={{ borderColor: "rgba(8,182,62,0.3)" }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <span className="text-xs font-medium" style={{ color: "#64748B" }}>BVN Photo</span>
                    </div>
                  )}
                </div>
              )}

              {ninData && (
                <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl p-4" style={{ background: "#F4F6F8", border: "1px solid #E5E7EB" }}>
                  {[
                    ["Full Name", `${ninData.firstName || ""} ${ninData.middleName || ""} ${ninData.lastName || ""}`.trim()],
                    ["Date of Birth", ninData.dateOfBirth],
                    ["Gender", ninData.gender],
                    ["State", ninData.state]
                  ].map(([k, v]) => v ? (
                    <div key={k}>
                      <p className="text-xs" style={{ color: "#64748B" }}>{k}</p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: "#0F172A" }}>{v}</p>
                    </div>
                  ) : null)}
                </div>
              )}
            </SectionCard>

            {/* Education */}
            {(edu || candidate.educationProvider) && (
              <SectionCard title="Education Verification" icon={GraduationCap}
                accent={{ bg: "rgba(37,99,235,0.08)", color: "#2563EB" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    {candidate.educationProvider}
                  </span>
                </div>
                {edu?.manualReview === true ? (
                  <div className="space-y-3">
                    <CheckRow
                      label={`${(candidate.educationProvider || "").toUpperCase()} Results`}
                      status={edu.reviewStatus === "completed" ? (edu.found ? "verified" : "failed") : "pending"}
                      detail={edu.reviewStatus === "completed" ? (edu.found ? "Manual review completed" : "Not verified") : "Awaiting manual review"} />
                    {edu.reviewStatus !== "completed" && (
                      <div className="flex items-center gap-2 text-xs rounded-xl px-3 py-2 mt-2"
                        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}>
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        {edu.failureReason || "Education check sent to manual review. Our team will process it within 2–4 hours."}
                      </div>
                    )}
                    {edu.reviewStatus === "completed" && edu.subjectGrades && Object.keys(edu.subjectGrades).length > 0 && (
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b" style={{ borderColor: "#F4F6F8" }}>
                              <th className="text-left py-2 text-xs font-semibold" style={{ color: "#64748B" }}>Subject</th>
                              <th className="text-right py-2 text-xs font-semibold" style={{ color: "#64748B" }}>Grade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(edu.subjectGrades).map(([subject, grade]: any) => (
                              <tr key={subject} className="border-b last:border-0" style={{ borderColor: "#F4F6F8" }}>
                                <td className="py-2.5" style={{ color: "#0F172A" }}>{subject}</td>
                                <td className="py-2.5 text-right font-semibold" style={{ color: "#0F172A" }}>{grade}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : edu?.found === true ? (
                  <>
                    <CheckRow label={`${(candidate.educationProvider || "").toUpperCase()} Results`} status="verified" detail={edu.candidateName || undefined} />
                    {edu.subjects && Array.isArray(edu.subjects) && (
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b" style={{ borderColor: "#F4F6F8" }}>
                              <th className="text-left py-2 text-xs font-semibold" style={{ color: "#64748B" }}>Subject</th>
                              <th className="text-right py-2 text-xs font-semibold" style={{ color: "#64748B" }}>Grade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {edu.subjects.map((s: any) => (
                              <tr key={s.subject} className="border-b last:border-0" style={{ borderColor: "#F4F6F8" }}>
                                <td className="py-2.5" style={{ color: "#0F172A" }}>{s.subject}</td>
                                <td className="py-2.5 text-right font-semibold" style={{ color: "#0F172A" }}>{s.grade}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : edu?.found === false ? (
                  <CheckRow label={`${(candidate.educationProvider || "").toUpperCase()} Results`} status="failed" detail="No matching record found" />
                ) : (
                  <CheckRow label="Education results" status="pending" detail="Still processing..." />
                )}
              </SectionCard>
            )}

            {/* Fraud Analysis */}
            {fraud && (
              <SectionCard title="Fraud & Risk Analysis" icon={Shield}
                accent={{ bg: fraud.score >= 80 ? "rgba(8,182,62,0.08)" : fraud.score >= 60 ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)",
                  color: fraud.score >= 80 ? "#08B63E" : fraud.score >= 60 ? "#F59E0B" : "#EF4444" }}>
                <div className="flex items-center gap-5 mb-4">
                  <CircleScore score={fraud.score} size={72} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold" style={{ color: "#0F172A" }}>{fraud.level}</p>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{
                          background: fraud.score >= 80 ? "rgba(8,182,62,0.1)" : fraud.score >= 60 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                          color: fraud.score >= 80 ? "#08B63E" : fraud.score >= 60 ? "#F59E0B" : "#EF4444"
                        }}>
                        {fraud.flags?.length === 0 ? "Clean" : `${fraud.flags?.length} flag(s)`}
                      </span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: "#F4F6F8" }}>
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${fraud.score}%` }}
                        transition={{ duration: 0.9, ease }}
                        className="h-full rounded-full"
                        style={{ background: fraud.score >= 80 ? "#08B63E" : fraud.score >= 60 ? "#F59E0B" : "#EF4444" }} />
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: "#64748B" }}>
                      {fraud.flags?.length === 0 ? "No significant fraud indicators found." : `${fraud.flags?.length} risk factor(s) detected.`}
                    </p>
                  </div>
                </div>
                {fraud.flags?.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {fraud.flags.map((flag: string) => (
                      <div key={flag} className="flex items-center gap-2 text-sm rounded-xl px-3 py-2.5"
                        style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444" }}>
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        {flag}
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

            {/* AI Hiring Recommendation */}
            {decision && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease }}
                className="rounded-2xl p-6 mb-5"
                style={{ background: decision.bg, border: `1px solid ${decision.border}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4" style={{ color: decision.color }} />
                  <p className="font-semibold text-sm" style={{ color: "#0F172A" }}>AI Hiring Recommendation</p>
                  <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: decision.color }}>
                    <Zap className="w-3 h-3" />
                    {decision.label}
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#0F172A" }}>{decision.text}</p>
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15, ease }}
              className="flex flex-wrap gap-3">
              <Button className="text-white rounded-xl flex-1 sm:flex-none font-semibold shadow-md"
                style={{ background: "linear-gradient(135deg, #08B63E, #079C36)" }}
                onClick={downloadPdf} disabled={downloadingPdf}>
                {downloadingPdf
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating PDF...</>
                  : <><Download className="w-4 h-4 mr-2" /> Download PDF Report</>}
              </Button>
              <Button variant="outline" onClick={() => { setRefreshing(true); load(); }}
                className="rounded-xl flex-1 sm:flex-none" style={{ borderColor: "#E5E7EB" }}>
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </ScreeningDashboardLayout>
  );
}
