import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Search, Filter, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { screeningApi, getDecisionBg, getStatusBg } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

const TABS = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "In Progress", value: "processing" },
  { label: "Manual Review", value: "manual_review" },
  { label: "Review", value: "review" },
  { label: "Failed", value: "failed" },
];

export default function ScreeningCandidates() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<any>({});

  const load = async (status = tab, p = page) => {
    setLoading(true);
    try {
      const data = await screeningApi.candidates.list({ status: status === "all" ? undefined : status, page: p, limit: 20 });
      setCandidates(data.candidates || []);
      setPagination(data.pagination);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(tab, 1); setPage(1); }, [tab]);
  useEffect(() => {
    screeningApi.dashboard.stats().then((d: any) => setCounts({
      all: d.totalScreenings, completed: d.completed, processing: d.inProgress, review: d.review, failed: d.failed,
    })).catch(() => {});
  }, []);

  const filtered = search
    ? candidates.filter(c => c.fullName?.toLowerCase().includes(search.toLowerCase()) || c.reference?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase()))
    : candidates;

  return (
    <ScreeningDashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">All Screenings</h1>
            <p className="text-sm text-gray-500">Manage and track candidate verifications</p>
          </div>
          <Link href="/employment-screening/dashboard/screen">
            <Button className="bg-green-700 hover:bg-green-800 text-white rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> New Screening
            </Button>
          </Link>
        </div>

        {/* Search + Filter */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search candidate, email or reference ID..."
              className="pl-9 h-10 rounded-xl border-gray-200" />
          </div>
          <Button variant="outline" size="sm" onClick={() => load()} className="rounded-xl h-10 px-3">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.value ? 'bg-green-700 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300'}`}>
              {t.label} {counts[t.value] !== undefined ? <span className="ml-1 opacity-70">{counts[t.value]?.toLocaleString()}</span> : ""}
            </button>
          ))}
        </div>

        {/* Table / Cards */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-full" />
                  <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-40" /><div className="h-2 bg-gray-100 rounded w-28" /></div>
                  <div className="w-16 h-6 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No candidates found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or start a new screening.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(c => (
                <Link key={c.id} href={`/employment-screening/dashboard/candidates/${c.id}`}>
                  <a className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                      {c.fullName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{c.fullName}</p>
                      <p className="text-xs text-gray-400">{c.reference} · {new Date(c.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}{c.position ? ` · ${c.position}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {c.overallScore !== null && c.overallScore !== undefined && (
                        <span className="text-sm font-bold text-gray-800">{c.overallScore}%</span>
                      )}
                      {c.decision ? (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getDecisionBg(c.decision)}`}>
                          {c.decision === "PASS" ? "Pass" : c.decision === "REVIEW" ? "Review" : "Failed"}
                        </span>
                      ) : (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusBg(c.status)}`}>
                          {c.status === "processing" ? "In Progress" : c.status === "manual_review" ? "Manual Review" : c.status}
                        </span>
                      )}
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">Page {pagination.page} of {pagination.pages} · {pagination.total.toLocaleString()} total</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage(p => p - 1); load(tab, page - 1); }} className="rounded-xl">Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => { setPage(p => p + 1); load(tab, page + 1); }} className="rounded-xl">Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ScreeningDashboardLayout>
  );
}
