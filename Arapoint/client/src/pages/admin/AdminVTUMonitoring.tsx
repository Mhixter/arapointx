import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { tokenStorage } from "@/lib/tokenStorage";
import {
  Loader2, RefreshCw, Smartphone, Wifi, Zap, Tv, ShieldCheck,
  CheckCircle2, AlertTriangle, XCircle, TrendingUp, Clock, Activity,
  ToggleLeft, ToggleRight, Settings, Database
} from "lucide-react";

const API = (path: string, opts?: RequestInit) =>
  fetch(`/api/admin${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${tokenStorage.getToken()}`, "Content-Type": "application/json", ...(opts?.headers || {}) },
  });

type Provider = 'airtimenigeria' | 'vtpass' | 'vtugate' | 'unknown';
type ProviderStats = { total: number; completed: number; pending: number; failed: number; successRate: number };

interface MonitoringData {
  airtime: { allTime: Record<string, ProviderStats>; last24h: Record<string, ProviderStats> };
  data: { allTime: Record<string, ProviderStats>; last24h: Record<string, ProviderStats> };
  electricity: { allTime: Record<string, ProviderStats>; last24h: Record<string, ProviderStats> };
  cable: { allTime: Record<string, ProviderStats>; last24h: Record<string, ProviderStats> };
  identity: {
    allTime: { total: number; verified: number; failed: number; pending: number; successRate: number };
    last24h: { total: number; verified: number; failed: number; pending: number; successRate: number };
  };
  generatedAt: string;
}

interface AggregatorSettings {
  active_vtu_airtime?: string;
  active_vtu_data?: string;
  active_vtu_electricity?: string;
  active_identity_provider?: string;
  identity_prembly_enabled?: string;
  identity_youverify_enabled?: string;
  vtu_airtimenigeria_enabled?: string;
  vtu_vtpass_enabled?: string;
  vtu_vtugate_enabled?: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  airtimenigeria: 'AirtimeNigeria',
  vtpass: 'VTPass',
  vtugate: 'VTUGate',
  unknown: 'Unknown',
};

const PROVIDER_COLORS: Record<string, string> = {
  airtimenigeria: 'bg-blue-500',
  vtpass: 'bg-purple-500',
  vtugate: 'bg-green-500',
  unknown: 'bg-gray-400',
};

function SuccessRateBadge({ rate }: { rate: number }) {
  if (rate >= 90) return <Badge className="bg-green-100 text-green-800 border-green-200">{rate}%</Badge>;
  if (rate >= 70) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{rate}%</Badge>;
  return <Badge className="bg-red-100 text-red-800 border-red-200">{rate}%</Badge>;
}

