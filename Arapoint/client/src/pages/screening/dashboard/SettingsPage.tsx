import { useEffect, useState } from "react";
import { Save, Building2, Bell, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { screeningApi, getScreeningSession, clearScreeningSession } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";
import { useLocation } from "wouter";

const TABS = ["Organization", "Billing", "Security"];

export default function ScreeningSettings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState("Organization");
  const [saving, setSaving] = useState(false);
  const session = getScreeningSession();

  const [form, setForm] = useState({
    name: session?.org?.name || "",
    phone: "",
    industry: "",
    size: "",
    website: "",
    billingType: "prepaid",
    autoDebitEnabled: false,
    autoDebitThreshold: "5000",
    autoDebitAmount: "50000",
  });

  useEffect(() => {
    screeningApi.auth.me().then((data: any) => {
      const org = data.organization;
      setForm(f => ({
        ...f,
        name: org.name || f.name,
        phone: org.phone || "",
        industry: org.industry || "",
        size: org.size || "",
        website: org.website || "",
      }));
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await screeningApi.settings.update(form);
      toast({ title: "Settings saved!" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    clearScreeningSession();
    setLocation("/employment-screening/login");
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <ScreeningDashboardLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500">Manage your organization preferences</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl">
            <Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Profile card */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-800 rounded-2xl p-6 mb-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-blue-700 font-bold text-xl flex-shrink-0">
            {form.name?.charAt(0)?.toUpperCase() || "O"}
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-lg">{form.name}</p>
            <p className="text-blue-200 text-sm">{session?.org?.email}</p>
            <p className="text-blue-300 text-xs mt-0.5">{session?.user?.role?.replace("_", " ")} · Organization Admin</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "Organization" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-blue-700" />
              <h2 className="font-semibold text-gray-900 text-sm">Organization Details</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm font-medium">Organization Name</Label>
                <Input value={form.name} onChange={set("name")} placeholder="Company Name" className="h-10 rounded-xl border-gray-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Phone Number</Label>
                <Input value={form.phone} onChange={set("phone")} placeholder="+234 800 000 0000" className="h-10 rounded-xl border-gray-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Website</Label>
                <Input value={form.website} onChange={set("website")} placeholder="https://company.com" className="h-10 rounded-xl border-gray-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Industry</Label>
                <Select value={form.industry} onValueChange={v => setForm(f => ({ ...f, industry: v }))}>
                  <SelectTrigger className="h-10 rounded-xl border-gray-200">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Fintech", "Banking", "Insurance", "Healthcare", "Logistics", "Telecom", "Retail", "Government", "Other"].map(i => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Company Size</Label>
                <Select value={form.size} onValueChange={v => setForm(f => ({ ...f, size: v }))}>
                  <SelectTrigger className="h-10 rounded-xl border-gray-200">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {["1-10", "11-50", "51-200", "201-500", "500+"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {tab === "Billing" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-blue-700" />
              <h2 className="font-semibold text-gray-900 text-sm">Billing Preferences</h2>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Billing Type</Label>
              <Select value={form.billingType} onValueChange={v => setForm(f => ({ ...f, billingType: v }))}>
                <SelectTrigger className="h-10 rounded-xl border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prepaid">Prepaid (Pay as you go)</SelectItem>
                  <SelectItem value="monthly">Monthly Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-900">Auto Top-Up</p>
                <p className="text-xs text-gray-500">Automatically fund wallet when balance falls below threshold</p>
              </div>
              <Switch checked={form.autoDebitEnabled} onCheckedChange={v => setForm(f => ({ ...f, autoDebitEnabled: v }))} />
            </div>
            {form.autoDebitEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Threshold (₦)</Label>
                  <Input value={form.autoDebitThreshold} onChange={set("autoDebitThreshold")} type="number" className="h-10 rounded-xl border-gray-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Top-up Amount (₦)</Label>
                  <Input value={form.autoDebitAmount} onChange={set("autoDebitAmount")} type="number" className="h-10 rounded-xl border-gray-200" />
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "Security" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-blue-700" />
                <h2 className="font-semibold text-gray-900 text-sm">Security</h2>
              </div>
              <div className="space-y-3">
                {[["Login Email", session?.org?.email], ["User Role", session?.user?.role?.replace("_", " ") || "—"], ["Account Status", "Active"]].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <p className="text-sm text-gray-500">{k}</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <h3 className="font-semibold text-red-800 text-sm mb-2">Danger Zone</h3>
              <p className="text-xs text-red-600 mb-4">These actions are irreversible. Please proceed with caution.</p>
              <Button variant="destructive" size="sm" onClick={handleLogout} className="rounded-xl">
                <LogOut className="w-4 h-4 mr-2" /> Log Out of All Sessions
              </Button>
            </div>
          </div>
        )}
      </div>
    </ScreeningDashboardLayout>
  );
}
