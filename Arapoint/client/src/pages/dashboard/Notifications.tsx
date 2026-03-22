import { tokenStorage } from '@/lib/tokenStorage';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Bell, AlertCircle, CheckCircle, Info, XCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  timestamp: string;
  category: string;
}

const getAuthToken = () => tokenStorage.getItem('accessToken');

const fetchNotifications = async (): Promise<Notification[]> => {
  const token = getAuthToken();
  if (!token) return [];
  
  const response = await fetch('/api/dashboard/notifications?limit=30', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  
  if (!response.ok) return [];
  const data = await response.json();
  return data.data?.notifications || [];
};

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return CheckCircle;
    case 'error':
      return XCircle;
    case 'warning':
      return AlertCircle;
    default:
      return Info;
  }
};

const getIconColor = (type: string) => {
  switch (type) {
    case 'success':
      return 'text-green-600 dark:text-green-400';
    case 'error':
      return 'text-red-600 dark:text-red-400';
    case 'warning':
      return 'text-amber-600 dark:text-amber-400';
    default:
      return 'text-blue-600 dark:text-blue-400';
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

export default function Notifications() {
  const token = getAuthToken();
  
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['dashboard', 'notifications'],
    queryFn: fetchNotifications,
    refetchOnWindowFocus: true,
    staleTime: 10000,
    enabled: !!token,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 sm:h-8 sm:w-8" />
            Notifications
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">Stay updated with your account activity</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading notifications...</span>
        </div>
      ) : notifications.length === 0 ? (
        <Card className="max-w-2xl">
          <CardContent className="pt-12 pb-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">Your activity will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {notifications.map((notif) => {
            const Icon = getIcon(notif.type);
            return (
              <Card key={notif.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 ${getIconColor(notif.type)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{notif.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{formatTimestamp(notif.timestamp)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
