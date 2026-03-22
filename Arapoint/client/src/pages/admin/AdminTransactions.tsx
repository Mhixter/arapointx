import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Loader2, RefreshCw, Eye, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet, Receipt, CalendarDays, Filter, X } from "lucide-react";
import { useLocation } from "wouter";
import { adminApi } from "@/lib/api/admin";
import { useState, useEffect, useCallback } from "react";
import { tokenStorage } from "@/lib/tokenStorage";

interface Props {
  filterUserId?: string;
  filterUserName?: string;
  embedded?: boolean;
}

type Period = 'all' | 'today' | 'week' | 'month' | 'custom';

const TYPE_LABELS: Record<string, string> = {
  fund_wallet: 'Wallet Funding',
  wallet_funding: 'Wallet Funding',
  admin_fund: 'Admin Funding',
  admin_debit: 'Admin Debit',
  refund: 'Refund',
  nin_verification: 'NIN Verification',
  vnin_verification: 'Virtual NIN Verification',
  nin_phone_verification: 'NIN Phone Verification',
  nin_validation: 'NIN Validation',
  nin_tracking: 'NIN With Tracking ID',
  ipe_clearance: 'IPE Clearance',
  birth_attestation: 'Birth Attestation',
  bvn_verification: 'BVN Verification',
  bvn_digital_card: 'BVN Digital Card',
  bvn_modification: 'BVN Modification',
  airtime_purchase: 'Airtime Purchase',
  data_purchase: 'Data Purchase',
  electricity_purchase: 'Electricity Payment',
  cable_purchase: 'Cable TV Subscription',
  cac_registration: 'CAC Registration',
  education_service: 'Education Service',
  jamb_service: 'JAMB Service',
  jamb_olevel_upload: "JAMB O'Level Upload",
  jamb_admission_letter: 'JAMB Admission Letter',
  jamb_original_result: 'JAMB Original Result',
  jamb_reprinting_caps: 'JAMB Reprinting & Caps',
  jamb_score_lookup: 'JAMB Score Lookup',
  waec_result_lookup: 'WAEC Result Lookup',
  neco_result_lookup: 'NECO Result Lookup',
  nabteb_result_lookup: 'NABTEB Result Lookup',
  nbais_result_lookup: 'NBAIS Result Lookup',
  pin_purchase: 'Exam PIN Purchase',
  service_purchase: 'Service Purchase',
  identity_verification: 'Identity Verification',
};

const TYPE_COLORS: Record<string, string> = {
  wallet_funding: 'bg-green-100 text-green-800 border-green-200',
  fund_wallet: 'bg-green-100 text-green-800 border-green-200',
  admin_fund: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  admin_debit: 'bg-red-100 text-red-800 border-red-200',
  airtime_purchase: 'bg-blue-100 text-blue-800 border-blue-200',
  data_purchase: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  electricity_purchase: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cable_purchase: 'bg-purple-100 text-purple-800 border-purple-200',
  jamb_service: 'bg-orange-100 text-orange-800 border-orange-200',
};

const ALL_TX_TYPES = Object.keys(TYPE_LABELS);

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
  if (short) return new Date(dateString).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  return new Date(dateString).toLocaleString('en-NG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function toDateInputValue(d: Date) {
  return d.toISOString().split('T')[0];
}

function getPeriodDates(period: Period, customStart: string, customEnd: string): { startDate?: string; endDate?: string } {
  const now = new Date();
  if (period === 'today') {
    return { startDate: toDateInputValue(now), endDate: toDateInputValue(now) };
  }
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return { startDate: toDateInputValue(start), endDate: toDateInputValue(now) };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: toDateInputValue(start), endDate: toDateInputValue(now) };
  }
  if (period === 'custom') {
    return { startDate: customStart || undefined, endDate: customEnd || undefined };
  }
  return {};
}

function periodLabel(period: Period) {
  if (period === 'today') return 'Today';
  if (period === 'week') return 'Last 7 Days';
  if (period === 'month') return 'This Month';
  if (period === 'custom') return 'Custom Range';
  return 'All Time';
}

