import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, Building2, ArrowRight, ArrowLeft, CheckCircle,
  Users, Briefcase, Shield, Zap, Sparkles, ChevronRight
} from "lucide-react";
import arapointLogo from "@assets/arapoint-logo-transparent.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { screeningApi, saveScreeningSession } from "@/lib/screening/api";

const ease = [0.22, 1, 0.36, 1] as any;

const INDUSTRIES = [
  "Financial Services", "Technology", "Healthcare", "Education",
  "Retail & E-commerce", "Manufacturing", "Logistics", "Government",
  "Consulting", "Other",
];

const TEAM_SIZES = [
  { label: "1–10", sub: "Startup / SME" },
  { label: "11–50", sub: "Growing team" },
  { label: "51–200", sub: "Mid-size" },
  { label: "201–500", sub: "Enterprise" },
  { label: "500+", sub: "Large enterprise" },
];

const STEPS = [
  { id: 1, label: "Organization", icon: Building2 },
  { id: 2, label: "Industry", icon: Briefcase },
  { id: 3, label: "Team Size", icon: Users },
  { id: 4, label: "Account", icon: Shield },
];

export default function ScreeningRegister() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    organizationName: "", email: "", password: "", phone: "", industry: "", size: ""
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const canNext = () => {
    if (step === 1) return form.organizationName.trim().length >= 2;
    if (step === 2) return form.industry.length > 0;
    if (step === 3) return form.size.length > 0;
    return form.email.trim().length > 3 && form.password.length >= 8;
  };

  const handleSubmit = async () => {
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

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#F4F6F8" }}>
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-white border rounded-xl flex items-center justify-center p-1.5 shadow-sm" style={{ borderColor: "#E5E7EB" }}>
            <img src={arapointLogo} alt="Arapoint" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="font-bold text-base leading-none" style={{ color: "#0F172A" }}>Arapoint Screening</p>
            <p className="text-xs mt-0.5" style={{ color: "#08B63E" }}>Organization Onboarding</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border overflow-hidden" style={{ borderColor: "#E5E7EB", boxShadow: "0 20px 60px rgba(8,20,43,0.1)" }}>
          {/* Progress header */}
          <div className="px-8 pt-7 pb-5 border-b" style={{ borderColor: "#F4F6F8" }}>
            <div className="flex items-center justify-between mb-4">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const done = step > s.id;
                const active = step === s.id;
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300"
                        style={{
                          background: done ? "#08B63E" : active ? "#08142B" : "#F4F6F8",
                          border: active ? "none" : done ? "none" : `1px solid #E5E7EB`
                        }}>
                        {done
                          ? <CheckCircle className="w-4 h-4 text-white" />
                          : <Icon className="w-4 h-4" style={{ color: active ? "white" : "#64748B" }} />}
                      </div>
                      <span className="text-[10px] font-medium hidden sm:block"
                        style={{ color: active ? "#0F172A" : done ? "#08B63E" : "#64748B" }}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 h-0.5 mx-2 rounded-full transition-all duration-500"
                        style={{ background: step > s.id ? "#08B63E" : "#E5E7EB", width: "40px" }} />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Progress bar */}
            <div className="h-1 rounded-full" style={{ background: "#F4F6F8" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #08B63E, #079C36)" }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4, ease }}
              />
            </div>
          </div>

          {/* Step content */}
          <div className="px-8 py-7">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease }}>
                  <div className="mb-6">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-3"
                      style={{ background: "rgba(8,182,62,0.08)", color: "#08B63E", border: "1px solid rgba(8,182,62,0.2)" }}>
                      <Sparkles className="w-3 h-3" /> Step 1 of 4
                    </div>
                    <h2 className="text-xl font-bold" style={{ color: "#0F172A" }}>Name your organization</h2>
                    <p className="text-sm mt-1" style={{ color: "#64748B" }}>This will appear on all reports and certificates</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium" style={{ color: "#0F172A" }}>Organization Name</Label>
                      <Input value={form.organizationName} onChange={set("organizationName")}
                        placeholder="Acme Corporation Ltd." className="h-11 rounded-xl text-sm"
                        style={{ borderColor: "#E5E7EB", background: "#F4F6F8" }} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium" style={{ color: "#0F172A" }}>Phone Number <span style={{ color: "#64748B" }}>(optional)</span></Label>
                      <Input value={form.phone} onChange={set("phone")}
                        placeholder="+234 801 234 5678" className="h-11 rounded-xl text-sm"
                        style={{ borderColor: "#E5E7EB", background: "#F4F6F8" }} />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease }}>
                  <div className="mb-6">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-3"
                      style={{ background: "rgba(37,99,235,0.08)", color: "#2563EB", border: "1px solid rgba(37,99,235,0.2)" }}>
                      <Briefcase className="w-3 h-3" /> Step 2 of 4
                    </div>
                    <h2 className="text-xl font-bold" style={{ color: "#0F172A" }}>Select your industry</h2>
                    <p className="text-sm mt-1" style={{ color: "#64748B" }}>Helps us tailor your screening configuration</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {INDUSTRIES.map(ind => (
                      <button key={ind} type="button" onClick={() => setForm(f => ({ ...f, industry: ind }))}
                        className="text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border"
                        style={form.industry === ind ? {
                          background: "rgba(8,182,62,0.08)", borderColor: "#08B63E", color: "#08B63E"
                        } : { borderColor: "#E5E7EB", color: "#0F172A", background: "#FAFAFA" }}>
                        {form.industry === ind && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                        {ind}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease }}>
                  <div className="mb-6">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-3"
                      style={{ background: "rgba(124,58,237,0.08)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.2)" }}>
                      <Users className="w-3 h-3" /> Step 3 of 4
                    </div>
                    <h2 className="text-xl font-bold" style={{ color: "#0F172A" }}>Team size</h2>
                    <p className="text-sm mt-1" style={{ color: "#64748B" }}>How many employees does your organization have?</p>
                  </div>
                  <div className="space-y-2">
                    {TEAM_SIZES.map(({ label, sub }) => (
                      <button key={label} type="button" onClick={() => setForm(f => ({ ...f, size: label }))}
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all border"
                        style={form.size === label ? {
                          background: "rgba(8,182,62,0.08)", borderColor: "#08B63E"
                        } : { borderColor: "#E5E7EB", background: "#FAFAFA" }}>
                        <div>
                          <span className="font-semibold" style={{ color: form.size === label ? "#08B63E" : "#0F172A" }}>{label}</span>
                          <span className="ml-2 text-xs" style={{ color: "#64748B" }}>{sub}</span>
                        </div>
                        {form.size === label
                          ? <CheckCircle className="w-4 h-4" style={{ color: "#08B63E" }} />
                          : <ChevronRight className="w-4 h-4" style={{ color: "#E5E7EB" }} />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease }}>
                  <div className="mb-6">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-3"
                      style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <Shield className="w-3 h-3" /> Step 4 of 4
                    </div>
                    <h2 className="text-xl font-bold" style={{ color: "#0F172A" }}>Create your account</h2>
                    <p className="text-sm mt-1" style={{ color: "#64748B" }}>Set up admin credentials for your organization</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium" style={{ color: "#0F172A" }}>Work Email</Label>
                      <Input type="email" value={form.email} onChange={set("email")}
                        placeholder="you@company.com" className="h-11 rounded-xl text-sm"
                        style={{ borderColor: "#E5E7EB", background: "#F4F6F8" }} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium" style={{ color: "#0F172A" }}>Password</Label>
                      <div className="relative">
                        <Input type={showPass ? "text" : "password"} value={form.password} onChange={set("password")}
                          placeholder="Min. 8 characters" className="h-11 rounded-xl text-sm pr-10"
                          style={{ borderColor: "#E5E7EB", background: "#F4F6F8" }} />
                        <button type="button" onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#64748B" }}>
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {form.password.length > 0 && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#F4F6F8" }}>
                            <div className="h-full rounded-full transition-all"
                              style={{
                                width: form.password.length < 6 ? "25%" : form.password.length < 10 ? "60%" : "100%",
                                background: form.password.length < 6 ? "#EF4444" : form.password.length < 10 ? "#F59E0B" : "#08B63E"
                              }} />
                          </div>
                          <span className="text-xs" style={{ color: form.password.length < 6 ? "#EF4444" : form.password.length < 10 ? "#F59E0B" : "#08B63E" }}>
                            {form.password.length < 6 ? "Weak" : form.password.length < 10 ? "Fair" : "Strong"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="mt-5 p-4 rounded-xl" style={{ background: "#F4F6F8", border: "1px solid #E5E7EB" }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: "#0F172A" }}>Summary</p>
                    <div className="space-y-1">
                      {[
                        ["Organization", form.organizationName],
                        ["Industry", form.industry],
                        ["Team Size", form.size],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs">
                          <span style={{ color: "#64748B" }}>{k}</span>
                          <span className="font-medium" style={{ color: "#0F172A" }}>{v || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center gap-3 mt-7">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(s => s - 1)} className="rounded-xl"
                  style={{ borderColor: "#E5E7EB", color: "#0F172A" }}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
              <Button
                className="flex-1 h-11 text-white rounded-xl font-semibold"
                style={{ background: canNext() ? "linear-gradient(135deg, #08B63E, #079C36)" : "#E5E7EB", color: canNext() ? "white" : "#64748B" }}
                disabled={!canNext() || loading}
                onClick={step < 4 ? () => setStep(s => s + 1) : handleSubmit}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : step < 4 ? (
                  <span className="flex items-center gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Create Organization
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: "#64748B" }}>
          Already have an account?{" "}
          <a href="/employment-screening/login" className="font-semibold hover:opacity-70" style={{ color: "#08B63E" }}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
