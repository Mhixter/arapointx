import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Search,
  RefreshCw,
  Plus,
  Users,
  ShieldCheck,
  Clock3,
  AlertTriangle,
  XCircle,
  Eye,
  MoreVertical,
  Filter,
  ChevronLeft,
  ChevronRight,
  Phone,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { screeningApi, getStatusBg, getStatusLabel } from "@/lib/screening/api";
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
  const [sort, setSort] = useState("latest");

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
      all: d.totalScreenings,
      completed: d.completed,
      processing: d.inProgress,
      manual_review: d.manualReview || 0,
      review: d.review,
      failed: d.failed,
    })).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? candidates.filter(c =>
          c.fullName?.toLowerCase().includes(q) ||
          c.reference?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q))
      : candidates;

    if (sort === "oldest") {
      return [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    if (sort === "name") {
      return [...list].sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
    }
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [candidates, search, sort]);

  const resolvePhoto = (candidate: any) => {
    const photo = candidate?.ninResult?.data?.photo || candidate?.bvnResult?.data?.photo;
    if (!photo || typeof photo !== "string") return null;
    if (photo.startsWith("data:image") || photo.startsWith("http")) return photo;
    return `data:image/jpeg;base64,${photo}`;
  };

  const getChecks = (candidate: any) => {
    const checks = [
      candidate?.ninResult?.success,
      candidate?.bvnResult?.success,
      candidate?.educationResult?.success,
      candidate?.fraudResult?.success,
      candidate?.crossCheckResult?.success,
    ];
    const done = checks.filter(Boolean).length;
    const total = 5;
    return { done, total };
  };

  const statusBadge = (candidate: any) => {
    if (candidate.decision === "PASS") return { label: "Pass", className: "bg-green-100 text-green-700 border-green-200" };
    if (candidate.decision === "REVIEW") return { label: "Review", className: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    if (candidate.decision === "FAIL") return { label: "Failed", className: "bg-red-100 text-red-700 border-red-200" };
    return { label: getStatusLabel(candidate.status), className: getStatusBg(candidate.status) };
  };

  const rowAccent = (candidate: any) => {
    if (candidate.decision === "PASS") return "#08B63E";
    if (candidate.decision === "REVIEW") return "#F59E0B";
    if (candidate.decision === "FAIL" || candidate.status === "failed") return "#EF4444";
    if (candidate.status === "processing" || candidate.status === "pending") return "#2563EB";
    return "#CBD5E1";
  };

  const statCards = [
    { label: "Completed", value: counts.completed ?? 0, sub: "+12% from last 7 days", icon: ShieldCheck, tone: "green" },
    { label: "In Progress", value: counts.processing ?? 0, sub: "No active screenings", icon: Clock3, tone: "blue" },
    { label: "Under Review", value: counts.review ?? 0, sub: "Needs attention", icon: AlertTriangle, tone: "orange" },
    { label: "Failed", value: counts.failed ?? 0, sub: "No failed screenings", icon: XCircle, tone: "red" },
  ];

  return (
    <ScreeningDashboardLayout>
      <div className="p-6 max-w-[1240px] mx-auto space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[40px] leading-none font-bold tracking-tight" style={{ color: "#0F172A" }}>All Screenings</h1>
            <p className="text-[28px] mt-2 font-medium" style={{ color: "#64748B" }}>Manage and track candidate verifications</p>
          </div>
          <Link href="/employment-screening/dashboard/screen">
            <Button size="sm" className="text-white rounded-2xl h-11 px-5 font-semibold shadow-md"
              style={{ background: "linear-gradient(135deg, #08B63E, #079C36)" }}>
              <Plus className="w-4 h-4 mr-2" /> New Screening
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05, ease }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            const tones: Record<string, any> = {
              green: { bg: "#E8FBF0", icon: "#08B63E", sub: "#08B63E" },
              blue: { bg: "#EEF4FF", icon: "#2563EB", sub: "#64748B" },
              orange: { bg: "#FFF4E8", icon: "#F59E0B", sub: "#64748B" },
              red: { bg: "#FFEFF1", icon: "#EF4444", sub: "#64748B" },
            };
            const tone = tones[card.tone];
            return (
              <div key={card.label} className="bg-white rounded-2xl border p-5"
                style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: tone.bg }}>
                    <Icon className="w-6 h-6" style={{ color: tone.icon }} />
                  </div>
                  <div>
                    <p className="text-[28px] font-bold leading-none" style={{ color: "#0F172A" }}>{card.value}</p>
                    <p className="text-lg font-medium mt-1" style={{ color: "#0F172A" }}>{card.label}</p>
                    <p className="text-sm mt-1.5" style={{ color: tone.sub }}>{card.sub}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08, ease }}
          className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#64748B" }} />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search candidate, email or reference ID..."
              className="pl-10 h-12 rounded-xl text-sm"
              style={{ borderColor: "#E5E7EB", background: "white" }} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-12 rounded-xl px-5 text-sm"
              style={{ borderColor: "#E5E7EB", color: "#334155", background: "white" }}>
              <Filter className="w-4 h-4 mr-2" /> Filters
            </Button>
            <Button variant="outline" onClick={() => load()} className="h-12 rounded-xl px-3"
              style={{ borderColor: "#E5E7EB", color: "#334155", background: "white" }}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1, ease }}
          className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TABS.map(t => {
              const cnt = t.value === "all" ? (counts.all ?? pagination?.total ?? candidates.length) : (counts[t.value] ?? 0);
              return (
                <button key={t.value} onClick={() => setTab(t.value)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border"
                  style={tab === t.value ? {
                    background: "#08B63E", color: "white", borderColor: "#08B63E"
                  } : {
                    background: "white", color: "#475569", borderColor: "#E5E7EB"
                  }}>
                  {t.label}
                  <span className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: tab === t.value ? "rgba(255,255,255,0.25)" : "#F4F6F8", color: tab === t.value ? "white" : "#64748B" }}>
                    {cnt?.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative w-full xl:w-auto">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none h-11 w-full xl:w-48 rounded-xl border px-4 pr-10 text-sm font-medium"
              style={{ borderColor: "#E5E7EB", background: "white", color: "#334155" }}
            >
              <option value="latest">Sort by: Latest</option>
              <option value="oldest">Sort by: Oldest</option>
              <option value="name">Sort by: Name</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#64748B" }} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15, ease }}
          className="bg-white rounded-2xl border overflow-hidden"
          style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>

          <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 border-b text-xs font-semibold"
            style={{ borderColor: "#F4F6F8", color: "#64748B", background: "#FAFAFA" }}>
            <div className="col-span-4">Candidate</div>
            <div className="col-span-3">Screening Details</div>
            <div className="col-span-2">Progress</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {loading ? (
            <div>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-5 border-b animate-pulse" style={{ borderColor: "#F4F6F8" }}>
                  <div className="w-14 h-14 bg-gray-100 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded-lg w-44" />
                    <div className="h-3 bg-gray-100 rounded-lg w-64" />
                  </div>
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
              {filtered.map((c, i) => {
                const photo = resolvePhoto(c);
                const checks = getChecks(c);
                const score = c.overallScore ?? Math.round((checks.done / checks.total) * 100);
                const status = statusBadge(c);
                const progressColor = score >= 80 ? "#08B63E" : score >= 60 ? "#F59E0B" : "#EF4444";
                const accent = rowAccent(c);
                return (
                  <motion.div key={c.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <div className="grid lg:grid-cols-12 gap-4 px-4 lg:px-6 py-4 border-b last:border-0 items-center"
                      style={{ borderColor: "#F4F6F8", borderLeft: `4px solid ${accent}` }}>
                      <div className="lg:col-span-4 flex items-center gap-3 min-w-0">
                        <input type="checkbox" className="w-5 h-5 rounded border" style={{ borderColor: "#CBD5E1" }} />
                        {photo ? (
                          <img src={photo} alt={c.fullName || "Candidate"} className="w-14 h-14 rounded-full object-cover border"
                            style={{ borderColor: "#E5E7EB" }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold text-white"
                            style={{ background: "linear-gradient(135deg, #08142B, #2563EB)" }}>
                            {c.fullName?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link href={`/employment-screening/dashboard/candidates/${c.id}`}>
                            <a className="font-semibold text-[17px] truncate block hover:opacity-80" style={{ color: "#0F172A" }}>{c.fullName}</a>
                          </Link>
                          <p className="text-sm truncate" style={{ color: "#64748B" }}>{c.email || "—"}</p>
                          <p className="text-sm flex items-center gap-1 mt-0.5" style={{ color: "#64748B" }}>
                            <Phone className="w-3.5 h-3.5" /> {c.phone || "—"}
                          </p>
                        </div>
                      </div>

                      <div className="lg:col-span-3">
                        <p className="text-xs uppercase tracking-wide" style={{ color: "#94A3B8" }}>Reference ID</p>
                        <p className="text-sm font-semibold" style={{ color: "#0F172A" }}>{c.reference || "—"}</p>
                        <p className="text-xs uppercase tracking-wide mt-2" style={{ color: "#94A3B8" }}>Position</p>
                        <p className="text-sm font-semibold uppercase" style={{ color: "#0F172A" }}>{c.position || "—"}</p>
                      </div>

                      <div className="lg:col-span-2">
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-16 h-16">
                            <svg width="64" height="64" className="-rotate-90">
                              <circle cx="32" cy="32" r="26" fill="none" stroke="#E5E7EB" strokeWidth="6" />
                              <circle
                                cx="32"
                                cy="32"
                                r="26"
                                fill="none"
                                stroke={progressColor}
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={163.4}
                                strokeDashoffset={163.4 - (Math.max(0, Math.min(100, score)) / 100) * 163.4}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: "#0F172A" }}>
                              {score}%
                            </div>
                          </div>
                        </div>
                        <p className="text-sm font-medium mt-1.5" style={{ color: "#64748B" }}>{checks.done} of {checks.total} checks</p>
                      </div>

                      <div className="lg:col-span-2">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full border inline-flex ${status.className}`}>
                          {status.label}
                        </span>
                        <p className="text-sm mt-2" style={{ color: "#64748B" }}>
                          {c.completedAt ? "Completed on" : c.status === "review" ? "Under review" : "Updated on"}
                        </p>
                        <p className="text-sm font-semibold" style={{ color: "#334155" }}>
                          {new Date(c.completedAt || c.updatedAt || c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>

                      <div className="lg:col-span-1 flex lg:justify-end gap-2">
                        <Link href={`/employment-screening/dashboard/candidates/${c.id}`}>
                          <button className="w-11 h-11 rounded-xl border flex items-center justify-center hover:bg-gray-50 transition-colors"
                            style={{ borderColor: "#E5E7EB" }}>
                            <Eye className="w-4 h-4" style={{ color: "#64748B" }} />
                          </button>
                        </Link>
                        <button className="w-11 h-11 rounded-xl border flex items-center justify-center hover:bg-gray-50 transition-colors"
                          style={{ borderColor: "#E5E7EB" }}>
                          <MoreVertical className="w-4 h-4" style={{ color: "#64748B" }} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-t" style={{ borderColor: "#F4F6F8" }}>
            <p className="text-sm" style={{ color: "#64748B" }}>
              Showing {filtered.length === 0 ? 0 : (page - 1) * (pagination?.limit || 20) + 1} to {Math.min(((page - 1) * (pagination?.limit || 20)) + filtered.length, pagination?.total || filtered.length)} of {pagination?.total ?? filtered.length} results
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" disabled={page <= 1}
                onClick={() => { setPage(p => p - 1); load(tab, page - 1); }}
                className="h-11 w-11 rounded-xl" style={{ borderColor: "#E5E7EB" }}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="w-11 h-11 rounded-xl border flex items-center justify-center text-sm font-semibold"
                style={{ borderColor: "#08B63E", color: "white", background: "#08B63E" }}>
                {page}
              </div>
              <Button variant="outline" size="icon" disabled={!pagination || page >= pagination.pages}
                onClick={() => { setPage(p => p + 1); load(tab, page + 1); }}
                className="h-11 w-11 rounded-xl" style={{ borderColor: "#E5E7EB" }}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </ScreeningDashboardLayout>
  );
}
