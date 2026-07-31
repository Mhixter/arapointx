import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Search, RefreshCw, Plus, ArrowRight, Users, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { screeningApi, getDecisionBg, getStatusBg } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

const ease = [0.22, 1, 0.36, 1] as any;

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
    ? candidates.filter(c =>
        c.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        c.reference?.includes(search) ||
        c.email?.toLowerCase().includes(search.toLowerCase()))
    : candidates;

  return (
    <ScreeningDashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "#0F172A" }}>Candidate Screenings</h1>
            <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>Manage and track all candidate verifications</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => load()} className="rounded-xl h-9 px-3 gap-1.5"
              style={{ borderColor: "#E5E7EB", color: "#64748B" }}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Link href="/employment-screening/dashboard/screen">
              <Button size="sm" className="text-white rounded-xl h-9 font-semibold shadow-md"
                style={{ background: "linear-gradient(135deg, #08B63E, #079C36)" }}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> New Screening
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05, ease }}
          className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#64748B" }} />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or reference ID..."
            className="pl-10 h-11 rounded-xl text-sm"
            style={{ borderColor: "#E5E7EB", background: "white" }} />
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1, ease }}
          className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {TABS.map(t => {
            const cnt = counts[t.value];
            return (
              <button key={t.value} onClick={() => setTab(t.value)}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={tab === t.value ? {
                  background: "#0F172A", color: "white"
                } : {
                  background: "white", color: "#64748B", border: "1px solid #E5E7EB"
                }}>
                {t.label}
                {cnt !== undefined && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: tab === t.value ? "rgba(255,255,255,0.15)" : "#F4F6F8", color: tab === t.value ? "white" : "#64748B" }}>
                    {cnt?.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15, ease }}
          className="bg-white rounded-2xl border overflow-hidden"
          style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>

          {/* Table header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 border-b text-xs font-semibold uppercase tracking-wide"
            style={{ borderColor: "#F4F6F8", color: "#64748B", background: "#FAFAFA" }}>
            <div className="col-span-5">Candidate</div>
            <div className="col-span-3">Reference</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          {loading ? (
            <div>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b animate-pulse" style={{ borderColor: "#F4F6F8" }}>
                  <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded-lg w-40" />
                    <div className="h-2 bg-gray-100 rounded-lg w-28" />
                  </div>
                  <div className="w-16 h-6 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "#F4F6F8" }}>
                <Users className="w-5 h-5" style={{ color: "#64748B" }} />
              </div>
              <p className="font-medium" style={{ color: "#0F172A" }}>No candidates found</p>
              <p className="text-sm mt-1" style={{ color: "#64748B" }}>Try adjusting your filters or start a new screening.</p>
            </div>
          ) : (
            <div>
              {filtered.map((c, i) => (
                <motion.div key={c.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <Link href={`/employment-screening/dashboard/candidates/${c.id}`}>
                    <a className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/80 transition-colors group border-b last:border-0"
                      style={{ borderColor: "#F4F6F8" }}>
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #08142B, #2563EB)" }}>
                        {c.fullName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: "#0F172A" }}>{c.fullName}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: "#64748B" }}>
                          {c.reference}
                          {c.position ? ` · ${c.position}` : ""}
                        </p>
                      </div>
                      {/* Date */}
                      <div className="hidden sm:block text-xs flex-shrink-0" style={{ color: "#64748B" }}>
                        {new Date(c.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                      {/* Score + Status */}
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        {c.overallScore !== null && c.overallScore !== undefined && (
                          <span className="text-sm font-bold hidden sm:block" style={{ color: "#0F172A" }}>{c.overallScore}%</span>
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
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#64748B" }} />
                      </div>
                    </a>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: "#F4F6F8" }}>
              <p className="text-xs" style={{ color: "#64748B" }}>
                Page {pagination.page} of {pagination.pages} · {pagination.total.toLocaleString()} total
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1}
                  onClick={() => { setPage(p => p - 1); load(tab, page - 1); }}
                  className="rounded-xl text-xs h-8" style={{ borderColor: "#E5E7EB" }}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.pages}
                  onClick={() => { setPage(p => p + 1); load(tab, page + 1); }}
                  className="rounded-xl text-xs h-8" style={{ borderColor: "#E5E7EB" }}>Next</Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </ScreeningDashboardLayout>
  );
}
