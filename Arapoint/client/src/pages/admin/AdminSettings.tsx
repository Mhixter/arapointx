import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bell, Shield, Database, Globe, Save } from "lucide-react";
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
  });

  const settingsMap: Record<string, string> = {
    waecUrl: 'rpa_provider_url_waec',
    necoUrl: 'rpa_provider_url_neco',
    nabtebUrl: 'rpa_provider_url_nabteb',
    mbaisUrl: 'rpa_provider_url_mbais',
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('accessToken');
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
            // Also include other non-mapped settings
            Object.entries(data.data).forEach(([key, value]) => {
              const reverseMap = Object.entries(settingsMap).find(([_, dbKey]) => dbKey === key);
              if (!reverseMap) mappedSettings[key] = value;
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

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const payload: any = { ...settings };
      // Map local keys to DB keys for RPA URLs
      Object.entries(settingsMap).forEach(([localKey, dbKey]) => {
        if (payload[localKey] !== undefined) {
          payload[dbKey] = payload[localKey];
          // We don't delete the localKey here to avoid state mismatch if the UI relies on it
        }
      });

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Failed to save settings');

      await refetchSettings();
      
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-tight">Platform Settings</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Configure your platform preferences and security settings</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 gap-1">
          <TabsTrigger value="general" className="gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
            <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">General</span>
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
            <span className="hidden xs:inline sm:inline">Education RPA</span>
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
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} size="sm" className="h-9 sm:h-10 text-xs sm:text-sm px-4 sm:px-6">
          <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
