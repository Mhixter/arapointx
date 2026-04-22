import { tokenStorage } from '@/lib/tokenStorage';
import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Banknote, Loader2, RefreshCw, LogOut, Clock, Plus, Trash2, Phone,
  CheckCircle, ArrowDownCircle, Wallet, AlertCircle, Edit, XCircle,
  MessageSquare, Send, TrendingUp, LayoutDashboard, Inbox, Briefcase,
  History as HistoryIcon, User, ChevronRight, Activity, Search, Bell,
  Circle, Hash,
} from 'lucide-react';

const getToken = () => tokenStorage.getItem('a2cAgentToken');

type Section = 'overview' | 'inventory' | 'mine' | 'history' | 'numbers' | 'support' | 'profile';

const STATUS_META: Record<string, { label: string; tone: 'amber' | 'blue' | 'violet' | 'emerald' | 'rose' | 'slate' }> = {
  pending: { label: 'Pending', tone: 'amber' },
  pending_confirmation: { label: 'Awaiting confirmation', tone: 'amber' },
  airtime_sent: { label: 'Airtime sent', tone: 'amber' },
  airtime_received: { label: 'Airtime received', tone: 'blue' },
  user_confirmed: { label: 'User confirmed', tone: 'blue' },
  pickup: { label: 'Picked up', tone: 'violet' },
  processing: { label: 'Processing', tone: 'violet' },
  completed: { label: 'Completed', tone: 'emerald' },
  completed_and_paid: { label: 'Completed & paid', tone: 'emerald' },
  rejected: { label: 'Rejected', tone: 'rose' },
  cancelled: { label: 'Cancelled', tone: 'rose' },
  not_received_contact_support: { label: 'Not received', tone: 'rose' },
};

const TONE_CLASSES: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30',
};

const TONE_DOT: Record<string, string> = {
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
};

const NETWORKS = ['mtn', 'airtel', 'glo', '9mobile'];

const IN_PROGRESS_STATUSES = new Set<string>([
  'pending', 'airtime_sent', 'airtime_received', 'user_confirmed', 'pending_confirmation',
  'pickup', 'processing',
]);

interface InventoryItem {
  id: string;
  phoneNumber: string;
  network: string;
  dailyLimit: string;
  usedToday: string;
  isActive: boolean;
  label: string | null;
  priority: number;
  createdAt: string;
}

