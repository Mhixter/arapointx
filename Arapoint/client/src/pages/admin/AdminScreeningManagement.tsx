import { useState, useEffect } from "react";
import {
  BarChart3, Search, Filter, AlertTriangle, CheckCircle, Clock, XCircle,
  Eye, MoreVertical, Download, RotateCcw, FileText, Mail, Phone, MapPin,
  TrendingUp, Users, DollarSign, Zap, RefreshCw, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API_BASE = "/api/admin/screening";

export default function AdminScreeningManagement() {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [screenings, setScreenings] = useState<any[]>([]);
  const [failedEducationChecks, setFailedEducationChecks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"orgs" | "screenings" | "failed-edu">("orgs");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedScreening, setSelectedScreening] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showManualReviewDialog, setShowManualReviewDialog] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [selectedFailedCheck, setSelectedFailedCheck] = useState<any>(null);
  const [manualDecision, setManualDecision] = useState<"pass" | "fail" | "review">("review");
  const [manualNotes, setManualNotes] = useState("");
  const [overrideDecision, setOverrideDecision] = useState<"pass" | "fail">("pass");
  const [overrideNotes, setOverrideNotes] = useState("");

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch organizations
      const orgsRes = await fetch(`${API_BASE}/organizations`, { headers });
      if (orgsRes.ok) {
        const data = await orgsRes.json();
        setOrganizations(data.data || []);
      }

      // Fetch stats
      const statsRes = await fetch(`${API_BASE}/stats`, { headers });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data || {});
      }

      // Fetch failed education checks
      const failedRes = await fetch(`${API_BASE}/failed-education-checks`, { headers });
      if (failedRes.ok) {
        const data = await failedRes.json();
        setFailedEducationChecks(data.data || []);
      }
    } catch (err) {
      toast({ title: "Failed to fetch data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch screenings for selected org
  useEffect(() => {
    if (selectedOrg && activeTab === "screenings") {
      fetchScreenings();
    }
  }, [selectedOrg, activeTab, filterStatus]);

  const fetchScreenings = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const url = new URL(`${API_BASE}/screenings`, window.location.origin);
      url.searchParams.set("orgId", selectedOrg);
      if (filterStatus !== "all") url.searchParams.set("status", filterStatus);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setScreenings(data.data || []);
      }
    } catch (err) {
      toast({ title: "Failed to fetch screenings", variant: "destructive" });
    }
  };

  const handleManualReview = async () => {
    if (!selectedScreening) return;

    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE}/screenings/${selectedScreening.id}/manual-review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision: manualDecision,
          notes: manualNotes,
          reviewedAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        toast({ title: "Manual review completed", description: "Screening decision updated" });
        setShowManualReviewDialog(false);
        setManualNotes("");
        fetchScreenings();
      } else {
        throw new Error("Failed to save review");
      }
    } catch (err: any) {
      toast({ title: "Failed to save review", description: err.message, variant: "destructive" });
    }
  };

  const handleRetryEducationCheck = async (checkId: string) => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE}/failed-education-checks/${checkId}/retry`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast({ title: "Retry initiated", description: "Education check will be retried" });
        fetchAllData();
      }
    } catch (err: any) {
      toast({ title: "Failed to retry", description: err.message, variant: "destructive" });
    }
  };

  const handleOverrideEducationCheck = async () => {
    if (!selectedFailedCheck) return;

    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE}/failed-education-checks/${selectedFailedCheck.id}/override`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision: overrideDecision,
          notes: overrideNotes,
        }),
      });

      if (res.ok) {
        toast({ title: "Manual override applied", description: "Screening updated with manual decision" });
        setShowOverrideDialog(false);
        setOverrideNotes("");
        fetchAllData();
      }
    } catch (err: any) {
      toast({ title: "Failed to apply override", description: err.message, variant: "destructive" });
    }
  };

  // Filter screenings
  const filteredScreenings = screenings.filter(s =>
    searchTerm === "" || s.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nin?.includes(searchTerm) || s.bvn?.includes(searchTerm)
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "fail": return <XCircle className="w-4 h-4 text-red-600" />;
      case "review": return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case "pending": return <Clock className="w-4 h-4 text-blue-600" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employment Screening Management</h1>
          <p className="text-gray-600 mt-1">Monitor organizations, screenings, and manual reviews</p>
        </div>
        <Button onClick={fetchAllData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && activeTab === "orgs" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Organizations", value: stats.totalOrganizations, icon: Users, color: "bg-blue-50" },
            { label: "Total Screenings", value: stats.totalScreenings, icon: BarChart3, color: "bg-purple-50" },
            { label: "Pass Rate", value: `${stats.passRate}%`, icon: TrendingUp, color: "bg-green-50" },
            { label: "Failed Edu Checks", value: stats.failedEducationChecks, icon: AlertTriangle, color: "bg-red-50" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className={`${stat.color} rounded-lg p-4 border border-gray-200`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <Icon className="w-8 h-8 text-gray-400" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setSearchTerm(""); }} className="bg-white rounded-lg border border-gray-200">
        <TabsList className="w-full justify-start border-b border-gray-200 rounded-none bg-gray-50 p-0">
          <TabsTrigger value="orgs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-white">
            <Users className="w-4 h-4 mr-2" /> Organizations
          </TabsTrigger>
          <TabsTrigger value="screenings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-white">
            <BarChart3 className="w-4 h-4 mr-2" /> Screenings
          </TabsTrigger>
          <TabsTrigger value="failed-edu" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-white">
            <AlertTriangle className="w-4 h-4 mr-2" /> Failed Checks
          </TabsTrigger>
        </TabsList>

        {/* ORGANIZATIONS TAB */}
        <TabsContent value="orgs" className="m-0">
          <div className="p-4 flex items-center gap-2 border-b border-gray-200">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by organization name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 focus:ring-0 text-sm"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-gray-700">Organization</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-700">Email</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-700">Screenings</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-700">Wallet</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations
                  .filter(o => searchTerm === "" || o.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) || o.email?.includes(searchTerm))
                  .map(org => (
                    <tr key={org.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{org.organizationName}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{org.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          org.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {org.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{org.screeningCount || 0}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">₦{parseFloat(org.walletBalance || "0").toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedOrg(org.id); setActiveTab("screenings"); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* SCREENINGS TAB */}
        <TabsContent value="screenings" className="m-0">
          <div className="space-y-4 p-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label className="text-sm font-medium text-gray-700">Organization</Label>
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>{org.organizationName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Status Filter</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["all", "pass", "fail", "review", "pending"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 flex items-center gap-2 border-b border-gray-200">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by candidate name, NIN, BVN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0 focus:ring-0 text-sm"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 font-semibold text-gray-700">Candidate</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-700">ID</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-700">Decision</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-700">Score</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-700">Date</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScreenings.map(screening => (
                      <tr key={screening.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{screening.candidateName}</td>
                        <td className="px-6 py-4 text-gray-600 text-xs font-mono">
                          {screening.nin?.slice(-4) || "—"} / {screening.bvn?.slice(-4) || "—"}
                        </td>
                        <td className="px-6 py-4 flex items-center gap-2">
                          {getStatusIcon(screening.decision)}
                          <span className="capitalize font-medium text-gray-900">{screening.decision}</span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{screening.score}/100</td>
                        <td className="px-6 py-4 text-gray-600 text-xs">{new Date(screening.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedScreening(screening); setShowDetailDialog(true); }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {screening.decision === "review" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedScreening(screening); setShowManualReviewDialog(true); }}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* FAILED EDUCATION CHECKS TAB */}
        <TabsContent value="failed-edu" className="m-0">
          <div className="border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold text-gray-700">Candidate</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-700">Exam Type</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-700">Error</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-700">Attempts</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {failedEducationChecks.map(check => (
                    <tr key={check.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{check.candidateName}</td>
                      <td className="px-6 py-4 text-gray-600">{check.examType}</td>
                      <td className="px-6 py-4 text-red-600 text-xs">{check.errorMessage?.slice(0, 40)}...</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{check.retryCount}/{check.maxRetries}</td>
                      <td className="px-6 py-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={check.retryCount >= check.maxRetries}
                          onClick={() => handleRetryEducationCheck(check.id)}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedFailedCheck(check); setShowOverrideDialog(true); }}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Screening Details</DialogTitle>
          </DialogHeader>
          {selectedScreening && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Candidate</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedScreening.candidateName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Decision</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedScreening.decision)}
                    <span className="capitalize font-semibold text-gray-900">{selectedScreening.decision}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Score</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedScreening.score}/100</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Created</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{new Date(selectedScreening.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Review Dialog */}
      <Dialog open={showManualReviewDialog} onOpenChange={setShowManualReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Review</DialogTitle>
            <DialogDescription>Review {selectedScreening?.candidateName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Decision</Label>
              <Select value={manualDecision} onValueChange={v => setManualDecision(v as any)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="review">Needs Review</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Notes</Label>
              <textarea
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Add review notes..."
                className="w-full mt-1 p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
            <Button onClick={handleManualReview} className="w-full bg-blue-700 hover:bg-blue-800 text-white">
              Submit Review
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Override Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Override</DialogTitle>
            <DialogDescription>Override education check for {selectedFailedCheck?.candidateName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Decision</Label>
              <Select value={overrideDecision} onValueChange={v => setOverrideDecision(v as any)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Notes</Label>
              <textarea
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="Explain the manual override..."
                className="w-full mt-1 p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
            <Button onClick={handleOverrideEducationCheck} className="w-full bg-blue-700 hover:bg-blue-800 text-white">
              Apply Override
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}