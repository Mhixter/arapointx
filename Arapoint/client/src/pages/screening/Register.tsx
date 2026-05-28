import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Shield, Zap, Users, Building2 } from "lucide-react";
import arapointLogo from "@assets/arapoint-logo-transparent.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { screeningApi, saveScreeningSession } from "@/lib/screening/api";

export default function ScreeningRegister() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ organizationName: "", email: "", password: "", phone: "", industry: "", size: "" });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast({ title: "Weak password", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = await screeningApi.auth.register(form);
      saveScreeningSession(data.token, data.organization, data.user);
      toast({ title: "Welcome to Arapoint Screening!", description: "Your organization has been created." });
      setLocation("/employment-screening/dashboard");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
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
              <p className="text-blue-300 text-xs">Employment Trust Infrastructure</p>
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
                <p className="text-blue-300 text-xs">{desc}</p>
              </div>
            </div>
          ))}
          <p className="text-blue-300 text-xs pt-2">Pay only ₦350 per candidate. No monthly fees.</p>
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

            <Button type="submit" disabled={loading} className="w-full h-11 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold">
              {loading ? "Creating Organization..." : "Create Organization & Get Started"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <a href="/employment-screening/login" className="text-blue-700 font-semibold hover:underline">Sign in</a>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-center text-xs text-gray-400">
              By creating an account, you agree to our{" "}
              <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
