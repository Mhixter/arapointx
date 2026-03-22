import { tokenStorage } from '@/lib/tokenStorage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ArrowDownRight, ArrowUpRight, Loader2, Search, Filter, CreditCard,
  TrendingUp, TrendingDown, Receipt, Copy, CheckCircle2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  description: string;
  amount: number;
  status: string;
  date: string;
  reference: string;
}

function getStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'successful':
    case 'success': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
    case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400';
    case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  }
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-NG', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-NG', {
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TransactionHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);
  const limit = 20;

  const getAuthToken = () => tokenStorage.getItem('accessToken');

  const fetchTransactions = async (): Promise<{ transactions: Transaction[], total: number }> => {
    const token = getAuthToken();
    if (!token) return { transactions: [], total: 0 };
    const res = await fetch(`/api/dashboard/transactions?page=${page}&limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return { transactions: [], total: 0 };
    const data = await res.json();
    return {
      transactions: data.data?.transactions || [],
      total: data.data?.total || 0,
    };
  };

  const { data, isLoading } = useQuery({
    queryKey: ['all-transactions', page],
    queryFn: fetchTransactions,
    staleTime: 10000,
  });

  const transactions = data?.transactions || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const filtered = transactions.filter(tx => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || tx.description.toLowerCase().includes(q) || tx.reference?.toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || tx.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalCredits = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalDebits = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">View and track all your wallet transactions</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm ring-1 ring-border/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-border/50 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Credits</p>
                <p className="text-lg font-bold text-green-600">₦{totalCredits.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-border/50 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Debits</p>
                <p className="text-lg font-bold text-red-600">₦{totalDebits.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border/50">
        <CardHeader className="px-5 py-4 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">All Transactions</CardTitle>
              <CardDescription className="text-xs mt-0.5">Tap any row to view full details</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 w-40 text-sm"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit">Credits</SelectItem>
                  <SelectItem value="debit">Debits</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-muted-foreground">
              <CreditCard className="h-10 w-10 opacity-25" />
              <p className="text-sm font-medium">No transactions found</p>
              <p className="text-xs">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map(tx => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors group"
                  onClick={() => setSelectedTx(tx)}
                >
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    tx.type === 'credit' ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'
                  }`}>
                    {tx.type === 'credit'
                      ? <ArrowDownRight className="h-4 w-4 text-green-600" />
                      : <ArrowUpRight className="h-4 w-4 text-red-600" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatShortDate(tx.date)}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-xs text-muted-foreground">{formatTime(tx.date)}</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-slate-800 dark:text-white'}`}>
                      {tx.type === 'credit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getStatusStyle(tx.status)}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t bg-muted/10">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages} · {total} total</p>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs px-3"
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs px-3"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedTx} onOpenChange={open => !open && setSelectedTx(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                selectedTx?.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {selectedTx?.type === 'credit'
                  ? <ArrowDownRight className="h-4 w-4 text-green-600" />
                  : <ArrowUpRight className="h-4 w-4 text-red-600" />}
              </div>
              Transaction Details
            </DialogTitle>
            <DialogDescription className="sr-only">Full details of your transaction</DialogDescription>
          </DialogHeader>

          {selectedTx && (
            <div className="space-y-4 pt-1">
              <div className={`rounded-xl p-4 text-center ${selectedTx.type === 'credit' ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                <p className="text-xs text-muted-foreground mb-1">{selectedTx.type === 'credit' ? 'You Received' : 'You Spent'}</p>
                <p className={`text-3xl font-bold tracking-tight ${selectedTx.type === 'credit' ? 'text-green-700' : 'text-red-700'}`}>
                  {selectedTx.type === 'credit' ? '+' : '-'}₦{selectedTx.amount.toLocaleString()}
                </p>
                <Badge variant="outline" className={`mt-2 text-xs ${getStatusStyle(selectedTx.status)}`}>
                  {selectedTx.status}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border/50">
                  <span className="text-xs text-muted-foreground min-w-[80px]">Service</span>
                  <span className="text-sm font-medium text-right">{selectedTx.description}</span>
                </div>
                <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border/50">
                  <span className="text-xs text-muted-foreground min-w-[80px]">Date</span>
                  <span className="text-sm text-right">{formatFullDate(selectedTx.date)}</span>
                </div>
                <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border/50">
                  <span className="text-xs text-muted-foreground min-w-[80px]">Type</span>
                  <span className={`text-sm font-medium capitalize ${selectedTx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedTx.type}
                  </span>
                </div>
                {selectedTx.reference && (
                  <div className="flex items-start justify-between gap-3 py-2.5">
                    <span className="text-xs text-muted-foreground min-w-[80px]">Reference</span>
                    <div className="flex items-center gap-1.5 text-right">
                      <span className="text-xs font-mono text-muted-foreground break-all">{selectedTx.reference}</span>
                      <button
                        onClick={() => copyRef(selectedTx.reference)}
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Button variant="outline" className="w-full h-9" onClick={() => setSelectedTx(null)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
