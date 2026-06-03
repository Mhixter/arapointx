import { useState, useEffect } from "react";
import { tokenStorage } from "@/lib/tokenStorage";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2, Search, RefreshCw, Wallet, Users, Activity,
  TrendingUp, Eye, CheckCircle, XCircle, Clock, DollarSign,
  ChevronRight, ArrowLeft, AlertCircle, CreditCard, Ban
} from "lucide-react";

function adminFetch(path: string, options?: RequestInit) {
  const token = tokenStorage.getItem("adminToken");
  return fetch(`/api/admin${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
}

function fmt(n: number | string) {
  return Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgo(date: string) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Org = {
  id: string;
  name?: string;
  organization_name?: string;
  email: string;
  industry?: string;
  wallet_balance?: string;
  is_active?: boolean;
  status?: string;
  created_at?: string;
  screeningCount?: number;
};

type OrgDetail = {
  organization: any;
  transactions: any[];
  recentScreenings: any[];
};

export default function AdminScreeningOrgs() {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<OrgDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "screenings" | "transactions">("overview");
  const [fundDialog, setFundDialog] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [fundNote, setFundNote] = useState("");
  const [funding, setFunding] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const [orgsRes, statsRes] = await Promise.all([
        adminFetch("/screening/organizations"),
        adminFetch("/screening/stats"),
      ]);
      const [od, sd] = await Promise.all([orgsRes.json(), statsRes.json()]);
      if (od.status === "success") setOrgs(od.data);
      if (sd.status === "success") setStats(sd.data);
    } catch (e: any) {
      toast({ title: "Failed to load organizations", variant: "destructive" });
    }
    setLoading(false);
  };

  const openDetail = async (org: Org) => {
    setDetailLoading(true);
    setSelectedOrg(null);
    setActiveTab("overview");
    try {
      const res = await adminFetch(`/screening/organizations/${org.id}`);
      const data = await res.json();
      if (data.status === "success") setSelectedOrg(data.data);
    } catch {
      toast({ title: "Failed to load details", variant: "destructive" });
    }
    setDetailLoading(false);
  };

  const handleFund = async () => {
    if (!selectedOrg || !fundAmount || Number(fundAmount) <= 0) return;
    setFunding(true);
    try {
      const res = await adminFetch(`/screening/organizations/${selectedOrg.organization.id}/fund`, {
        method: "POST",
        body: JSON.stringify({ amount: Number(fundAmount), note: fundNote || undefined }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: "Wallet funded", description: `New balance: ₦${fmt(data.data.newBalance)}` });
        setFundDialog(false);
        setFundAmount("");
        setFundNote("");
        openDetail({ id: selectedOrg.organization.id } as Org);
        fetchOrgs();
      } else {
        toast({ title: "Fund failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Fund failed", variant: "destructive" });
    }
    setFunding(false);
  };

  const handleStatusToggle = async () => {
    if (!selectedOrg) return;
    const org = selectedOrg.organization;
    const newStatus = org.is_active ? "suspended" : "active";
    try {
      const res = await adminFetch(`/screening/organizations/${org.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: `Organization ${newStatus}` });
        openDetail({ id: org.id } as Org);
        fetchOrgs();
      }
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  useEffect(() => { fetchOrgs(); }, []);

  const filtered = orgs.filter(o => {
    const name = (o.name || o.organization_name || "").toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || o.email.toLowerCase().includes(q) || (o.industry || "").toLowerCase().includes(q);
  });

  const orgName = (o: any) => o?.name || o?.organization_name || "—";
  const isActive = (o: any) => o?.is_active !== false && o?.status !== "suspended";

  const decisionBadge = (d: string) => {
    if (d === "pass") return <Badge className="bg-emerald-100 text-emerald-800 text-xs">Pass</Badge>;
    if (d === "fail") return <Badge className="bg-red-100 text-red-800 text-xs">Fail</Badge>;
    if (d === "review") return <Badge className="bg-amber-100 text-amber-800 text-xs">Review</Badge>;
    return <Badge variant="outline" className="text-xs">{d || "Pending"}</Badge>;
  };

  if (selectedOrg !== null || detailLoading) {
    const org = selectedOrg?.organization;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setSelectedOrg(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to list
          </Button>
          {org && (
            <div className="flex items-center gap-2 ml-auto">
              <Button
                size="sm"
                variant="outline"
                className={isActive(org) ? "text-red-600 border-red-300 hover:bg-red-50" : "text-emerald-600 border-emerald-300 hover:bg-emerald-50"}
                onClick={handleStatusToggle}
              >
                {isActive(org) ? <><Ban className="w-4 h-4 mr-1" />Suspend</> : <><CheckCircle className="w-4 h-4 mr-1" />Activate</>}
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setFundDialog(true)}>
                <Wallet className="w-4 h-4 mr-1" /> Fund Wallet
              </Button>
            </div>
          )}
        </div>

        {detailLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : org ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">{orgName(org)}</h2>
                      <Badge className={isActive(org) ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                        {isActive(org) ? "Active" : "Suspended"}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{org.email}</p>
                    <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-600 dark:text-slate-400">
                      {org.industry && <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" />{org.industry}</span>}
                      {org.size && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{org.size}</span>}
                      {org.phone && <span>{org.phone}</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Joined {org.created_at ? new Date(org.created_at).toLocaleDateString() : "—"}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-6 text-white">
                <p className="text-emerald-100 text-sm font-medium mb-1">Wallet Balance</p>
                <p className="text-3xl font-bold">₦{fmt(org.wallet_balance || 0)}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 border-white/40 text-white hover:bg-white/10 w-full"
                  onClick={() => setFundDialog(true)}
                >
                  <DollarSign className="w-4 h-4 mr-1" /> Add Funds
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Screenings", value: org.total_screenings || 0, icon: Activity, color: "blue" },
                { label: "Passed", value: org.pass_count || 0, icon: CheckCircle, color: "emerald" },
                { label: "Failed", value: org.fail_count || 0, icon: XCircle, color: "red" },
                { label: "Team Members", value: org.team_members || 0, icon: Users, color: "purple" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-${color}-100 dark:bg-${color}-900/30`}>
                    <Icon className={`w-4 h-4 text-${color}-600`} />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{Number(value).toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex gap-0 border-b border-slate-200 dark:border-slate-700">
                {(["overview", "screenings", "transactions"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-3 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? "border-b-2 border-emerald-600 text-emerald-600"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {activeTab === "overview" && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Screenings</h3>
                    {!selectedOrg?.recentScreenings?.length ? (
                      <p className="text-sm text-slate-400 py-4 text-center">No screenings yet</p>
                    ) : (
                      selectedOrg.recentScreenings.slice(0, 5).map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-700">
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{s.full_name}</p>
                            <p className="text-xs text-slate-400">{s.created_at ? timeAgo(s.created_at) : "—"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {s.overall_score != null && (
                              <span className="text-xs text-slate-500">{s.overall_score}%</span>
                            )}
                            {decisionBadge(s.decision)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === "screenings" && (
                  <div className="space-y-2">
                    {!selectedOrg?.recentScreenings?.length ? (
                      <p className="text-sm text-slate-400 py-8 text-center">No screenings yet</p>
                    ) : (
                      selectedOrg.recentScreenings.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{s.full_name}</p>
                            <p className="text-xs text-slate-500 capitalize">{s.status} · {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {s.overall_score != null && (
                              <div className="text-right">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{s.overall_score}%</p>
                                <p className="text-xs text-slate-400">score</p>
                              </div>
                            )}
                            {decisionBadge(s.decision)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === "transactions" && (
                  <div className="space-y-2">
                    {!selectedOrg?.transactions?.length ? (
                      <p className="text-sm text-slate-400 py-8 text-center">No transactions yet</p>
                    ) : (
                      selectedOrg.transactions.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              t.type === "credit" ? "bg-emerald-100" : "bg-red-100"
                            }`}>
                              {t.type === "credit"
                                ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                                : <CreditCard className="w-4 h-4 text-red-600" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">{t.description || t.type}</p>
                              <p className="text-xs text-slate-400">{t.created_at ? timeAgo(t.created_at) : "—"}</p>
                            </div>
                          </div>
                          <p className={`text-sm font-bold ${t.type === "credit" ? "text-emerald-600" : "text-red-600"}`}>
                            {t.type === "credit" ? "+" : "-"}₦{fmt(t.amount || 0)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}

        <Dialog open={fundDialog} onOpenChange={setFundDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Fund Organization Wallet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-semibold text-slate-600">Amount (₦)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 50000"
                  value={fundAmount}
                  onChange={e => setFundAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">Note (optional)</Label>
                <Input
                  placeholder="e.g. Monthly credit"
                  value={fundNote}
                  onChange={e => setFundNote(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFundDialog(false)}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!fundAmount || Number(fundAmount) <= 0 || funding}
                onClick={handleFund}
              >
                {funding ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Wallet className="w-4 h-4 mr-2" />}
                Fund ₦{Number(fundAmount || 0).toLocaleString()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Screening Organizations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage organizations on the employment screening platform</p>
        </div>
        <Button variant="outline" onClick={fetchOrgs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Organizations", value: stats.totalOrganizations, icon: Building2, color: "blue" },
            { label: "Total Screenings", value: stats.totalScreenings, icon: Activity, color: "purple" },
            { label: "Pass Rate", value: `${stats.passRate || 0}%`, icon: TrendingUp, color: "emerald" },
            { label: "Pending Reviews", value: stats.reviewScreenings, icon: AlertCircle, color: "amber" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-${color}-100 dark:bg-${color}-900/30`}>
                <Icon className={`w-4 h-4 text-${color}-600`} />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search orgs…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <p className="text-sm text-slate-500 ml-auto">{filtered.length} organization{filtered.length !== 1 ? "s" : ""}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Building2 className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No organizations found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map(org => (
              <button
                key={org.id}
                onClick={() => openDetail(org)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{orgName(org)}</p>
                    <Badge className={`text-xs ${isActive(org) ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {isActive(org) ? "Active" : "Suspended"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{org.email} {org.industry ? `· ${org.industry}` : ""}</p>
                </div>
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    ₦{fmt(org.wallet_balance || 0)}
                  </p>
                  <p className="text-xs text-slate-400">{org.screeningCount ?? 0} screenings</p>
                </div>
                <div className="text-right flex-shrink-0 ml-1 sm:ml-3">
                  <p className="text-xs text-slate-400 mb-1">
                    {org.created_at ? new Date(org.created_at).toLocaleDateString() : "—"}
                  </p>
                  <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
