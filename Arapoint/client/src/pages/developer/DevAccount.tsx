import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DevLayout } from "./DevLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, RefreshCw, Save, Lock, ShieldCheck, CheckCircle, Clock, XCircle, AlertCircle, ChevronRight, AlertTriangle } from "lucide-react";

function devFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("dev_token");
  return fetch(`/api/v1/developer${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options?.headers },
  });
}

export default function DevAccount() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ name: "", company: "", webhookUrl: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [kycData, setKycData] = useState<any>(null);

  const loadProfile = () => {
    devFetch("/profile").then(r => r.json()).then(data => {
      if (data.status === "success") {
        setProfile(data.data);
        setForm({ name: data.data.name, company: data.data.company || "", webhookUrl: data.data.webhookUrl || "" });
      }
    });
    devFetch("/kyc/status").then(r => r.json()).then(data => {
      if (data.status === "success") setKycData(data.data);
    });
  };

  useEffect(() => { loadProfile(); }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await devFetch("/profile", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: "Profile updated" });
        const stored = JSON.parse(localStorage.getItem("dev_user") || "{}");
        localStorage.setItem("dev_user", JSON.stringify({ ...stored, name: form.name, company: form.company }));
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setSavingPw(true);
    try {
      const res = await devFetch("/profile/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: "Password updated" });
        setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setSavingPw(false);
    }
  };

  const kycStatusDisplay = (status: string) => {
    switch (status) {
      case "approved": return { icon: CheckCircle, color: "text-green-400", label: "Approved", bg: "bg-green-900/30 border-green-700/50", desc: "Your business is fully verified. You have complete API access." };
      case "submitted": return { icon: Clock, color: "text-yellow-400", label: "Under Review", bg: "bg-yellow-900/30 border-yellow-700/50", desc: "Your application is being reviewed. Expected within 24–72 hours." };
      case "conditional": return { icon: AlertTriangle, color: "text-orange-400", label: "Conditional Approval", bg: "bg-orange-900/30 border-orange-700/50", desc: "Limited access granted. Review the note and resubmit if needed." };
      case "rejected": return { icon: XCircle, color: "text-red-400", label: "Rejected", bg: "bg-red-900/30 border-red-700/50", desc: "Your application was rejected. Update and resubmit via Business Verification." };
      default: return { icon: AlertCircle, color: "text-gray-400", label: "Not Started", bg: "bg-gray-800/50 border-gray-700", desc: "Submit your KYB to unlock full API access and higher rate limits." };
    }
  };

  return (
    <DevLayout>
      <div className="space-y-6 max-w-xl">
        <div>
          <h1 className="text-xl font-bold text-white">Account Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your developer profile</p>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center text-sm font-bold">
                {profile?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-white text-sm">{profile?.name}</CardTitle>
                <CardDescription className="text-gray-400 text-xs">{profile?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Full Name</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Email</Label>
                <Input value={profile?.email || ""} disabled className="bg-gray-800 border-gray-700 text-gray-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Company (optional)</Label>
                <Input
                  value={form.company}
                  onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  placeholder="Your company name"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Webhook URL (optional)</Label>
                <Input
                  type="url"
                  value={form.webhookUrl}
                  onChange={e => setForm(f => ({ ...f, webhookUrl: e.target.value }))}
                  placeholder="https://your-server.com/webhook"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
                <p className="text-xs text-gray-500">Receive real-time notifications when API jobs complete</p>
              </div>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-400" />
              <CardTitle className="text-white text-sm font-semibold">Change Password</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Current Password</Label>
                <Input
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">New Password</Label>
                <Input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="••••••••"
                  minLength={8}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Confirm New Password</Label>
                <Input
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="••••••••"
                  minLength={8}
                />
              </div>
              <Button type="submit" disabled={savingPw} variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800">
                {savingPw ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {kycData && (() => {
          const { icon: Icon, color, label, bg, desc } = kycStatusDisplay(kycData.kycStatus);
          return (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-gray-400" />
                  <CardTitle className="text-white text-sm font-semibold">Business Verification (KYB)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`flex items-start gap-3 p-3 rounded-lg border ${bg}`}>
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${color}`}>{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                    {kycData.kycReviewNote && (
                      <p className="text-xs text-gray-300 mt-1.5 border-t border-gray-700 pt-1.5">
                        <span className="text-gray-500">Note: </span>{kycData.kycReviewNote}
                      </p>
                    )}
                  </div>
                </div>
                {kycData.kycStatus !== "approved" && (
                  <Button size="sm" onClick={() => setLocation("/developer/kyb")}
                    className="bg-indigo-600 hover:bg-indigo-700 text-xs">
                    {kycData.kycStatus === "not_required" ? "Start Business Verification" :
                     kycData.kycStatus === "submitted" ? "View Application" : "Update & Resubmit"}
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })()}

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold">Account Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Account ID", value: profile?.id },
              { label: "Account Type", value: (profile?.accountType || "individual").charAt(0).toUpperCase() + (profile?.accountType || "individual").slice(1) },
              { label: "Member Since", value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—" },
            ].map(item => (
              <div key={item.label} className="flex justify-between py-2 border-b border-gray-800 last:border-0">
                <span className="text-xs text-gray-400">{item.label}</span>
                <span className="text-xs text-gray-200 font-mono">{item.value || "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DevLayout>
  );
}

