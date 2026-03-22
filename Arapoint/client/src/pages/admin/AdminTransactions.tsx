import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, RefreshCw, Eye, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet, Receipt } from "lucide-react";
import { useLocation } from "wouter";
import { adminApi } from "@/lib/api/admin";
import { useState, useEffect } from "react";

interface Props {
  filterUserId?: string;
  filterUserName?: string;
  embedded?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  nin_verification: 'NIN Verification',
  nin_validation: 'NIN Validation',
  bvn_verification: 'BVN Verification',
  wallet_funding: 'Wallet Funding',
  admin_fund: 'Admin Funding',
  admin_debit: 'Admin Debit',
  cac_registration: 'CAC Registration',
  airtime_purchase: 'Airtime Purchase',
  data_purchase: 'Data Purchase',
  electricity_payment: 'Electricity Payment',
  cable_payment: 'Cable Payment',
  jamb_service: 'JAMB Service',
  identity_verification: 'Identity Verification',
};

const TYPE_COLORS: Record<string, string> = {
  wallet_funding: 'bg-green-100 text-green-800 border-green-200',
  admin_fund: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  admin_debit: 'bg-red-100 text-red-800 border-red-200',
  airtime_purchase: 'bg-blue-100 text-blue-800 border-blue-200',
  data_purchase: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  electricity_payment: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cable_payment: 'bg-purple-100 text-purple-800 border-purple-200',
  jamb_service: 'bg-orange-100 text-orange-800 border-orange-200',
};

function getTypeLabel(type: string) {
  return TYPE_LABELS[type] || type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';
}

function getTypeColor(type: string) {
  return TYPE_COLORS[type] || 'bg-gray-100 text-gray-800 border-gray-200';
}

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'successful':
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'failed': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function formatAmount(amount: string) {
  const num = parseFloat(amount);
  return { value: Math.abs(num), positive: num >= 0 };
}

