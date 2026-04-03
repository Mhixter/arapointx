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
  X, Key, Lock, Unlock, BarChart3, Globe
} from "lucide-react";

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

const kycColor = (s: string) => ({
  approved: "bg-green-100 text-green-800", submitted: "bg-yellow-100 text-yellow-800",
  conditional: "bg-orange-100 text-orange-800", rejected: "bg-red-100 text-red-800",
}[s] ?? "bg-gray-100 text-gray-600");

const envColor = (m: string) => m === "live"
  ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";

export default function AdminDeveloperPortal() {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [kycQueue, setKycQueue] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "conditional" | "reject">("approve");
  const [reviewNote, setReviewNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [logsPage, setLogsPage] = useState(1);
  const [devsPage, setDevsPage] = useState(1);
  const [selectedDev, setSelectedDev] = useState<DevDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, devsRes, logsRes, kycRes] = await Promise.all([
        adminFetch("/admin/stats"),
        adminFetch(`/admin/developers?page=${devsPage}`),
        adminFetch(`/admin/logs/all?page=${logsPage}`),
        adminFetch("/admin/kyc?status=submitted"),
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

  const loadDevDetail = async (id: string) => {
    setDetailLoading(true);
    setSelectedDev(null);
    try {
      const res = await adminFetch(`/admin/developers/${id}`);
      const data = await res.json();
      if (data.status === "success") setSelectedDev(data.data);
    } catch {}
    setDetailLoading(false);
  };

  useEffect(() => { loadAll(); }, [devsPage, logsPage]);

  const handleKycReview = async () => {
    if (!reviewId) return;
    try {
      const res = await adminFetch(`/admin/kyc/${reviewId}`, {
        method: "PATCH", body: JSON.stringify({ action: reviewAction, note: reviewNote }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: `KYB ${reviewAction}d` });
        setReviewId(null); setReviewNote("");
        loadAll();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
  };

  const handleToggleStatus = async (id: string, current: boolean) => {
    try {
      const res = await adminFetch(`/admin/developers/${id}/status`, {
        method: "PATCH", body: JSON.stringify({ isActive: !current }),
      });
      const data = await res.json();
      if (data.status === "success") { toast({ title: "Updated" }); loadAll(); }
    } catch {}
  };

  const handlePromote = async (id: string, action: "live" | "sandbox") => {
    setPromotingId(id);
    try {
      const res = await adminFetch(`/admin/developers/${id}/promote`, {
        method: "PATCH", body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: `Developer moved to ${action} mode` });
        loadAll();
        if (selectedDev?.developer.id === id) loadDevDetail(id);
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch {}
    setPromotingId(null);
  };

  const filteredDevs = developers.filter(d =>
    [d.name, d.email, d.company || ""].join(" ").toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                    <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                    <p className="text-xl font-bold">{item.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="developers">
            <TabsList>
              <TabsTrigger value="developers">
                <Users className="h-4 w-4 mr-1.5" /> Developers ({developers.length})
              </TabsTrigger>
              <TabsTrigger value="logs">
                <Activity className="h-4 w-4 mr-1.5" /> API Logs
              </TabsTrigger>
              <TabsTrigger value="kyc">
                <ShieldCheck className="h-4 w-4 mr-1.5" /> KYB Review
                {kycQueue.length > 0 && (
                  <Badge variant="destructive" className="ml-1.5 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                    {kycQueue.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Developers tab ── */}
            <TabsContent value="developers" className="space-y-3 mt-4">
              <Input placeholder="Search name, email, company..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="max-w-sm" />
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Developer</th>
                      <th className="text-left p-3 font-medium hidden lg:table-cell">Mode</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">KYB</th>
                      <th className="text-right p-3 font-medium hidden md:table-cell">Wallet</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDevs.map(dev => (
                      <tr key={dev.id} className="border-t hover:bg-muted/40 cursor-pointer"
                        onClick={() => loadDevDetail(dev.id)}>
                        <td className="p-3">
                          <p className="font-medium text-sm">{dev.name}</p>
                          <p className="text-xs text-muted-foreground">{dev.email}</p>
                          {dev.company && <p className="text-xs text-muted-foreground">{dev.company}</p>}
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${envColor(dev.environmentMode || "sandbox")}`}>
                            {dev.environmentMode === "live" ? "Live" : "Sandbox"}
                          </span>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${kycColor(dev.kycStatus)}`}>
                            {dev.kycStatus?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="p-3 text-right hidden md:table-cell text-sm">
                          ₦{parseFloat(dev.walletBalance || "0").toLocaleString()}
                        </td>
                        <td className="p-3">
                          {dev.isActive
                            ? <Badge className="bg-green-100 text-green-800 border-0 text-xs">Active</Badge>
                            : <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                        </td>
                        <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="sm" variant="ghost" onClick={() => loadDevDetail(dev.id)}
                              className="h-7 w-7 p-0 text-muted-foreground">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline"
                              onClick={() => handleToggleStatus(dev.id, dev.isActive)}
                              className="h-7 text-xs px-2">
                              {dev.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredDevs.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No developers found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationRow page={devsPage} hasMore={developers.length >= 20}
                onPrev={() => setDevsPage(p => p - 1)} onNext={() => setDevsPage(p => p + 1)} />
            </TabsContent>

            {/* ── Logs tab ── */}
            <TabsContent value="logs" className="space-y-3 mt-4">
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Developer</th>
                      <th className="text-left p-3 font-medium">Endpoint</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">Status</th>
                      <th className="text-right p-3 font-medium hidden md:table-cell">Cost</th>
                      <th className="text-right p-3 font-medium hidden lg:table-cell">Duration</th>
                      <th className="text-right p-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => {
                      const code = log.status_code ?? log.statusCode ?? 0;
                      const dur = log.duration_ms ?? log.durationMs ?? 0;
                      const ts = log.created_at ?? log.createdAt ?? "";
                      return (
                        <tr key={log.id} className="border-t hover:bg-muted/40">
                          <td className="p-3">
                            <p className="text-xs font-medium">{log.developer_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{log.developer_email || ""}</p>
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded mr-1.5">{log.method}</span>
                            <span className="text-xs">{log.endpoint}</span>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            {code >= 200 && code < 300 ? <CheckCircle className="h-4 w-4 text-green-500" />
                              : code >= 400 ? <XCircle className="h-4 w-4 text-red-500" />
                              : <Clock className="h-4 w-4 text-yellow-500" />}
                          </td>
                          <td className="p-3 text-right hidden md:table-cell text-xs">
                            {parseFloat(log.cost || "0") > 0 ? `₦${parseFloat(log.cost).toLocaleString()}` : "—"}
                          </td>
                          <td className="p-3 text-right hidden lg:table-cell text-xs text-muted-foreground">{dur}ms</td>
                          <td className="p-3 text-right text-xs text-muted-foreground">
                            {ts ? new Date(ts).toLocaleString() : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {logs.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No logs found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationRow page={logsPage} hasMore={logs.length >= 50}
                onPrev={() => setLogsPage(p => p - 1)} onNext={() => setLogsPage(p => p + 1)} />
            </TabsContent>

            {/* ── KYB Review tab ── */}
            <TabsContent value="kyc" className="space-y-4 mt-4">
              {kycQueue.length === 0 ? (
                <Card>
                  <CardContent className="pt-10 pb-10 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="font-medium">No pending KYB reviews</p>
                    <p className="text-sm text-muted-foreground">All business verification submissions have been reviewed</p>
                  </CardContent>
                </Card>
              ) : kycQueue.map(dev => {
                const kyb = dev.kycDocuments as any;
                const structured = kyb?.companyInfo;
                return (
                  <Card key={dev.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{dev.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-0.5">{dev.email}{dev.company && ` · ${dev.company}`}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="capitalize text-xs">{dev.accountType}</Badge>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${kycColor(dev.kycStatus)}`}>
                              {dev.kycStatus?.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {dev.kycSubmittedAt ? new Date(dev.kycSubmittedAt).toLocaleDateString() : "—"}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {structured ? (
                        <div className="space-y-3">
                          <KybSection title="Company Information" icon={<Globe className="h-3.5 w-3.5" />}>
                            <KybRow label="Legal Name" value={kyb.companyInfo.legalName} />
                            <KybRow label="CAC Number" value={kyb.companyInfo.cacNumber} />
                            <KybRow label="Business Type" value={kyb.companyInfo.businessType} />
                            <KybRow label="Address" value={kyb.companyInfo.businessAddress} />
                            <KybRow label="Phone" value={kyb.companyInfo.phone} />
                            {kyb.companyInfo.tin && <KybRow label="TIN" value={kyb.companyInfo.tin} />}
                            {kyb.companyInfo.website && <KybRow label="Website" value={kyb.companyInfo.website} />}
                          </KybSection>
                          {kyb.directors?.length > 0 && (
                            <KybSection title="Directors / UBO" icon={<Users className="h-3.5 w-3.5" />}>
                              {kyb.directors.map((d: any, i: number) => (
                                <div key={i} className={i > 0 ? "border-t pt-2 mt-1" : ""}>
                                  <KybRow label={`Director ${i + 1}`} value={d.fullName} />
                                  <KybRow label="ID" value={`${(d.idType || "").toUpperCase()}: ${d.idNumber}`} />
                                  {d.ownershipPercent && <KybRow label="Ownership" value={`${d.ownershipPercent}%`} />}
                                </div>
                              ))}
                            </KybSection>
                          )}
                          {kyb.apiUseCase && (
                            <KybSection title="API Use Case" icon={<FileText className="h-3.5 w-3.5" />}>
                              <KybRow label="Purpose" value={kyb.apiUseCase.purpose} />
                              <KybRow label="Volume" value={kyb.apiUseCase.expectedVolume} />
                              <KybRow label="Customers" value={kyb.apiUseCase.targetCustomers} />
                              <KybRow label="Services" value={(kyb.apiUseCase.dataTypesNeeded || []).join(", ")} />
                            </KybSection>
                          )}
                          {kyb.compliance && (
                            <KybSection title="Compliance" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                              <KybRow label="PEP" value={kyb.compliance.isPEP ? "Declared PEP" : "No PEPs"} />
                              <KybRow label="AML" value={kyb.compliance.amlDeclaration ? "Declared" : "Not declared"} />
                              <KybRow label="Terms" value={kyb.compliance.termsAccepted ? "Accepted" : "Not accepted"} />
                            </KybSection>
                          )}
                        </div>
                      ) : dev.kycDocuments ? (
                        <div className="bg-muted rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {JSON.stringify(dev.kycDocuments, null, 2)}
                        </div>
                      ) : <p className="text-sm text-muted-foreground">No documents submitted</p>}

                      {reviewId === dev.id ? (
                        <div className="space-y-3 border-t pt-3">
                          <p className="text-sm font-medium">Decision</p>
                          <div className="flex gap-2">
                            {(["approve", "conditional", "reject"] as const).map(a => (
                              <Button key={a} size="sm" onClick={() => setReviewAction(a)}
                                className={`flex-1 capitalize ${
                                  a === "approve" && reviewAction === "approve" ? "bg-green-600 hover:bg-green-700 text-white border-0" :
                                  a === "conditional" && reviewAction === "conditional" ? "bg-orange-600 hover:bg-orange-700 text-white border-0" :
                                  a === "reject" && reviewAction === "reject" ? "bg-red-600 hover:bg-red-700 text-white border-0" : ""
                                }`} variant={reviewAction === a ? "default" : "outline"}>
                                {a === "approve" ? <CheckCircle className="h-3.5 w-3.5 mr-1" /> :
                                 a === "conditional" ? <AlertCircle className="h-3.5 w-3.5 mr-1" /> :
                                 <XCircle className="h-3.5 w-3.5 mr-1" />}
                                {a.charAt(0).toUpperCase() + a.slice(1)}
                              </Button>
                            ))}
                          </div>
                          <Textarea
                            placeholder={reviewAction === "approve" ? "Optional note..." :
                              reviewAction === "conditional" ? "Explain conditions and limitations..." :
                              "Reason for rejection (required)..."}
                            value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                            className="text-sm" rows={3} />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleKycReview} className="flex-1">Submit Decision</Button>
                            <Button size="sm" variant="outline" onClick={() => setReviewId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline"
                          onClick={() => { setReviewId(dev.id); setReviewAction("approve"); setReviewNote(""); }}>
                          <Eye className="h-4 w-4 mr-2" /> Review Application
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Developer Detail Panel ── */}
        {(selectedDev || detailLoading) && (
          <div className="w-96 shrink-0">
            <div className="sticky top-4 bg-white border rounded-xl shadow-sm overflow-hidden">
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
                      <InfoPair label="KYB" value={
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${kycColor(selectedDev.developer.kycStatus)}`}>
                          {selectedDev.developer.kycStatus?.replace(/_/g, " ")}
                        </span>
                      } />
                      <InfoPair label="Wallet" value={`₦${parseFloat(selectedDev.developer.walletBalance || "0").toLocaleString()}`} />
                      <InfoPair label="Joined" value={new Date(selectedDev.developer.createdAt).toLocaleDateString()} />
                      <InfoPair label="Status" value={selectedDev.developer.isActive ? "Active" : "Inactive"} />
                      <InfoPair label="Type" value={selectedDev.developer.accountType || "individual"} />
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
                      <Button size="sm" className="w-full justify-between"
                        variant="outline"
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
                          const ts = (log as any).created_at ?? (log as any).createdAt ?? "";
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

function KybSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}{title}
      </div>
      <div className="px-3 py-2.5 space-y-1.5">{children}</div>
    </div>
  );
}

function KybRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right break-words">{value || "—"}</span>
    </div>
  );
}
