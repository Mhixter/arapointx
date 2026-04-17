import { tokenStorage } from '@/lib/tokenStorage';
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Shield, Database, Globe, Save, Mail, Loader2, Send, CreditCard, CheckCircle2, XCircle, Eye, EyeOff, Headset, Phone, MessageCircle, Trash2, AlertTriangle, Cloud, Upload, Image, Download, RefreshCw, FileDown, FileUp, Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";

export default function AdminSettings() {
  const { toast } = useToast();
  const { refetchSettings } = useSettings();
  const [settings, setSettings] = useState({
    siteName: "Arapoint Solutions",
    siteEmail: "support@arapoint.com.ng",
    sitePhone: "+234 800 123 4567",
    siteAddress: "Lagos, Nigeria",
    maintenanceMode: false,
    emailNotifications: true,
    smsNotifications: true,
    twoFactorAuth: false,
    sessionTimeout: "30",
    maxLoginAttempts: "5",
    currency: "NGN",
    timezone: "Africa/Lagos",
    waecUrl: "",
    necoUrl: "",
    nabtebUrl: "",
    nbaisUrl: "",
    jambSlipUrl: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    smtpFromName: "Arapoint",
    smtpFromEmail: "",
    supportWhatsappChannel: "",
    supportWhatsappGroup: "",
  });
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [gateways, setGateways] = useState<Record<string, any>>({});
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [gatewayForms, setGatewayForms] = useState<Record<string, Record<string, string>>>({});
  const [savingGateway, setSavingGateway] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [clearingTestData, setClearingTestData] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult] = useState<Record<string, number> | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null);
  const [clearCacheLoading, setClearCacheLoading] = useState(false);
  const [clearCacheConfirm, setClearCacheConfirm] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPagination, setLogsPagination] = useState<{ total: number; pages: number }>({ total: 0, pages: 1 });
  const [cloudinary, setCloudinary] = useState({ cloudName: '', apiKey: '', apiSecret: '' });
  const [cloudinaryStatus, setCloudinaryStatus] = useState<{ greenUrl?: string; blueUrl?: string; cloudName?: string }>({});
  const [uploadingLogos, setUploadingLogos] = useState(false);
  const [showCloudinarySecret, setShowCloudinarySecret] = useState(false);

  const settingsMap: Record<string, string> = {
    waecUrl: 'rpa_provider_url_waec',
    necoUrl: 'rpa_provider_url_neco',
    nabtebUrl: 'rpa_provider_url_nabteb',
    nbaisUrl: 'rpa_provider_url_nbais',
    jambSlipUrl: 'rpa_provider_url_jamb_slip',
  };

  const booleanKeys = ['maintenanceMode', 'emailNotifications', 'smsNotifications', 'twoFactorAuth'];

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = tokenStorage.getItem('adminToken');
        const response = await fetch('/api/admin/settings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const mappedSettings: any = {};
            Object.entries(settingsMap).forEach(([localKey, dbKey]) => {
              if (data.data[dbKey]) mappedSettings[localKey] = data.data[dbKey];
            });
            Object.entries(data.data).forEach(([key, value]) => {
              const reverseMap = Object.entries(settingsMap).find(([_, dbKey]) => dbKey === key);
              if (!reverseMap) mappedSettings[key] = value;
            });
            booleanKeys.forEach((key) => {
              if (key in mappedSettings) {
                if (mappedSettings[key] === "true") mappedSettings[key] = true;
                else if (mappedSettings[key] === "false") mappedSettings[key] = false;
              }
            });
            setSettings(prev => ({ ...prev, ...mappedSettings }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch settings', err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchCloudinaryStatus = async () => {
      try {
        const token = tokenStorage.getItem('adminToken');
        const res = await fetch('/api/admin/cloudinary/status', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setCloudinaryStatus({
              greenUrl: data.data.emailLogoGreenUrl,
              blueUrl: data.data.emailLogoBlueUrl,
              cloudName: data.data.cloudinaryCloudName,
            });
            if (data.data.cloudinaryCloudName) {
              setCloudinary(prev => ({ ...prev, cloudName: data.data.cloudinaryCloudName }));
            }
          }
        }
      } catch {}
    };
    fetchCloudinaryStatus();
  }, []);

  const handleUploadLogos = async () => {
    if (!cloudinary.cloudName || !cloudinary.apiKey || !cloudinary.apiSecret) {
      toast({ title: "Missing Fields", description: "Please fill in all three Cloudinary fields.", variant: "destructive" });
      return;
    }
    setUploadingLogos(true);
    try {
      const token = tokenStorage.getItem('adminToken');
      const res = await fetch('/api/admin/cloudinary/upload-logos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(cloudinary),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setCloudinaryStatus({ greenUrl: data.data.greenUrl, blueUrl: data.data.blueUrl, cloudName: cloudinary.cloudName });
        toast({ title: "Logos Uploaded", description: "Both email logo images are now live on Cloudinary CDN.", variant: "success" });
      } else {
        toast({ title: "Upload Failed", description: data.message || "Failed to upload logos.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error while uploading.", variant: "destructive" });
    } finally {
      setUploadingLogos(false);
    }
  };

  const fetchGateways = async () => {
    setGatewayLoading(true);
    try {
      const token = tokenStorage.getItem('adminToken');
      const response = await fetch('/api/admin/payment-gateways/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.data?.gateways) {
          setGateways(data.data.gateways);
          const forms: Record<string, Record<string, string>> = {};
          Object.entries(data.data.gateways).forEach(([key, gw]: [string, any]) => {
            forms[key] = {};
            gw.fields.forEach((field: any) => {
              forms[key][field.key] = field.value || '';
            });
          });
          setGatewayForms(forms);
        }
      }
    } catch (err) {
      console.error('Failed to fetch gateways', err);
    } finally {
      setGatewayLoading(false);
    }
  };

  const handleSaveGateway = async (gatewayKey: string) => {
    setSavingGateway(gatewayKey);
    try {
      const token = tokenStorage.getItem('adminToken');
      const credentials = gatewayForms[gatewayKey] || {};
      const response = await fetch('/api/admin/payment-gateways/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ gateway: gatewayKey, credentials })
      });

      if (!response.ok) throw new Error('Failed to save');

      toast({
        title: "Gateway Saved",
        description: `${gateways[gatewayKey]?.name || gatewayKey} credentials saved and activated.`,
        variant: "success",
      });
      await fetchGateways();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save gateway credentials.",
        variant: "destructive"
      });
    } finally {
      setSavingGateway(null);
    }
  };

  const saveTabSettings = async (fields: Record<string, any>, tabName: string, shouldRefetch = false) => {
    try {
      const token = tokenStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fields)
      });

      if (!response.ok) throw new Error('Failed to save settings');

      if (shouldRefetch) {
        await refetchSettings();
      }

      toast({
        title: `${tabName} Settings Saved`,
        description: `Your ${tabName.toLowerCase()} settings have been updated successfully.`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to save ${tabName.toLowerCase()} settings. Please try again.`,
        variant: "destructive"
      });
    }
  };

  const handleSaveGeneral = () => {
    saveTabSettings({
      siteName: settings.siteName,
      siteAddress: settings.siteAddress,
      maintenanceMode: settings.maintenanceMode,
      currency: settings.currency,
      timezone: settings.timezone,
    }, "General", true);
  };

  const handleSaveSupport = () => {
    saveTabSettings({
      siteEmail: settings.siteEmail,
      sitePhone: settings.sitePhone,
      supportWhatsappChannel: settings.supportWhatsappChannel,
      supportWhatsappGroup: settings.supportWhatsappGroup,
    }, "Support", true);
  };

  const handleSaveEmail = () => {
    saveTabSettings({
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpPass: settings.smtpPass,
      smtpFromName: settings.smtpFromName,
      smtpFromEmail: settings.smtpFromEmail,
    }, "Email");
  };

  const handleSaveNotifications = () => {
    saveTabSettings({
      emailNotifications: settings.emailNotifications,
      smsNotifications: settings.smsNotifications,
    }, "Notifications");
  };

  const handleSaveSecurity = () => {
    saveTabSettings({
      twoFactorAuth: settings.twoFactorAuth,
      sessionTimeout: settings.sessionTimeout,
      maxLoginAttempts: settings.maxLoginAttempts,
    }, "Security");
  };

  const handleSaveEducation = () => {
    saveTabSettings({
      [settingsMap.waecUrl]: settings.waecUrl,
      [settingsMap.necoUrl]: settings.necoUrl,
      [settingsMap.nabtebUrl]: settings.nabtebUrl,
      [settingsMap.nbaisUrl]: settings.nbaisUrl,
      [settingsMap.jambSlipUrl]: settings.jambSlipUrl,
    }, "Education");
  };

  const handleSaveAdvanced = () => {
    saveTabSettings({
      maintenanceMode: settings.maintenanceMode,
    }, "Advanced");
  };

  const handleClearTestData = async () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }
    setClearingTestData(true);
    setShowClearConfirm(false);
    try {
      const token = tokenStorage.getItem('adminToken');
      const res = await fetch('/api/admin/clear-test-data', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Request failed');
      toast({ title: "Test Data Cleared", variant: "success", description: "All transactions, orders, and support records have been removed." });
    } catch {
      toast({ title: "Error", description: "Failed to clear test data. Please try again.", variant: "destructive" });
    } finally {
      setClearingTestData(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const token = tokenStorage.getItem('adminToken');
      const res = await fetch('/api/admin/db/backup', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Backup failed');
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `arapoint-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Backup Downloaded", description: `${filename} has been saved to your device.` });
    } catch {
      toast({ title: "Backup Failed", description: "Could not generate the backup. Please try again.", variant: "destructive" });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.tables || !parsed.version) throw new Error('Invalid backup file format');
      setPendingRestoreData(parsed);
      setShowRestoreConfirm(true);
    } catch (err: any) {
      toast({ title: 'Invalid File', description: err.message || 'Please select a valid Arapoint backup JSON file.', variant: 'destructive' });
    }
  };

  const handleRestore = async () => {
    if (!pendingRestoreData) return;
    setRestoreLoading(true);
    setShowRestoreConfirm(false);
    setRestoreResult(null);
    try {
      const token = tokenStorage.getItem('adminToken');
      const res = await fetch('/api/admin/db/restore', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingRestoreData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Restore failed');
      setRestoreResult(data.data?.restored || {});
      toast({ title: 'Restore Complete', description: 'Database has been restored from backup successfully.' });
    } catch (err: any) {
      toast({ title: 'Restore Failed', description: err.message || 'Could not restore the backup. Please try again.', variant: 'destructive' });
    } finally {
      setRestoreLoading(false);
      setPendingRestoreData(null);
    }
  };

  const handleClearCache = async () => {
    if (!clearCacheConfirm) { setClearCacheConfirm(true); return; }
    setClearCacheLoading(true);
    setClearCacheConfirm(false);
    try {
      const token = tokenStorage.getItem('adminToken');
      const res = await fetch('/api/admin/db/clear-cache', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      toast({ title: "Cache Cleared", description: data.message || 'Server cache has been cleared.' });
    } catch (err: any) {
      toast({ title: "Clear Cache Failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setClearCacheLoading(false);
    }
  };

  const fetchLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const token = tokenStorage.getItem('adminToken');
      const res = await fetch(`/api/admin/db/logs?page=${page}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setLogs(data.data?.logs || []);
      setLogsPagination({
        total: data.data?.pagination?.total || 0,
        pages: data.data?.pagination?.pages || 1,
      });
      setLogsPage(page);
    } catch {
      toast({ title: "Error", description: "Failed to load activity logs.", variant: "destructive" });
    } finally {
      setLogsLoading(false);
    }
  };

  const handleViewLogs = () => {
    setShowLogsDialog(true);
    fetchLogs(1);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-tight">Platform Settings</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Configure your platform preferences and security settings</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-8 h-auto p-1 gap-1">
          <TabsTrigger value="general" className="gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
            <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
            <Headset className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Support</span>
          </TabsTrigger>
          <TabsTrigger value="gateways" className="gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm" onClick={() => { if (Object.keys(gateways).length === 0) fetchGateways(); }}>
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Gateways</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
            <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
            <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Notify</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="education" className="gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
            <Database className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Education</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
            <Database className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Advanced</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Site Information</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Basic information about your platform</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="site-name" className="text-xs sm:text-sm">Site Name</Label>
                  <Input
                    id="site-name"
                    value={settings.siteName}
                    onChange={(e) => setSettings(prev => ({ ...prev, siteName: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="site-address" className="text-xs sm:text-sm">Address</Label>
                  <Input
                    id="site-address"
                    value={settings.siteAddress}
                    onChange={(e) => setSettings(prev => ({ ...prev, siteAddress: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Regional Settings</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Configure currency and timezone</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Currency</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger className="h-8 sm:h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NGN">Nigerian Naira (NGN)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger className="h-8 sm:h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Lagos">West Africa Time (WAT)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveGeneral} size="sm" className="h-9 sm:h-10 text-xs sm:text-sm px-4 sm:px-6">
              <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Save General Settings
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="support" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2"><Mail className="h-4 w-4" /> Contact Information</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Email and phone shown on the user support page</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="support-email" className="text-xs sm:text-sm">Support Email</Label>
                  <Input
                    id="support-email"
                    type="email"
                    placeholder="support@example.com"
                    value={settings.siteEmail}
                    onChange={(e) => setSettings(prev => ({ ...prev, siteEmail: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="support-phone" className="text-xs sm:text-sm">Support Phone</Label>
                  <Input
                    id="support-phone"
                    placeholder="+234 800 000 0000"
                    value={settings.sitePhone}
                    onChange={(e) => setSettings(prev => ({ ...prev, sitePhone: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2"><MessageCircle className="h-4 w-4 text-green-500" /> WhatsApp Links</CardTitle>
              <CardDescription className="text-xs sm:text-sm">WhatsApp channel and group links shown on the user support page</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="wa-channel" className="text-xs sm:text-sm">WhatsApp Channel Link</Label>
                  <Input
                    id="wa-channel"
                    placeholder="https://whatsapp.com/channel/..."
                    value={settings.supportWhatsappChannel}
                    onChange={(e) => setSettings(prev => ({ ...prev, supportWhatsappChannel: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Broadcast channel link — users can follow for announcements</p>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="wa-group" className="text-xs sm:text-sm">WhatsApp Group Link</Label>
                  <Input
                    id="wa-group"
                    placeholder="https://chat.whatsapp.com/..."
                    value={settings.supportWhatsappGroup}
                    onChange={(e) => setSettings(prev => ({ ...prev, supportWhatsappGroup: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Community group link — users can join for peer support</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveSupport} size="sm" className="h-9 sm:h-10 text-xs sm:text-sm px-4 sm:px-6">
              <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Save Support Settings
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="gateways" className="space-y-4 sm:space-y-6">
          {gatewayLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(gateways).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Click the Gateways tab to load payment gateway configurations.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(gateways).map(([key, gw]: [string, any]) => (
                <Card key={key}>
                  <CardHeader className="p-4 sm:p-6 pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                          {gw.name}
                          {gw.configured ? (
                            <Badge className="bg-green-100 text-green-700 text-[10px]">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              <XCircle className="h-3 w-3 mr-1" />
                              Not Configured
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm mt-1">{gw.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-2 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {gw.fields.map((field: any) => (
                        <div key={field.key} className={`space-y-1.5 ${field.type === 'toggle' ? 'flex items-center justify-between sm:col-span-2' : ''}`}>
                          {field.type === 'toggle' ? (
                            <>
                              <div>
                                <Label className="text-xs sm:text-sm">{field.label}</Label>
                                <p className="text-[10px] text-muted-foreground">Enable for testing without real transactions</p>
                              </div>
                              <Switch
                                checked={(gatewayForms[key]?.[field.key] || 'false') === 'true'}
                                onCheckedChange={(checked) => {
                                  setGatewayForms(prev => ({
                                    ...prev,
                                    [key]: { ...prev[key], [field.key]: checked ? 'true' : 'false' }
                                  }));
                                }}
                              />
                            </>
                          ) : (
                            <>
                              <Label className="text-xs sm:text-sm">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-0.5">*</span>}
                              </Label>
                              <div className="relative">
                                <Input
                                  type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                                  placeholder={field.hasValue ? '••••••• (already set, leave blank to keep)' : field.label}
                                  value={gatewayForms[key]?.[field.key] || ''}
                                  onChange={(e) => {
                                    setGatewayForms(prev => ({
                                      ...prev,
                                      [key]: { ...prev[key], [field.key]: e.target.value }
                                    }));
                                  }}
                                  className="h-8 sm:h-9 text-sm pr-10"
                                />
                                {field.type === 'password' && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                                  >
                                    {showPasswords[field.key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </Button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        className="h-8 sm:h-9 text-xs sm:text-sm px-4"
                        disabled={savingGateway === key}
                        onClick={() => handleSaveGateway(key)}
                      >
                        {savingGateway === key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Save className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Save {gw.name}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="email" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">SMTP Configuration</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Configure Gmail SMTP for sending OTP emails and notifications</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="smtp-host" className="text-xs sm:text-sm">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    placeholder="smtp.gmail.com"
                    value={settings.smtpHost}
                    onChange={(e) => setSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="smtp-port" className="text-xs sm:text-sm">SMTP Port</Label>
                  <Input
                    id="smtp-port"
                    placeholder="587"
                    value={settings.smtpPort}
                    onChange={(e) => setSettings(prev => ({ ...prev, smtpPort: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="smtp-user" className="text-xs sm:text-sm">Gmail Address</Label>
                  <Input
                    id="smtp-user"
                    type="email"
                    placeholder="your-email@gmail.com"
                    value={settings.smtpUser}
                    onChange={(e) => setSettings(prev => ({ ...prev, smtpUser: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="smtp-pass" className="text-xs sm:text-sm">App Password</Label>
                  <Input
                    id="smtp-pass"
                    type="password"
                    placeholder="Gmail App Password"
                    value={settings.smtpPass}
                    onChange={(e) => setSettings(prev => ({ ...prev, smtpPass: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Sender Information</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Configure the sender name and email for outgoing messages</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="smtp-from-name" className="text-xs sm:text-sm">Sender Name</Label>
                  <Input
                    id="smtp-from-name"
                    placeholder="Arapoint"
                    value={settings.smtpFromName}
                    onChange={(e) => setSettings(prev => ({ ...prev, smtpFromName: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="smtp-from-email" className="text-xs sm:text-sm">Sender Email</Label>
                  <Input
                    id="smtp-from-email"
                    type="email"
                    placeholder="noreply@arapoint.com.ng"
                    value={settings.smtpFromEmail}
                    onChange={(e) => setSettings(prev => ({ ...prev, smtpFromEmail: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Cloud className="h-4 w-4 text-blue-500" />
                Cloudinary Email Logo
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Host email header images on Cloudinary CDN so they display instantly in Gmail and all email clients without any blocking.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
              {(cloudinaryStatus.greenUrl || cloudinaryStatus.blueUrl) && (
                <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20 p-3 space-y-2">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Logos active on Cloudinary CDN
                  </p>
                  {cloudinaryStatus.greenUrl && (
                    <div className="flex items-center gap-2">
                      <Image className="h-3 w-3 text-green-600 shrink-0" />
                      <a href={cloudinaryStatus.greenUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-green-700 dark:text-green-400 truncate hover:underline">
                        {cloudinaryStatus.greenUrl}
                      </a>
                    </div>
                  )}
                  {cloudinaryStatus.blueUrl && (
                    <div className="flex items-center gap-2">
                      <Image className="h-3 w-3 text-blue-600 shrink-0" />
                      <a href={cloudinaryStatus.blueUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-700 dark:text-blue-400 truncate hover:underline">
                        {cloudinaryStatus.blueUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cld-cloud-name" className="text-xs sm:text-sm">Cloud Name</Label>
                  <Input
                    id="cld-cloud-name"
                    placeholder="your-cloud-name"
                    value={cloudinary.cloudName}
                    onChange={(e) => setCloudinary(prev => ({ ...prev, cloudName: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cld-api-key" className="text-xs sm:text-sm">API Key</Label>
                  <Input
                    id="cld-api-key"
                    placeholder="123456789012345"
                    value={cloudinary.apiKey}
                    onChange={(e) => setCloudinary(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cld-api-secret" className="text-xs sm:text-sm">API Secret</Label>
                  <div className="relative">
                    <Input
                      id="cld-api-secret"
                      type={showCloudinarySecret ? 'text' : 'password'}
                      placeholder="••••••••••••••••••••"
                      value={cloudinary.apiSecret}
                      onChange={(e) => setCloudinary(prev => ({ ...prev, apiSecret: e.target.value }))}
                      className="h-8 sm:h-9 text-sm pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCloudinarySecret(p => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCloudinarySecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Get your credentials from <a href="https://console.cloudinary.com" target="_blank" rel="noopener noreferrer" className="underline">console.cloudinary.com</a> &rarr; Settings &rarr; API Keys. The free plan is sufficient.
              </p>
              <Button
                onClick={handleUploadLogos}
                disabled={uploadingLogos}
                size="sm"
                className="h-9 text-xs sm:text-sm w-full sm:w-auto"
              >
                {uploadingLogos
                  ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Uploading Logos...</>
                  : <><Upload className="h-3.5 w-3.5 mr-2" /> Save & Upload Logos to Cloudinary</>
                }
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Test Email</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Send a test email to verify your SMTP configuration</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Input
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="h-8 sm:h-9 text-sm flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                  disabled={sendingTest || !testEmail}
                  onClick={async () => {
                    setSendingTest(true);
                    try {
                      const token = tokenStorage.getItem('adminToken');
                      const response = await fetch('/api/admin/test-email', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ to: testEmail })
                      });
                      const data = await response.json();
                      if (response.ok) {
                        toast({ title: "Test Email Sent", variant: "success", description: "Check your inbox for the test email." });
                      } else {
                        toast({ title: "Failed", description: data.message || "Failed to send test email", variant: "destructive" });
                      }
                    } catch (err) {
                      toast({ title: "Error", description: "Failed to send test email", variant: "destructive" });
                    } finally {
                      setSendingTest(false);
                    }
                  }}
                >
                  {sendingTest ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                  Send Test
                </Button>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Save your SMTP settings first, then send a test email to confirm everything works.
              </p>
            </CardContent>
          </Card>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveEmail} size="sm" className="h-9 sm:h-10 text-xs sm:text-sm px-4 sm:px-6">
              <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Save Email Settings
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Notification Preferences</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-xs sm:text-sm">Email Notifications</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Receive email alerts for important events</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
                  className="flex-shrink-0"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-xs sm:text-sm">SMS Notifications</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Receive SMS alerts for critical updates</p>
                </div>
                <Switch
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, smsNotifications: checked }))}
                  className="flex-shrink-0"
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveNotifications} size="sm" className="h-9 sm:h-10 text-xs sm:text-sm px-4 sm:px-6">
              <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Save Notification Settings
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Security Settings</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Configure platform security options</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-xs sm:text-sm">Two-Factor Authentication</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Require 2FA for all admin accounts</p>
                </div>
                <Switch
                  checked={settings.twoFactorAuth}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, twoFactorAuth: checked }))}
                  className="flex-shrink-0"
                />
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="session-timeout" className="text-xs sm:text-sm">Session Timeout (minutes)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeout: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="max-attempts" className="text-xs sm:text-sm">Max Login Attempts</Label>
                  <Input
                    id="max-attempts"
                    type="number"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxLoginAttempts: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveSecurity} size="sm" className="h-9 sm:h-10 text-xs sm:text-sm px-4 sm:px-6">
              <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Save Security Settings
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="education" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Education RPA Configuration</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Configure portal URLs for result checking bots</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="waec-url" className="text-xs sm:text-sm">WAEC Portal URL</Label>
                  <Input
                    id="waec-url"
                    placeholder="https://www.waecdirect.org"
                    value={settings.waecUrl || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, waecUrl: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="neco-url" className="text-xs sm:text-sm">NECO Portal URL</Label>
                  <Input
                    id="neco-url"
                    placeholder="https://results.neco.gov.ng"
                    value={settings.necoUrl || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, necoUrl: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="nabteb-url" className="text-xs sm:text-sm">NABTEB Portal URL</Label>
                  <Input
                    id="nabteb-url"
                    placeholder="https://eworld.nabteb.gov.ng"
                    value={settings.nabtebUrl || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, nabtebUrl: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="nbais-url" className="text-xs sm:text-sm">NBAIS Portal URL</Label>
                  <Input
                    id="nbais-url"
                    placeholder="https://resultchecker.nbais.com.ng"
                    value={settings.nbaisUrl || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, nbaisUrl: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="jamb-slip-url" className="text-xs sm:text-sm">JAMB Exam Slip Portal URL</Label>
                  <Input
                    id="jamb-slip-url"
                    placeholder="https://slipsprinting.jamb.gov.ng/PrintExaminationSlip"
                    value={settings.jambSlipUrl || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, jambSlipUrl: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Leave blank to use the default JAMB slip printing portal URL.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveEducation} size="sm" className="h-9 sm:h-10 text-xs sm:text-sm px-4 sm:px-6">
              <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Save Education Settings
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Maintenance Mode</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Control platform availability</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-xs sm:text-sm">Enable Maintenance Mode</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Users will see a maintenance page when enabled</p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, maintenanceMode: checked }))}
                  className="flex-shrink-0"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Database Management</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Database maintenance — backup data, clear server cache, and review admin activity logs</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">

              {/* Backup */}
              <div className="rounded-md border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs sm:text-sm font-medium mb-0.5">Database Backup</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Download a full JSON snapshot — users, wallets, transactions, service requests, pricing, admin settings, and more.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 sm:h-9 text-xs sm:text-sm shrink-0"
                  onClick={handleBackup}
                  disabled={backupLoading}
                >
                  {backupLoading
                    ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 animate-spin" />
                    : <FileDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />}
                  {backupLoading ? 'Exporting…' : 'Download Backup'}
                </Button>
              </div>

              {/* Restore */}
              <div className="rounded-md border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs sm:text-sm font-medium mb-0.5">Restore from Backup</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Upload a previous backup JSON file to restore all records — users, transactions, service requests, settings, and pricing.
                    Existing records are updated; new ones are inserted.
                  </p>
                  {restoreResult && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-[10px] text-green-700">
                      <strong>Last restore:</strong>{' '}
                      {Object.entries(restoreResult).map(([t, n]) => `${t}: ${n}`).join(' · ')}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <input
                    type="file"
                    accept=".json,application/json"
                    id="restore-file-input"
                    className="hidden"
                    onChange={handleRestoreFileSelect}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                    onClick={() => document.getElementById('restore-file-input')?.click()}
                    disabled={restoreLoading}
                  >
                    {restoreLoading
                      ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 animate-spin" />
                      : <FileUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />}
                    {restoreLoading ? 'Restoring…' : 'Upload & Restore'}
                  </Button>
                </div>
              </div>

              {/* Clear Cache */}
              <div className="rounded-md border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs sm:text-sm font-medium mb-0.5">Clear Server Cache</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Remove all cached responses from the server cache. The platform will re-fetch fresh data on next requests.
                  </p>
                </div>
                {clearCacheConfirm ? (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 sm:h-9 text-xs sm:text-sm"
                      onClick={handleClearCache}
                      disabled={clearCacheLoading}
                    >
                      {clearCacheLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                      Confirm Clear
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm" onClick={() => setClearCacheConfirm(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9 text-xs sm:text-sm shrink-0"
                    onClick={handleClearCache}
                    disabled={clearCacheLoading}
                  >
                    <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                    Clear Cache
                  </Button>
                )}
              </div>

              {/* View Logs */}
              <div className="rounded-md border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs sm:text-sm font-medium mb-0.5">Admin Activity Logs</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Browse a full audit trail of all admin actions taken on the platform.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 sm:h-9 text-xs sm:text-sm shrink-0"
                  onClick={handleViewLogs}
                >
                  <Activity className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                  View Logs
                </Button>
              </div>

            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-900">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Irreversible actions — use with caution</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
              <div className="rounded-md border border-red-200 dark:border-red-900 p-3 sm:p-4 bg-red-50 dark:bg-red-950/20">
                <p className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300 mb-0.5">Clear All Test Data</p>
                <p className="text-[10px] sm:text-xs text-red-500 dark:text-red-400 mb-3">
                  Permanently deletes all transactions, service requests (identity, CAC, JAMB, education), support conversations, RPA jobs, shared files, and resets all user wallet balances to ₦0. Admin accounts are preserved.
                </p>
                {showClearConfirm ? (
                  <div className="flex flex-wrap gap-2">
                    <p className="w-full text-xs font-semibold text-red-700 dark:text-red-300">Are you sure? This cannot be undone.</p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={handleClearTestData}
                      disabled={clearingTestData}
                    >
                      {clearingTestData ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                      Yes, Clear Everything
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setShowClearConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleClearTestData}
                    disabled={clearingTestData}
                  >
                    <Trash2 className="h-3 w-3 mr-1.5" />
                    Clear Test Data
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveAdvanced} size="sm" className="h-9 sm:h-10 text-xs sm:text-sm px-4 sm:px-6">
              <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Save Advanced Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />Confirm Database Restore
            </DialogTitle>
            <DialogDescription className="text-sm">
              This will upsert all records from your backup file into the live database.
              Existing records will be updated to match the backup. New records will be inserted.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {pendingRestoreData && (
            <div className="bg-muted rounded-lg p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">Backup info:</p>
              <p className="text-muted-foreground">Exported: {new Date(pendingRestoreData.exportedAt).toLocaleString('en-NG')}</p>
              <p className="text-muted-foreground">Version: {pendingRestoreData.version}</p>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {Object.entries(pendingRestoreData.tables || {}).map(([name, info]: [string, any]) => (
                  <div key={name} className="flex justify-between">
                    <span>{name}</span>
                    <span className="font-semibold">{info?.count ?? 0} rows</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleRestore}
              disabled={restoreLoading}
            >
              {restoreLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileUp className="h-4 w-4 mr-2" />}
              Yes, Restore Now
            </Button>
            <Button variant="outline" onClick={() => { setShowRestoreConfirm(false); setPendingRestoreData(null); }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-4xl w-full max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Admin Activity Logs
            </DialogTitle>
            <DialogDescription>
              {logsPagination.total > 0
                ? `${logsPagination.total} total records — page ${logsPage} of ${logsPagination.pages}`
                : 'Recent admin actions on the platform'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-1 px-1">
            {logsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">No activity logs found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-36">Time</TableHead>
                    <TableHead className="text-xs">Admin</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                    <TableHead className="text-xs">Resource</TableHead>
                    <TableHead className="text-xs">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{log.adminName || 'Unknown'}</div>
                        <div className="text-[10px] text-muted-foreground">{log.adminEmail}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px] font-normal">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.resourceType && (
                          <span className="text-muted-foreground">
                            {log.resourceType}{log.resourceId ? ` #${String(log.resourceId).slice(0, 8)}` : ''}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">{log.ipAddress || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          {logsPagination.pages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={logsPage <= 1 || logsLoading}
                onClick={() => fetchLogs(logsPage - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">Page {logsPage} of {logsPagination.pages}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={logsPage >= logsPagination.pages || logsLoading}
                onClick={() => fetchLogs(logsPage + 1)}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
