import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Code2, Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";

type RegisterStep = "form" | "otp" | "done";

export default function DevLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
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
        setLocation("/developer/dashboard");
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
        setTimeout(() => setLocation("/developer/dashboard"), 1500);
      } else {
        toast({ title: "Verification failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Code2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Arapoint Developer Portal</h1>
          <p className="text-gray-400 text-sm mt-1">Build with Nigeria's verification infrastructure</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 mb-6">
            <TabsTrigger value="login" className="data-[state=active]:bg-indigo-600 text-white">Sign In</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-indigo-600 text-white">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Welcome back</CardTitle>
                <CardDescription className="text-gray-400">Sign in to your developer account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Email</Label>
                    <Input
                      type="email" required
                      value={loginForm.email}
                      onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      placeholder="dev@company.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Password</Label>
                    <Input
                      type="password" required
                      value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            {registerStep === "done" ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="pt-8 pb-8 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-white text-xl font-bold mb-2">Account Created!</h3>
                  <p className="text-gray-400 text-sm">Redirecting to your dashboard...</p>
                </CardContent>
              </Card>
            ) : registerStep === "otp" ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <button onClick={() => setRegisterStep("form")} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <div className="flex justify-center mb-2">
                    <div className="w-12 h-12 rounded-full bg-indigo-900 flex items-center justify-center">
                      <Mail className="w-6 h-6 text-indigo-400" />
                    </div>
                  </div>
                  <CardTitle className="text-white text-center">Verify Your Email</CardTitle>
                  <CardDescription className="text-gray-400 text-center">
                    Enter the 6-digit code sent to<br />
                    <span className="text-indigo-400 font-medium">{registerForm.email}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-sm">Verification Code</Label>
                      <Input
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="bg-gray-800 border-gray-700 text-white text-center text-2xl tracking-[0.5em] placeholder:text-gray-600 placeholder:text-base placeholder:tracking-normal"
                        placeholder="000000"
                      />
                    </div>
                    <Button type="submit" disabled={loading || otpCode.length !== 6} className="w-full bg-indigo-600 hover:bg-indigo-700">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Create Account
                    </Button>
                    <p className="text-center text-sm text-gray-500">
                      Didn't receive the code?{" "}
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendCooldown > 0 || loading}
                        className="text-indigo-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                      </button>
                    </p>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Create developer account</CardTitle>
                  <CardDescription className="text-gray-400">Start integrating Arapoint APIs</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-sm">Full Name</Label>
                      <Input
                        required
                        value={registerForm.name}
                        onChange={e => setRegisterForm(f => ({ ...f, name: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-sm">Email</Label>
                      <Input
                        type="email" required
                        value={registerForm.email}
                        onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                        placeholder="dev@company.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-sm">Company (optional)</Label>
                      <Input
                        value={registerForm.company}
                        onChange={e => setRegisterForm(f => ({ ...f, company: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                        placeholder="Acme Ltd"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-sm">Password</Label>
                      <Input
                        type="password" required minLength={8}
                        value={registerForm.password}
                        onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                        placeholder="Min 8 characters"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-sm">Confirm Password</Label>
                      <Input
                        type="password" required minLength={8}
                        value={registerForm.confirmPassword}
                        onChange={e => setRegisterForm(f => ({ ...f, confirmPassword: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                        placeholder="••••••••"
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Send Verification Code
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-gray-600 mt-4">
          <a href="/" className="text-indigo-400 hover:underline">← Back to Arapoint</a>
        </p>
      </div>
    </div>
  );
}
