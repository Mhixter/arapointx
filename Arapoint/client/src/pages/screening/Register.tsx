import { useState } from "react";
import { useLocation } from "wouter";
import { Briefcase, Eye, EyeOff, Building2 } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-xl mb-4">
            <Briefcase className="w-4 h-4" />
            <span className="font-semibold text-sm">Arapoint Screening</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Your Organization</h1>
          <p className="text-gray-500 text-sm mt-1">Start verifying candidates in minutes</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Organization Name</Label>
              <Input value={form.organizationName} onChange={set("organizationName")} placeholder="Acme Corp Ltd" required
                className="h-11 rounded-xl border-gray-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Work Email</Label>
              <Input type="email" value={form.email} onChange={set("email")} placeholder="hr@company.com" required
                className="h-11 rounded-xl border-gray-200" />
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
                className="h-11 rounded-xl border-gray-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Input type={showPass ? "text" : "password"} value={form.password} onChange={set("password")}
                  placeholder="Min. 8 characters" required className="h-11 rounded-xl border-gray-200 pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              <p className="font-semibold mb-1">Pricing: ₦350/candidate</p>
              <p>NIN ₦130 + BVN ₦80 + Education ₦120 + Fraud Check ₦20</p>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-medium">
              {loading ? "Creating Organization..." : "Create Organization & Get Started"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{" "}
            <a href="/employment-screening/login" className="text-blue-700 font-semibold hover:underline">Sign in</a>
          </p>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          By creating an account, you agree to our{" "}
          <a href="/terms" className="underline">Terms of Service</a>
        </p>
      </div>
    </div>
  );
}