function ProviderStatsCard({ title, icon: Icon, stats24h, statsAll, color }: {
  title: string;
  icon: any;
  stats24h: Record<string, ProviderStats>;
  statsAll: Record<string, ProviderStats>;
  color: string;
}) {
  const hasData = Object.keys(stats24h).length > 0 || Object.keys(statsAll).length > 0;
  const allProviders = new Set([...Object.keys(stats24h), ...Object.keys(statsAll)]);

  return (
    <Card className="border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${color}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No transactions yet</p>
        ) : (
          <div className="space-y-4">
            {[...allProviders].map(provider => {
              const h24 = stats24h[provider] || { total: 0, completed: 0, pending: 0, failed: 0, successRate: 0 };
              const all = statsAll[provider] || { total: 0, completed: 0, pending: 0, failed: 0, successRate: 0 };
              return (
                <div key={provider} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${PROVIDER_COLORS[provider] || 'bg-gray-400'}`} />
                      <span className="font-medium text-sm">{PROVIDER_LABELS[provider] || provider}</span>
                    </div>
                    <SuccessRateBadge rate={h24.successRate} />
                  </div>
                  <Progress value={h24.successRate} className="h-1.5" />
                  <div className="grid grid-cols-4 gap-1 text-xs text-center">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{h24.total}</div>
                      <div className="text-gray-500">24h Total</div>
                    </div>
                    <div>
                      <div className="font-semibold text-green-600">{h24.completed}</div>
                      <div className="text-gray-500">Done</div>
                    </div>
                    <div>
                      <div className="font-semibold text-yellow-600">{h24.pending}</div>
                      <div className="text-gray-500">Pending</div>
                    </div>
                    <div>
                      <div className="font-semibold text-red-600">{h24.failed}</div>
                      <div className="text-gray-500">Failed</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 text-center">All-time: {all.total} total, {all.successRate}% success</div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveProviderSelector({ label, settingKey, value, options, onChange }: {
  label: string;
  settingKey: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex gap-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(settingKey, opt.value)}
            className={`px-3 py-1 text-xs rounded-full border transition-all ${
              value === opt.value
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AdminVTUMonitoring() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingSettings, setPendingSettings] = useState<AggregatorSettings>({});

  const { data: monitoringData, isLoading: monLoading, refetch: refetchMon } = useQuery({
    queryKey: ['vtu-monitoring'],
    queryFn: async () => {
      const res = await API('/vtu-monitoring');
      const json = await res.json();
      return json.data as MonitoringData;
    },
    refetchInterval: 60000,
  });

  const { data: aggData, isLoading: aggLoading, refetch: refetchAgg } = useQuery({
    queryKey: ['aggregator-settings'],
    queryFn: async () => {
      const res = await API('/aggregator-settings');
      const json = await res.json();
      return (json.data?.settings || {}) as AggregatorSettings;
    },
  });

  const saveAggMutation = useMutation({
    mutationFn: async (settings: AggregatorSettings) => {
      const res = await API('/aggregator-settings', {
        method: 'POST',
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error('Failed to save');
    },
    onSuccess: () => {
      toast({ title: 'Settings saved', description: 'Aggregator configuration updated.' });
      queryClient.invalidateQueries({ queryKey: ['aggregator-settings'] });
      setPendingSettings({});
    },
    onError: () => toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' }),
  });

  const syncPlansMutation = useMutation({
    mutationFn: async () => {
      const res = await API('/vtugate/sync-plans', { method: 'POST' });
      const json = await res.json();
      return json;
    },
    onSuccess: (data) => {
      toast({ title: 'Plans synced', description: data.message || 'VTUGate plans synced successfully.' });
    },
    onError: () => toast({ title: 'Sync failed', description: 'Could not sync VTUGate plans.', variant: 'destructive' }),
  });

  const testVtugateMutation = useMutation({
    mutationFn: async () => {
      const res = await API('/payment-gateways/vtugate/test', { method: 'POST' });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: 'VTUGate Connected', description: data.message });
      } else {
        toast({ title: 'VTUGate Issue', description: data.message, variant: 'destructive' });
      }
    },
    onError: () => toast({ title: 'Test failed', variant: 'destructive' }),
  });

  const currentSettings: AggregatorSettings = { ...aggData, ...pendingSettings };
  const hasPending = Object.keys(pendingSettings).length > 0;

  const handleSettingChange = (key: string, value: string) => {
    setPendingSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveAggMutation.mutate(pendingSettings);
  };

  const vtuOptions = [
    { value: 'airtimenigeria', label: 'AirtimeNigeria' },
    { value: 'vtpass', label: 'VTPass' },
    { value: 'vtugate', label: 'VTUGate' },
  ];
  const elecOptions = [
    { value: 'vtpass', label: 'VTPass' },
    { value: 'vtugate', label: 'VTUGate' },
  ];
  const identityOptions = [
    { value: 'prembly', label: 'Prembly' },
    { value: 'youverify', label: 'YouVerify' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            VTU & Identity Monitoring
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Success rates, delivery status, and aggregator management
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetchMon(); refetchAgg(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Aggregator Control Panel */}
      <Card className="border-blue-100 dark:border-blue-900/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
              <Settings className="h-5 w-5" />
              Active Aggregator Settings
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm" variant="outline"
                onClick={() => testVtugateMutation.mutate()}
                disabled={testVtugateMutation.isPending}
              >
                {testVtugateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Test VTUGate
              </Button>
              <Button
                size="sm" variant="outline"
                onClick={() => syncPlansMutation.mutate()}
                disabled={syncPlansMutation.isPending}
              >
                {syncPlansMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Database className="h-4 w-4 mr-1" />}
                Sync VTUGate Plans
              </Button>
              {hasPending && (
                <Button size="sm" onClick={handleSave} disabled={saveAggMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white">
                  {saveAggMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Save Changes
                </Button>
              )}
            </div>
          </div>
          <CardDescription>Select which provider handles each service. Changes take effect on the next transaction.</CardDescription>
        </CardHeader>
        <CardContent>
          {aggLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1 border rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">VTU Services</p>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  <ActiveProviderSelector
                    label="Airtime Provider"
                    settingKey="active_vtu_airtime"
                    value={currentSettings.active_vtu_airtime || 'airtimenigeria'}
                    options={vtuOptions}
                    onChange={handleSettingChange}
                  />
                  <ActiveProviderSelector
                    label="Data Provider"
                    settingKey="active_vtu_data"
                    value={currentSettings.active_vtu_data || 'airtimenigeria'}
                    options={vtuOptions}
                    onChange={handleSettingChange}
                  />
                  <ActiveProviderSelector
                    label="Electricity Provider"
                    settingKey="active_vtu_electricity"
                    value={currentSettings.active_vtu_electricity || 'vtpass'}
                    options={elecOptions}
                    onChange={handleSettingChange}
                  />
                </div>
              </div>
              <div className="space-y-1 border rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Identity Verification</p>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  <ActiveProviderSelector
                    label="Primary Provider"
                    settingKey="active_identity_provider"
                    value={currentSettings.active_identity_provider || 'prembly'}
                    options={identityOptions}
                    onChange={handleSettingChange}
                  />
                </div>
                <div className="mt-4 pt-3 border-t text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <p>• <strong>Prembly</strong> (IdentityPass): Primary identity provider. Has response_code-based error mapping.</p>
                  <p>• <strong>YouVerify</strong>: Fallback identity provider. Configure credentials in Settings → Gateways.</p>
                  <p className="text-blue-600 dark:text-blue-400 mt-2">Note: The identity route automatically uses Prembly if configured and available.</p>
                </div>
              </div>
            </div>
          )}
          {hasPending && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              You have unsaved changes. Click "Save Changes" to apply them.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      {monLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : monitoringData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <ProviderStatsCard
              title="Airtime"
              icon={Smartphone}
              stats24h={monitoringData.airtime.last24h}
              statsAll={monitoringData.airtime.allTime}
              color="bg-blue-500"
            />
            <ProviderStatsCard
              title="Data"
              icon={Wifi}
              stats24h={monitoringData.data.last24h}
              statsAll={monitoringData.data.allTime}
              color="bg-cyan-500"
            />
            <ProviderStatsCard
              title="Electricity"
              icon={Zap}
              stats24h={monitoringData.electricity.last24h}
              statsAll={monitoringData.electricity.allTime}
              color="bg-yellow-500"
            />
            <ProviderStatsCard
              title="Cable TV"
              icon={Tv}
              stats24h={monitoringData.cable.last24h}
              statsAll={monitoringData.cable.allTime}
              color="bg-purple-500"
            />
          </div>

          {/* Identity Monitoring */}
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-500">
                  <ShieldCheck className="h-4 w-4 text-white" />
                </div>
                Identity Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: 'Last 24 Hours', stats: monitoringData.identity.last24h },
                  { label: 'All Time', stats: monitoringData.identity.allTime },
                ].map(({ label, stats }) => (
                  <div key={label} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
                      <SuccessRateBadge rate={stats.successRate} />
                    </div>
                    <Progress value={stats.successRate} className="h-2" />
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.total}</div>
                        <div className="text-xs text-gray-500">Total</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">{stats.verified}</div>
                        <div className="text-xs text-gray-500">Verified</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-yellow-600">{stats.pending}</div>
                        <div className="text-xs text-gray-500">Pending</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600">{stats.failed}</div>
                        <div className="text-xs text-gray-500">Failed</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-gray-400 text-center">
            Last updated: {new Date(monitoringData.generatedAt).toLocaleString()} · Auto-refreshes every minute
          </p>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No monitoring data available yet.</p>
            <p className="text-sm mt-1">Data will appear as transactions are processed.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
