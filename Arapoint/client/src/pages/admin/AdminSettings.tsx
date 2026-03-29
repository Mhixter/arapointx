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
import { Bell, Shield, Database, Globe, Save, Mail, Loader2, Send, CreditCard, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
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
    mbaisUrl: "",
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

  const settingsMap: Record<string, string> = {
    waecUrl: 'rpa_provider_url_waec',
    necoUrl: 'rpa_provider_url_neco',
    nabtebUrl: 'rpa_provider_url_nabteb',
    mbaisUrl: 'rpa_provider_url_mbais',
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
      siteEmail: settings.siteEmail,
      sitePhone: settings.sitePhone,
      siteAddress: settings.siteAddress,
      maintenanceMode: settings.maintenanceMode,
      currency: settings.currency,
      timezone: settings.timezone,
      supportWhatsappChannel: settings.supportWhatsappChannel,
      supportWhatsappGroup: settings.supportWhatsappGroup,
    }, "General", true);
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
      [settingsMap.mbaisUrl]: settings.mbaisUrl,
    }, "Education");
  };

  const handleSaveAdvanced = () => {
    saveTabSettings({
      maintenanceMode: settings.maintenanceMode,
    }, "Advanced");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-tight">Platform Settings</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Configure your platform preferences and security settings</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 h-auto p-1 gap-1">
          <TabsTrigger value="general" className="gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
            <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">General</span>
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
                  <Label htmlFor="site-email" className="text-xs sm:text-sm">Contact Email</Label>
                  <Input
                    id="site-email"
                    type="email"
                    value={settings.siteEmail}
                    onChange={(e) => setSettings(prev => ({ ...prev, siteEmail: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="site-phone" className="text-xs sm:text-sm">Contact Phone</Label>
                  <Input
                    id="site-phone"
                    value={settings.sitePhone}
                    onChange={(e) => setSettings(prev => ({ ...prev, sitePhone: e.target.value }))}
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
              <CardTitle className="text-base sm:text-lg">Support Contact Links</CardTitle>
              <CardDescription className="text-xs sm:text-sm">WhatsApp links shown on the user support page</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="wa-channel" className="text-xs sm:text-sm">WhatsApp Channel Link</Label>
                  <Input
                    id="wa-channel"
                    placeholder="https://whatsapp.com/channel/..."
                    value={settings.supportWhatsappChannel}
                    onChange={(e) => setSettings(prev => ({ ...prev, supportWhatsappChannel: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
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
                        toast({ title: "Test Email Sent", description: "Check your inbox for the test email." });
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
                  <Label htmlFor="mbais-url" className="text-xs sm:text-sm">MBAIS Portal URL</Label>
                  <Input
                    id="mbais-url"
                    placeholder="https://result.mbais.gov.ng"
                    value={settings.mbaisUrl || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, mbaisUrl: e.target.value }))}
                    className="h-8 sm:h-9 text-sm"
                  />
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
              <CardDescription className="text-xs sm:text-sm">Database maintenance options</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
                  <Database className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Backup
                </Button>
                <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">Clear Cache</Button>
                <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">View Logs</Button>
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
    </div>
  );
}
