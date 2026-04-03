import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Code2, Loader2, Mail, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";

const C = {
  bg: "#0A0A0A",
  card: "#111827",
  border: "#1F2937",
  text: "#E5E7EB",
  muted: "#6B7280",
  blue: "#0B5FFF",
  green: "#12B76A",
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

export default function DevLogin() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [registerForm, setRegisterForm] = useState({ email: "", name: "", company: "", password: "", confirmPassword: "" });
  const [registerStep, setRegisterStep] = useState<RegisterStep>("form");
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

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
        toast({ title: "Welcome back!", description: `Logged in as ${data.data.developer.name}` });
        window.location.href = "/developer/dashboard";
      } else {
        toast({ title: "Login failed", description: data.message, variant: "destructive" });
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

  const submitBtn = (label: string) => (
    <button type="submit" disabled={loading}
      className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
      style={{ background: C.blue }}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {label}
    </button>
  );

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
          {tab === "login" && (
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
                {submitBtn("Sign In")}
              </form>
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