function StatusChip({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status, tone: 'slate' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONE_CLASSES[meta.tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[meta.tone]}`} />
      {meta.label}
    </span>
  );
}

function ageString(iso?: string) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

function ageTone(iso?: string): 'slate' | 'amber' | 'rose' {
  if (!iso) return 'slate';
  const m = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (m > 60) return 'rose';
  if (m > 15) return 'amber';
  return 'slate';
}

function fmtNaira(v: any) {
  return `₦${parseFloat(v || 0).toLocaleString()}`;
}

export default function A2CAgentDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [section, setSection] = useState<Section>('overview');

  const [inventoryJobs, setInventoryJobs] = useState<any[]>([]);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<InventoryItem[]>([]);

  const [loadingInv, setLoadingInv] = useState(false);
  const [loadingMine, setLoadingMine] = useState(false);
  const [loadingHist, setLoadingHist] = useState(false);
  const [loadingNumbers, setLoadingNumbers] = useState(false);

  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [completeModal, setCompleteModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [actionForm, setActionForm] = useState({ agentNotes: '', rejectionReason: '' });
  const [actionBusy, setActionBusy] = useState(false);

  const [showAddNumber, setShowAddNumber] = useState(false);
  const [numberForm, setNumberForm] = useState({ phoneNumber: '', network: 'mtn', dailyLimit: '500000', label: '' });
  const [addBusy, setAddBusy] = useState(false);

  const [historyFilter, setHistoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Support inbox
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // ───────────── auth + initial load
  useEffect(() => {
    if (!getToken()) { setLocation('/agent/a2c/login'); return; }
    fetchProfile();
    fetchStats();
    fetchInventoryJobs();
    fetchMyJobs();
  }, []);

  // ───────────── live polling for inventory + my jobs (every 10s)
  useEffect(() => {
    const h = setInterval(() => {
      if (!getToken()) return;
      fetchInventoryJobs();
      fetchMyJobs();
      fetchStats();
    }, 10_000);
    return () => clearInterval(h);
  }, []);

  // ───────────── per-section loaders
  useEffect(() => {
    if (section === 'history') fetchHistory();
    if (section === 'numbers') fetchPhoneNumbers();
    if (section === 'support') { fetchSupport(); markSupportRead(); }
  }, [section]);

  useEffect(() => { if (section === 'history') fetchHistory(); }, [historyFilter]);

  // ───────────── data
  const fetchProfile = async () => {
    const r = await fetch('/api/a2c-agent/profile', { headers: { Authorization: `Bearer ${getToken()}` } });
    const d = await r.json();
    if (d.status === 'success') setProfile(d.data.agent);
  };

  const fetchStats = async () => {
    const r = await fetch('/api/a2c-agent/stats', { headers: { Authorization: `Bearer ${getToken()}` } });
    const d = await r.json();
    if (d.status === 'success') setStats(d.data);
  };

  const fetchInventoryJobs = async () => {
    setLoadingInv(true);
    try {
      const r = await fetch('/api/a2c-agent/requests/inventory', { headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await r.json();
      if (d.status === 'success') setInventoryJobs(d.data.requests || []);
    } finally { setLoadingInv(false); }
  };

  const fetchMyJobs = async () => {
    setLoadingMine(true);
    try {
      const r = await fetch('/api/a2c-agent/requests/mine', { headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await r.json();
      if (d.status === 'success') setMyJobs(d.data.requests || []);
    } finally { setLoadingMine(false); }
  };

  const fetchHistory = async () => {
    setLoadingHist(true);
    try {
      const params = new URLSearchParams();
      if (historyFilter !== 'all') params.append('status', historyFilter);
      const r = await fetch(`/api/a2c-agent/requests?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await r.json();
      if (d.status === 'success') {
        const onlyDone = (d.data.requests || []).filter((j: any) => ['completed', 'rejected', 'cancelled', 'completed_and_paid', 'not_received_contact_support'].includes(j.status));
        setHistory(onlyDone);
      }
    } finally { setLoadingHist(false); }
  };

  const fetchPhoneNumbers = async () => {
    setLoadingNumbers(true);
    try {
      const r = await fetch('/api/a2c-agent/inventory', { headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await r.json();
      if (d.status === 'success') setPhoneNumbers(d.data.inventory || []);
    } finally { setLoadingNumbers(false); }
  };

  const fetchSupport = async () => {
    setSupportLoading(true);
    try {
      const r = await fetch('/api/a2c-agent/support-messages', { headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await r.json();
      if (d.status === 'success') setSupportMessages(d.data.messages || []);
    } finally { setSupportLoading(false); }
  };

  const markSupportRead = async () => {
    try { await fetch('/api/a2c-agent/support-messages/mark-read', { method: 'PUT', headers: { Authorization: `Bearer ${getToken()}` } }); } catch {}
  };

  const sendReply = async (id: string) => {
    const text = replyText[id]?.trim();
    if (!text) return;
    const r = await fetch(`/api/a2c-agent/support-messages/${id}/reply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
    const d = await r.json();
    if (d.status === 'success') {
      setReplyText(prev => ({ ...prev, [id]: '' }));
      setReplyingTo(null);
      fetchSupport();
    }
  };

  // ───────────── actions
  const pickJob = async (job: any) => {
    // Optimistic remove from inventory list
    setInventoryJobs(prev => prev.filter(j => j.id !== job.id));
    const r = await fetch(`/api/a2c-agent/requests/${job.id}/claim`, {
      method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
    });
    const d = await r.json();
    if (r.ok && d.status === 'success') {
      toast({ title: 'Picked', variant: 'success', description: `${job.trackingId} added to your jobs` });
      fetchMyJobs();
      fetchInventoryJobs();
      fetchStats();
      setSection('mine');
    } else {
      toast({ title: 'Could not pick', variant: 'destructive', description: d.message || 'Job may have been claimed by another agent.' });
      fetchInventoryJobs();
    }
  };

  const releaseJob = async (job: any) => {
    const r = await fetch(`/api/a2c-agent/requests/${job.id}/release`, {
      method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
    });
    const d = await r.json();
    if (r.ok && d.status === 'success') {
      toast({ title: 'Released', variant: 'success' });
      fetchMyJobs(); fetchInventoryJobs();
    } else {
      toast({ title: 'Cannot release', variant: 'destructive', description: d.message });
    }
  };

  const updateStatus = async (status: 'completed' | 'rejected') => {
    if (!selectedJob) return;
    if (status === 'rejected' && !actionForm.rejectionReason.trim()) {
      toast({ title: 'Reason required', variant: 'destructive' });
      return;
    }
    setActionBusy(true);
    const r = await fetch(`/api/a2c-agent/requests/${selectedJob.id}/update-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, agentNotes: actionForm.agentNotes, rejectionReason: actionForm.rejectionReason }),
    });
    const d = await r.json();
    setActionBusy(false);
    if (r.ok && d.status === 'success') {
      toast({ title: status === 'completed' ? 'Marked completed' : 'Rejected', variant: 'success' });
      setCompleteModal(false); setRejectModal(false);
      setActionForm({ agentNotes: '', rejectionReason: '' });
      fetchMyJobs(); fetchStats();
    } else {
      toast({ title: 'Update failed', variant: 'destructive', description: d.message });
    }
  };

  const addNumber = async () => {
    if (!numberForm.phoneNumber || !numberForm.network) {
      toast({ title: 'Phone & network required', variant: 'destructive' });
      return;
    }
    setAddBusy(true);
    const r = await fetch('/api/a2c-agent/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(numberForm),
    });
    const d = await r.json();
    setAddBusy(false);
    if (d.status === 'success') {
      toast({ title: 'Number added', variant: 'success' });
      setShowAddNumber(false);
      setNumberForm({ phoneNumber: '', network: 'mtn', dailyLimit: '500000', label: '' });
      fetchPhoneNumbers();
    } else {
      toast({ title: 'Failed', variant: 'destructive', description: d.message });
    }
  };

  const toggleNumber = async (id: string, isActive: boolean) => {
    const r = await fetch(`/api/a2c-agent/inventory/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ isActive }),
    });
    if ((await r.json()).status === 'success') fetchPhoneNumbers();
  };

  const deleteNumber = async (id: string) => {
    if (!confirm('Remove this phone number?')) return;
    const r = await fetch(`/api/a2c-agent/inventory/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
    });
    if ((await r.json()).status === 'success') fetchPhoneNumbers();
  };

  const logout = () => {
    tokenStorage.removeItem('a2cAgentToken');
    tokenStorage.removeItem('a2cAgentRefreshToken');
    tokenStorage.removeItem('a2cAgentInfo');
    setLocation('/agent/a2c/login');
  };

  // ───────────── derived
  const unreadSupport = useMemo(
    () => supportMessages.filter((m: any) => !m.readAt && m.toDepartment === 'a2c').length,
    [supportMessages],
  );
  const filteredInventory = useMemo(() => {
    if (!search.trim()) return inventoryJobs;
    const s = search.toLowerCase();
    return inventoryJobs.filter((j: any) =>
      (j.trackingId || '').toLowerCase().includes(s) ||
      (j.userName || '').toLowerCase().includes(s) ||
      (j.phoneNumber || '').toLowerCase().includes(s) ||
      (j.receivingNumber || '').toLowerCase().includes(s),
    );
  }, [inventoryJobs, search]);

  const filteredMine = useMemo(() => {
    if (!search.trim()) return myJobs;
    const s = search.toLowerCase();
    return myJobs.filter((j: any) =>
      (j.trackingId || '').toLowerCase().includes(s) ||
      (j.userName || '').toLowerCase().includes(s) ||
      (j.phoneNumber || '').toLowerCase().includes(s),
    );
  }, [myJobs, search]);

  // ───────────── shell
  const navItems: { key: Section; label: string; icon: any; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'inventory', label: 'Job Inventory', icon: Inbox, badge: inventoryJobs.length },
    { key: 'mine', label: 'My Jobs', icon: Briefcase, badge: myJobs.length },
    { key: 'history', label: 'History', icon: HistoryIcon },
    { key: 'numbers', label: 'Phone Numbers', icon: Phone },
    { key: 'support', label: 'Support Inbox', icon: MessageSquare, badge: unreadSupport },
    { key: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100" style={{ fontFeatureSettings: '"tnum"' }}>
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Arapoint A2C</p>
            <p className="text-[11px] text-slate-500">Agent Console</p>
          </div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = section === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge ? (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white dark:bg-slate-900/10 dark:text-slate-900' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => setLocation('/agent/a2c/performance')}>
            <TrendingUp className="h-4 w-4" /> My Performance
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={logout}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 lg:px-6 py-3">
          <div className="lg:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white">
              <Banknote className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">A2C</span>
          </div>
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by tracking ID, customer, phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>
          <Button variant="ghost" size="sm" className="relative" onClick={() => setSection('support')}>
            <Bell className="h-4 w-4" />
            {unreadSupport > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </Button>
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium leading-tight">{profile?.name || 'Agent'}</p>
              <p className="text-[10px] text-slate-500 leading-tight">{profile?.employeeId || '—'}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-xs font-semibold">
              {(profile?.name || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Mobile nav (horizontal scroll chips) */}
        <div className="lg:hidden flex gap-1 overflow-x-auto px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {navItems.map(item => {
            const active = section === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {item.label}
                {item.badge ? <span className="font-semibold">{item.badge}</span> : null}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <main className="flex-1 px-4 lg:px-6 py-6 space-y-6 max-w-[1400px] w-full mx-auto">
          {section === 'overview' && (
            <Overview
              stats={stats}
              inventoryCount={inventoryJobs.length}
              myCount={myJobs.length}
              recentInventory={inventoryJobs.slice(0, 5)}
              recentMine={myJobs.slice(0, 5)}
              onPick={pickJob}
              onOpenJob={(j: any) => { setSelectedJob(j); setSection('mine'); }}
              onGoInventory={() => setSection('inventory')}
              onGoMine={() => setSection('mine')}
            />
          )}

          {section === 'inventory' && (
            <InventoryPanel
              loading={loadingInv}
              jobs={filteredInventory}
              onPick={pickJob}
              onRefresh={fetchInventoryJobs}
            />
          )}

          {section === 'mine' && (
            <MyJobsPanel
              loading={loadingMine}
              jobs={filteredMine}
              onComplete={(j: any) => { setSelectedJob(j); setActionForm({ agentNotes: '', rejectionReason: '' }); setCompleteModal(true); }}
              onReject={(j: any) => { setSelectedJob(j); setActionForm({ agentNotes: '', rejectionReason: '' }); setRejectModal(true); }}
              onRelease={releaseJob}
              onRefresh={fetchMyJobs}
            />
          )}

          {section === 'history' && (
            <HistoryPanel
              loading={loadingHist}
              jobs={history}
              filter={historyFilter}
              setFilter={setHistoryFilter}
              onRefresh={fetchHistory}
            />
          )}

          {section === 'numbers' && (
            <PhoneNumbersPanel
              loading={loadingNumbers}
              items={phoneNumbers}
              onAdd={() => setShowAddNumber(true)}
              onToggle={toggleNumber}
              onDelete={deleteNumber}
            />
          )}

          {section === 'support' && (
            <SupportPanel
              loading={supportLoading}
              messages={supportMessages}
              replyText={replyText}
              setReplyText={setReplyText}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              onSendReply={sendReply}
              onRefresh={() => { fetchSupport(); markSupportRead(); }}
            />
          )}

          {section === 'profile' && <ProfilePanel profile={profile} />}
        </main>
      </div>

      {/* Add phone number */}
      <Dialog open={showAddNumber} onOpenChange={setShowAddNumber}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add phone number</DialogTitle>
            <DialogDescription>Add a number to receive customer airtime.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pn">Phone number</Label>
              <Input id="pn" placeholder="08012345678" value={numberForm.phoneNumber} onChange={e => setNumberForm({ ...numberForm, phoneNumber: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Network</Label>
              <Select value={numberForm.network} onValueChange={v => setNumberForm({ ...numberForm, network: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NETWORKS.map(n => <SelectItem key={n} value={n}>{n.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dl">Daily limit (₦)</Label>
              <Input id="dl" type="number" value={numberForm.dailyLimit} onChange={e => setNumberForm({ ...numberForm, dailyLimit: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lbl">Label</Label>
              <Input id="lbl" placeholder="Primary, Backup…" value={numberForm.label} onChange={e => setNumberForm({ ...numberForm, label: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNumber(false)}>Cancel</Button>
            <Button onClick={addNumber} disabled={addBusy}>{addBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete modal */}
      <Dialog open={completeModal} onOpenChange={setCompleteModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700"><CheckCircle className="h-5 w-5" /> Mark job completed</DialogTitle>
            <DialogDescription>Confirm payment was sent and the customer was satisfied.</DialogDescription>
          </DialogHeader>
          {selectedJob && <JobSummary job={selectedJob} />}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea placeholder="e.g. Bank transfer ref, customer confirmation…" value={actionForm.agentNotes} onChange={e => setActionForm({ ...actionForm, agentNotes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteModal(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus('completed')} disabled={actionBusy}>
              {actionBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm completion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={rejectModal} onOpenChange={setRejectModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700"><XCircle className="h-5 w-5" /> Reject job</DialogTitle>
            <DialogDescription>The customer will be notified with your reason.</DialogDescription>
          </DialogHeader>
          {selectedJob && <JobSummary job={selectedJob} />}
          <div className="space-y-2">
            <Label>Rejection reason <span className="text-rose-600">*</span></Label>
            <Textarea placeholder="Why is this being rejected?" value={actionForm.rejectionReason} onChange={e => setActionForm({ ...actionForm, rejectionReason: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Internal notes (optional)</Label>
            <Textarea value={actionForm.agentNotes} onChange={e => setActionForm({ ...actionForm, agentNotes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => updateStatus('rejected')} disabled={actionBusy}>
              {actionBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, trend, tone = 'slate' }: { icon: any; label: string; value: any; trend?: string; tone?: string }) {
  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
            {trend && <p className="mt-1 text-[11px] text-slate-500">{trend}</p>}
          </div>
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Overview({ stats, inventoryCount, myCount, recentInventory, recentMine, onPick, onGoInventory, onGoMine }: any) {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Overview"
        description="Live snapshot of your queue, jobs, and performance."
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Inbox} label="Available to pick" value={inventoryCount} tone="amber" />
        <KpiCard icon={Briefcase} label="My active jobs" value={myCount} tone="violet" />
        <KpiCard icon={CheckCircle} label="Completed (lifetime)" value={stats.totalCompletedRequests || 0} tone="emerald" />
        <KpiCard icon={Activity} label="Awaiting confirmation" value={stats.awaiting || 0} tone="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 shadow-none">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold">Action queue</p>
                <p className="text-xs text-slate-500">Latest jobs available to pick</p>
              </div>
              <Button size="sm" variant="ghost" className="text-xs" onClick={onGoInventory}>
                View all <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            {recentInventory.length === 0 ? (
              <EmptyState icon={Inbox} title="You're all caught up" subtitle="No unassigned jobs in the queue." compact />
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {recentInventory.map((j: any) => (
                  <li key={j.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3 text-slate-400" />
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400 truncate">{j.trackingId}</span>
                        <StatusChip status={j.status} />
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span className="truncate">{j.userName || 'Unknown'}</span>
                        <span>·</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">{fmtNaira(j.airtimeAmount)}</span>
                        <span>→</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtNaira(j.cashAmount)}</span>
                      </div>
                    </div>
                    <span className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded ${TONE_CLASSES[ageTone(j.createdAt)]}`}>
                      <Clock className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                      {ageString(j.createdAt)}
                    </span>
                    <Button size="sm" className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white" onClick={() => onPick(j)}>
                      Pick
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-none">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold">My jobs</p>
                <p className="text-xs text-slate-500">Currently in your queue</p>
              </div>
              <Button size="sm" variant="ghost" className="text-xs" onClick={onGoMine}>
                Open <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            {recentMine.length === 0 ? (
              <EmptyState icon={Briefcase} title="No active jobs" subtitle="Pick a job to start." compact />
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {recentMine.map((j: any) => (
                  <li key={j.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-500 truncate">{j.trackingId}</span>
                      <StatusChip status={j.status} />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 truncate">{j.userName || 'Unknown'}</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtNaira(j.cashAmount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InventoryPanel({ loading, jobs, onPick, onRefresh }: any) {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Job Inventory"
        description="Unassigned jobs. Pick a job to claim it — first agent wins."
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
              Live · refreshes every 10s
            </span>
            <Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw className="h-3.5 w-3.5" /></Button>
          </div>
        }
      />
      <Card className="border-slate-200 dark:border-slate-800 shadow-none overflow-hidden">
        {loading && jobs.length === 0 ? (
          <SkeletonRows />
        ) : jobs.length === 0 ? (
          <EmptyState icon={Inbox} title="Inventory is empty" subtitle="New jobs will appear here automatically." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Tracking</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium">Receiving #</th>
                  <th className="px-3 py-3 font-medium text-right">Amount</th>
                  <th className="px-3 py-3 font-medium">Bank</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Age</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {jobs.map((j: any) => (
                  <tr key={j.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                    <td className="px-5 py-3">
                      <div className="font-mono text-xs">{j.trackingId}</div>
                      <Badge variant="outline" className="mt-1 text-[10px] uppercase">{j.network}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{j.userName || '—'}</div>
                      <div className="text-xs text-slate-500">{j.phoneNumber}</div>
                    </td>
                    <td className="px-3 py-3">
                      {j.receivingNumber ? <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400">{j.receivingNumber}</span> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <div>{fmtNaira(j.airtimeAmount)}</div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">→ {fmtNaira(j.cashAmount)}</div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div>{j.bankName || '—'}</div>
                      <div className="font-mono text-slate-500">{j.accountNumber || '—'}</div>
                    </td>
                    <td className="px-3 py-3"><StatusChip status={j.status} /></td>
                    <td className="px-3 py-3">
                      <span className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded ${TONE_CLASSES[ageTone(j.createdAt)]}`}>
                        {ageString(j.createdAt)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white" onClick={() => onPick(j)}>
                        Pick
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function MyJobsPanel({ loading, jobs, onComplete, onReject, onRelease, onRefresh }: any) {
  const active = (jobs as any[]).filter((j: any) => IN_PROGRESS_STATUSES.has(j.status));
  return (
    <div className="space-y-4">
      <SectionHeader
        title="My Jobs"
        description="Jobs you've claimed. Complete or reject from here."
        action={<Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw className="h-3.5 w-3.5" /></Button>}
      />
      {loading && active.length === 0 ? <SkeletonRows /> : active.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800 shadow-none">
          <EmptyState icon={Briefcase} title="No active jobs" subtitle="Pick one from Job Inventory to begin." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {active.map((j: any) => (
            <Card key={j.id} className="border-slate-200 dark:border-slate-800 shadow-none">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{j.trackingId}</span>
                      <Badge variant="outline" className="text-[10px] uppercase">{j.network}</Badge>
                    </div>
                    <p className="text-sm font-semibold mt-1">{j.userName || 'Customer'}</p>
                    <p className="text-xs text-slate-500">{j.phoneNumber}</p>
                  </div>
                  <StatusChip status={j.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 dark:bg-slate-900/50 rounded-md p-3 border border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="text-slate-500 uppercase tracking-wide text-[10px]">Airtime</p>
                    <p className="font-semibold tabular-nums mt-0.5">{fmtNaira(j.airtimeAmount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase tracking-wide text-[10px]">Pay-out</p>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">{fmtNaira(j.cashAmount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase tracking-wide text-[10px]">Age</p>
                    <p className="font-semibold tabular-nums mt-0.5">{ageString(j.createdAt)}</p>
                  </div>
                </div>

                <div className="text-xs space-y-0.5">
                  <p><span className="text-slate-500">Receiving:</span> <span className="font-mono">{j.receivingNumber || '—'}</span></p>
                  <p><span className="text-slate-500">Bank:</span> {j.bankName || '—'} <span className="font-mono">{j.accountNumber || ''}</span></p>
                  <p><span className="text-slate-500">Account name:</span> {j.accountName || '—'}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 flex-1" onClick={() => onComplete(j)}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Complete
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => onReject(j)}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  {j.status === 'pickup' && (
                    <Button size="sm" variant="outline" onClick={() => onRelease(j)}>
                      Release
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryPanel({ loading, jobs, filter, setFilter, onRefresh }: any) {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="History"
        description="Completed, rejected, and cancelled jobs you've handled."
        action={
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw className="h-3.5 w-3.5" /></Button>
          </div>
        }
      />
      <Card className="border-slate-200 dark:border-slate-800 shadow-none overflow-hidden">
        {loading ? <SkeletonRows /> : jobs.length === 0 ? (
          <EmptyState icon={HistoryIcon} title="No history yet" subtitle="Completed jobs will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Tracking</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium text-right">Amount</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">When</th>
                  <th className="px-5 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {jobs.map((j: any) => (
                  <tr key={j.id}>
                    <td className="px-5 py-3 font-mono text-xs">{j.trackingId}</td>
                    <td className="px-3 py-3">
                      <div>{j.userName || '—'}</div>
                      <div className="text-xs text-slate-500">{j.phoneNumber}</div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmtNaira(j.cashAmount)}</td>
                    <td className="px-3 py-3"><StatusChip status={j.status} /></td>
                    <td className="px-3 py-3 text-xs text-slate-500 tabular-nums">{j.updatedAt ? new Date(j.updatedAt).toLocaleString() : '—'}</td>
                    <td className="px-5 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">{j.agentNotes || j.rejectionReason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function PhoneNumbersPanel({ loading, items, onAdd, onToggle, onDelete }: any) {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Phone Numbers"
        description="Manage receiving numbers (max 5 active)."
        action={<Button size="sm" onClick={onAdd}><Plus className="h-4 w-4 mr-1" /> Add number</Button>}
      />
      {loading ? <SkeletonRows /> : items.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800 shadow-none">
          <EmptyState icon={Phone} title="No numbers added" subtitle="Add your first receiving number." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item: any) => (
            <Card key={item.id} className={`border-slate-200 dark:border-slate-800 shadow-none ${!item.isActive && 'opacity-60'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-semibold">{item.phoneNumber}</p>
                      <Badge variant="outline" className="text-[10px] uppercase">{item.network}</Badge>
                    </div>
                    {item.label && <p className="text-xs text-slate-500 mt-1">{item.label}</p>}
                  </div>
                  <Switch checked={item.isActive} onCheckedChange={(v) => onToggle(item.id, v)} />
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Used today: <span className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">{fmtNaira(item.usedToday)}</span> / {fmtNaira(item.dailyLimit)}
                </div>
                <div className="mt-3 flex justify-end">
                  <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => onDelete(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SupportPanel({ loading, messages, replyText, setReplyText, replyingTo, setReplyingTo, onSendReply, onRefresh }: any) {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Support Inbox"
        description="Messages from the support team."
        action={<Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw className="h-3.5 w-3.5" /></Button>}
      />
      {loading ? <SkeletonRows /> : messages.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800 shadow-none">
          <EmptyState icon={MessageSquare} title="No messages" subtitle="Support communications will appear here." />
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((msg: any) => (
            <Card key={msg.id} className={`border-slate-200 dark:border-slate-800 shadow-none ${!msg.readAt && msg.toDepartment === 'a2c' ? 'ring-1 ring-blue-200 dark:ring-blue-500/30' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${msg.fromType === 'support_agent' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'}`}>
                      {msg.fromType === 'support_agent' ? 'Support' : 'A2C Agent'}
                    </span>
                    <span className="text-xs text-slate-500">{msg.fromName}</span>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}</span>
                </div>
                {msg.linkedOrderId && <p className="text-xs text-slate-500 mb-2">Linked order: <span className="font-mono">{msg.linkedOrderId}</span></p>}
                <p className="text-sm">{msg.message}</p>
                {msg.fromType === 'support_agent' && (
                  <div className="mt-3">
                    {replyingTo === msg.id ? (
                      <div className="space-y-2">
                        <Textarea placeholder="Type your reply…" value={replyText[msg.id] || ''} onChange={e => setReplyText((p: any) => ({ ...p, [msg.id]: e.target.value }))} className="min-h-[80px] text-sm" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => onSendReply(msg.id)}><Send className="h-3.5 w-3.5 mr-1" /> Send</Button>
                          <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setReplyingTo(msg.id)}>Reply</Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfilePanel({ profile }: any) {
  if (!profile) return <div className="text-sm text-slate-500">Loading…</div>;
  const Field = ({ label, value }: any) => (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
  return (
    <div className="space-y-4">
      <SectionHeader title="Profile" description="Your account information." />
      <Card className="border-slate-200 dark:border-slate-800 shadow-none">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Name" value={profile.name} />
          <Field label="Email" value={profile.email} />
          <Field label="Employee ID" value={profile.employeeId || 'N/A'} />
          <Field label="Status" value={<Badge variant={profile.isAvailable ? 'default' : 'secondary'}>{profile.isAvailable ? 'Active' : 'Inactive'}</Badge>} />
          <Field label="Total completed" value={`${profile.totalCompletedRequests || 0} jobs`} />
        </CardContent>
      </Card>
    </div>
  );
}

function JobSummary({ job }: any) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3 border border-slate-200 dark:border-slate-800 text-sm space-y-1.5">
      <div className="flex justify-between"><span className="text-slate-500">Tracking</span><span className="font-mono">{job.trackingId}</span></div>
      <div className="flex justify-between"><span className="text-slate-500">Customer</span><span>{job.userName || '—'}</span></div>
      <div className="flex justify-between"><span className="text-slate-500">Pay-out</span><span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtNaira(job.cashAmount)}</span></div>
      <div className="border-t border-slate-200 dark:border-slate-800 pt-1.5 mt-1.5 text-xs">
        <div>Pay to: <span className="font-medium">{job.bankName}</span></div>
        <div className="font-mono">{job.accountNumber}</div>
        <div className="text-slate-500">{job.accountName}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle, compact }: any) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-14'} px-4`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="p-4 space-y-2">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="h-12 rounded-md bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
      ))}
    </div>
  );
}
