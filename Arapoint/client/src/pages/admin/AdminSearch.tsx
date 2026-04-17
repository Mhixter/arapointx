import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tokenStorage } from "@/lib/tokenStorage";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Search, Loader2, Users, Receipt, Package, LifeBuoy, Cpu,
  ArrowRight, User, Mail, Phone, Wallet, ShieldCheck, AlertCircle,
  Hash, Calendar, Tag, RefreshCw,
} from "lucide-react";

interface SearchResults {
  users: UserResult[];
  transactions: TxResult[];
  identityOrders: IdentityOrderResult[];
  educationOrders: EduOrderResult[];
  jambOrders: JambOrderResult[];
  supportTickets: TicketResult[];
  rpaJobs: RpaResult[];
}

interface Totals {
  users: number;
  transactions: number;
  orders: number;
  supportTickets: number;
  rpaJobs: number;
}

interface UserResult {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  walletBalance: string;
  kycStatus: string;
  emailVerified: boolean;
  isSuspended: boolean;
  createdAt: string;
}
interface TxResult {
  id: string;
  userId: string;
  transactionType: string;
  amount: string;
  referenceId: string | null;
  status: string;
  description: string | null;
  paymentMethod: string | null;
  createdAt: string;
}
interface IdentityOrderResult {
  id: string;
  userId: string;
  trackingId: string;
  serviceType: string;
  status: string;
  nin: string | null;
  validatedFullName: string | null;
  createdAt: string;
}
interface EduOrderResult {
  id: string;
  userId: string;
  trackingId: string;
  serviceType: string;
  status: string;
  registrationNumber: string | null;
  createdAt: string;
}
interface JambOrderResult {
  id: string;
  userId: string;
  trackingId: string;
  serviceType: string;
  status: string;
  registrationNumber: string | null;
  candidateName: string | null;
  createdAt: string;
}
interface TicketResult {
  id: string;
  userId: string;
  referenceId: string;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  createdAt: string;
}
interface RpaResult {
  id: string;
  userId: string;
  serviceType: string;
  status: string;
  retryCount: number;
  createdAt: string;
}

function statusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'completed': case 'success': case 'verified': case 'active': return 'bg-green-100 text-green-800 border-green-200';
    case 'pending': case 'processing': case 'open': case 'assigned': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'failed': case 'rejected': case 'suspended': return 'bg-red-100 text-red-800 border-red-200';
    case 'resolved': case 'closed': return 'bg-slate-100 text-slate-600 border-slate-200';
    default: return 'bg-blue-100 text-blue-800 border-blue-200';
  }
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtAmount(a: string) {
  return `₦${parseFloat(a || '0').toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

function truncateId(id: string) {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-6)}`;
}

