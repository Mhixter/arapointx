import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Shield, Zap, Users } from "lucide-react";
import arapointLogo from "@assets/arapoint-logo-transparent.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { screeningApi, saveScreeningSession } from "@/lib/screening/api";

export default function ScreeningLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const data = await screeningApi.auth.login({ email, password });
      saveScreeningSession(data.token, data.organization, data.user);
      setLocation("/employment-screening/dashboard");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-[#14532d] via-[#166534] to-[#15803d] p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border border-white rounded-full" />
          <div className="absolute top-40 left-40 w-40 h-40 border border-white rounded-full" />
          <div className="absolute bottom-20 right-10 w-80 h-80 border border-white rounded-full" />
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 bg-white rounded-full" style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, opacity: Math.random() * 0.5 + 0.3 }} />
          ))}
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1">
              <img src={arapointLogo} alt="Arapoint" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-white font-bold text-xl">Arapoint</p>
              <p className="text-green-300 text-xs">Employment Trust Infrastructure</p>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Verify identity,<br />education, and<br />hiring risk in minutes.
          </h1>
          <p className="text-green-200 text-lg">Nigeria's most trusted employment screening platform.</p>
        </div>

        <div className="relative space-y-4">
          {[
            { icon: Shield, label: "Identity Verified", desc: "NIN + BVN cross-check in real-time" },
            { icon: Zap, label: "Instant Results", desc: "Most checks complete in under 5 minutes" },
            { icon: Users, label: "Trusted by Businesses", desc: "HR teams, fintechs, and lenders across Nigeria" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{label}</p>
                <p className="text-green-300 text-xs">{desc}</p>
              </div>
            </div>
          ))}
          <p className="text-green-300 text-xs pt-2">Trusted by modern African businesses.</p>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center p-1">
              <img src={arapointLogo} alt="Arapoint" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-bold text-gray-900">Arapoint Screening</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
            <p className="text-gray-500 text-sm mt-1">Access your organization's screening dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Email Address</Label>
              <Input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@company.com" required
                className="h-11 rounded-xl border-gray-200 focus:border-green-600 focus:ring-green-600"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password" required
                  className="h-11 rounded-xl border-gray-200 focus:border-green-600 focus:ring-green-600 pr-10"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-green-700 hover:bg-green-800 text-white rounded-xl font-medium">
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{" "}
              <a href="/employment-screening/register" className="text-green-700 font-semibold hover:underline">
                Create organization
              </a>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-center text-xs text-gray-400">
              Need help?{" "}
              <a href="/contact" className="text-green-600 hover:underline">Contact Support</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
