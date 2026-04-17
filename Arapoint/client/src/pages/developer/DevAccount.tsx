import { useState, useEffect } from "react";
import { DevLayout } from "./DevLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Save, Lock, ShieldCheck, CheckCircle, Clock, XCircle,
  AlertCircle, ChevronRight, AlertTriangle, RefreshCw,
  User, Globe, Webhook, KeyRound, Calendar, BadgeCheck,
  Smartphone, Shield, QrCode, EyeOff, Eye, X
} from "lucide-react";

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
  const [pwVisible, setPwVisible] = useState({ current: false, new: false, confirm: false });

  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaSetupMode, setTwoFaSetupMode] = useState<"idle" | "setup" | "confirm" | "disable">("idle");
  const [twoFaSetupData, setTwoFaSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaDisablePassword, setTwoFaDisablePassword] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const load = () => {
    devFetch("/profile").then(r => r.json()).then(d => {
      if (d.status === "success") {
        setProfile(d.data);
        setForm({ name: d.data.name, company: d.data.company || "", webhookUrl: d.data.webhookUrl || "" });
        setTwoFaEnabled(d.data.twoFactorEnabled || false);
      }
    });
    devFetch("/kyc/status").then(r => r.json()).then(d => {
      if (d.status === "success") setKycData(d.data);
    });
  };

  useEffect(() => { load(); }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await devFetch("/profile", { method: "PUT", body: JSON.stringify(form) });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: "Profile saved" });
        const stored = JSON.parse(localStorage.getItem("dev_user") || "{}");
        localStorage.setItem("dev_user", JSON.stringify({ ...stored, name: form.name, company: form.company }));
        load();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      return toast({ title: "Passwords don't match", variant: "destructive" });
    }
    if (pwForm.newPassword.length < 8) {
      return toast({ title: "Minimum 8 characters required", variant: "destructive" });
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
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setSavingPw(false);
    }
  };

  const startSetup2fa = async () => {
    setTwoFaLoading(true);
    try {
      const res = await devFetch("/auth/2fa/setup");
      const data = await res.json();
      if (data.status === "success") {
        setTwoFaSetupData({ secret: data.data.secret, qrCode: data.data.qrCode });
        setTwoFaCode("");
        setTwoFaSetupMode("setup");
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const enable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFaSetupData || twoFaCode.length !== 6) return;
    setTwoFaLoading(true);
    try {
      const res = await devFetch("/auth/2fa/enable", {
        method: "POST",
        body: JSON.stringify({ secret: twoFaSetupData.secret, totp_code: twoFaCode }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: "2FA Enabled", description: "Google Authenticator is now protecting your account.", variant: "success" });
        setTwoFaSetupMode("idle");
        setTwoFaSetupData(null);
        setTwoFaCode("");
        setShowSecret(false);
        load();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
        setTwoFaCode("");
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const disable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFaDisablePassword) return;
    setTwoFaLoading(true);
    try {
      const res = await devFetch("/auth/2fa/disable", {
        method: "POST",
        body: JSON.stringify({ password: twoFaDisablePassword }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: "2FA Disabled", description: "Two-factor authentication has been removed from your account." });
        setTwoFaSetupMode("idle");
        setTwoFaDisablePassword("");
        setShowDisablePassword(false);
        load();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
        setTwoFaDisablePassword("");
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const kybDisplay = (status: string) => ({
    "approved":    { icon: CheckCircle,    color: "text-[#12B76A]", ring: "border-emerald-800/60 bg-emerald-950/40", label: "Verified",           desc: "Full API access granted." },
    "submitted":   { icon: Clock,          color: "text-amber-400",   ring: "border-amber-800/60 bg-amber-950/40",   label: "Under Review",       desc: "Expect a decision within 24–72 hours." },
    "conditional": { icon: AlertTriangle,  color: "text-orange-400",  ring: "border-orange-800/60 bg-orange-950/40", label: "Conditional",         desc: "Limited access. Review note and resubmit." },
    "rejected":    { icon: XCircle,        color: "text-red-400",     ring: "border-red-800/60 bg-red-950/40",       label: "Rejected",           desc: "Update information and resubmit." },
  }[status] ?? { icon: AlertCircle, color: "text-gray-500", ring: "border-gray-800 bg-gray-900/60", label: "Not Started", desc: "Complete KYB to unlock higher rate limits." });

  const initials = profile?.name
    ? profile.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
    : "—";

  return (
    <DevLayout>
      <div className="max-w-2xl space-y-1">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-white">Account Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your profile, security, and verification</p>
        </div>

        {/* Profile Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-lg font-bold text-white shrink-0 select-none">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{profile?.name || "—"}</p>
            <p className="text-sm text-gray-400 truncate">{profile?.email || "—"}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <BadgeCheck className="w-3.5 h-3.5" />
                {((profile?.accountType || "individual").charAt(0).toUpperCase() + (profile?.accountType || "individual").slice(1))}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-NG", { month: "short", year: "numeric" }) : "—"}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-500 mb-0.5">Account ID</p>
            <p className="text-xs font-mono text-gray-400 truncate max-w-[120px]">{profile?.id?.substring(0, 16)}…</p>
          </div>
        </div>

        {/* Profile Form */}
        <Section title="Profile" icon={<User className="w-4 h-4" />}>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name">
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white h-9" />
              </Field>
              <Field label="Email">
                <Input value={profile?.email || ""} disabled
                  className="bg-gray-800/50 border-gray-800 text-gray-500 h-9 cursor-not-allowed" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Company" hint="Optional">
                <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  placeholder="Your company name"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 h-9" />
              </Field>
              <Field label="Webhook URL" hint="Optional — for async job callbacks">
                <div className="relative">
                  <Webhook className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <Input type="url" value={form.webhookUrl} onChange={e => setForm(f => ({ ...f, webhookUrl: e.target.value }))}
                    placeholder="https://your-server.com/webhook"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 h-9 pl-8" />
                </div>
              </Field>
            </div>
            <div className="pt-1">
              <Button type="submit" disabled={saving} size="sm" className="bg-[#0B5FFF] hover:opacity-90 h-9 px-5">
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                Save Profile
              </Button>
            </div>
          </form>
        </Section>

        {/* Password */}
        <Section title="Security" icon={<Lock className="w-4 h-4" />}>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Current Password">
                <PwInput value={pwForm.currentPassword} onChange={v => setPwForm(f => ({ ...f, currentPassword: v }))}
                  visible={pwVisible.current} onToggle={() => setPwVisible(p => ({ ...p, current: !p.current }))} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="New Password">
                  <PwInput value={pwForm.newPassword} onChange={v => setPwForm(f => ({ ...f, newPassword: v }))}
                    visible={pwVisible.new} onToggle={() => setPwVisible(p => ({ ...p, new: !p.new }))} />
                </Field>
                <Field label="Confirm New Password">
                  <PwInput value={pwForm.confirmPassword} onChange={v => setPwForm(f => ({ ...f, confirmPassword: v }))}
                    visible={pwVisible.confirm} onToggle={() => setPwVisible(p => ({ ...p, confirm: !p.confirm }))} />
                </Field>
              </div>
            </div>
            {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
              <p className="text-xs text-red-400">Passwords do not match</p>
            )}
            <Button type="submit" disabled={savingPw} size="sm" variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white h-9 px-5">
              {savingPw ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <KeyRound className="w-3.5 h-3.5 mr-2" />}
              Update Password
            </Button>
          </form>
        </Section>

        {/* Two-Factor Authentication */}
        <Section title="Two-Factor Authentication" icon={<Smartphone className="w-4 h-4" />}>
          {/* Status row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${twoFaEnabled ? "bg-emerald-950/60 border border-emerald-800/60" : "bg-gray-800 border border-gray-700"}`}>
                <Shield className={`w-4.5 h-4.5 ${twoFaEnabled ? "text-emerald-400" : "text-gray-500"}`} style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {twoFaEnabled ? "Authenticator app is active" : "Not enabled"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {twoFaEnabled
                    ? "Your account is protected with Google Authenticator TOTP codes"
                    : "Add a second layer of security to your developer account"}
                </p>
              </div>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${twoFaEnabled ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60" : "bg-gray-800 text-gray-500 border border-gray-700"}`}>
              {twoFaEnabled ? "ON" : "OFF"}
            </span>
          </div>

          {/* Idle — show action button */}
          {twoFaSetupMode === "idle" && (
            <>
              {!twoFaEnabled ? (
                <Button size="sm" onClick={startSetup2fa} disabled={twoFaLoading}
                  className="bg-[#0B5FFF] hover:opacity-90 h-9 px-5">
                  {twoFaLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <QrCode className="w-3.5 h-3.5 mr-2" />}
                  Set Up Google Authenticator
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => { setTwoFaSetupMode("disable"); setTwoFaDisablePassword(""); }}
                  className="border-red-900/60 text-red-400 hover:bg-red-950/40 hover:text-red-300 h-9 px-5">
                  <X className="w-3.5 h-3.5 mr-2" />
                  Disable 2FA
                </Button>
              )}
            </>
          )}

          {/* Setup — show QR code */}
          {twoFaSetupMode === "setup" && twoFaSetupData && (
            <div className="space-y-5">
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-300 mb-1">Step 1 — Scan this QR code</p>
                  <p className="text-xs text-gray-500">Open Google Authenticator → tap + → Scan QR code</p>
                </div>
                <div className="flex justify-center">
                  <div className="p-3 bg-white rounded-xl inline-block">
                    <img src={twoFaSetupData.qrCode} alt="2FA QR Code" className="w-44 h-44 block" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-300 mb-1.5">Backup code (manual entry)</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs font-mono text-gray-300 tracking-wider select-all">
                      {showSecret ? twoFaSetupData.secret : "••••••••••••••••••••••••••••••••"}
                    </code>
                    <button type="button" onClick={() => setShowSecret(v => !v)}
                      className="text-gray-500 hover:text-gray-300 p-1.5">
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">Save this code somewhere safe in case you lose your phone.</p>
                </div>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-300">Step 2 — Enter the 6-digit code from the app</p>
                <form onSubmit={enable2fa} className="space-y-3">
                  <input
                    maxLength={6} required autoFocus placeholder="000000"
                    value={twoFaCode}
                    onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-2.5 rounded-lg text-center text-xl tracking-[0.5em] font-mono outline-none bg-gray-900 border border-gray-700 text-white focus:border-blue-500 transition-colors"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={twoFaLoading || twoFaCode.length !== 6}
                      className="bg-[#0B5FFF] hover:opacity-90 h-9 px-5 flex-1">
                      {twoFaLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <CheckCircle className="w-3.5 h-3.5 mr-2" />}
                      Activate 2FA
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => { setTwoFaSetupMode("idle"); setTwoFaSetupData(null); setTwoFaCode(""); setShowSecret(false); }}
                      className="border-gray-700 text-gray-400 hover:text-white h-9 px-4">
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Disable confirmation */}
          {twoFaSetupMode === "disable" && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">
                  Disabling 2FA will remove this security layer from your account. Enter your password to confirm.
                </p>
              </div>
              <form onSubmit={disable2fa} className="space-y-3">
                <div className="relative">
                  <Input
                    type={showDisablePassword ? "text" : "password"}
                    placeholder="Your account password"
                    value={twoFaDisablePassword}
                    onChange={e => setTwoFaDisablePassword(e.target.value)}
                    className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 h-9 pr-9"
                    required
                  />
                  <button type="button" onClick={() => setShowDisablePassword(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs">
                    {showDisablePassword ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={twoFaLoading || !twoFaDisablePassword}
                    className="bg-red-700 hover:bg-red-600 h-9 px-5">
                    {twoFaLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <X className="w-3.5 h-3.5 mr-2" />}
                    Disable 2FA
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setTwoFaSetupMode("idle"); setTwoFaDisablePassword(""); }}
                    className="border-gray-700 text-gray-400 hover:text-white h-9 px-4">
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Section>

        {/* Business Verification */}
        {kycData && (() => {
          const d = kybDisplay(kycData.kycStatus);
          const Icon = d.icon;
          return (
            <Section title="Business Verification" icon={<ShieldCheck className="w-4 h-4" />}>
              <div className={`flex items-start gap-3.5 p-4 rounded-lg border ${d.ring}`}>
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${d.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm font-semibold ${d.color}`}>{d.label}</span>
                  </div>
                  <p className="text-xs text-gray-400">{d.desc}</p>
                  {kycData.kycReviewNote && (
                    <div className="mt-2.5 pt-2 border-t border-gray-700/60">
                      <p className="text-xs text-gray-300">
                        <span className="text-gray-500 uppercase tracking-wide text-[10px] mr-1">Note</span>
                        {kycData.kycReviewNote}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {kycData.kycStatus !== "approved" && (
                <div className="mt-3">
                  <Button size="sm" onClick={() => { window.location.href = "/developer/kyb"; }}
                    className="bg-[#0B5FFF] hover:opacity-90 h-9 px-5 text-sm">
                    {kycData.kycStatus === "not_required" ? "Begin Business Verification" :
                     kycData.kycStatus === "submitted" ? "View Application Status" : "Update & Resubmit"}
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              )}
            </Section>
          );
        })()}
      </div>
    </DevLayout>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mt-4">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-800">
        <span className="text-gray-400">{icon}</span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <Label className="text-gray-300 text-xs font-medium">{label}</Label>
        {hint && <span className="text-[10px] text-gray-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function PwInput({ value, onChange, visible, onToggle }: {
  value: string; onChange: (v: string) => void; visible: boolean; onToggle: () => void;
}) {
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="••••••••"
        minLength={8}
        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 h-9 pr-9"
      />
      <button type="button" onClick={onToggle}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs">
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
