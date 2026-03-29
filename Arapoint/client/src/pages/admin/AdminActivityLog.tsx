import { tokenStorage } from '@/lib/tokenStorage';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Activity, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface LogEntry {
  id: string;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  requestId?: string | null;
  createdAt: string;
}

export default function AdminActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = tokenStorage.getItem('adminToken');
      const res = await fetch('/api/admin/notifications/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLogs(data.data?.notifications || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = !search
    ? logs
    : logs.filter(l =>
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.message.toLowerCase().includes(search.toLowerCase())
      );

  const typeIcon = (type?: string) => {
    const colors: Record<string, string> = {
      error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return colors[type || 'info'] || colors.info;
  };

  const typeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      error: 'Error',
      warning: 'Warning',
      success: 'Success',
      info: 'Info',
    };
    return labels[type || 'info'] || 'System';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6" /> Activity Log
          </h2>
          <p className="text-sm text-muted-foreground mt-1">System events and admin activity history</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search activity…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center text-muted-foreground">
            <Activity className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">{search ? 'No matching activity' : 'No activity yet'}</p>
            <p className="text-sm mt-1">{search ? 'Try a different search term.' : 'System events will appear here.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</p>
          {filtered.map(log => (
            <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border bg-white dark:bg-gray-900 hover:shadow-sm transition-shadow">
              <div className="shrink-0 mt-0.5">
                <Badge className={`text-xs font-medium ${typeIcon(log.type)}`}>{typeLabel(log.type)}</Badge>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{log.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{log.message}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
