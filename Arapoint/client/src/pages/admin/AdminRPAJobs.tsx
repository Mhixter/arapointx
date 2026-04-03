import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Eye,
  RotateCcw,
  Zap,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:    { label: 'Pending',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700 border-blue-200',       icon: Loader2 },
  completed:  { label: 'Completed',  color: 'bg-green-100 text-green-700 border-green-200',    icon: CheckCircle2 },
  failed:     { label: 'Failed',     color: 'bg-red-100 text-red-700 border-red-200',          icon: XCircle },
};

const SERVICE_LABELS: Record<string, string> = {
  neco: 'NECO',
  neco_result: 'NECO Result',
  neco_service: 'NECO Result',
  waec: 'WAEC',
  waec_result: 'WAEC Result',
  waec_service: 'WAEC Result',
  nabteb: 'NABTEB',
  nabteb_result: 'NABTEB Result',
  nbais: 'NBAIS',
  nbais_result: 'NBAIS Result',
  jamb: 'JAMB',
  jamb_score: 'JAMB Score',
  jamb_service: 'JAMB Score',
  vtpass_data_scrape: 'VTU Data Scrape',
};

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

function timeAgo(d: string | null | undefined) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminRPAJobs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['/api/admin/rpa/jobs', statusFilter, page],
    queryFn: () => adminApi.getRpaJobs(page, 20, statusFilter === 'all' ? undefined : statusFilter),
    refetchInterval: 10000,
  });

  const jobs = (data as any)?.jobs || [];
  const stats = (data as any)?.stats || {};
  const pagination = (data as any)?.pagination || {};

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => adminApi.retryRpaJob(jobId),
    onSuccess: () => {
      toast({ title: 'Job queued for retry', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rpa/jobs'] });
    },
    onError: (err: any) => {
      toast({ title: 'Retry failed', description: err?.response?.data?.message || err.message, variant: 'destructive' });
    },
  });

  const forceRetryMutation = useMutation({
    mutationFn: (jobId: string) => (adminApi as any).forceRetryRpaJob(jobId),
    onSuccess: () => {
      toast({ title: 'Job force-retried — queued as fresh attempt', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rpa/jobs'] });
    },
    onError: (err: any) => {
      toast({ title: 'Force-retry failed', description: err?.response?.data?.message || err.message, variant: 'destructive' });
    },
  });

  const statCards = [
    { label: 'Pending',    value: stats.pending    ?? '—', color: 'text-yellow-600', icon: Clock,        status: 'pending' },
    { label: 'Processing', value: stats.processing  ?? '—', color: 'text-blue-600',   icon: Loader2,      status: 'processing' },
    { label: 'Completed',  value: stats.completed   ?? '—', color: 'text-green-600',  icon: CheckCircle2, status: 'completed' },
    { label: 'Failed',     value: stats.failed      ?? '—', color: 'text-red-600',    icon: XCircle,      status: 'failed' },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">RPA Job Monitor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor and manage automated result-check jobs. Auto-refreshes every 10 seconds.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <Card
              key={card.status}
              className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === card.status ? 'ring-2 ring-primary' : ''}`}
              onClick={() => { setStatusFilter(card.status); setPage(1); }}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`h-8 w-8 ${card.color} shrink-0`} />
                <div>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter tabs */}
      <Tabs value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="all">All Jobs</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Job table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {statusFilter === 'all' ? 'All Jobs' : `${STATUS_CONFIG[statusFilter]?.label ?? statusFilter} Jobs`}
            {pagination.total != null && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">({pagination.total} total)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No jobs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="hidden md:table-cell">User ID</TableHead>
                    <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead className="hidden md:table-cell">Error</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job: any) => {
                    const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
                    const Icon = cfg.icon;
                    const isStuck = job.status === 'processing' && job.startedAt
                      && (Date.now() - new Date(job.startedAt).getTime()) > 5 * 60 * 1000;

                    return (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${cfg.color} ${isStuck ? 'ring-1 ring-orange-400' : ''}`}>
                            <Icon className={`h-3 w-3 ${job.status === 'processing' ? 'animate-spin' : ''}`} />
                            {cfg.label}
                            {isStuck && <span className="ml-1 text-orange-500 font-semibold">!</span>}
                          </Badge>
                          {isStuck && (
                            <p className="text-[10px] text-orange-500 mt-0.5">Stuck &gt;5 min</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{SERVICE_LABELS[job.serviceType] || job.serviceType}</p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[100px]">{job.id.slice(0, 8)}…</p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <p className="text-xs font-mono truncate max-w-[120px]">{job.userId || '—'}</p>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <p className="text-xs">{formatDate(job.createdAt)}</p>
                          <p className="text-[11px] text-muted-foreground">{timeAgo(job.createdAt)}</p>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-semibold ${(job.retryCount || 0) > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                            {job.retryCount || 0}/{job.maxRetries || 3}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[160px]">
                          {job.errorMessage ? (
                            <p className="text-xs text-red-600 truncate" title={job.errorMessage}>{job.errorMessage}</p>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="View details"
                              onClick={() => setSelectedJob(job)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {(job.status === 'failed' || (job.status === 'pending' && (job.retryCount || 0) < (job.maxRetries || 3))) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={retryMutation.isPending}
                                onClick={() => retryMutation.mutate(job.id)}
                                title="Retry (respects max retries)"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Retry
                              </Button>
                            )}
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 text-xs bg-orange-600 hover:bg-orange-700"
                              disabled={forceRetryMutation.isPending}
                              onClick={() => forceRetryMutation.mutate(job.id)}
                              title="Force-retry: resets retry count, works on any status"
                            >
                              <Zap className="h-3 w-3 mr-1" />
                              Force
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Job detail dialog */}
      {selectedJob && (
        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Job Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Job ID', selectedJob.id],
                  ['Status', selectedJob.status],
                  ['Service Type', SERVICE_LABELS[selectedJob.serviceType] || selectedJob.serviceType],
                  ['User ID', selectedJob.userId || '—'],
                  ['Priority', selectedJob.priority ?? 0],
                  ['Retry Count', `${selectedJob.retryCount || 0} / ${selectedJob.maxRetries || 3}`],
                  ['Created', formatDate(selectedJob.createdAt)],
                  ['Started', formatDate(selectedJob.startedAt)],
                  ['Completed', formatDate(selectedJob.completedAt)],
                ].map(([label, val]) => (
                  <div key={label as string}>
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-medium break-all">{val as string}</p>
                  </div>
                ))}
              </div>

              {selectedJob.errorMessage && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Error Message</p>
                  <p className="text-red-600 text-xs font-mono whitespace-pre-wrap">{selectedJob.errorMessage}</p>
                </div>
              )}

              {selectedJob.queryData && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Query Data (Input)</p>
                  <pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedJob.queryData, null, 2)}
                  </pre>
                </div>
              )}

              {selectedJob.result && Object.keys(selectedJob.result).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Result Data</p>
                  <pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedJob.result, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  onClick={() => { forceRetryMutation.mutate(selectedJob.id); setSelectedJob(null); }}
                  disabled={forceRetryMutation.isPending}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Force Retry (Reset & Queue)
                </Button>
                <Button variant="outline" onClick={() => setSelectedJob(null)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
