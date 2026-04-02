import { useState, useEffect } from "react";
import { DevLayout } from "./DevLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, RefreshCw, Save, Lock } from "lucide-react";

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

  useEffect(() => {
    devFetch("/profile").then(r => r.json()).then(data => {
      if (data.status === "success") {
        setProfile(data.data);
        setForm({ name: data.data.name, company: data.data.company || "", webhookUrl: data.data.webhookUrl || "" });
      }
    });
  }, []);

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
            <CardTitle className="text-white text-sm font-semibold">Account Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Account ID", value: profile?.id },
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
