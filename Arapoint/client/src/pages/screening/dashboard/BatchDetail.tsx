import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, RefreshCw, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { screeningApi, getDecisionBg, getStatusBg } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

export default function BatchDetail() {
  const { batchId } = useParams<{ batchId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    screeningApi.bulk.getBatch(batchId).then(setData).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [batchId]);

  useEffect(() => {
    if (data?.batch?.status === "processing") {
      const t = setTimeout(load, 10000);
      return () => clearTimeout(t);
    }
  }, [data?.batch?.status]);

  const batch = data?.batch;
  const candidates = data?.candidates || [];
  const passCount = candidates.filter((c: any) => c.decision === "PASS").length;
  const failCount = candidates.filter((c: any) => c.decision === "FAIL").length;
  const reviewCount = candidates.filter((c: any) => c.decision === "REVIEW").length;
  const pendingCount = candidates.filter((c: any) => c.status === "pending" || c.status === "processing").length;
  const passRate = candidates.length > 0 ? Math.round((passCount / candidates.length) * 100) : 0;

  return (
    <ScreeningDashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/employment-screening/dashboard/bulk">
            <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"><ArrowLeft className="w-4 h-4" /></button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">{batch?.fileName || batch?.batchReference || "Batch"}</h1>
            <p className="text-xs text-gray-400">{batch?.batchReference}</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="rounded-xl">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total", value: candidates.length, color: "text-gray-900" },
            { label: "Pass", value: passCount, color: "text-green-600" },
            { label: "Review", value: reviewCount, color: "text-yellow-600" },
            { label: "Failed", value: failCount, color: "text-red-600" },
            { label: "Pending", value: pendingCount, color: "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {batch && batch.totalCandidates > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-800">Processing Progress</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${batch.status === "completed" ? "bg-green-100 text-green-700" : "bg-emerald-100 text-emerald-700"}`}>
                {batch.status === "completed" ? "Completed" : "In Progress"}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className="h-2.5 rounded-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${Math.round(((batch.completedCandidates || 0) / batch.totalCandidates) * 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{batch.completedCandidates || 0} completed</span>
              <span>{batch.totalCandidates} total</span>
            </div>
            {passRate > 0 && <p className="text-sm text-green-600 font-medium mt-2">{passRate}% Pass Rate</p>}
          </div>
        )}

        {/* Candidate list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Candidates</h2>
          </div>
          {loading && candidates.length === 0 ? (
            <div className="py-16 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-green-700" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-12 text-center">
              <FileSpreadsheet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No candidates in this batch.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {candidates.map((c: any) => (
                <Link key={c.id} href={`/employment-screening/dashboard/candidates/${c.id}`}>
                  <a className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xs flex-shrink-0">
                      {c.fullName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.fullName}</p>
                      <p className="text-xs text-gray-400">{c.position || "—"}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.overallScore !== null && c.overallScore !== undefined && (
                        <span className="text-sm font-bold text-gray-700">{c.overallScore}%</span>
                      )}
                      {c.decision ? (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getDecisionBg(c.decision)}`}>
                          {c.decision}
                        </span>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusBg(c.status)}`}>
                          {c.status === "processing" || c.status === "pending" ? "Pending" : c.status}
                        </span>
                      )}
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScreeningDashboardLayout>
  );
}
