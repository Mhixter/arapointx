import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, CheckCircle, AlertTriangle, XCircle, HelpCircle, Activity } from "lucide-react";
import { tokenStorage } from "@/lib/tokenStorage";

interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'broken' | 'unknown';
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  consecutiveFailures: number;
  lastError: string | null;
  lastResponsePreview?: string | null;
  isAutoDisabled: boolean;
  autoDisabledAt: string | null;
  totalChecks: number;
  totalFailures: number;
}

const PROVIDER_LABELS: Record<string, string> = {
  waec: 'WAEC',
  neco: 'NECO',
  nabteb: 'NABTEB',
  nbais: 'NBAIS',
};

function StatusBadge({ status, disabled }: { status: string; disabled: boolean }) {
  if (disabled) return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" />Auto-Disabled</Badge>;
  switch (status) {
    case 'healthy': return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Healthy</Badge>;
    case 'degraded': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertTriangle className="h-3 w-3 mr-1" />Degraded</Badge>;
    case 'broken': return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" />Broken</Badge>;
    default: return <Badge className="bg-gray-100 text-gray-800 border-gray-200"><HelpCircle className="h-3 w-3 mr-1" />Unknown</Badge>;
  }
}

function fmtDate(d: string | null): string {
  if (!d) return 'Never';
  try {
    const date = new Date(d);
    const diff = Date.now() - date.getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return date.toLocaleString();
  } catch { return d; }
}

export default function AdminPortalHealth() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [checking, setChecking] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-portal-health'],
    queryFn: async () => {
      const token = tokenStorage.getItem('accessToken');
      const res = await fetch('/api/admin/portal-health', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      return (json.data?.providers || []) as ProviderHealth[];
    },
    refetchInterval: 60_000,
  });

  const checkMutation = useMutation({
    mutationFn: async (provider: string) => {
      setChecking(provider);
      const token = tokenStorage.getItem('accessToken');
      const res = await fetch(`/api/admin/portal-health/check/${provider}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Check failed');
      return res.json();
    },
    onSuccess: (_data, provider) => {
      toast({ title: 'Health check complete', description: `${PROVIDER_LABELS[provider]} checked` });
      qc.invalidateQueries({ queryKey: ['admin-portal-health'] });
      setChecking(null);
    },
    onError: () => { setChecking(null); toast({ title: 'Check failed', variant: 'destructive' }); },
  });

  const enableMutation = useMutation({
    mutationFn: async (provider: string) => {
      const token = tokenStorage.getItem('accessToken');
      const res = await fetch(`/api/admin/portal-health/enable/${provider}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Re-enable failed');
      return res.json();
    },
    onSuccess: (_data, provider) => {
      toast({ title: 'Provider re-enabled', description: `${PROVIDER_LABELS[provider]} is now active` });
      qc.invalidateQueries({ queryKey: ['admin-portal-health'] });
    },
    onError: () => toast({ title: 'Re-enable failed', variant: 'destructive' }),
  });

  if (isLoading) return <div className="p-6 flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Loading portal health...</div>;

  const providers = data || [];
  const broken = providers.filter(p => p.status === 'broken' || p.isAutoDisabled).length;
  const degraded = providers.filter(p => p.status === 'degraded').length;
  const healthy = providers.filter(p => p.status === 'healthy').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-green-600" />Portal Health Monitor</h1>
          <p className="text-sm text-muted-foreground mt-1">Automatic health checks every 6 hours. Providers with 3 consecutive failures are auto-disabled.</p>
        </div>
        <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ['admin-portal-health'] })}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Healthy</div><div className="text-2xl font-bold text-green-600">{healthy}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Degraded</div><div className="text-2xl font-bold text-yellow-600">{degraded}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Broken / Disabled</div><div className="text-2xl font-bold text-red-600">{broken}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => (
          <Card key={p.provider}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{PROVIDER_LABELS[p.provider] || p.provider.toUpperCase()}</CardTitle>
                <StatusBadge status={p.status} disabled={p.isAutoDisabled} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Last check:</span> {fmtDate(p.lastCheckedAt)}</div>
                <div><span className="text-muted-foreground">Last success:</span> {fmtDate(p.lastSuccessAt)}</div>
                <div><span className="text-muted-foreground">Consecutive fails:</span> <span className={p.consecutiveFailures > 0 ? 'text-red-600 font-semibold' : ''}>{p.consecutiveFailures}</span></div>
                <div><span className="text-muted-foreground">Total checks:</span> {p.totalChecks} ({p.totalFailures} failed)</div>
              </div>
              {p.lastError && (
                <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-800">
                  <strong>Last error:</strong> {p.lastError}
                  {p.lastResponsePreview && <div className="mt-1 italic opacity-75 break-all">"{p.lastResponsePreview.slice(0, 150)}..."</div>}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" disabled={checking === p.provider} onClick={() => checkMutation.mutate(p.provider)}>
                  {checking === p.provider ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Check Now
                </Button>
                {p.isAutoDisabled && (
                  <Button size="sm" variant="default" onClick={() => enableMutation.mutate(p.provider)} disabled={enableMutation.isPending}>
                    Re-enable
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