export default function AdminTransactions({ filterUserId, filterUserName, embedded }: Props = {}) {
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [period, setPeriod] = useState<Period>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [appliedCustomStart, setAppliedCustomStart] = useState('');
  const [appliedCustomEnd, setAppliedCustomEnd] = useState('');

  useEffect(() => { setPage(1); }, [filterUserId]);
  useEffect(() => { setPage(1); }, [typeFilter, period, appliedCustomStart, appliedCustomEnd]);

  const { startDate, endDate } = getPeriodDates(
    period,
    period === 'custom' ? appliedCustomStart : '',
    period === 'custom' ? appliedCustomEnd : '',
  );

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-transactions', page, filterUserId, typeFilter, startDate, endDate],
    queryFn: () => adminApi.getTransactions(page, 20, filterUserId, {
      type: typeFilter !== 'all' ? typeFilter : undefined,
      startDate,
      endDate,
    }),
    refetchInterval: 30000,
  });

  const allTransactions: any[] = data?.transactions || [];
  const pagination = data?.pagination;
  const totals = data?.totals;

  const activeFilterCount = [
    typeFilter !== 'all' ? 1 : 0,
    period !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  function clearFilters() {
    setTypeFilter('all');
    setPeriod('all');
    setCustomStart('');
    setCustomEnd('');
    setAppliedCustomStart('');
    setAppliedCustomEnd('');
    setPage(1);
  }

  function applyCustomRange() {
    setAppliedCustomStart(customStart);
    setAppliedCustomEnd(customEnd);
    setShowCustom(false);
  }

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

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Credits {period !== 'all' ? `(${periodLabel(period)})` : '(All Time)'}
                    </p>
                    <p className="text-lg font-bold text-green-700">
                      ₦{(totals?.credits || 0).toLocaleString()}
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      Debits {period !== 'all' ? `(${periodLabel(period)})` : '(All Time)'}
                    </p>
                    <p className="text-lg font-bold text-red-700">
                      ₦{(totals?.debits || 0).toLocaleString()}
                    </p>
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
                    <p className="text-xs text-muted-foreground">Matching Records</p>
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
                    <p className="text-xs text-muted-foreground">Net Flow</p>
                    <p className={`text-lg font-bold ${(totals?.credits || 0) - (totals?.debits || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {(totals?.credits || 0) - (totals?.debits || 0) >= 0 ? '+' : ''}₦{Math.abs((totals?.credits || 0) - (totals?.debits || 0)).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="shadow-sm border-0 ring-1 ring-border/60">
        <CardHeader className="px-5 py-4 border-b bg-muted/30">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold">
                {filterUserName ? `${filterUserName}'s Transactions` : 'All Transactions'}
                <span className="ml-2 text-sm font-normal text-muted-foreground">({pagination?.total || 0})</span>
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {embedded && (
                  <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-8">
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                )}
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={clearFilters}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear filters
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2 items-end">
              {/* Period presets */}
              <div className="flex gap-1 flex-wrap">
                {(['all', 'today', 'week', 'month'] as Period[]).map(p => (
                  <Button
                    key={p}
                    variant={period === p ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs px-3"
                    onClick={() => setPeriod(p)}
                  >
                    {p === 'all' ? 'All Time' : p === 'today' ? 'Today' : p === 'week' ? 'Last 7 Days' : 'This Month'}
                  </Button>
                ))}
                {/* Custom date range */}
                <Popover open={showCustom} onOpenChange={setShowCustom}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={period === 'custom' ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-xs px-3"
                      onClick={() => { setPeriod('custom'); setShowCustom(true); }}
                    >
                      <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                      {period === 'custom' && appliedCustomStart ? `${appliedCustomStart} → ${appliedCustomEnd || '...'}` : 'Custom'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="start">
                    <p className="text-sm font-semibold mb-3">Custom Date Range</p>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">From</Label>
                        <Input type="date" className="h-8 text-xs" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">To</Label>
                        <Input type="date" className="h-8 text-xs" value={customEnd} onChange={e => setCustomEnd(e.target.value)} min={customStart} />
                      </div>
                      <Button size="sm" className="w-full h-8 text-xs" onClick={applyCustomRange} disabled={!customStart}>
                        Apply Range
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Type filter */}
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-48 text-xs">
                  <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {ALL_TX_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{getTypeLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active filter summary */}
            {(period !== 'all' || typeFilter !== 'all') && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-muted-foreground">Filtered by:</span>
                {period !== 'all' && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {periodLabel(period)}
                    {period === 'custom' && appliedCustomStart && `: ${appliedCustomStart}${appliedCustomEnd ? ` → ${appliedCustomEnd}` : ''}`}
                  </Badge>
                )}
                {typeFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Filter className="h-3 w-3" />
                    {getTypeLabel(typeFilter)}
                  </Badge>
                )}
              </div>
            )}
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
          ) : allTransactions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Receipt className="h-10 w-10 opacity-30" />
              <p className="text-sm">No transactions found for the selected filters</p>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs mt-1" onClick={clearFilters}>Clear filters</Button>
              )}
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
                    {allTransactions.map((tx: any) => {
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
                          <td className="px-4 py-3.5 max-w-[200px]">
                            <p className="text-sm text-muted-foreground truncate">
                              {tx.description || getTypeLabel(tx.transactionType)}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className={`flex items-center justify-end gap-1 font-semibold ${positive ? 'text-green-600' : 'text-red-600'}`}>
                              {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
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
                {allTransactions.map((tx: any) => {
                  const { value, positive } = formatAmount(tx.amount);
                  return (
                    <div
                      key={tx.id}
                      className="px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors"
                      onClick={() => setSelectedTx(tx)}
                    >
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${positive ? 'bg-green-100' : 'bg-red-100'}`}>
                        {positive ? <ArrowUpRight className="h-4 w-4 text-green-600" /> : <ArrowDownRight className="h-4 w-4 text-red-600" />}
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
                          <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${getStatusColor(tx.status)}`}>{tx.status}</Badge>
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
            <DialogDescription>{selectedTx?.referenceId || 'No reference'}</DialogDescription>
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
                    <Badge variant="outline" className={`text-xs ${getStatusColor(selectedTx.status)}`}>{selectedTx.status || 'unknown'}</Badge>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Type</p>
                    <Badge variant="outline" className={`text-xs ${getTypeColor(selectedTx.transactionType)}`}>{getTypeLabel(selectedTx.transactionType)}</Badge>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Date & Time</p>
                    <p className="text-sm font-medium">{formatDate(selectedTx.createdAt)}</p>
                  </div>
                  {selectedTx.description && (
                    <div className="bg-muted/40 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{selectedTx.description}</p>
                    </div>
                  )}
                  {!embedded && selectedTx.userName && (
                    <div className="bg-muted/40 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">User</p>
                      <p className="text-sm font-semibold">{selectedTx.userName}</p>
                      <p className="text-xs text-muted-foreground">{selectedTx.userEmail}</p>
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
                <Button variant="outline" className="w-full" onClick={() => setSelectedTx(null)}>Close</Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
