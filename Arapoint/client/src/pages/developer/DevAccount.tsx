import { useState, useEffect } from "react";
import { DevLayout } from "./DevLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, RefreshCw, Save, Lock, ShieldCheck, CheckCircle, Clock, XCircle, AlertCircle, Upload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

function devFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("dev_token");
  return fetch(`/api/v1/developer${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options?.headers },
  });
}

export default function DevAccount() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ name: "", company: "", webhookUrl: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [kycData, setKycData] = useState<any>(null);
  const [kycForm, setKycForm] = useState({ accountType: "individual", documents: "" });
  const [savingKyc, setSavingKyc] = useState(false);

  const loadProfile = () => {
    devFetch("/profile").then(r => r.json()).then(data => {
      if (data.status === "success") {
        setProfile(data.data);
        setForm({ name: data.data.name, company: data.data.company || "", webhookUrl: data.data.webhookUrl || "" });
        setKycForm(f => ({ ...f, accountType: data.data.accountType || "individual" }));
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

  const submitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKyc(true);
    try {
      let documents: any[] = [];
      if (kycForm.accountType !== "individual" && kycForm.documents.trim()) {
        try {
          documents = JSON.parse(kycForm.documents);
          if (!Array.isArray(documents)) documents = [documents];
        } catch {
          documents = [{ description: kycForm.documents }];
        }
      }
      const res = await devFetch("/kyc/submit", {
        method: "POST",
        body: JSON.stringify({ accountType: kycForm.accountType, documents }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: "KYC Updated", description: data.message });
        loadProfile();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setSavingKyc(false);
    }
  };

  const kycStatusDisplay = (status: string) => {
    switch (status) {
      case "approved": return { icon: CheckCircle, color: "text-green-400", label: "Approved" };
      case "submitted": return { icon: Clock, color: "text-yellow-400", label: "Under Review" };
      case "rejected": return { icon: XCircle, color: "text-red-400", label: "Rejected" };
      default: return { icon: AlertCircle, color: "text-gray-400", label: "Not Required" };
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

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gray-400" />
              <CardTitle className="text-white text-sm font-semibold">Account Type & KYC</CardTitle>
            </div>
            {kycData && (() => {
              const { icon: Icon, color, label } = kycStatusDisplay(kycData.kycStatus);
              return (
                <div className={`flex items-center gap-1.5 text-sm mt-1 ${color}`}>
                  <Icon className="w-4 h-4" />
                  <span>KYC Status: {label}</span>
                </div>
              );
            })()}
          </CardHeader>
          <CardContent>
            {kycData?.kycStatus === "submitted" ? (
              <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 text-sm text-yellow-300">
                Your KYC documents are currently under review. We'll notify you once reviewed.
              </div>
            ) : kycData?.kycStatus === "approved" ? (
              <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3 text-sm text-green-300">
                Your KYC has been approved. You have full access to all API features.
              </div>
            ) : kycData?.kycStatus === "rejected" ? (
              <div className="space-y-3">
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-sm text-red-300">
                  Your KYC was rejected. {kycData.kycReviewNote && <span>Reason: {kycData.kycReviewNote}</span>}
                </div>
                <form onSubmit={submitKyc} className="space-y-3">
                  <KycForm kycForm={kycForm} setKycForm={setKycForm} saving={savingKyc} label="Resubmit KYC" />
                </form>
              </div>
            ) : (
              <form onSubmit={submitKyc} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Account Type</Label>
                  <select
                    value={kycForm.accountType}
                    onChange={e => setKycForm(f => ({ ...f, accountType: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm"
                  >
                    <option value="individual">Individual Developer</option>
                    <option value="business">Business</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <p className="text-xs text-gray-500">Business and Enterprise accounts require KYC verification for higher API limits</p>
                </div>
                {kycForm.accountType !== "individual" && (
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">KYC Documents</Label>
                    <Textarea
                      required
                      value={kycForm.documents}
                      onChange={e => setKycForm(f => ({ ...f, documents: e.target.value }))}
                      placeholder={`Provide your business documents. Include:\n- Business Registration Number (CAC)\n- Tax ID\n- Director's NIN/BVN\n- Utility Bill (address verification)\n- Business Address`}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[120px]"
                    />
                    <p className="text-xs text-gray-500">Describe your documents or paste document details. Admin will review within 24-48 hours.</p>
                  </div>
                )}
                <Button type="submit" disabled={savingKyc} className="bg-indigo-600 hover:bg-indigo-700">
                  {savingKyc ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
                  {kycForm.accountType === "individual" ? "Save Account Type" : "Submit for KYC Review"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

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

function KycForm({ kycForm, setKycForm, saving, label }: { kycForm: any; setKycForm: any; saving: boolean; label: string }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-gray-300 text-sm">Account Type</Label>
        <select
          value={kycForm.accountType}
          onChange={e => setKycForm((f: any) => ({ ...f, accountType: e.target.value }))}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm"
        >
          <option value="business">Business</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-gray-300 text-sm">KYC Documents</Label>
        <Textarea
          required
          value={kycForm.documents}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setKycForm((f: any) => ({ ...f, documents: e.target.value }))}
          placeholder="Provide updated business documents..."
          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px]"
        />
      </div>
      <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 w-full">
        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
        {label}
      </Button>
    </>
  );
}
