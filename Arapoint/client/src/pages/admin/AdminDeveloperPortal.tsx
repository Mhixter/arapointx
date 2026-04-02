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
  Users, Activity, DollarSign, CheckCircle, XCircle, Clock, Eye, Search,
  RefreshCw, ShieldCheck, FileText, AlertCircle
} from "lucide-react";

function adminFetch(path: string, options?: RequestInit) {
  const token = tokenStorage.getItem("adminToken");
  return fetch(`/api/v1/developer${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options?.headers },
  });
}

interface DevStats {
  apiCalls: {
    active_developers: number;
    total_api_calls: number;
    total_revenue: number;
    success_calls: number;
    calls_today: number;
  };
  developerStats: {
    total_developers: number;
    active_developers: number;
    pending_kyc: number;
  };
}

interface Developer {
  id: string;
  email: string;
  name: string;
  company?: string;
  walletBalance: string;
  isActive: boolean;
  emailVerified: boolean;
  accountType: string;
  kycStatus: string;
  kycSubmittedAt?: string;
  createdAt: string;
}

interface ApiLog {
  id: string;
  developerId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  cost: string;
  durationMs: number;
  ipAddress: string;
  createdAt: string;
}

export default function AdminDeveloperPortal() {
  const { toast } = useToast();
  const [stats, setStats] = useState<DevStats | null>(null);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [kycQueue, setKycQueue] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewNote, setReviewNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [logsPage, setLogsPage] = useState(1);
  const [devsPage, setDevsPage] = useState(1);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, devsRes, logsRes, kycRes] = await Promise.all([
        adminFetch("/admin/stats"),
        adminFetch(`/admin/developers?page=${devsPage}`),
        adminFetch(`/admin/logs?page=${logsPage}`),
        adminFetch("/admin/kyc?status=submitted"),
      ]);
      const [statsData, devsData, logsData, kycData] = await Promise.all([
        statsRes.json(), devsRes.json(), logsRes.json(), kycRes.json()
      ]);
      if (statsData.status === "success") setStats(statsData.data);
      if (devsData.status === "success") setDevelopers(devsData.data.developers);
      if (logsData.status === "success") setLogs(logsData.data.logs);
      if (kycData.status === "success") setKycQueue(kycData.data.developers);
    } catch (e) {
      toast({ title: "Error", description: "Failed to load developer portal data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [devsPage, logsPage]);

  const handleKycReview = async () => {
    if (!reviewId) return;
    try {
      const res = await adminFetch(`/admin/kyc/${reviewId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: reviewAction, note: reviewNote }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: "KYC Updated", description: `KYC ${reviewAction}d successfully` });
        setReviewId(null);
        setReviewNote("");
        loadAll();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update KYC", variant: "destructive" });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await adminFetch(`/admin/developers/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: "Updated", description: `Developer ${!currentStatus ? "activated" : "deactivated"}` });
        loadAll();
      }
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const filteredDevs = developers.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.company || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const kycStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "submitted": return "bg-yellow-100 text-yellow-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Developer Portal</h1>
          <p className="text-muted-foreground text-sm">Monitor API usage, manage developers and KYC</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Developers</p>
                  <p className="text-2xl font-bold">{stats.developerStats.total_developers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total API Calls</p>
                  <p className="text-2xl font-bold">{stats.apiCalls.total_api_calls?.toLocaleString() || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">₦{parseFloat(stats.apiCalls.total_revenue || "0").toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending KYC</p>
                  <p className="text-2xl font-bold">{stats.developerStats.pending_kyc || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="developers">
        <TabsList>
          <TabsTrigger value="developers">
            <Users className="h-4 w-4 mr-2" />
            Developers ({developers.length})
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Activity className="h-4 w-4 mr-2" />
            API Logs
          </TabsTrigger>
          <TabsTrigger value="kyc">
            <ShieldCheck className="h-4 w-4 mr-2" />
            KYC Review {kycQueue.length > 0 && <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">{kycQueue.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="developers" className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or company..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Developer</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Account Type</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">KYC</th>
                  <th className="text-right p-3 font-medium">Wallet</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevs.map(dev => (
                  <tr key={dev.id} className="border-t hover:bg-muted/50">
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{dev.name}</p>
                        <p className="text-xs text-muted-foreground">{dev.email}</p>
                        {dev.company && <p className="text-xs text-muted-foreground">{dev.company}</p>}
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <Badge variant="outline" className="capitalize">{dev.accountType || "individual"}</Badge>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${kycStatusColor(dev.kycStatus)}`}>
                        {dev.kycStatus?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3 text-right">₦{parseFloat(dev.walletBalance || "0").toLocaleString()}</td>
                    <td className="p-3">
                      {dev.isActive ? (
                        <Badge className="bg-green-100 text-green-800 border-0">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm" variant="outline"
                        onClick={() => handleToggleStatus(dev.id, dev.isActive)}
                        className="text-xs"
                      >
                        {dev.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredDevs.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No developers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Page {devsPage}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={devsPage <= 1} onClick={() => setDevsPage(p => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={developers.length < 20} onClick={() => setDevsPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Endpoint</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Status</th>
                  <th className="text-right p-3 font-medium hidden md:table-cell">Cost</th>
                  <th className="text-right p-3 font-medium hidden md:table-cell">Duration</th>
                  <th className="text-right p-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-t hover:bg-muted/50">
                    <td className="p-3">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded mr-2">{log.method}</span>
                      {log.endpoint}
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      {log.statusCode >= 200 && log.statusCode < 300 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : log.statusCode >= 400 ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                    </td>
                    <td className="p-3 text-right hidden md:table-cell">
                      {parseFloat(log.cost || "0") > 0 ? `₦${parseFloat(log.cost).toLocaleString()}` : "-"}
                    </td>
                    <td className="p-3 text-right hidden md:table-cell">{log.durationMs}ms</td>
                    <td className="p-3 text-right text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No logs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Page {logsPage}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={logsPage <= 1} onClick={() => setLogsPage(p => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={logs.length < 50} onClick={() => setLogsPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="kyc" className="space-y-4">
          {kycQueue.length === 0 ? (
            <Card>
              <CardContent className="pt-8 pb-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-medium">No pending KYC reviews</p>
                <p className="text-sm text-muted-foreground">All KYC submissions have been reviewed</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {kycQueue.map(dev => (
                <Card key={dev.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{dev.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{dev.email} {dev.company && `· ${dev.company}`}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="capitalize">{dev.accountType}</Badge>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${kycStatusColor(dev.kycStatus)}`}>
                            {dev.kycStatus?.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {dev.kycSubmittedAt ? new Date(dev.kycSubmittedAt).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dev.kycDocuments && (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-1"><FileText className="h-4 w-4" /> Submitted Documents</p>
                        <div className="bg-muted rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {JSON.stringify(dev.kycDocuments, null, 2)}
                        </div>
                      </div>
                    )}

                    {reviewId === dev.id ? (
                      <div className="space-y-3 border-t pt-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={reviewAction === "approve" ? "default" : "outline"}
                            onClick={() => setReviewAction("approve")}
                            className="flex-1"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant={reviewAction === "reject" ? "destructive" : "outline"}
                            onClick={() => setReviewAction("reject")}
                            className="flex-1"
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                        <Textarea
                          placeholder="Review note (optional for approval, recommended for rejection)"
                          value={reviewNote}
                          onChange={e => setReviewNote(e.target.value)}
                          className="text-sm"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleKycReview} className="flex-1">
                            Submit Review
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setReviewId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setReviewId(dev.id); setReviewAction("approve"); setReviewNote(""); }}>
                        <Eye className="h-4 w-4 mr-2" /> Review KYC
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
