import { useState, useEffect } from "react";
import { tokenStorage } from "@/lib/tokenStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Activity, DollarSign, CheckCircle, XCircle, Clock, Eye,
  Search, RefreshCw, ShieldCheck, FileText, AlertCircle, ChevronRight,
  X, Key, Lock, Unlock, BarChart3, Globe, Download, FileCheck,
  Building2, UserCheck, Layers, ChevronDown, ChevronUp, FileIcon,
  Calendar, Mail, Hash, Wallet, Plus
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

function adminFetch(path: string, options?: RequestInit) {
  const token = tokenStorage.getItem("adminToken");
  return fetch(`/api/v1/developer${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options?.headers },
  });
}

interface Developer {
  id: string; email: string; name: string; company?: string;
  walletBalance: string; isActive: boolean; emailVerified: boolean;
  accountType: string; kycStatus: string; kycSubmittedAt?: string;
  kycDocuments?: any; kycReviewNote?: string; createdAt: string;
  environmentMode?: string; webhookUrl?: string;
}
interface ApiLog {
  id: string; developer_id?: string; developerId?: string;
  developer_name?: string; developer_email?: string;
  endpoint: string; method: string; status_code?: number; statusCode?: number;
  cost: string; duration_ms?: number; durationMs?: number;
  ip_address?: string; ipAddress?: string;
  created_at?: string; createdAt?: string;
}
interface DevDetail {
  developer: Developer; apiKeys: any[]; recentLogs: ApiLog[];
  summary: { total_calls: number; total_spent: string; success_calls: number; calls_30d: number };
}

const KYB_STATUS = {
  approved:    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", label: "Approved" },
  submitted:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500",   label: "Pending Review" },
  conditional: { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",  dot: "bg-orange-500",  label: "Conditional" },
  rejected:    { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     dot: "bg-red-500",     label: "Rejected" },
} as Record<string, { bg: string; text: string; border: string; dot: string; label: string }>;

function KybStatusBadge({ status }: { status: string }) {
  const s = KYB_STATUS[status] ?? { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400", label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

const envColor = (m: string) => m === "live"
  ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";

export default function AdminDeveloperPortal() {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [kycQueue, setKycQueue] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [kycFilter, setKycFilter] = useState<"submitted" | "approved" | "rejected" | "conditional" | "all">("submitted");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "conditional" | "reject">("approve");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [logsPage, setLogsPage] = useState(1);
  const [devsPage, setDevsPage] = useState(1);
  const [selectedDev, setSelectedDev] = useState<DevDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [creditModal, setCreditModal] = useState<{ open: boolean; devId: string; devName: string } | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [crediting, setCrediting] = useState(false);
  const [rateLimitModal, setRateLimitModal] = useState<{ open: boolean; devId: string; devName: string; current: number } | null>(null);
  const [rateLimitValue, setRateLimitValue] = useState("");
  const [settingRateLimit, setSettingRateLimit] = useState(false);

  const loadKyc = async (filter: string = kycFilter) => {
    try {
      const res = await adminFetch(`/admin/kyc?status=${filter}`);
      const data = await res.json();
      if (data.status === "success") setKycQueue(data.data.developers);
    } catch {}
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, devsRes, logsRes, kycRes] = await Promise.all([
        adminFetch("/admin/stats"),
        adminFetch(`/admin/developers?page=${devsPage}`),
        adminFetch(`/admin/logs/all?page=${logsPage}`),
        adminFetch(`/admin/kyc?status=${kycFilter}`),
      ]);
      const [sd, dd, ld, kd] = await Promise.all([
        statsRes.json(), devsRes.json(), logsRes.json(), kycRes.json()
      ]);
      if (sd.status === "success") setStats(sd.data);
      if (dd.status === "success") setDevelopers(dd.data.developers);
      if (ld.status === "success") setLogs(ld.data.logs);
      if (kd.status === "success") setKycQueue(kd.data.developers);
    } catch {
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadKyc(kycFilter); }, [kycFilter]);

  const handleKycReview = async () => {
    if (!reviewId) return;
    if (reviewAction === "reject" && !reviewNote.trim()) {
      toast({ title: "Rejection reason required", description: "Please provide a reason for rejection.", variant: "destructive" });
      return;
    }
    setReviewLoading(true);
    try {
      const res = await adminFetch(`/admin/kyc/${reviewId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: reviewAction, note: reviewNote }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: reviewAction === "approve" ? "KYB Approved" : reviewAction === "conditional" ? "Conditional Approval Set" : "Application Rejected", variant: reviewAction === "approve" ? "success" : reviewAction === "reject" ? "destructive" : "default" });
        setReviewId(null); setReviewNote("");
        loadKyc(kycFilter);
      } else {
        toast({ title: data.message || "Review failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setReviewLoading(false);
    }
  };

  const handleToggleStatus = async (devId: string, current: boolean) => {
    try {
      const res = await adminFetch(`/admin/developers/${devId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !current }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: current ? "Account deactivated" : "Account activated", variant: current ? "default" : "success" });
        loadAll();
      }
    } catch { toast({ title: "Failed to update", variant: "destructive" }); }
  };

  const handlePromote = async (devId: string, mode: string) => {
    setPromotingId(devId);
    try {
      const res = await adminFetch(`/admin/developers/${devId}/environment`, {
        method: "PATCH",
        body: JSON.stringify({ environmentMode: mode }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: `Moved to ${mode} mode`, variant: "success" });
        loadDevDetail(devId);
      } else {
        toast({ title: data.message || "Failed", variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setPromotingId(null); }
  };

  const loadDevDetail = async (devId: string) => {
    setDetailLoading(true);
    try {
      const res = await adminFetch(`/admin/developers/${devId}`);
      const data = await res.json();
      if (data.status === "success") setSelectedDev(data.data);
    } catch {} finally { setDetailLoading(false); }
  };

  const downloadKybDoc = async (fileKey: string, fileName: string) => {
    try {
      const res = await adminFetch(`/admin/kyc/document/${encodeURIComponent(fileKey)}`);
      if (!res.ok) { toast({ title: "Document not found", variant: "destructive" }); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const handleCreditSandbox = async () => {
    if (!creditModal) return;
    const amt = parseFloat(creditAmount);
    if (!amt || amt <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setCrediting(true);
    try {
      const res = await adminFetch(`/admin/developers/${creditModal.devId}/credit-sandbox`, {
        method: "POST",
        body: JSON.stringify({ amount: amt, reason: creditReason }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: `₦${amt.toLocaleString("en-NG")} credited to ${creditModal.devName}'s sandbox wallet`, variant: "success" });
        setCreditModal(null);
        setCreditAmount("");
        setCreditReason("");
        loadDevDetail(creditModal.devId);
        loadAll();
      } else {
        toast({ title: data.message || "Credit failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
    setCrediting(false);
  };

  const handleSetRateLimit = async () => {
    if (!rateLimitModal) return;
    const limit = parseInt(rateLimitValue);
    if (isNaN(limit) || limit < 0) {
      toast({ title: "Enter a valid number", variant: "destructive" });
      return;
    }
    setSettingRateLimit(true);
    try {
      const res = await adminFetch(`/admin/developers/${rateLimitModal.devId}/rate-limit`, {
        method: "PATCH",
        body: JSON.stringify({ rateLimit: limit }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: data.message, variant: "success" });
        setRateLimitModal(null);
        setRateLimitValue("");
        loadDevDetail(rateLimitModal.devId);
      } else {
        toast({ title: data.message || "Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
    setSettingRateLimit(false);
  };

  const filteredDevs = developers.filter(d =>
    [d.name, d.email, d.company || ""].join(" ").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCard = (id: string) => setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Developer Portal</h1>
          <p className="text-muted-foreground text-sm">Manage developers, API access, and KYB reviews</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Developers", value: stats.developerStats?.total_developers || 0, icon: Users, color: "blue" },
            { label: "Active Developers", value: stats.developerStats?.active_developers || 0, icon: CheckCircle, color: "green" },
            { label: "Pending KYB", value: stats.developerStats?.pending_kyc || 0, icon: AlertCircle, color: "orange" },
            { label: "Total API Calls", value: (stats.apiCalls?.total_api_calls || 0).toLocaleString(), icon: Activity, color: "purple" },
            { label: "Platform Revenue", value: `₦${parseFloat(stats.apiCalls?.total_revenue || "0").toLocaleString()}`, icon: DollarSign, color: "emerald" },
          ].map(item => (
            <Card key={item.label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg bg-${item.color}-100 flex items-center justify-center shrink-0`}>
                    <item.icon className={`h-4 w-4 text-${item.color}-600`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold leading-none">{item.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-4">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="kyc">
            <TabsList className="mb-4">
              <TabsTrigger value="kyc">
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                KYB Reviews
                {kycQueue.filter(d => d.kycStatus === "submitted").length > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none font-bold">
                    {kycQueue.filter(d => d.kycStatus === "submitted").length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="developers">
                <Users className="h-4 w-4 mr-1.5" />Developers
              </TabsTrigger>
              <TabsTrigger value="logs">
                <Activity className="h-4 w-4 mr-1.5" />API Logs
              </TabsTrigger>
            </TabsList>

            {/* ── KYB Review tab ── */}
            <TabsContent value="kyc" className="space-y-4 mt-0">
              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2 pb-1">
                {([
                  { value: "submitted", label: "Pending Review", color: "amber" },
                  { value: "approved",  label: "Approved",       color: "emerald" },
                  { value: "conditional", label: "Conditional",  color: "orange" },
                  { value: "rejected",  label: "Rejected",       color: "red" },
                  { value: "all",       label: "All",            color: "gray" },
                ] as const).map(f => (
                  <button key={f.value}
                    onClick={() => setKycFilter(f.value)}
                    className={`h-7 px-3 text-xs font-semibold rounded-full border transition-all ${
                      kycFilter === f.value
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-muted-foreground border-border hover:border-foreground/30"
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>

              {kycQueue.length === 0 ? (
                <Card>
                  <CardContent className="pt-12 pb-12 text-center">
                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-7 w-7 text-green-600" />
                    </div>
                    <p className="font-semibold text-base">
                      {kycFilter === "submitted" ? "No pending KYB reviews" :
                       kycFilter === "all" ? "No KYB applications found" :
                       `No ${kycFilter} KYB applications`}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {kycFilter === "submitted" ? "All business verification submissions have been reviewed." :
                       "Try a different status filter above."}
                    </p>
                  </CardContent>
                </Card>
              ) : kycQueue.map(dev => {
                const kyb = dev.kycDocuments as any;
                const structured = kyb?.companyInfo;
                const isExpanded = expandedCards[dev.id] ?? true;
                const isReviewing = reviewId === dev.id;

                return (
                  <div key={dev.id} className="border rounded-xl overflow-hidden bg-card shadow-sm">
                    {/* Card Header */}
                    <div className="flex items-start justify-between p-5 gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 font-bold text-indigo-600 text-lg">
                          {dev.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base">{dev.name}</h3>
                            <KybStatusBadge status={dev.kycStatus} />
                            <Badge variant="outline" className="capitalize text-xs">{dev.accountType}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{dev.email}</span>
                            {dev.company && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{dev.company}</span>}
                            {dev.kycSubmittedAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Submitted {new Date(dev.kycSubmittedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => toggleCard(dev.id)} className="text-muted-foreground hover:text-foreground mt-1 shrink-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="border-t">
                        {structured ? (
                          <div className="divide-y">
                            {/* Company Information */}
                            <div className="p-5">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                                  <Building2 className="h-3.5 w-3.5 text-blue-600" />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Company Information</p>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {[
                                  { label: "Legal Name", value: kyb.companyInfo.legalName },
                                  { label: "CAC Number", value: kyb.companyInfo.cacNumber },
                                  { label: "Business Type", value: kyb.companyInfo.businessType },
                                  { label: "Phone", value: kyb.companyInfo.phone },
                                  { label: "TIN", value: kyb.companyInfo.tin },
                                  { label: "Website", value: kyb.companyInfo.website },
                                ].filter(f => f.value).map(({ label, value }) => (
                                  <div key={label} className="bg-muted/40 rounded-lg p-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                                    <p className="text-xs font-medium mt-1 break-words">{value}</p>
                                  </div>
                                ))}
                                {kyb.companyInfo.businessAddress && (
                                  <div className="bg-muted/40 rounded-lg p-3 col-span-2 md:col-span-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Business Address</p>
                                    <p className="text-xs font-medium mt-1">{kyb.companyInfo.businessAddress}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Directors */}
                            {kyb.directors?.length > 0 && (
                              <div className="p-5">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center">
                                    <UserCheck className="h-3.5 w-3.5 text-purple-600" />
                                  </div>
                                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Directors / UBO ({kyb.directors.length})</p>
                                </div>
                                <div className="space-y-2">
                                  {kyb.directors.map((d: any, i: number) => (
                                    <div key={i} className="bg-muted/40 rounded-lg p-3 flex gap-4 flex-wrap">
                                      <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</p>
                                        <p className="text-xs font-semibold mt-0.5">{d.fullName}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ID</p>
                                        <p className="text-xs font-medium mt-0.5">{(d.idType || "").toUpperCase()}: {d.idNumber}</p>
                                      </div>
                                      {d.ownershipPercent && (
                                        <div>
                                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ownership</p>
                                          <p className="text-xs font-medium mt-0.5">{d.ownershipPercent}%</p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* API Use Case */}
                            {kyb.apiUseCase && (
                              <div className="p-5">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
                                    <Layers className="h-3.5 w-3.5 text-indigo-600" />
                                  </div>
                                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">API Use Case</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {[
                                    { label: "Purpose", value: kyb.apiUseCase.purpose },
                                    { label: "Expected Volume", value: kyb.apiUseCase.expectedVolume },
                                    { label: "Target Customers", value: kyb.apiUseCase.targetCustomers },
                                  ].filter(f => f.value).map(({ label, value }) => (
                                    <div key={label} className="bg-muted/40 rounded-lg p-3">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                                      <p className="text-xs font-medium mt-1">{value}</p>
                                    </div>
                                  ))}
                                  {kyb.apiUseCase.dataTypesNeeded?.length > 0 && (
                                    <div className="bg-muted/40 rounded-lg p-3">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Services Needed</p>
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {kyb.apiUseCase.dataTypesNeeded.map((s: string) => (
                                          <span key={s} className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">{s}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Compliance */}
                            {kyb.compliance && (
                              <div className="p-5">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 rounded-md bg-green-100 flex items-center justify-center">
                                    <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                                  </div>
                                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Compliance Declarations</p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                  {[
                                    { label: "PEP Status", value: kyb.compliance.isPEP ? "⚠ PEP Declared" : "✓ No PEPs", ok: !kyb.compliance.isPEP },
                                    { label: "AML Declaration", value: kyb.compliance.amlDeclaration ? "✓ Declared" : "✗ Not declared", ok: !!kyb.compliance.amlDeclaration },
                                    { label: "Terms Accepted", value: kyb.compliance.termsAccepted ? "✓ Accepted" : "✗ Not accepted", ok: !!kyb.compliance.termsAccepted },
                                  ].map(({ label, value, ok }) => (
                                    <div key={label} className={`rounded-lg p-3 border ${ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                                      <p className={`text-xs font-semibold mt-1 ${ok ? "text-green-700" : "text-red-600"}`}>{value}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Documents */}
                            {kyb.uploadedDocuments && Object.keys(kyb.uploadedDocuments).length > 0 && (
                              <div className="p-5">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center">
                                    <FileCheck className="h-3.5 w-3.5 text-amber-600" />
                                  </div>
                                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Uploaded Documents</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {([
                                    { key: "cac_certificate",    label: "CAC Certificate",      icon: "📋" },
                                    { key: "status_report",      label: "Status Report",        icon: "📄" },
                                    { key: "address_verification", label: "Address Verification", icon: "🏠" },
                                  ] as const).map(({ key, label, icon }) => {
                                    const doc = kyb.uploadedDocuments[key];
                                    if (!doc) return null;
                                    const ext = (doc.name || "").split(".").pop()?.toUpperCase() || "FILE";
                                    return (
                                      <div key={key} className="border rounded-xl p-4 flex flex-col gap-3 bg-card hover:shadow-md transition-shadow">
                                        <div className="flex items-start gap-3">
                                          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-lg shrink-0">
                                            {icon}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-foreground">{label}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate" title={doc.name}>{doc.name}</p>
                                            <span className="text-[9px] font-bold bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">{ext}</span>
                                          </div>
                                        </div>
                                        <Button size="sm" variant="outline"
                                          className="w-full h-8 text-xs font-semibold border-dashed hover:bg-amber-50 hover:border-amber-400 hover:text-amber-700 transition-colors"
                                          onClick={() => downloadKybDoc(doc.fileKey, doc.name)}>
                                          <Download className="h-3.5 w-3.5 mr-1.5" /> Download File
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Review note from previous review */}
                            {dev.kycReviewNote && !isReviewing && (
                              <div className="px-5 py-4 bg-muted/30">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Previous Review Note</p>
                                <p className="text-xs text-muted-foreground italic">{dev.kycReviewNote}</p>
                              </div>
                            )}
                          </div>
                        ) : dev.kycDocuments ? (
                          <div className="p-5">
                            <div className="bg-muted rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                              {JSON.stringify(dev.kycDocuments, null, 2)}
                            </div>
                          </div>
                        ) : (
                          <div className="p-5 text-center text-sm text-muted-foreground">No documents submitted</div>
                        )}

                        {/* ── Review Panel ── */}
                        {isReviewing ? (
                          <div className="border-t bg-muted/20 p-5 space-y-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
                                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                              </div>
                              <p className="text-sm font-bold">Review Decision</p>
                              <span className="text-xs text-muted-foreground">for {dev.name}</span>
                            </div>

                            {/* Action selector */}
                            <div className="grid grid-cols-3 gap-2">
                              {([
                                { action: "approve",     label: "Approve",      icon: CheckCircle,  active: "bg-emerald-600 text-white border-emerald-600 shadow-sm", inactive: "hover:border-emerald-400 hover:text-emerald-700" },
                                { action: "conditional", label: "Conditional",  icon: AlertCircle,  active: "bg-orange-500 text-white border-orange-500 shadow-sm", inactive: "hover:border-orange-400 hover:text-orange-700" },
                                { action: "reject",      label: "Reject",       icon: XCircle,      active: "bg-red-600 text-white border-red-600 shadow-sm", inactive: "hover:border-red-400 hover:text-red-600" },
                              ] as const).map(({ action, label, icon: Icon, active, inactive }) => (
                                <button key={action} onClick={() => setReviewAction(action)}
                                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                                    reviewAction === action ? active : `bg-background border-border text-muted-foreground ${inactive}`
                                  }`}>
                                  <Icon className="h-4 w-4" />
                                  {label}
                                </button>
                              ))}
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                                {reviewAction === "approve" ? "Admin note (optional)" :
                                 reviewAction === "conditional" ? "Conditions and requirements *" :
                                 "Reason for rejection *"}
                              </label>
                              <Textarea
                                placeholder={
                                  reviewAction === "approve" ? "Add an optional note for the developer..." :
                                  reviewAction === "conditional" ? "Explain what conditions must be met, what documents are missing, and what limitations apply..." :
                                  "Provide a clear reason for rejection so the developer can understand and resubmit..."
                                }
                                value={reviewNote}
                                onChange={e => setReviewNote(e.target.value)}
                                className="text-sm resize-none" rows={3} />
                            </div>

                            <div className="flex gap-2">
                              <Button onClick={handleKycReview} disabled={reviewLoading} size="sm"
                                className={`flex-1 font-semibold ${
                                  reviewAction === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" :
                                  reviewAction === "conditional" ? "bg-orange-500 hover:bg-orange-600 text-white" :
                                  "bg-red-600 hover:bg-red-700 text-white"
                                }`}>
                                {reviewLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                                {reviewLoading ? "Submitting..." :
                                 reviewAction === "approve" ? "Confirm Approval" :
                                 reviewAction === "conditional" ? "Set Conditional" :
                                 "Confirm Rejection"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setReviewId(null); setReviewNote(""); }} className="px-4">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="border-t p-4 flex items-center justify-between gap-3">
                            <div className="text-xs text-muted-foreground">
                              {dev.kycStatus === "submitted" ? "This application is awaiting your review." :
                               dev.kycStatus === "approved" ? "Application approved. Developer has live access." :
                               dev.kycStatus === "conditional" ? "Conditional approval set. Awaiting developer updates." :
                               "Application was rejected. Developer may resubmit."}
                            </div>
                            <Button size="sm"
                              onClick={() => { setReviewId(dev.id); setReviewAction("approve"); setReviewNote(""); }}
                              className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                              {dev.kycStatus === "submitted" ? "Review Application" : "Update Decision"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </TabsContent>

            {/* ── Developers tab ── */}
            <TabsContent value="developers" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search developers..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {filteredDevs.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">No developers found</div>
                    ) : filteredDevs.map(dev => (
                      <div key={dev.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer"
                        onClick={() => loadDevDetail(dev.id)}>
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 shrink-0">
                          {dev.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate">{dev.name}</p>
                            {!dev.isActive && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-bold">inactive</span>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{dev.email}{dev.company && ` · ${dev.company}`}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <KybStatusBadge status={dev.kycStatus} />
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${envColor(dev.environmentMode || "sandbox")}`}>
                            {dev.environmentMode || "sandbox"}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <PaginationRow page={devsPage} hasMore={developers.length >= 50}
                onPrev={() => setDevsPage(p => p - 1)} onNext={() => setDevsPage(p => p + 1)} />
            </TabsContent>

            {/* ── Logs tab ── */}
            <TabsContent value="logs" className="space-y-3 mt-4">
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {logs.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">No API logs found</div>
                    ) : logs.map(log => {
                      const code = (log as any).status_code ?? (log as any).statusCode ?? 0;
                      const dur = (log as any).duration_ms ?? (log as any).durationMs ?? 0;
                      const ts = (log as any).created_at ?? (log as any).createdAt ?? "";
                      const devName = (log as any).developer_name ?? (log as any).developerName ?? "";
                      return (
                        <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                          {code >= 200 && code < 300
                            ? <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${code >= 200 && code < 300 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{code}</span>
                          <span className="font-mono flex-1 truncate text-muted-foreground">{log.endpoint}</span>
                          <span className="text-muted-foreground shrink-0">{dur}ms</span>
                          <span className="text-muted-foreground shrink-0 hidden md:block truncate max-w-[120px]">{devName}</span>
                          <span className="text-muted-foreground shrink-0 hidden md:block">{ts ? new Date(ts).toLocaleDateString() : ""}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <PaginationRow page={logsPage} hasMore={logs.length >= 50}
                onPrev={() => setLogsPage(p => p - 1)} onNext={() => setLogsPage(p => p + 1)} />
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Developer Detail Panel ── */}
        {(selectedDev || detailLoading) && (
          <div className="w-96 shrink-0">
            <div className="sticky top-4 border rounded-xl shadow-sm overflow-hidden bg-card">
              <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                <p className="font-semibold text-sm">Developer Detail</p>
                <button onClick={() => setSelectedDev(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {detailLoading ? (
                <div className="flex justify-center items-center h-40">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : selectedDev && (
                <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                  {/* Identity */}
                  <div className="p-4 border-b">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">
                        {selectedDev.developer.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{selectedDev.developer.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{selectedDev.developer.email}</p>
                        {selectedDev.developer.company && (
                          <p className="text-xs text-muted-foreground">{selectedDev.developer.company}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <InfoPair label="Mode" value={
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${envColor(selectedDev.developer.environmentMode || "sandbox")}`}>
                          {selectedDev.developer.environmentMode === "live" ? "Live" : "Sandbox"}
                        </span>
                      } />
                      <InfoPair label="KYB" value={<KybStatusBadge status={selectedDev.developer.kycStatus} />} />
                      <InfoPair label="Wallet" value={`₦${parseFloat(selectedDev.developer.walletBalance || "0").toLocaleString()}`} />
                      <InfoPair label="Joined" value={new Date(selectedDev.developer.createdAt).toLocaleDateString()} />
                      <InfoPair label="Status" value={selectedDev.developer.isActive ? "Active" : "Inactive"} />
                      <InfoPair label="Type" value={selectedDev.developer.accountType || "individual"} />
                      <InfoPair label="Rate Limit" value={
                        ((selectedDev.developer as any).customRateLimit || (selectedDev.developer as any).custom_rate_limit || 0) > 0
                          ? `${Number((selectedDev.developer as any).customRateLimit || (selectedDev.developer as any).custom_rate_limit).toLocaleString()}/day`
                          : `Default (${selectedDev.developer.environmentMode === "live" ? "10,000" : "100"}/day)`
                      } />
                    </div>

                    {selectedDev.developer.webhookUrl && (
                      <div className="mt-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Webhook URL</p>
                        <p className="text-xs font-mono text-muted-foreground truncate">{selectedDev.developer.webhookUrl}</p>
                      </div>
                    )}
                    <div className="mt-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Account ID</p>
                      <p className="text-xs font-mono text-muted-foreground break-all">{selectedDev.developer.id}</p>
                    </div>
                  </div>

                  {/* Usage Summary */}
                  <div className="p-4 border-b">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Usage Summary</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Total Calls", value: selectedDev.summary?.total_calls || 0 },
                        { label: "Success Calls", value: selectedDev.summary?.success_calls || 0 },
                        { label: "Last 30 Days", value: selectedDev.summary?.calls_30d || 0 },
                        { label: "Total Spent", value: `₦${parseFloat(selectedDev.summary?.total_spent || "0").toLocaleString()}` },
                      ].map(s => (
                        <div key={s.label} className="bg-muted/50 rounded-lg p-2.5">
                          <p className="text-[10px] text-muted-foreground">{s.label}</p>
                          <p className="text-sm font-bold">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* API Keys */}
                  <div className="p-4 border-b">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      API Keys ({selectedDev.apiKeys.length})
                    </p>
                    {selectedDev.apiKeys.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No keys created</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDev.apiKeys.map(k => (
                          <div key={k.id} className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg">
                            <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{k.key_name || k.keyName}</p>
                              <p className="text-[10px] font-mono text-muted-foreground truncate">{(k.api_key || k.apiKey || "").substring(0, 20)}…</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-[10px] px-1.5 rounded ${
                                (k.environment || "sandbox") === "live"
                                  ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                {k.environment || "sandbox"}
                              </span>
                              <span className={`text-[10px] ${(k.is_active ?? k.isActive) ? "text-green-600" : "text-red-500"}`}>
                                {(k.is_active ?? k.isActive) ? "active" : "revoked"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-4 border-b">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Actions</p>
                    <div className="space-y-2">
                      <Button size="sm" className="w-full justify-between" variant="outline"
                        onClick={() => handleToggleStatus(selectedDev.developer.id, selectedDev.developer.isActive)}>
                        {selectedDev.developer.isActive ? "Deactivate Account" : "Activate Account"}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                      {selectedDev.developer.environmentMode !== "live" && selectedDev.developer.kycStatus === "approved" && (
                        <Button size="sm" className="w-full justify-between bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={promotingId === selectedDev.developer.id}
                          onClick={() => handlePromote(selectedDev.developer.id, "live")}>
                          {promotingId === selectedDev.developer.id
                            ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            : <><Unlock className="h-3.5 w-3.5 mr-1" /> Promote to Live Mode</>}
                        </Button>
                      )}
                      {selectedDev.developer.environmentMode === "live" && (
                        <Button size="sm" className="w-full justify-between" variant="outline"
                          disabled={promotingId === selectedDev.developer.id}
                          onClick={() => handlePromote(selectedDev.developer.id, "sandbox")}>
                          {promotingId === selectedDev.developer.id
                            ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            : <><Lock className="h-3.5 w-3.5 mr-1" /> Move to Sandbox</>}
                        </Button>
                      )}
                      {/* Credit Sandbox Wallet — always available regardless of mode */}
                      <Button size="sm"
                        className="w-full justify-between bg-emerald-700 hover:bg-emerald-600 text-white"
                        onClick={() => {
                          setCreditAmount("");
                          setCreditReason("");
                          setCreditModal({ open: true, devId: selectedDev.developer.id, devName: selectedDev.developer.name });
                        }}>
                        <span className="flex items-center gap-1.5">
                          <Wallet className="h-3.5 w-3.5" />
                          Credit Sandbox Wallet
                        </span>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm"
                        className="w-full justify-between bg-blue-700 hover:bg-blue-600 text-white"
                        onClick={() => {
                          const current = (selectedDev.developer as any).customRateLimit || (selectedDev.developer as any).custom_rate_limit || 0;
                          setRateLimitValue(current > 0 ? current.toString() : "");
                          setRateLimitModal({ open: true, devId: selectedDev.developer.id, devName: selectedDev.developer.name, current });
                        }}>
                        <span className="flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5" />
                          Set API Rate Limit
                        </span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Recent Logs */}
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recent API Calls</p>
                    {selectedDev.recentLogs.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No calls yet</p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedDev.recentLogs.slice(0, 10).map(log => {
                          const code = (log as any).status_code ?? (log as any).statusCode ?? 0;
                          const dur = (log as any).duration_ms ?? (log as any).durationMs ?? 0;
                          return (
                            <div key={log.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs">
                              {code >= 200 && code < 300
                                ? <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                                : <XCircle className="h-3 w-3 text-red-500 shrink-0" />}
                              <span className="font-mono truncate flex-1">{log.endpoint}</span>
                              <span className="text-muted-foreground shrink-0">{dur}ms</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Credit Sandbox Wallet Dialog ── */}
      <Dialog open={!!creditModal?.open} onOpenChange={open => !open && setCreditModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-600" />
              Credit Sandbox Wallet
            </DialogTitle>
            <DialogDescription>
              Manually add funds to <strong>{creditModal?.devName}</strong>'s sandbox wallet for testing.
              No real payment is processed. The developer will be notified by email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm mb-1.5 block">Amount (₦) <span className="text-red-500">*</span></Label>
              <Input
                type="number" min={1} placeholder="e.g. 5000"
                value={creditAmount}
                onChange={e => setCreditAmount(e.target.value)}
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                {[1000, 5000, 10000, 50000].map(a => (
                  <button key={a}
                    onClick={() => setCreditAmount(a.toString())}
                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                      creditAmount === a.toString()
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}>
                    ₦{a.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Reason / Note <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="e.g. Testing allowance for onboarding"
                value={creditReason}
                onChange={e => setCreditReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreditModal(null)}>Cancel</Button>
            <Button
              onClick={handleCreditSandbox}
              disabled={crediting || !creditAmount}
              className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {crediting
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />
                : <Wallet className="h-3.5 w-3.5 mr-2" />}
              Credit ₦{parseFloat(creditAmount || "0").toLocaleString("en-NG")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Set API Rate Limit Dialog ── */}
      <Dialog open={!!rateLimitModal?.open} onOpenChange={open => !open && setRateLimitModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Set API Rate Limit
            </DialogTitle>
            <DialogDescription>
              Override the daily API call limit for <strong>{rateLimitModal?.devName}</strong>.
              Default limits: Sandbox = 100/day, Live = 10,000/day.
              Set to 0 to reset to the default limit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm mb-1.5 block">Daily Request Limit</Label>
              <Input
                type="number" min={0} placeholder="e.g. 50000"
                value={rateLimitValue}
                onChange={e => setRateLimitValue(e.target.value)}
              />
              {rateLimitModal && rateLimitModal.current > 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Current custom limit: <strong>{rateLimitModal.current.toLocaleString()}</strong> requests/day
                </p>
              )}
              {rateLimitModal && rateLimitModal.current === 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Currently using default limit
                </p>
              )}
              <div className="flex gap-2 mt-2 flex-wrap">
                {[1000, 5000, 10000, 50000, 100000].map(a => (
                  <button key={a}
                    onClick={() => setRateLimitValue(a.toString())}
                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                      rateLimitValue === a.toString()
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}>
                    {a.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRateLimitModal(null)}>Cancel</Button>
            {rateLimitModal && rateLimitModal.current > 0 && (
              <Button variant="outline" onClick={() => { setRateLimitValue("0"); }}>
                Reset to Default
              </Button>
            )}
            <Button
              onClick={handleSetRateLimit}
              disabled={settingRateLimit || rateLimitValue === ""}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              {settingRateLimit
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />
                : <Activity className="h-3.5 w-3.5 mr-2" />}
              {parseInt(rateLimitValue || "0") === 0 ? "Reset to Default" : `Set ${parseInt(rateLimitValue || "0").toLocaleString()}/day`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaginationRow({ page, hasMore, onPrev, onNext }: {
  page: number; hasMore: boolean; onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>Page {page}</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={onPrev}>Previous</Button>
        <Button size="sm" variant="outline" disabled={!hasMore} onClick={onNext}>Next</Button>
      </div>
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="text-xs font-medium mt-0.5">{value}</div>
    </div>
  );
}
