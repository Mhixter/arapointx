import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, RefreshCw, X } from "lucide-react";
import { useLocation } from "wouter";
import { adminApi, AdminTransaction } from "@/lib/api/admin";
import { useState, useEffect } from "react";

interface Props {
  filterUserId?: string;
  filterUserName?: string;
  embedded?: boolean;
}

export default function AdminTransactions({ filterUserId, filterUserName, embedded }: Props = {}) {
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [userSearch, setUserSearch] = useState(filterUserName || "");
  const [activeUserId, setActiveUserId] = useState<string | undefined>(filterUserId);

  useEffect(() => {
    setActiveUserId(filterUserId);
    setUserSearch(filterUserName || "");
    setPage(1);
  }, [filterUserId, filterUserName]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-transactions', page, activeUserId],
    queryFn: () => adminApi.getTransactions(page, 20, activeUserId),
    refetchInterval: 30000,
  });

  const transactions = data?.transactions || [];
  const pagination = data?.pagination;

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    const prefix = num < 0 ? '-' : '+';
    return `${prefix}₦${Math.abs(num).toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'successful':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'nin_verification': 'NIN Verification',
      'nin_validation': 'NIN Validation',
      'bvn_verification': 'BVN Verification',
      'wallet_funding': 'Wallet Funding',
      'admin_fund': 'Admin Funding',
      'admin_debit': 'Admin Debit',
      'cac_registration': 'CAC Registration',
      'airtime_purchase': 'Airtime Purchase',
      'data_purchase': 'Data Purchase',
      'electricity_payment': 'Electricity Payment',
      'cable_payment': 'Cable Payment',
      'jamb_service': 'JAMB Service',
    };
    return labels[type] || type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">Failed to load transactions</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold tracking-tight">Transactions</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Monitor all platform transactions</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              size="sm"
              className="h-8 sm:h-9"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin")} size="sm" className="h-8 sm:h-9">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      )}

      {!embedded && (
        <Card className="p-4">
          <div className="flex gap-2 items-center flex-wrap">
            <Input
              placeholder="Filter by user name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="max-w-xs h-8 text-sm"
            />
            {activeUserId && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  setActiveUserId(undefined);
                  setUserSearch("");
                  setPage(1);
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Clear Filter: {filterUserName || activeUserId}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              {activeUserId
                ? `Showing transactions for: ${filterUserName || activeUserId}`
                : `Showing all transactions`}
            </p>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">
            {activeUserId && filterUserName
              ? `${filterUserName}'s Transactions (${pagination?.total || 0})`
              : `All Transactions (${pagination?.total || 0})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
                    {!embedded && <th className="text-left p-3 text-xs font-medium text-muted-foreground">User</th>}
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Description</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Reference</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-muted/30">
                      <td className="p-3 text-sm whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                      {!embedded && (
                        <td className="p-3 text-sm">
                          <div className="font-medium text-xs">{(tx as any).userName || '-'}</div>
                          <div className="text-muted-foreground text-xs">{(tx as any).userEmail || ''}</div>
                        </td>
                      )}
                      <td className="p-3 text-sm">{getTypeLabel(tx.transactionType)}</td>
                      <td className="p-3 text-xs text-muted-foreground max-w-[160px] truncate">{(tx as any).description || '-'}</td>
                      <td className="p-3 text-sm font-mono text-xs truncate max-w-[120px]">{tx.referenceId || '-'}</td>
                      <td className={`p-3 text-sm text-right font-medium ${parseFloat(tx.amount) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatAmount(tx.amount)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