function highlight(text: string, query: string) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function AdminSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [searchedQuery, setSearchedQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const totalCount = totals ? totals.users + totals.transactions + totals.orders + totals.supportTickets + totals.rpaJobs : 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q && q.length >= 2) {
      setQuery(q);
      setTimeout(() => {
        runSearch(q);
      }, 50);
    }
  }, []);

  async function runSearch(q: string) {
    if (!q || q.length < 2) return;
    setLoading(true);
    setResults(null);
    setTotals(null);
    try {
      const token = tokenStorage.getItem('adminToken');
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Search failed');
      setResults(data.data.results);
      setTotals(data.data.totals);
      setSearchedQuery(q);
      setActiveTab('all');
    } catch (err: any) {
      toast({ title: 'Search failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    if (q.length < 2) {
      toast({ title: 'Too short', description: 'Enter at least 2 characters to search.', variant: 'destructive' });
      return;
    }
    await runSearch(q);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch();
  }

  const orderResults = results ? [...results.identityOrders, ...results.educationOrders, ...results.jambOrders] : [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Search className="h-6 w-6 text-primary" />
          Global Search
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search across users, transactions, orders, and support tickets
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search by name, email, phone, reference ID, tracking ID, ticket ID…"
                className="pl-9 h-11 text-sm"
                autoFocus
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || query.trim().length < 2}
              className="h-11 px-5 shrink-0"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Search</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />Users: name · email · phone</span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1"><Receipt className="h-3 w-3" />Transactions: ID · reference</span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1"><Package className="h-3 w-3" />Orders: tracking ID</span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1"><LifeBuoy className="h-3 w-3" />Tickets: ticket ID · subject</span>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{totalCount}</span> result{totalCount !== 1 ? 's' : ''} for{' '}
              <span className="font-semibold text-foreground">"{searchedQuery}"</span>
            </p>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setResults(null); setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); }}>
              <RefreshCw className="h-3 w-3" />Clear
            </Button>
          </div>

          {totalCount === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-14 gap-3">
                <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">No results found for "{searchedQuery}"</p>
                <p className="text-xs text-muted-foreground">Try a different search term or check the spelling</p>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="all" className="text-xs h-8">
                  All <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{totalCount}</Badge>
                </TabsTrigger>
                {totals!.users > 0 && (
                  <TabsTrigger value="users" className="text-xs h-8">
                    Users <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{totals!.users}</Badge>
                  </TabsTrigger>
                )}
                {totals!.transactions > 0 && (
                  <TabsTrigger value="transactions" className="text-xs h-8">
                    Transactions <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{totals!.transactions}</Badge>
                  </TabsTrigger>
                )}
                {totals!.orders > 0 && (
                  <TabsTrigger value="orders" className="text-xs h-8">
                    Orders <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{totals!.orders}</Badge>
                  </TabsTrigger>
                )}
                {totals!.supportTickets > 0 && (
                  <TabsTrigger value="tickets" className="text-xs h-8">
                    Tickets <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{totals!.supportTickets}</Badge>
                  </TabsTrigger>
                )}
                {totals!.rpaJobs > 0 && (
                  <TabsTrigger value="rpa" className="text-xs h-8">
                    RPA Jobs <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{totals!.rpaJobs}</Badge>
                  </TabsTrigger>
                )}
              </TabsList>

              {/* ── All Tab ── */}
              <TabsContent value="all" className="mt-4 space-y-6">
                {results.users.length > 0 && <UserSection users={results.users} query={searchedQuery} navigate={navigate} />}
                {results.transactions.length > 0 && <TxSection txs={results.transactions} query={searchedQuery} navigate={navigate} />}
                {orderResults.length > 0 && <OrderSection identity={results.identityOrders} edu={results.educationOrders} jamb={results.jambOrders} query={searchedQuery} navigate={navigate} />}
                {results.supportTickets.length > 0 && <TicketSection tickets={results.supportTickets} query={searchedQuery} navigate={navigate} />}
                {results.rpaJobs.length > 0 && <RpaSection jobs={results.rpaJobs} query={searchedQuery} navigate={navigate} />}
              </TabsContent>

              <TabsContent value="users" className="mt-4">
                <UserSection users={results.users} query={searchedQuery} navigate={navigate} />
              </TabsContent>
              <TabsContent value="transactions" className="mt-4">
                <TxSection txs={results.transactions} query={searchedQuery} navigate={navigate} />
              </TabsContent>
              <TabsContent value="orders" className="mt-4">
                <OrderSection identity={results.identityOrders} edu={results.educationOrders} jamb={results.jambOrders} query={searchedQuery} navigate={navigate} />
              </TabsContent>
              <TabsContent value="tickets" className="mt-4">
                <TicketSection tickets={results.supportTickets} query={searchedQuery} navigate={navigate} />
              </TabsContent>
              <TabsContent value="rpa" className="mt-4">
                <RpaSection jobs={results.rpaJobs} query={searchedQuery} navigate={navigate} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}

      {/* Initial empty state */}
      {!results && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 gap-3">
            <Search className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">Enter a search term above to begin</p>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              You can search by user name, email, phone number, transaction reference, order tracking ID, or support ticket ID
            </p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center py-14 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Searching across all records…</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count, href, navigate }: { icon: any; title: string; count: number; href?: string; navigate: any }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-primary" />
        {title}
        <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1">{count}</Badge>
      </h3>
      {href && (
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate(href)}>
          View all <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function UserSection({ users, query, navigate }: { users: UserResult[]; query: string; navigate: any }) {
  return (
    <div>
      <SectionHeader icon={Users} title="Users" count={users.length} href="/admin/users" navigate={navigate} />
      <div className="space-y-2">
        {users.map(u => (
          <Card key={u.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/admin/users?search=${encodeURIComponent(u.email)}`)}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{highlight(u.name, query)}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />{highlight(u.email, query)}
                      </span>
                      {u.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{highlight(u.phone, query)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Wallet className="h-3 w-3" />{fmtAmount(u.walletBalance)}
                      </span>
                      <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${statusColor(u.kycStatus)}`}>{u.kycStatus}</span>
                      {u.isSuspended && <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${statusColor('suspended')}`}>Suspended</span>}
                      {u.emailVerified && <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${statusColor('verified')}`}>Verified</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end"><Calendar className="h-3 w-3" />{fmtDate(u.createdAt)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">{truncateId(u.id)}</p>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-1.5 ml-auto" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TxSection({ txs, query, navigate }: { txs: TxResult[]; query: string; navigate: any }) {
  return (
    <div>
      <SectionHeader icon={Receipt} title="Transactions" count={txs.length} href="/admin/transactions" navigate={navigate} />
      <div className="space-y-2">
        {txs.map(tx => (
          <Card key={tx.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/admin/transactions?search=${encodeURIComponent(tx.referenceId || tx.id)}`)}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Receipt className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold capitalize">{tx.transactionType?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{tx.description || 'No description'}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                      <span className="text-sm font-bold text-foreground">{fmtAmount(tx.amount)}</span>
                      {tx.referenceId && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                          <Hash className="h-3 w-3" />{highlight(tx.referenceId, query)}
                        </span>
                      )}
                      {tx.paymentMethod && <span className="text-[10px] text-muted-foreground capitalize">{tx.paymentMethod}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${statusColor(tx.status)}`}>{tx.status}</span>
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 justify-end"><Calendar className="h-3 w-3" />{fmtDate(tx.createdAt)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{truncateId(tx.id)}</p>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-1.5 ml-auto" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function OrderRow({ label, trackingId, serviceType, status, subtitle, query, href, navigate }: {
  label: string; trackingId: string; serviceType: string; status: string; subtitle?: string | null; query: string; href: string; navigate: any;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(href)}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{highlight(trackingId, query)}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{serviceType?.replace(/_/g, ' ')} · {label}</p>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{highlight(subtitle, query)}</p>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${statusColor(status)}`}>{status}</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-2 ml-auto" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OrderSection({ identity, edu, jamb, query, navigate }: {
  identity: IdentityOrderResult[]; edu: EduOrderResult[]; jamb: JambOrderResult[]; query: string; navigate: any;
}) {
  const total = identity.length + edu.length + jamb.length;
  return (
    <div>
      <SectionHeader icon={Package} title="Orders" count={total} navigate={navigate} />
      <div className="space-y-2">
        {identity.map(o => (
          <OrderRow key={o.id} label="Identity" trackingId={o.trackingId} serviceType={o.serviceType} status={o.status}
            subtitle={o.validatedFullName || o.nin} query={query} href="/admin/identity" navigate={navigate} />
        ))}
        {edu.map(o => (
          <OrderRow key={o.id} label="Education" trackingId={o.trackingId} serviceType={o.serviceType} status={o.status}
            subtitle={o.registrationNumber} query={query} href="/admin/education" navigate={navigate} />
        ))}
        {jamb.map(o => (
          <OrderRow key={o.id} label="JAMB" trackingId={o.trackingId} serviceType={o.serviceType} status={o.status}
            subtitle={o.candidateName || o.registrationNumber} query={query} href="/admin/education" navigate={navigate} />
        ))}
      </div>
    </div>
  );
}

function TicketSection({ tickets, query, navigate }: { tickets: TicketResult[]; query: string; navigate: any }) {
  return (
    <div>
      <SectionHeader icon={LifeBuoy} title="Support Tickets" count={tickets.length} href="/admin/support" navigate={navigate} />
      <div className="space-y-2">
        {tickets.map(t => (
          <Card key={t.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/support')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <LifeBuoy className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{highlight(t.subject, query)}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                        <Hash className="h-3 w-3" />{highlight(t.referenceId, query)}
                      </span>
                      {t.category && <span className="flex items-center gap-1 text-[11px] text-muted-foreground capitalize"><Tag className="h-3 w-3" />{t.category}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${statusColor(t.status)}`}>{t.status?.replace(/_/g, ' ')}</span>
                    {t.priority !== 'normal' && <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${statusColor(t.priority)}`}>{t.priority}</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 justify-end"><Calendar className="h-3 w-3" />{fmtDate(t.createdAt)}</p>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-1 ml-auto" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RpaSection({ jobs, query, navigate }: { jobs: RpaResult[]; query: string; navigate: any }) {
  return (
    <div>
      <SectionHeader icon={Cpu} title="RPA Jobs" count={jobs.length} href="/admin/rpa-jobs" navigate={navigate} />
      <div className="space-y-2">
        {jobs.map(j => (
          <Card key={j.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/rpa-jobs')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Cpu className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold capitalize">{j.serviceType?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{highlight(j.id, query)}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Retry {j.retryCount} · {fmtDate(j.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${statusColor(j.status)}`}>{j.status}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-2 ml-auto" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
