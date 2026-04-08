import { useState, useEffect, useCallback } from "react";
import { tokenStorage } from "@/lib/tokenStorage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Search, RefreshCw, ChevronLeft, ChevronRight, Monitor, Smartphone, Globe } from "lucide-react";
import { format } from "date-fns";

interface LoginActivity {
  id: string;
  actorType: string;
  actorId: string | null;
  actorEmail: string;
  actorName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  status: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ACTOR_TYPE_COLORS: Record<string, string> = {
  user: "bg-blue-100 text-blue-700",
  admin: "bg-purple-100 text-purple-700",
  agent: "bg-orange-100 text-orange-700",
  developer: "bg-green-100 text-green-700",
};

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function DeviceIcon({ device }: { device: string | null }) {
  const d = (device || "").toLowerCase();
  if (d.includes("mobile") || d.includes("phone")) return <Smartphone className="h-4 w-4 text-muted-foreground" />;
  if (d.includes("tablet")) return <Smartphone className="h-4 w-4 text-muted-foreground" />;
  if (d.includes("desktop") || d.includes("pc")) return <Monitor className="h-4 w-4 text-muted-foreground" />;
  return <Globe className="h-4 w-4 text-muted-foreground" />;
}

export default function AdminLoginActivity() {
  const [activities, setActivities] = useState<LoginActivity[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [actorType, setActorType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const token = tokenStorage.getItem("adminToken");
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (actorType && actorType !== "all") params.set("actorType", actorType);
      if (search.trim()) params.set("search", search.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/admin/login-activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200) {
        setActivities(json.data.data);
        setPagination(json.data.pagination);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, actorType, search, from, to]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchActivities();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Login Activity</h1>
          <p className="text-sm text-muted-foreground">Track all login events across users, admins, agents, and developers</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name or IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actorType} onValueChange={(v) => { setActorType(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Actor type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              className="w-40"
              placeholder="From"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
              className="w-40"
              placeholder="To"
            />
            <Button type="submit" variant="default" size="default">Search</Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => { setSearch(""); setActorType("all"); setFrom(""); setTo(""); setPage(1); }}
              title="Reset filters"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-lg overflow-hidden border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Actor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Device / Browser</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No login activities found.
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((a) => (
                    <TableRow key={a.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="font-medium text-sm">{a.actorName || "—"}</div>
                        <div className="text-xs text-muted-foreground">{a.actorEmail}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTOR_TYPE_COLORS[a.actorType] || "bg-gray-100 text-gray-700"}`}>
                          {a.actorType}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{a.ipAddress || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <DeviceIcon device={a.device} />
                          <span className="text-sm">{a.device || "Unknown"}</span>
                          {a.browser && <span className="text-xs text-muted-foreground">· {a.browser}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{a.os || "—"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[a.status] || "bg-gray-100 text-gray-700"}`}>
                          {a.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(a.createdAt), "dd MMM yyyy, HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Page {pagination.page} of {pagination.pages}</span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
