import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Code2, Loader2, Mail, ArrowLeft, CheckCircle, Eye, EyeOff, KeyRound, Lock, ShieldCheck, AlertTriangle } from "lucide-react";

const C = {
  bg: "var(--dev-bg)",
  card: "var(--dev-card)",
  border: "var(--dev-border)",
  text: "var(--dev-text)",
  muted: "var(--dev-muted)",
  blue: "var(--dev-blue)",
  green: "var(--dev-green)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>{label}</label>
      {children}
    </div>
  );
}

function StyledInput({ type = "text", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      {...props}
      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
      style={{
        background: "#0A0A0A",
        border: `1px solid ${C.border}`,
        color: C.text,
      }}
      onFocus={e => (e.currentTarget.style.borderColor = C.blue)}
      onBlur={e => (e.currentTarget.style.borderColor = C.border)}
    />
  );
}

type RegisterStep = "form" | "otp" | "done";
type ForgotStep = "email" | "reset" | "done";
type RecoveryStep = "form" | "sent";
type View = "auth" | "forgot" | "2fa-recovery";

export default function DevLogin() {
  const { toast } = useToast();
  const [view, setView] = useState<View>("auth");
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [registerForm, setRegisterForm] = useState({ email: "", name: "", company: "", password: "", confirmPassword: "" });
  const [registerStep, setRegisterStep] = useState<RegisterStep>("form");
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [forgotResendCooldown, setForgotResendCooldown] = useState(0);
  const [loginStep, setLoginStep] = useState<"credentials" | "2fa">("credentials");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>("form");
  const [recoveryForm, setRecoveryForm] = useState({ email: "", password: "" });
  const [showRecoveryPw, setShowRecoveryPw] = useState(false);
  const [recoveryConfirming, setRecoveryConfirming] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("recovery_token");
    if (token) {
      setRecoveryConfirming(true);
      fetch("/api/v1/developer/auth/2fa/recovery/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.status === "success") {
            localStorage.setItem("dev_token", data.data.token);
            localStorage.setItem("dev_user", JSON.stringify(data.data.developer));
            window.history.replaceState({}, "", window.location.pathname);
            toast({ title: "Access restored!", variant: "success", description: "2FA has been disabled and you are now signed in." });
            window.location.href = "/developer/dashboard";
          } else {
            window.history.replaceState({}, "", window.location.pathname);
            toast({ title: "Recovery failed", description: data.message || "Invalid or expired link.", variant: "destructive" });
            setRecoveryConfirming(false);
          }
        })
        .catch(() => {
          toast({ title: "Error", description: "Network error. Try again.", variant: "destructive" });
          setRecoveryConfirming(false);
        });
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/developer/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (data.status === "success") {
        localStorage.setItem("dev_token", data.data.token);
        localStorage.setItem("dev_user", JSON.stringify(data.data.developer));
        toast({ title: "Welcome back!", variant: "success", description: `Logged in as ${data.data.developer.name}` });
        window.location.href = "/developer/dashboard";
      } else if (data.status === "2fa_required") {
        setTempToken(data.data.temp_token);
        setTwoFactorCode("");
        setLoginStep("2fa");
      } else {
        toast({ title: "Login failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.length !== 6) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/developer/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temp_token: tempToken, totp_code: twoFactorCode }),
      });
      const data = await res.json();
      if (data.status === "success") {
        localStorage.setItem("dev_token", data.data.token);
        localStorage.setItem("dev_user", JSON.stringify(data.data.developer));
        toast({ title: "Welcome back!", variant: "success", description: `Logged in as ${data.data.developer.name}` });
        window.location.href = "/developer/dashboard";
      } else {
        toast({ title: "Verification failed", description: data.message, variant: "destructive" });
        setTwoFactorCode("");
      }
    } catch {
      toast({ title: "Error", description: "Network error. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (registerForm.password.length < 8) {
      toast({ title: "Password too short", description: "Minimum 8 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/developer/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registerForm.email }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setRegisterStep("otp");
        toast({ title: "OTP Sent!", description: `A verification code was sent to ${registerForm.email}` });
        startResendCooldown();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const startForgotResendCooldown = () => {
    setForgotResendCooldown(60);
    const interval = setInterval(() => {
      setForgotResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast({ title: "Email required", description: "Enter your registered email address", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await fetch("/api/v1/developer/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotStep("reset");
      startForgotResendCooldown();
      toast({ title: "Code Sent", variant: "success", description: "If that email is registered, a 6-digit reset code has been sent." });
    } catch {
      toast({ title: "Error", description: "Network error. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotResendOtp = async () => {
    if (forgotResendCooldown > 0) return;
    setLoading(true);
    try {
      await fetch("/api/v1/developer/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      startForgotResendCooldown();
      toast({ title: "Code Resent", variant: "success", description: "A new reset code has been sent to your email." });
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.length !== 6) {
      toast({ title: "Invalid code", description: "Enter the 6-digit code from your email", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Minimum 8 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/developer/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, newPassword }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setForgotStep("done");
      } else {
        toast({ title: "Reset failed", description: data.message || "Invalid or expired code.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/developer/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registerForm.email }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({ title: "OTP Resent", description: "A new code was sent to your email" });
        startResendCooldown();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast({ title: "Invalid code", description: "Enter the 6-digit code from your email", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/developer/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerForm.email,
          name: registerForm.name,
          company: registerForm.company,
          password: registerForm.password,
          otpCode,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        localStorage.setItem("dev_token", data.data.token);
        localStorage.setItem("dev_user", JSON.stringify(data.data.developer));
        setRegisterStep("done");
        setTimeout(() => { window.location.href = "/developer/dashboard"; }, 1500);
      } else {
        toast({ title: "Verification failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/developer/auth/2fa/recovery/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoveryForm.email, password: recoveryForm.password }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setRecoveryStep("sent");
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const submitBtn = (label: string) => (
    <button type="submit" disabled={loading}
      className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
      style={{ background: C.blue }}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {label}
    </button>
  );

  if (recoveryConfirming) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: C.bg }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: C.blue }} />
          <p className="text-sm" style={{ color: C.muted }}>Verifying your recovery link…</p>
        </div>
      </div>
    );
  }

  if (view === "2fa-recovery") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: C.bg }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg,#0B5FFF,#12B76A)", boxShadow: `0 8px 32px ${C.blue}40` }}>
              <Code2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Arapoint Developer Portal</h1>
            <p className="text-sm mt-1" style={{ color: C.muted }}>Build with Nigeria's verification infrastructure</p>
          </div>

          <div className="rounded-2xl p-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            {recoveryStep === "sent" ? (
              <div className="py-6 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${C.blue}1A` }}>
                  <Mail className="w-8 h-8" style={{ color: C.blue }} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Check your email</h3>
                <p className="text-sm mb-2" style={{ color: C.muted }}>
                  We've sent a recovery link to{" "}
                  <span className="font-semibold" style={{ color: C.blue }}>{recoveryForm.email}</span>
                </p>
                <p className="text-xs mb-6" style={{ color: C.muted }}>
                  Click the link in your email to disable 2FA and sign in automatically. It expires in 15 minutes.
                </p>
                <div className="rounded-lg p-3 mb-5 flex items-start gap-2 text-left" style={{ background: "#1A1A00", border: "1px solid #3D3D00" }}>
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#FBBF24" }} />
                  <p className="text-xs" style={{ color: "#FBBF24" }}>
                    Clicking the link will permanently disable 2FA on your account. Re-enable it from your security settings after signing in.
                  </p>
                </div>
                <button onClick={() => { setView("auth"); setLoginStep("credentials"); setRecoveryStep("form"); }}
                  className="w-full py-2.5 rounded-lg text-sm font-bold transition-opacity hover:opacity-90"
                  style={{ background: C.card, border: `1px solid ${C.border}`, color: C.muted }}>
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => { setView("auth"); setLoginStep("2fa"); }}
                  className="flex items-center gap-1 text-sm mb-4" style={{ color: C.muted }}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "#3D0A0A" }}>
                    <ShieldCheck className="w-6 h-6" style={{ color: "#F87171" }} />
                  </div>
                  <h2 className="text-lg font-bold text-white">Recover Authenticator Access</h2>
                  <p className="text-sm mt-1" style={{ color: C.muted }}>
                    Verify your identity to receive a one-time recovery link via email. This will disable 2FA on your account.
                  </p>
                </div>
                <form onSubmit={handleRecoveryRequest} className="space-y-4">
                  <Field label="Email">
                    <StyledInput type="email" required placeholder="dev@company.com"
                      value={recoveryForm.email}
                      onChange={e => setRecoveryForm(f => ({ ...f, email: e.target.value }))} />
                  </Field>
                  <Field label="Password">
                    <div className="relative">
                      <StyledInput type={showRecoveryPw ? "text" : "password"} required placeholder="Your account password"
                        value={recoveryForm.password}
                        onChange={e => setRecoveryForm(f => ({ ...f, password: e.target.value }))}
                        style={{ paddingRight: "2.5rem" }} />
                      <button type="button" onClick={() => setShowRecoveryPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }}>
                        {showRecoveryPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>
                  <button type="submit" disabled={loading}
                    className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: C.blue }}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Send Recovery Link
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-xs mt-4" style={{ color: C.muted }}>
            <a href="/" style={{ color: C.blue }} className="hover:underline">← Back to Arapoint</a>
          </p>
        </div>
      </div>
    );
  }

  if (view === "forgot") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: C.bg }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg,#0B5FFF,#12B76A)", boxShadow: `0 8px 32px ${C.blue}40` }}>
              <Code2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Arapoint Developer Portal</h1>
            <p className="text-sm mt-1" style={{ color: C.muted }}>Build with Nigeria's verification infrastructure</p>
          </div>

          <div className="rounded-2xl p-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>

            {forgotStep === "done" && (
              <div className="py-8 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${C.green}1A` }}>
                  <CheckCircle className="w-10 h-10" style={{ color: C.green }} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Password Reset!</h3>
                <p className="text-sm mb-6" style={{ color: C.muted }}>Your password has been updated. You can now sign in.</p>
                <button onClick={() => { setView("auth"); setForgotStep("email"); setForgotEmail(""); setForgotOtp(""); setNewPassword(""); setConfirmNewPassword(""); }}
                  className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: C.blue }}>
                  Back to Sign In
                </button>
              </div>
            )}

            {forgotStep === "reset" && (
              <>
                <button onClick={() => setForgotStep("email")} className="flex items-center gap-1 text-sm mb-4" style={{ color: C.muted }}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="text-center mb-5">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${C.blue}1A` }}>
                    <KeyRound className="w-6 h-6" style={{ color: C.blue }} />
                  </div>
                  <h2 className="text-lg font-bold text-white">Enter Reset Code</h2>
                  <p className="text-sm mt-1" style={{ color: C.muted }}>
                    We sent a 6-digit code to{" "}
                    <span className="font-semibold" style={{ color: C.blue }}>{forgotEmail}</span>
                  </p>
                </div>
                <form onSubmit={handleForgotResetPassword} className="space-y-4">
                  <Field label="6-Digit Reset Code">
                    <input
                      required maxLength={6} inputMode="numeric"
                      value={forgotOtp}
                      onChange={e => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-3 py-3 rounded-lg text-center text-2xl tracking-[0.5em] font-mono outline-none"
                      placeholder="000000"
                      style={{ background: "#0A0A0A", border: `1px solid ${C.border}`, color: C.text }}
                      onFocus={e => (e.currentTarget.style.borderColor = C.blue)}
                      onBlur={e => (e.currentTarget.style.borderColor = C.border)}
                    />
                  </Field>
                  <Field label="New Password">
                    <div className="relative">
                      <StyledInput type={showNewPw ? "text" : "password"} required minLength={8} placeholder="Min 8 characters"
                        value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        style={{ paddingRight: "2.5rem" }} />
                      <button type="button" onClick={() => setShowNewPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }}>
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirm New Password">
                    <StyledInput type="password" required minLength={8} placeholder="••••••••"
                      value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} />
                  </Field>
                  <button type="submit" disabled={loading || forgotOtp.length !== 6}
                    className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: C.blue }}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Lock className="w-4 h-4" />
                    Reset Password
                  </button>
                  <p className="text-center text-sm" style={{ color: C.muted }}>
                    Didn't receive the code?{" "}
                    <button type="button" onClick={handleForgotResendOtp}
                      disabled={forgotResendCooldown > 0 || loading}
                      className="font-semibold disabled:opacity-50"
                      style={{ color: C.blue }}>
                      {forgotResendCooldown > 0 ? `Resend in ${forgotResendCooldown}s` : "Resend Code"}
                    </button>
                  </p>
                </form>
              </>
            )}

            {forgotStep === "email" && (
              <>
                <button onClick={() => setView("auth")} className="flex items-center gap-1 text-sm mb-4" style={{ color: C.muted }}>
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </button>
                <div className="text-center mb-5">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${C.blue}1A` }}>
                    <Mail className="w-6 h-6" style={{ color: C.blue }} />
                  </div>
                  <h2 className="text-lg font-bold text-white">Recover your account</h2>
                  <p className="text-sm mt-1" style={{ color: C.muted }}>Enter your registered email and we'll send a reset code.</p>
                </div>
                <form onSubmit={handleForgotSendOtp} className="space-y-4">
                  <Field label="Email">
                    <StyledInput type="email" required placeholder="dev@company.com"
                      value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
                  </Field>
                  <button type="submit" disabled={loading}
                    className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: C.blue }}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Send Reset Code
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-xs mt-4" style={{ color: C.muted }}>
            <a href="/" style={{ color: C.blue }} className="hover:underline">← Back to Arapoint</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: C.bg }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg,#0B5FFF,#12B76A)", boxShadow: `0 8px 32px ${C.blue}40` }}>
            <Code2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Arapoint Developer Portal</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>Build with Nigeria's verification infrastructure</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl p-1 mb-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          {(["login", "register"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setRegisterStep("form"); }}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all"
              style={tab === t
                ? { background: C.blue, color: "#fff" }
                : { color: C.muted }}>
              {t === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>

          {/* ── Login ── */}
          {tab === "login" && loginStep === "credentials" && (
            <>
              <h2 className="text-lg font-bold text-white mb-0.5">Welcome back</h2>
              <p className="text-sm mb-5" style={{ color: C.muted }}>Sign in to your developer account</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <Field label="Email">
                  <StyledInput type="email" required placeholder="dev@company.com"
                    value={loginForm.email}
                    onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} />
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <StyledInput type={showPw ? "text" : "password"} required placeholder="••••••••"
                      value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      style={{ paddingRight: "2.5rem" }} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
                <div className="flex justify-end -mt-1">
                  <button type="button" onClick={() => { setView("forgot"); setForgotEmail(loginForm.email); setForgotStep("email"); }}
                    className="text-xs hover:underline" style={{ color: C.blue }}>
                    Forgot password?
                  </button>
                </div>
                {submitBtn("Sign In")}
              </form>
            </>
          )}

          {/* ── 2FA Step ── */}
          {tab === "login" && loginStep === "2fa" && (
            <>
              <button onClick={() => { setLoginStep("credentials"); setTwoFactorCode(""); setTempToken(""); }}
                className="flex items-center gap-1 text-sm mb-4" style={{ color: C.muted }}>
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: `${C.blue}1A`, border: `1px solid ${C.blue}40` }}>
                  <ShieldCheck className="w-7 h-7" style={{ color: C.blue }} />
                </div>
                <h2 className="text-lg font-bold text-white">Two-Factor Authentication</h2>
                <p className="text-sm mt-1" style={{ color: C.muted }}>
                  Open Google Authenticator and enter the<br />6-digit code for Arapoint Developer Portal
                </p>
              </div>
              <form onSubmit={handleVerify2fa} className="space-y-5">
                <Field label="Authenticator Code">
                  <input
                    required maxLength={6} autoFocus
                    value={twoFactorCode}
                    onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-3 rounded-lg text-center text-2xl tracking-[0.5em] font-mono outline-none"
                    placeholder="000000"
                    style={{ background: "#0A0A0A", border: `1px solid ${C.border}`, color: C.text }}
                    onFocus={e => (e.currentTarget.style.borderColor = C.blue)}
                    onBlur={e => (e.currentTarget.style.borderColor = C.border)}
                  />
                </Field>
                <button type="submit" disabled={loading || twoFactorCode.length !== 6}
                  className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: C.blue }}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Verify & Sign In
                </button>
              </form>
              <p className="text-center text-xs mt-4" style={{ color: C.muted }}>
                Code refreshes every 30 seconds
              </p>
              <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <p className="text-center text-xs" style={{ color: C.muted }}>
                  Lost access to your authenticator?{" "}
                  <button type="button"
                    onClick={() => { setView("2fa-recovery"); setRecoveryForm({ email: loginForm.email, password: "" }); setRecoveryStep("form"); }}
                    className="font-semibold hover:underline"
                    style={{ color: C.blue }}>
                    Recover account
                  </button>
                </p>
              </div>
            </>
          )}

          {/* ── Register ── */}
          {tab === "register" && registerStep === "done" && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${C.green}1A` }}>
                <CheckCircle className="w-10 h-10" style={{ color: C.green }} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Account Created!</h3>
              <p className="text-sm" style={{ color: C.muted }}>Redirecting to your dashboard...</p>
            </div>
          )}

          {tab === "register" && registerStep === "otp" && (
            <>
              <button onClick={() => setRegisterStep("form")} className="flex items-center gap-1 text-sm mb-4" style={{ color: C.muted }}>
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${C.blue}1A` }}>
                  <Mail className="w-6 h-6" style={{ color: C.blue }} />
                </div>
                <h2 className="text-lg font-bold text-white">Verify your email</h2>
                <p className="text-sm mt-1" style={{ color: C.muted }}>
                  Enter the 6-digit code sent to{" "}
                  <span className="font-semibold" style={{ color: C.blue }}>{registerForm.email}</span>
                </p>
              </div>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <Field label="Verification Code">
                  <input
                    required maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-3 rounded-lg text-center text-2xl tracking-[0.5em] font-mono outline-none"
                    placeholder="000000"
                    style={{ background: "#0A0A0A", border: `1px solid ${C.border}`, color: C.text }}
                    onFocus={e => (e.currentTarget.style.borderColor = C.blue)}
                    onBlur={e => (e.currentTarget.style.borderColor = C.border)}
                  />
                </Field>
                <button type="submit" disabled={loading || otpCode.length !== 6}
                  className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: C.blue }}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Account
                </button>
                <p className="text-center text-sm" style={{ color: C.muted }}>
                  Didn't receive the code?{" "}
                  <button type="button" onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="font-semibold disabled:opacity-50"
                    style={{ color: C.blue }}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                  </button>
                </p>
              </form>
            </>
          )}

          {tab === "register" && registerStep === "form" && (
            <>
              <h2 className="text-lg font-bold text-white mb-0.5">Create developer account</h2>
              <p className="text-sm mb-5" style={{ color: C.muted }}>Start integrating Arapoint APIs</p>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <Field label="Full Name">
                  <StyledInput required placeholder="John Doe"
                    value={registerForm.name}
                    onChange={e => setRegisterForm(f => ({ ...f, name: e.target.value }))} />
                </Field>
                <Field label="Email">
                  <StyledInput type="email" required placeholder="dev@company.com"
                    value={registerForm.email}
                    onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))} />
                </Field>
                <Field label="Company (optional)">
                  <StyledInput placeholder="Acme Ltd"
                    value={registerForm.company}
                    onChange={e => setRegisterForm(f => ({ ...f, company: e.target.value }))} />
                </Field>
                <Field label="Password">
                  <StyledInput type="password" required minLength={8} placeholder="Min 8 characters"
                    value={registerForm.password}
                    onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))} />
                </Field>
                <Field label="Confirm Password">
                  <StyledInput type="password" required minLength={8} placeholder="••••••••"
                    value={registerForm.confirmPassword}
                    onChange={e => setRegisterForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                </Field>
                {submitBtn("Send Verification Code")}
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: C.muted }}>
          <a href="/" style={{ color: C.blue }} className="hover:underline">← Back to Arapoint</a>
        </p>
      </div>
    </div>
  );
}
