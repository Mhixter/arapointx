import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { CheckCircle, XCircle, AlertTriangle, Loader2, Download, RefreshCw, ArrowLeft, Shield, GraduationCap, User, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { screeningApi, getDecisionBg } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

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
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : "#dc2626";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={8} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-gray-900">{score}%</span>
      </div>
    </div>
  );
}

function CheckRow({ label, status, detail }: { label: string; status: "verified" | "failed" | "pending" | "low_risk" | "medium_risk" | "high_risk"; detail?: string }) {
  const icons = { verified: <CheckCircle className="w-4 h-4 text-green-600" />, failed: <XCircle className="w-4 h-4 text-red-500" />, pending: <Loader2 className="w-4 h-4 text-green-500 animate-spin" />, low_risk: <CheckCircle className="w-4 h-4 text-green-600" />, medium_risk: <AlertTriangle className="w-4 h-4 text-yellow-500" />, high_risk: <AlertTriangle className="w-4 h-4 text-red-500" /> };
  const labels: Record<string, string> = { verified: "Verified", failed: "Failed", pending: "In Progress", low_risk: "Low Risk", medium_risk: "Medium Risk", high_risk: "High Risk" };
  const colors: Record<string, string> = { verified: "text-green-600", failed: "text-red-600", pending: "text-green-600", low_risk: "text-green-600", medium_risk: "text-yellow-600", high_risk: "text-red-600" };
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        {icons[status]}
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          {detail && <p className="text-xs text-gray-400">{detail}</p>}
        </div>
      </div>
      <span className={`text-xs font-semibold ${colors[status]}`}>{labels[status]}</span>
    </div>
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
        headers: { Authorization: `Bearer ${token}` },
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
        <Loader2 className="w-8 h-8 animate-spin text-green-700" />
      </div>
    </ScreeningDashboardLayout>
  );
  if (!candidate) return (
    <ScreeningDashboardLayout>
      <div className="p-6 text-center"><p className="text-gray-500">Candidate not found.</p></div>
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

  // Re-evaluate DOB match live from actual data (overrides stale stored fraud flags)
  const liveDobMatch = ninData?.dateOfBirth && bvnData?.dateOfBirth
    ? normalizeDobFE(ninData.dateOfBirth) === normalizeDobFE(bvnData.dateOfBirth)
    : null;

  const fraud = rawFraud ? {
    ...rawFraud,
    flags: (rawFraud.flags || []).filter((f: string) =>
      // Drop the DOB mismatch flag if the live comparison shows they actually match
      !(liveDobMatch === true && /date of birth mismatch/i.test(f))
    ),
  } : rawFraud;

  const decisionBg: Record<string, string> = {
    PASS: "bg-green-100 border-green-200 text-green-800",
    REVIEW: "bg-yellow-100 border-yellow-200 text-yellow-800",
    FAIL: "bg-red-100 border-red-200 text-red-800",
  };
  const isProcessing = candidate.status === "processing" || candidate.status === "pending";

  return (
    <ScreeningDashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/employment-screening/dashboard/candidates">
            <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"><ArrowLeft className="w-4 h-4" /></button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Candidate Report</h1>
            <p className="text-xs text-gray-400">{candidate.reference}</p>
          </div>
          {candidate.decision && (
            <span className={`ml-auto text-sm font-bold px-4 py-1.5 rounded-full border ${decisionBg[candidate.decision] || "bg-gray-100 text-gray-700"}`}>
              Overall Result — {candidate.decision === "PASS" ? "Pass" : candidate.decision === "REVIEW" ? "Review Required" : "Failed"}
            </span>
          )}
        </div>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5 flex flex-col sm:flex-row gap-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-2xl flex-shrink-0">
            {candidate.fullName?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{candidate.fullName}</h2>
            <p className="text-gray-500 text-sm">{candidate.reference}</p>
            {candidate.position && <p className="text-gray-500 text-sm">{candidate.position}</p>}
            <p className="text-gray-400 text-xs mt-1">{new Date(candidate.createdAt).toLocaleString("en-NG")}</p>
          </div>
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-green-700" />
              <p className="text-xs text-green-600 font-medium">Processing...</p>
            </div>
          ) : candidate.overallScore !== null && candidate.overallScore !== undefined ? (
            <div className="flex flex-col items-center gap-2">
              <CircleScore score={candidate.overallScore} size={90} />
              <p className="text-xs font-semibold text-gray-500">Verification Score</p>
            </div>
          ) : null}
        </div>

        {isProcessing && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-5 mb-5">
            <p className="font-semibold text-green-900 text-sm mb-3">Verification in Progress</p>
            <div className="space-y-2">
              {[
                { label: "NIN Verification", done: ninSuccess },
                { label: "BVN Verification", done: bvnSuccess },
                { label: "Education Verification", done: !!edu },
                { label: "Fraud Analysis", done: !!fraud },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  {done ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Loader2 className="w-4 h-4 text-green-600 animate-spin" />}
                  <span className={done ? "text-green-700" : "text-green-700"}>{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-green-400 mt-3">Page refreshes automatically. Estimated: 3–5 min.</p>
          </div>
        )}

        {!isProcessing && (
          <>
            {/* Summary */}
            {candidate.overallScore !== null && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-green-700" />
                  <h3 className="font-semibold text-gray-900">Verification Score</h3>
                </div>
                <div className="flex items-center gap-6">
                  <CircleScore score={candidate.overallScore} size={90} />
                  <div className="flex-1">
                    <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                      <div className="h-3 rounded-full transition-all duration-700" style={{ width: `${candidate.overallScore}%`, background: candidate.overallScore >= 80 ? "#16a34a" : candidate.overallScore >= 60 ? "#d97706" : "#dc2626" }} />
                    </div>
                    <p className="text-sm text-gray-500">{candidate.overallScore >= 80 ? "Excellent" : candidate.overallScore >= 60 ? "Moderate" : "Poor"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Identity */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-green-700" />
                <h3 className="font-semibold text-gray-900">Identity Verification</h3>
              </div>
              <CheckRow label="NIN Verification" status={ninSuccess ? "verified" : "failed"} detail={ninData ? `${ninData.firstName || ""} ${ninData.lastName || ""}`.trim() || undefined : undefined} />
              <CheckRow label="BVN Verification" status={bvnSuccess ? "verified" : "failed"} detail={bvnData ? `${bvnData.firstName || ""} ${bvnData.lastName || ""}`.trim() || undefined : undefined} />
              {ninData && bvnData && (
                <>
                  {ninData.dateOfBirth && bvnData.dateOfBirth && (
                    <CheckRow label="Date of Birth Match" status={normalizeDobFE(ninData.dateOfBirth) === normalizeDobFE(bvnData.dateOfBirth) ? "verified" : "failed"} />
                  )}
                </>
              )}
              {/* Photos */}
              {(ninData?.photo || bvnData?.photo) && (
                <div className="mt-4 flex gap-4">
                  {ninData?.photo && (
                    <div className="flex flex-col items-center gap-1">
                      <img
                        src={`data:image/jpeg;base64,${ninData.photo}`}
                        alt="NIN Photo"
                        className="w-20 h-24 object-cover rounded-xl border-2 border-green-200 shadow-sm"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className="text-xs text-gray-400 font-medium">NIN Photo</span>
                    </div>
                  )}
                  {bvnData?.photo && (
                    <div className="flex flex-col items-center gap-1">
                      <img
                        src={`data:image/jpeg;base64,${bvnData.photo}`}
                        alt="BVN Photo"
                        className="w-20 h-24 object-cover rounded-xl border-2 border-green-200 shadow-sm"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className="text-xs text-gray-400 font-medium">BVN Photo</span>
                    </div>
                  )}
                </div>
              )}
              {ninData && (
                <div className="mt-4 grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4">
                  {[["Full Name", `${ninData.firstName || ""} ${ninData.middleName || ""} ${ninData.lastName || ""}`.trim()], ["Date of Birth", ninData.dateOfBirth], ["Gender", ninData.gender], ["State", ninData.state]].map(([k, v]) => v ? (
                    <div key={k}><p className="text-xs text-gray-400">{k}</p><p className="text-sm font-medium text-gray-800">{v}</p></div>
                  ) : null)}
                </div>
              )}
            </div>

            {/* Education */}
            {(edu || candidate.educationProvider) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="w-4 h-4 text-green-700" />
                  <h3 className="font-semibold text-gray-900">Education Verification</h3>
                  <span className="ml-auto text-xs text-gray-400 uppercase">{candidate.educationProvider}</span>
                </div>
                {edu?.manualReview === true ? (
                  /* Education escalated to manual review — not yet completed */
                  <div className="space-y-3">
                    <CheckRow
                      label={`${(candidate.educationProvider || "").toUpperCase()} Results`}
                      status={edu.reviewStatus === "completed" ? (edu.found ? "verified" : "failed") : "pending"}
                      detail={edu.reviewStatus === "completed" ? (edu.found ? "Manual review completed" : "Not verified") : "Awaiting manual review"}
                    />
                    {edu.reviewStatus !== "completed" && (
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mt-2">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        {edu.failureReason || "Education check sent to manual review. Our team will process it within 2–4 hours."}
                      </div>
                    )}
                    {edu.reviewStatus === "completed" && edu.subjectGrades && Object.keys(edu.subjectGrades).length > 0 && (
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-gray-100"><th className="text-left py-2 text-xs text-gray-400 font-medium">Subject</th><th className="text-right py-2 text-xs text-gray-400 font-medium">Grade</th></tr></thead>
                          <tbody>{Object.entries(edu.subjectGrades).map(([subject, grade]: any) => (<tr key={subject} className="border-b border-gray-50"><td className="py-2 text-gray-700">{subject}</td><td className="py-2 text-right font-semibold text-gray-900">{grade}</td></tr>))}</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : edu?.found === true ? (
                  /* Successfully verified via RPA */
                  <>
                    <CheckRow label={`${(candidate.educationProvider || "").toUpperCase()} Results`} status="verified" detail={edu.candidateName || undefined} />
                    {edu.subjects && Array.isArray(edu.subjects) && (
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-gray-100"><th className="text-left py-2 text-xs text-gray-400 font-medium">Subject</th><th className="text-right py-2 text-xs text-gray-400 font-medium">Grade</th></tr></thead>
                          <tbody>{edu.subjects.map((s: any) => (<tr key={s.subject} className="border-b border-gray-50"><td className="py-2 text-gray-700">{s.subject}</td><td className="py-2 text-right font-semibold text-gray-900">{s.grade}</td></tr>))}</tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : edu?.found === false ? (
                  /* Record not found */
                  <CheckRow label={`${(candidate.educationProvider || "").toUpperCase()} Results`} status="failed" detail="No matching record found" />
                ) : (
                  /* Still processing */
                  <CheckRow label="Education results" status="pending" detail="Still processing..." />
                )}
              </div>
            )}

            {/* Fraud */}
            {fraud && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-green-700" />
                  <h3 className="font-semibold text-gray-900">Fraud & Risk Analysis</h3>
                  <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${fraud.score >= 80 ? "bg-green-100 text-green-700" : fraud.score >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                    {fraud.level}
                  </span>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <CircleScore score={fraud.score} size={72} />
                  <div>
                    <p className="font-bold text-gray-900">{fraud.level}</p>
                    <p className="text-sm text-gray-500">{fraud.flags?.length === 0 ? "No significant fraud indicators found." : `${fraud.flags?.length} risk factor(s) detected.`}</p>
                  </div>
                </div>
                {fraud.flags?.length > 0 && (
                  <div className="space-y-2">
                    {fraud.flags.map((flag: string) => (
                      <div key={flag} className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{flag}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Recommendation */}
            {candidate.decision && (
              <div className={`rounded-2xl p-6 mb-5 ${candidate.decision === "PASS" ? "bg-green-50 border border-green-200" : candidate.decision === "REVIEW" ? "bg-yellow-50 border border-yellow-200" : "bg-red-50 border border-red-200"}`}>
                <p className="font-semibold text-gray-900 mb-1">Recommendation</p>
                <p className="text-sm text-gray-700">
                  {candidate.decision === "PASS" ? "Candidate meets employment verification requirements and is suitable for onboarding under standard HR review." :
                    candidate.decision === "REVIEW" ? "Candidate has some inconsistencies. Manual review is recommended before proceeding with hiring." :
                      "Candidate failed key verification checks. High risk detected. Do not proceed without thorough manual investigation."}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-green-700 hover:bg-green-800 text-white rounded-xl flex-1 sm:flex-none"
                onClick={downloadPdf}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" /> Download PDF Report</>
                )}
              </Button>
              <Button variant="outline" onClick={() => { setRefreshing(true); load(); }} className="rounded-xl flex-1 sm:flex-none">
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          </>
        )}
      </div>
    </ScreeningDashboardLayout>
  );
}
