import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Eye, EyeOff, Shield, Zap, Users, Sparkles, ArrowRight,
  CheckCircle, Lock, Building2
} from "lucide-react";
import arapointLogo from "@assets/arapoint-logo-transparent.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { screeningApi, saveScreeningSession } from "@/lib/screening/api";

const ease = [0.22, 1, 0.36, 1] as any;

const TRUST_BADGES = [
  { icon: Shield, label: "Bank-grade Security", desc: "256-bit TLS encryption" },
  { icon: Zap, label: "Real-time Verification", desc: "NIN + BVN in under 60s" },
  { icon: Users, label: "10,000+ Screenings", desc: "Trusted across Nigeria" },
];

// Mini dashboard mockup for 3D showcase
function DashboardShowcase() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: 8, rotateY: -6 }}
      animate={{ opacity: 1, y: 0, rotateX: 8, rotateY: -6 }}
      transition={{ duration: 0.9, delay: 0.3, ease }}
      style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
      className="w-full max-w-sm mx-auto">
      <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/20"
        style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}>
        {/* Mockup header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <div className="w-2 h-2 rounded-full bg-red-400 opacity-80" />
          <div className="w-2 h-2 rounded-full bg-yellow-400 opacity-80" />
          <div className="w-2 h-2 rounded-full bg-green-400 opacity-80" />
          <div className="flex-1 mx-2 h-4 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>
        {/* Mockup content */}
        <div className="p-4 space-y-3">
          {/* Stat row */}
          <div className="grid grid-cols-3 gap-2">
            {[["98%", "Pass Rate"], ["2.3k", "Screened"], ["₦0", "Fraud"]].map(([v, l]) => (
              <div key={l} className="rounded-xl p-2.5 text-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                <p className="text-white text-sm font-bold">{v}</p>
                <p className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{l}</p>
              </div>
            ))}
          </div>
          {/* Progress bars */}
          {[
            { label: "NIN Verified", pct: 92, color: "#08B63E" },
            { label: "BVN Matched", pct: 88, color: "#2563EB" },
            { label: "Education", pct: 74, color: "#8B5CF6" },
          ].map(({ label, pct, color }) => (
            <div key={label}>
              <div className="flex justify-between mb-1">
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>{label}</span>
                <span className="text-[10px] font-semibold" style={{ color }}>{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, delay: 0.8, ease }}
                  className="h-full rounded-full" style={{ background: color }} />
              </div>
            </div>
          ))}
          {/* Candidate rows */}
          {[
            { name: "Adebayo O.", status: "Cleared", ok: true },
            { name: "Ngozi E.", status: "In Progress", ok: null },
            { name: "Emeka K.", status: "Flagged", ok: false },
          ].map(({ name, status, ok }) => (
            <div key={name} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="w-6 h-6 rounded-lg text-[10px] font-bold text-white flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #08142B, #2563EB)" }}>
                {name.charAt(0)}
              </div>
              <span className="text-xs text-white flex-1">{name}</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: ok === true ? "rgba(8,182,62,0.2)" : ok === false ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)",
                  color: ok === true ? "#08B63E" : ok === false ? "#EF4444" : "#F59E0B"
                }}>
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

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
    <div className="min-h-screen flex" style={{ background: "#F4F6F8" }}>
      {/* Left — Authentication Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 order-2 lg:order-1">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-white border rounded-xl flex items-center justify-center p-1.5 shadow-sm" style={{ borderColor: "#E5E7EB" }}>
              <img src={arapointLogo} alt="Arapoint" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-bold text-base leading-none" style={{ color: "#0F172A" }}>Arapoint</p>
              <p className="text-xs mt-0.5" style={{ color: "#08B63E" }}>Screening Platform</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}>
            {/* Card */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border" style={{ borderColor: "#E5E7EB", boxShadow: "0 20px 60px rgba(8,20,43,0.12)" }}>
              <div className="mb-7">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-4"
                  style={{ background: "rgba(8,182,62,0.08)", color: "#08B63E", border: "1px solid rgba(8,182,62,0.2)" }}>
                  <Sparkles className="w-3 h-3" />
                  Enterprise Intelligence Platform
                </div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: "#0F172A" }}>Welcome back</h2>
                <p className="text-sm mt-1.5" style={{ color: "#64748B" }}>Sign in to your screening dashboard</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium" style={{ color: "#0F172A" }}>Email Address</Label>
                  <Input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="admin@company.com" required
                    className="h-11 rounded-xl text-sm"
                    style={{ borderColor: "#E5E7EB", background: "#F4F6F8" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium" style={{ color: "#0F172A" }}>Password</Label>
                    <a href="/employment-screening/forgot-password" className="text-xs font-medium hover:opacity-70" style={{ color: "#08B63E" }}>
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPass ? "text" : "password"} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password" required
                      className="h-11 rounded-xl text-sm pr-10"
                      style={{ borderColor: "#E5E7EB", background: "#F4F6F8" }}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#64748B" }}>
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={loading}
                  className="w-full h-11 text-white rounded-xl font-semibold text-sm shadow-lg"
                  style={{ background: "linear-gradient(135deg, #08B63E, #079C36)", boxShadow: "0 4px 14px rgba(8,182,62,0.35)" }}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing In...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign In <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>

              {/* SSO divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "#E5E7EB" }} />
                <span className="text-xs font-medium" style={{ color: "#64748B" }}>or continue with</span>
                <div className="flex-1 h-px" style={{ background: "#E5E7EB" }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Google", icon: "G" },
                  { label: "Microsoft", icon: "M" },
                ].map(({ label, icon }) => (
                  <button key={label}
                    className="flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-medium transition-all hover:bg-gray-50 border"
                    style={{ borderColor: "#E5E7EB", color: "#0F172A" }}
                    onClick={() => toast({ title: "SSO Coming Soon", description: `${label} SSO will be available soon.` })}>
                    <span className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center bg-gray-100">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>

              <p className="text-center text-sm mt-6" style={{ color: "#64748B" }}>
                Don't have an account?{" "}
                <a href="/employment-screening/register" className="font-semibold hover:opacity-70" style={{ color: "#08B63E" }}>
                  Create organization
                </a>
              </p>
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex items-center justify-center gap-6">
              {[
                { icon: Lock, label: "256-bit SSL" },
                { icon: Shield, label: "SOC 2 Ready" },
                { icon: CheckCircle, label: "NDPR Compliant" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: "#64748B" }}>
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right — 3D Dashboard Showcase */}
      <div className="hidden lg:flex flex-col justify-center order-1 lg:order-2 w-[55%] relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #08142B 0%, #102340 60%, #0D2D50 100%)" }}>
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        {/* Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 opacity-15"
          style={{ background: "radial-gradient(circle, #08B63E, transparent)", transform: "translate(20%, -20%)" }} />
        <div className="absolute bottom-0 left-0 w-72 h-72 opacity-10"
          style={{ background: "radial-gradient(circle, #2563EB, transparent)", transform: "translate(-20%, 20%)" }} />

        <div className="relative px-12 py-10 flex flex-col h-full justify-between">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl border border-white/20 flex items-center justify-center p-1.5">
              <img src={arapointLogo} alt="Arapoint" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">Arapoint</p>
              <p className="text-xs mt-0.5" style={{ color: "#08B63E" }}>Employment Trust Infrastructure</p>
            </div>
          </motion.div>

          {/* Hero copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="my-8">
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
              Verify identity,<br />education &<br />
              <span style={{ color: "#08B63E" }}>hiring risk</span> in minutes.
            </h1>
            <p className="text-base" style={{ color: "rgba(255,255,255,0.55)" }}>
              Nigeria's most trusted employment screening platform — built for modern HR teams, fintechs, and enterprises.
            </p>
          </motion.div>

          {/* 3D Dashboard mockup */}
          <div className="flex-1 flex items-center justify-center py-4">
            <DashboardShowcase />
          </div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease }}
            className="space-y-2.5">
            {TRUST_BADGES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Icon className="w-4 h-4" style={{ color: "#08B63E" }} />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-none">{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
