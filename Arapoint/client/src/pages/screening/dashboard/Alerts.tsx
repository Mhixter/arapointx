import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Bell, AlertTriangle, CheckCircle, Info, Settings, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { screeningApi } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

const TABS = ["All", "Alerts", "System", "Updates"];

function NotifIcon({ severity }: { severity: string }) {
  if (severity === "error") return <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4 text-red-600" /></div>;
  if (severity === "warning") return <div className="w-9 h-9 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4 text-yellow-600" /></div>;
  if (severity === "success") return <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0"><CheckCircle className="w-4 h-4 text-green-600" /></div>;
  return <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0"><Info className="w-4 h-4 text-blue-600" /></div>;
}

export default function ScreeningAlerts() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [tab, setTab] = useState("All");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    screeningApi.notifications.list().then(setNotifications).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    await screeningApi.notifications.markAllRead();
    setNotifications(n => n.map(x => ({ ...x, isRead: true })));
  };

  const markRead = async (id: string) => {
    await screeningApi.notifications.markRead(id);
    setNotifications(n => n.map(x => x.id === id ? { ...x, isRead: true } : x));
  };

  const typeMap: Record<string, string> = { alert: "Alerts", system: "System", update: "Updates" };
  const filtered = tab === "All" ? notifications : notifications.filter(n => typeMap[n.type] === tab || n.type === tab.toLowerCase());
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <ScreeningDashboardLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Alerts & Notifications</h1>
            {unreadCount > 0 && <p className="text-sm text-gray-500">{unreadCount} unread</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} className="rounded-xl"><RefreshCw className="w-4 h-4" /></Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead} className="rounded-xl text-xs gap-1">
                <Check className="w-3.5 h-3.5" /> Mark all read
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 px-6 py-4 animate-pulse">
                  <div className="w-9 h-9 bg-gray-100 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-48" /><div className="h-2 bg-gray-100 rounded w-64" /></div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(n => (
                <div key={n.id}
                  className={`flex gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? "bg-blue-50/40" : ""}`}
                  onClick={() => !n.isRead && markRead(n.id)}>
                  <NotifIcon severity={n.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${n.isRead ? "text-gray-700" : "text-gray-900"}`}>{n.title}</p>
                      <p className="text-xs text-gray-400 flex-shrink-0">{new Date(n.createdAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{n.message}</p>
                    {n.candidateId && (
                      <Link href={`/employment-screening/dashboard/candidates/${n.candidateId}`}>
                        <a className="text-xs text-blue-600 hover:underline mt-1 inline-block" onClick={e => e.stopPropagation()}>View candidate →</a>
                      </Link>
                    )}
                  </div>
                  {!n.isRead && <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}
          {filtered.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-100">
              <button className="w-full text-sm text-blue-700 font-medium hover:underline">View All Notifications</button>
            </div>
          )}
        </div>
      </div>
    </ScreeningDashboardLayout>
  );
}
