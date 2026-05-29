import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Shield, Zap, Users, Building2, Loader2, Mail, CheckCircle, ArrowLeft } from "lucide-react";
import arapointLogo from "@assets/arapoint-logo-transparent.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { screeningApi, saveScreeningSession } from "@/lib/screening/api";

export default function ScreeningRegisterWithOTP() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "otp" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp] = useState("");
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  const [form, setForm] = useState({
    organizationName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    industry: "",
    size: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.organizationName.trim()) {
      toast({ title: "Organization name required", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast({ title: "Invalid email address", variant: "destructive" });
      return;
    }
    if (form.password.length < 8) {
      toast({ title: "Weak password", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (!form.industry || !form.size) {
      toast({ title: "Please select industry and company size", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Send OTP to email
      const response = await fetch("/api/screening/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      if (!response.ok) throw new Error("Failed to send OTP");

      setRegistrationData(form);
      setStep("otp");
      setResendCountdown(60);
      toast({ title: "OTP sent", description: `Verification code sent to ${form.email}` });
    } catch (err: any) {
      toast({ title: "Failed to send OTP", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({ title: "Invalid OTP", description: "OTP must be 6 digits", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Verify OTP and register
      const response = await fetch("/api/screening/auth/register-with-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...registrationData,
          otp,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      const data = await response.json();
      saveScreeningSession(data.data.token, data.data.organization, data.data.user);
      setStep("success");
      setTimeout(() => setLocation("/employment-screening/dashboard"), 2500);
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;

    setLoading(true);
    try {
      const response = await fetch("/api/screening/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registrationData?.email }),
      });

      if (!response.ok) throw new Error("Failed to resend OTP");

      setOtp("");
      setResendCountdown(60);
      toast({ title: "OTP resent", description: "Check your email for the new code" });
    } catch (err: any) {
      toast({ title: "Failed to resend OTP", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer
  useState(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown(r => r - 1), 1000);
    return () => clearTimeout(timer);
  });

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-[#0F2461] via-[#1E3A8A] to-[#1D4ED8] p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border border-white rounded-full" />
          <div className="absolute top-40 left-40 w-40 h-40 border border-white rounded-full" />
          <div className="absolute bottom-20 right-10 w-80 h-80 border border-white rounded-full" />
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 bg-white rounded-full"
              style={{ top: `${(i * 17 + 5) % 100}%`, left: `${(i * 23 + 7) % 100}%`, opacity: 0.4 }} />
          ))}
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1">
              <img src={arapointLogo} alt="Arapoint" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-white font-bold text-xl">Arapoint</p>
              <p className="text-blue-100 text-xs">Employment Trust Infrastructure</p>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Start verifying<br />candidates<br />in minutes.
          </h1>
          <p className="text-blue-200 text-lg">Create your organization and get ₦350/candidate verified instantly.</p>
        </div>

        <div className="relative space-y-4">
          {[
            { icon: Shield, label: "NIN + BVN Identity", desc: "Cross-referenced in real-time" },
            { icon: Zap, label: "Education Screening", desc: "WAEC, NECO, NABTEB, NBAIS verified" },
            { icon: Users, label: "Team Management", desc: "Invite your HR team with role controls" },
            { icon: Building2, label: "Fraud Detection", desc: "AI-powered risk scoring on every candidate" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{label}</p>
                <p className="text-blue-100 text-xs">{desc}</p>
              </div>
            </div>
          ))}
          <p className="text-blue-100 text-xs pt-2">Pay only ₦350 per candidate. No monthly fees.</p>
        </div>
      </div>

      {/* Right — Register form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-6">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center p-1">
              <img src={arapointLogo} alt="Arapoint" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-bold text-gray-900">Arapoint Screening</span>
          </div>

          {/* FORM STEP */}
          {step === "form" && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Create Your Organization</h2>
                <p className="text-gray-500 text-sm mt-1">Set up your screening account and start verifying</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Organization Name</Label>
                  <Input value={form.organizationName} onChange={set("organizationName")} placeholder="Acme Corp Ltd" required
                    className="h-11 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Work Email</Label>
                  <Input type="email" value={form.email} onChange={set("email")} placeholder="hr@company.com" required
                    className="h-11 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Industry</Label>
                    <Select value={form.industry} onValueChange={v => setForm(f => ({ ...f, industry: v }))}>
                      <SelectTrigger className="h-11 rounded-xl border-gray-200">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {["Fintech", "Banking", "Insurance", "Healthcare", "Logistics", "Telecom", "Retail", "Government", "Other"].map(i => (
                          <SelectItem key={i} value={i}>{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Company Size</Label>
                    <Select value={form.size} onValueChange={v => setForm(f => ({ ...f, size: v }))}>
                      <SelectTrigger className="h-11 rounded-xl border-gray-200">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {["1-10", "11-50", "51-200", "201-500", "500+"].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Phone (Optional)</Label>
                  <Input value={form.phone} onChange={set("phone")} placeholder="+234 800 000 0000"
                    className="h-11 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Password</Label>
                  <div className="relative">
                    <Input type={showPass ? "text" : "password"} value={form.password} onChange={set("password")}
                      placeholder="Min. 8 characters" required
                      className="h-11 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 pr-10" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Confirm Password</Label>
                  <Input type="password" value={form.confirmPassword} onChange={set("confirmPassword")}
                    placeholder="Confirm password" required
                    className="h-11 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500" />
                </div>

                <Button type="submit" disabled={loading} className="w-full h-11 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending OTP...</> : "Continue & Verify Email"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Already have an account?{" "}
                  <a href="/employment-screening/login" className="text-blue-700 font-semibold hover:underline">Sign in</a>
                </p>
              </div>
            </>
          )}

          {/* OTP STEP */}
          {step === "otp" && (
            <>
              <div className="mb-8 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-blue-50">
                  <Mail className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
                <p className="text-gray-500 text-sm mt-2">
                  We sent a 6-digit code to<br />
                  <span className="font-semibold text-gray-700">{registrationData?.email}</span>
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Verification Code</Label>
                  <Input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="h-14 text-center text-2xl tracking-widest rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 font-mono"
                  />
                </div>

                <Button type="submit" disabled={loading || otp.length !== 6} className="w-full h-11 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Verifying...</> : "Verify & Create Account"}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={handleResendOtp}
                  disabled={resendCountdown > 0 || loading}
                  className="text-sm text-blue-600 hover:underline disabled:text-gray-400 font-medium"
                >
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Didn't receive code? Resend"}
                </button>
              </div>

              <button
                onClick={() => setStep("form")}
                className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" /> Back to form
              </button>
            </>
          )}

          {/* SUCCESS STEP */}
          {step === "success" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-green-50">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
              <p className="text-gray-500 text-sm">Your organization is ready. Redirecting to dashboard...</p>
            </div>
          )}

          {step !== "success" && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-center text-xs text-gray-400">
                By creating an account, you agree to our{" "}
                <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}