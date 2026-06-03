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
    if (!form.email.includes("@")) {
      toast({ title: "Valid email required", variant: "destructive" });
      return;
    }
    if (form.password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (!form.industry) {
      toast({ title: "Please select an industry", variant: "destructive" });
      return;
    }
    if (!form.size) {
      toast({ title: "Please select company size", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Send OTP
      const response = await fetch("/api/screening/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send OTP");
      }

      setRegistrationData(form);
      setStep("otp");
      setOtp("");
      startResendCountdown();
      toast({ title: "OTP sent", description: `Verification code sent to ${form.email}` });
    } catch (err: any) {
      toast({ title: "Failed to send OTP", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const startResendCountdown = () => {
    setResendCountdown(60);
    const interval = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);
    try {
      const response = await fetch("/api/screening/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registrationData.email }),
      });

      if (!response.ok) throw new Error("Failed to resend OTP");

      startResendCountdown();
      toast({ title: "OTP resent", description: "Check your email for the new code" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
        throw new Error(error.message || error.data?.message || "Registration failed");
      }

      const data = await response.json();
      saveScreeningSession(data.data.token, data.data.organization, data.data.user);
      setStep("success");
      setTimeout(() => setLocation("/employment-screening/dashboard"), 2500);
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

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
              <p className="text-blue-300 text-xs">Employment Screening</p>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Screen candidates.<br />Verify credentials.<br />Make smart hires.
          </h1>
          <p className="text-blue-200 text-lg">NIN, BVN, WAEC verification — all in minutes, not days.</p>
        </div>
        <div className="relative space-y-4">
          {[
            { icon: Shield, label: "Instant Verification", desc: "Results in under 2 minutes" },
            { icon: Zap, label: "₦350/Candidate", desc: "All-in-one employment screening" },
            { icon: Users, label: "Team Management", desc: "Invite your HR team" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{label}</p>
                <p className="text-blue-300 text-xs">{desc}</p>
              </div>
            </div>
          ))}
          <p className="text-blue-300 text-xs pt-2">Used by HR teams and recruiters across Nigeria.</p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto" style={{ background: "#ffffff" }}>
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-white border border-gray-200 p-2">
              <img src={arapointLogo} alt="Arapoint" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-extrabold text-gray-900">Arapoint</h1>
            <p className="text-sm mt-1 text-gray-600">Employment Screening Platform</p>
          </div>

          {step === "success" ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#d1fae51a" }}>
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
              <p className="text-gray-600 mb-6">Your account has been created. Redirecting to dashboard...</p>
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : step === "otp" ? (
            <div>
              <button
                onClick={() => setStep("form")}
                className="flex items-center gap-1 text-sm mb-6 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" /> Back to form
              </button>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "#dbeafe" }}>
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Verify your email</h2>
                <p className="text-gray-600 text-sm mt-2">
                  Enter the 6-digit code sent to <span className="font-semibold text-blue-600">{registrationData?.email}</span>
                </p>
              </div>
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs font-bold text-gray-600">Verification Code</Label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-3 rounded-lg text-center text-3xl tracking-[0.5em] font-mono border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-2.5 font-bold text-white rounded-lg transition-opacity disabled:opacity-50"
                  style={{ background: "#1d4ed8" }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Create Account
                </Button>
                <p className="text-center text-sm text-gray-600">
                  Didn't receive the code?{" "}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCountdown > 0 || loading}
                    className="font-semibold text-blue-600 disabled:opacity-50"
                  >
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend OTP"}
                  </button>
                </p>
              </form>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
              <p className="text-gray-600 text-sm mb-8">Start screening candidates in minutes</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs font-bold text-gray-600">Organization Name</Label>
                  <Input
                    type="text"
                    placeholder="Acme Corp Ltd"
                    value={form.organizationName}
                    onChange={set("organizationName")}
                    className="border-gray-300 text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-600">Work Email</Label>
                  <Input
                    type="email"
                    placeholder="hr@company.com"
                    value={form.email}
                    onChange={set("email")}
                    className="border-gray-300 text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-600">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPass ? "text" : "password"}
                      placeholder="Min 8 characters"
                      value={form.password}
                      onChange={set("password")}
                      className="border-gray-300 text-gray-900 placeholder:text-gray-400 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-600">Confirm Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    className="border-gray-300 text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-gray-600">Industry</Label>
                    <Select value={form.industry} onValueChange={(v) => setForm(f => ({ ...f, industry: v }))}>
                      <SelectTrigger className="border-gray-300 text-gray-900">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fintech">Fintech</SelectItem>
                        <SelectItem value="recruitment">Recruitment</SelectItem>
                        <SelectItem value="banking">Banking</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-gray-600">Company Size</Label>
                    <Select value={form.size} onValueChange={(v) => setForm(f => ({ ...f, size: v }))}>
                      <SelectTrigger className="border-gray-300 text-gray-900">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="500+">500+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-600">Phone (Optional)</Label>
                  <Input
                    type="tel"
                    placeholder="+234 800 000 0000"
                    value={form.phone}
                    onChange={set("phone")}
                    className="border-gray-300 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 font-bold text-white rounded-lg transition-opacity disabled:opacity-50"
                  style={{ background: "#1d4ed8" }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Send Verification Code
                </Button>
              </form>
              <p className="text-center text-xs text-gray-600 mt-6">
                Already have an account?{" "}
                <a href="/employment-screening/login" className="font-semibold text-blue-600 hover:underline">
                  Sign in
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}