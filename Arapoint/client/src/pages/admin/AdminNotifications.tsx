import { tokenStorage } from '@/lib/tokenStorage';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Loader2, RefreshCw, CheckCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  requestId?: string | null;
  createdAt: string;
}

export default function AdminNotifications() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = tokenStorage.getItem('adminToken');
      const res = await fetch('/api/admin/notifications/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotifications(data.data?.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id: string) => {
    try {
      const token = tokenStorage.getItem('adminToken');
      await fetch(`/api/admin/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (!unread.length) return;
    setMarkingAll(true);
    try {
      const token = tokenStorage.getItem('adminToken');
      await Promise.all(unread.map(n =>
        fetch(`/api/admin/notifications/${n.id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        })
      ));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast({ title: 'All notifications marked as read' });
    } catch {
      toast({ title: 'Failed to mark all as read', variant: 'destructive' });
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const typeColor = (type?: string) => {
    switch (type) {
      case 'error': return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
      case 'success': return 'border-l-green-500 bg-green-50 dark:bg-green-900/10';
      default: return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6" /> Notifications
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs">{unreadCount}</Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">System alerts and activity notifications</p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={markingAll}>
              {markingAll ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCheck className="h-4 w-4 mr-1" />}
              Mark all read
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchNotifications} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center text-muted-foreground">
            <BellOff className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No notifications</p>
            <p className="text-sm mt-1">You're all caught up.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`border-l-4 rounded-lg p-4 flex items-start justify-between gap-3 transition-all ${typeColor(n.type)} ${n.isRead ? 'opacity-60' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{n.title}</p>
                  {!n.isRead && <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
              {!n.isRead && (
                <Button size="sm" variant="ghost" className="shrink-0 h-7 text-xs" onClick={() => markRead(n.id)}>
                  Mark read
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