function formatDate(dateString: string, short = false) {
  if (short) {
    return new Date(dateString).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return new Date(dateString).toLocaleString('en-NG', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AdminTransactions({ filterUserId, filterUserName, embedded }: Props = {}) {
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTx, setSelectedTx] = useState<any>(null);

  useEffect(() => {
    setPage(1);
  }, [filterUserId]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-transactions', page, filterUserId],
    queryFn: () => adminApi.getTransactions(page, 20, filterUserId),
    refetchInterval: 30000,
  });

  const allTransactions: any[] = data?.transactions || [];
  const pagination = data?.pagination;

  const transactions = typeFilter === 'all'
    ? allTransactions
    : allTransactions.filter(tx => tx.transactionType === typeFilter);

  const uniqueTypes = Array.from(new Set(allTransactions.map(tx => tx.transactionType))).filter(Boolean);

  const totalCredits = allTransactions.filter(tx => parseFloat(tx.amount) >= 0).reduce((s, tx) => s + parseFloat(tx.amount), 0);
  const totalDebits = allTransactions.filter(tx => parseFloat(tx.amount) < 0).reduce((s, tx) => s + Math.abs(parseFloat(tx.amount)), 0);

  if (!embedded && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!embedded && error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Receipt className="h-12 w-12 text-muted-foreground" />
        <p className="text-destructive font-medium">Failed to load transactions</p>
        <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!embedded && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl lg:text-3xl font-heading font-bold tracking-tight">Transactions</h2>
              <p className="text-sm text-muted-foreground mt-1">Monitor all platform transactions</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching} size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={() => navigate("/admin")} size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Credits (page)</p>
                    <p className="text-lg font-bold text-green-700">₦{totalCredits.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Debits (page)</p>
                    <p className="text-lg font-bold text-red-700">₦{totalDebits.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Records</p>
                    <p className="text-lg font-bold text-blue-700">{pagination?.total || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">This Page</p>
                    <p className="text-lg font-bold text-purple-700">{allTransactions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="shadow-sm border-0 ring-1 ring-border/60">
        <CardHeader className="px-5 py-4 border-b bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold">
              {filterUserName ? `${filterUserName}'s Transactions` : 'All Transactions'}
              <span className="ml-2 text-sm font-normal text-muted-foreground">({pagination?.total || 0})</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {embedded && (
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-8">
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map(t => (
                    <SelectItem key={t} value={t}>{getTypeLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Receipt className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-destructive">Failed to load transactions</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Try Again</Button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Receipt className="h-10 w-10 opacity-30" />
              <p className="text-sm">No transactions found</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Date</th>
                      {!embedded && <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>}
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Description</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {transactions.map((tx: any) => {
                      const { value, positive } = formatAmount(tx.amount);
                      return (
                        <tr key={tx.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <p className="text-sm font-medium">{formatDate(tx.createdAt, true)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(tx.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>
                          {!embedded && (
                            <td className="px-4 py-3.5">
                              <p className="font-medium text-sm leading-tight">{tx.userName || '—'}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{tx.userEmail || ''}</p>
                            </td>
                          )}
                          <td className="px-4 py-3.5">
                            <Badge variant="outline" className={`text-xs font-medium ${getTypeColor(tx.transactionType)}`}>
                              {getTypeLabel(tx.transactionType)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 max-w-[180px]">
                            <p className="text-sm text-muted-foreground truncate">{tx.description || '—'}</p>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className={`flex items-center justify-end gap-1 font-semibold ${positive ? 'text-green-600' : 'text-red-600'}`}>
                              {positive
                                ? <ArrowUpRight className="h-3.5 w-3.5" />
                                : <ArrowDownRight className="h-3.5 w-3.5" />}
                              ₦{value.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge variant="outline" className={`text-xs ${getStatusColor(tx.status)}`}>
                              {tx.status || 'unknown'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setSelectedTx(tx)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-border/50">
                {transactions.map((tx: any) => {
                  const { value, positive } = formatAmount(tx.amount);
                  return (
                    <div
                      key={tx.id}
                      className="px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors"
                      onClick={() => setSelectedTx(tx)}
                    >
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${positive ? 'bg-green-100' : 'bg-red-100'}`}>
                        {positive
                          ? <ArrowUpRight className="h-4 w-4 text-green-600" />
                          : <ArrowDownRight className="h-4 w-4 text-red-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{getTypeLabel(tx.transactionType)}</p>
                          <p className={`text-sm font-bold flex-shrink-0 ${positive ? 'text-green-600' : 'text-red-600'}`}>
                            {positive ? '+' : '-'}₦{value.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">{tx.description || tx.userEmail || '—'}</p>
                          <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${getStatusColor(tx.status)}`}>
                            {tx.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(tx.createdAt, true)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t bg-muted/10">
              <p className="text-xs text-muted-foreground">
                Page {page} of {pagination.totalPages} · {pagination.total} total
              </p>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs px-3" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs px-3" onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${selectedTx && parseFloat(selectedTx.amount) >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {selectedTx && parseFloat(selectedTx.amount) >= 0
                  ? <ArrowUpRight className="h-4 w-4 text-green-600" />
                  : <ArrowDownRight className="h-4 w-4 text-red-600" />}
              </div>
              Transaction Detail
            </DialogTitle>
            <DialogDescription>
              {selectedTx?.referenceId || 'No reference'}
            </DialogDescription>
          </DialogHeader>

          {selectedTx && (() => {
            const { value, positive } = formatAmount(selectedTx.amount);
            return (
              <div className="space-y-4 pt-2">
                <div className={`rounded-xl p-4 text-center ${positive ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                  <p className="text-xs text-muted-foreground mb-1">{positive ? 'Credit' : 'Debit'}</p>
                  <p className={`text-3xl font-bold tracking-tight ${positive ? 'text-green-700' : 'text-red-700'}`}>
                    {positive ? '+' : '-'}₦{value.toLocaleString()}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(selectedTx.status)}`}>
                      {selectedTx.status || 'unknown'}
                    </Badge>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Type</p>
                    <Badge variant="outline" className={`text-xs ${getTypeColor(selectedTx.transactionType)}`}>
                      {getTypeLabel(selectedTx.transactionType)}
                    </Badge>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Date & Time</p>
                    <p className="text-sm font-medium">{formatDate(selectedTx.createdAt)}</p>
                  </div>
                  {!embedded && selectedTx.userName && (
                    <div className="bg-muted/40 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">User</p>
                      <p className="text-sm font-semibold">{selectedTx.userName}</p>
                      <p className="text-xs text-muted-foreground">{selectedTx.userEmail}</p>
                    </div>
                  )}
                  {selectedTx.description && (
                    <div className="bg-muted/40 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{selectedTx.description}</p>
                    </div>
                  )}
                  {selectedTx.referenceId && (
                    <div className="bg-muted/40 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Reference ID</p>
                      <p className="text-xs font-mono break-all">{selectedTx.referenceId}</p>
                    </div>
                  )}
                  {selectedTx.paymentMethod && (
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
                      <p className="text-sm capitalize">{selectedTx.paymentMethod?.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                </div>

                <Button variant="outline" className="w-full" onClick={() => setSelectedTx(null)}>
                  Close
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
