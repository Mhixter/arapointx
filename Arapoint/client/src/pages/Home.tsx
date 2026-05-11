import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Shield, GraduationCap, Building2, Zap, ChevronRight, Lock, ArrowRight, Code2, Terminal, Globe, Webhook, Users, CreditCard, Briefcase, BarChart3, Clock, BadgeCheck, Star, TrendingUp, CheckCheck, Database, Fingerprint, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import heroCutout from "@/assets/hero-cutout.png";

function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function StatCard({ value, label, suffix = "", prefix = "" }: { value: number; label: string; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const count = useCountUp(value, 1800, visible);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="text-center">
      <p className="text-4xl sm:text-5xl font-heading font-extrabold text-foreground tabular-nums">
        {prefix}{count.toLocaleString()}{suffix}
      </p>
      <p className="text-sm text-muted-foreground mt-1.5 leading-snug">{label}</p>
    </div>
  );
}

const TYPING_LINES = [
  '{ "status": "success",',
  '  "data": {',
  '    "firstName": "CHUKWUEMEKA",',
  '    "lastName": "OKONKWO",',
  '    "dateOfBirth": "1995-03-14",',
  '    "gender": "Male",',
  '    "nin": "12345678901",',
  '    "phone": "08012345678"',
  '  },',
  '  "decision": "PASS",',
  '  "score": 94',
  '}',
];

function AnimatedTerminal() {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < TYPING_LINES.length) {
        setLines(prev => [...prev, TYPING_LINES[i]]);
        i++;
      } else {
        setDone(true);
        clearInterval(interval);
        setTimeout(() => { setLines([]); setDone(false); i = 0; }, 3000);
      }
    }, 180);
    return () => clearInterval(interval);
  }, [done]);

  return (
    <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
        <span className="ml-2 text-xs text-gray-500 font-mono">NIN Verification → Response</span>
        <span className="ml-auto text-xs text-green-400 font-mono animate-pulse">● live</span>
      </div>
      <div className="p-4 font-mono text-xs min-h-[220px]">
        {lines.filter(Boolean).map((line, i) => (
          <div
            key={i}
            className="leading-6 animate-in slide-in-from-left-2 duration-200"
            style={{ color: line.includes('"status"') || line.includes('"message"') ? '#86EFAC' : line.includes('"decision"') || line.includes('"firstName"') || line.includes('"lastName"') ? '#93C5FD' : line.includes('"score"') || line.includes('"dateOfBirth"') ? '#FCD34D' : '#D1D5DB' }}
          >
            {line}
          </div>
        ))}
        {!done && <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-0.5 align-middle" />}
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/40 shadow-2xl bg-background">
      <div className="bg-sidebar px-4 py-3 flex items-center gap-3 border-b border-sidebar-border">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
          <div className="w-3 h-3 rounded-full bg-green-400/60" />
        </div>
        <span className="text-xs text-sidebar-foreground/50 font-mono ml-2">arapoint.com.ng/dashboard</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400">Verified</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "NIN Checks", value: "248", color: "text-primary", bg: "bg-primary/10" },
            { label: "SSCE Verified", value: "91", color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Wallet Balance", value: "₦12,400", color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map(s => (
            <div key={s.label} className={`rounded-lg p-2.5 ${s.bg}`}>
              <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold">Recent Verifications</span>
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
          {[
            { name: "ADAEZE NWOSU", type: "NIN + BVN", status: "PASS", time: "2 min ago" },
            { name: "EMEKA OKAFOR", type: "Employment Screen", status: "PASS", time: "5 min ago" },
            { name: "FATIMA ABUBAKAR", type: "WAEC Result", status: "REVIEW", time: "12 min ago" },
          ].map(r => (
            <div key={r.name} className="flex items-center justify-between px-3 py-2 border-b border-border/30 last:border-0 text-xs">
              <div>
                <p className="font-medium text-foreground">{r.name}</p>
                <p className="text-muted-foreground">{r.type}</p>
              </div>
              <div className="text-right">
                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${r.status === "PASS" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{r.status}</span>
                <p className="text-muted-foreground mt-0.5">{r.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col gap-20 pb-20">

      {/* ── HERO ── */}
      <section className="relative pt-20 pb-32 overflow-hidden bg-mesh">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
        </div>
        <div className="container relative z-10 grid lg:grid-cols-2 gap-12 items-center px-4 sm:px-6 lg:px-8">
          <div className="space-y-8 animate-in slide-in-from-left-5 duration-700 fade-in justify-self-start max-w-lg">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/30 gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              NDPA Compliant · Registry Connected · Live
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-foreground tracking-tight leading-[1.1]">
              Nigeria's Trusted<br />
              <span className="text-primary">Identity</span> &amp;<br />
              Verification API
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Verify NIN, BVN, WAEC, NECO results and screen employees — in real time. Built for fintechs, lenders, HR teams, and any Nigerian business that needs to know who they're dealing with.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/auth/signup">
                <Button size="lg" className="h-13 px-8 text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5">
                  Start Verifying Free <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button size="lg" variant="outline" className="h-13 px-8 text-base bg-background/50 backdrop-blur-sm hover:-translate-y-0.5 transition-all">
                  View API Docs
                </Button>
              </Link>
            </div>
            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><CheckCircle2 className="text-primary h-3.5 w-3.5" /><span>No setup fee</span></div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="text-primary h-3.5 w-3.5" /><span>Free sandbox</span></div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="text-primary h-3.5 w-3.5" /><span>Pay per use</span></div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="text-primary h-3.5 w-3.5" /><span>Under 2 seconds</span></div>
            </div>
          </div>

          <div className="relative animate-in slide-in-from-right-5 duration-1000 fade-in delay-200 justify-self-end w-full max-w-md">
            {/* Gradient background panel */}
            <div className="relative rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, #059669 0%, #065f46 60%, #022c22 100%)", minHeight: 480 }}>
              {/* Subtle grid pattern overlay */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)", backgroundSize: "28px 28px" }} />
              {/* Floating stat cards */}
              <div className="absolute top-6 left-5 bg-white/95 backdrop-blur rounded-xl shadow-lg px-3 py-2.5 z-20">
                <p className="text-xs font-bold text-gray-900">Identity Verified</p>
                <p className="text-xs text-gray-400 mt-0.5">NIN · BVN · SSCE</p>
              </div>
              <div className="absolute top-6 right-5 flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-xl shadow-lg px-3 py-2.5 z-20">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-green-700">PASS</span>
              </div>
              <div className="absolute bottom-6 left-5 bg-white/95 backdrop-blur rounded-xl shadow-lg px-3 py-2.5 z-20">
                <p className="text-xs text-gray-400">Response time</p>
                <p className="text-sm font-bold text-gray-900">1.2s</p>
              </div>
              <div className="absolute bottom-6 right-5 bg-white/95 backdrop-blur rounded-xl shadow-lg px-3 py-2.5 z-20">
                <p className="text-xs text-gray-400">Confidence</p>
                <p className="text-sm font-bold text-gray-900">99.4%</p>
              </div>
              {/* Cutout person — bottom aligned so they "stand" in the card */}
              <img
                src={heroCutout}
                alt="Nigerian professional using Arapoint identity verification"
                className="relative z-10 w-full object-contain object-bottom"
                style={{ height: 480 }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="border-y border-border/40 bg-muted/30">
        <div className="container px-4 py-14">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 divide-x divide-border/40">
            <StatCard value={250000} suffix="+" label="Verifications processed" />
            <StatCard value={99} suffix="%" label="Uptime guarantee" />
            <StatCard value={2} suffix="s" label="Average NIN/BVN response time" />
            <StatCard value={4} label="Exam bodies supported (WAEC, NECO, NABTEB, NBAIS)" />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="container px-4">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/30">
            Complete verification suite
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold">Everything in one platform</h2>
          <p className="text-muted-foreground text-lg">Verify customers, screen employees, validate education credentials, and detect fraud — all through a single API or dashboard.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={Fingerprint}
            title="Identity Verification"
            description="Instant NIN and BVN validation directly from NIMC and CBN registries. Full name, DOB, gender, and address returned in under 2 seconds."
            href="/identity-verification"
            badge="From ₦80"
          />
          <FeatureCard
            icon={Briefcase}
            title="Employment Screening"
            description="Verify NIN + BVN + SSCE in one API call. Cross-reference names and DOB, analyze grades, get an automated PASS / REVIEW / FAIL decision."
            href="/employment-screening"
            badge="From ₦391"
          />
          <FeatureCard
            icon={GraduationCap}
            title="Education Verification"
            description="Verify WAEC, NECO, NABTEB, and NBAIS results programmatically. Automated credit-level analysis — English, Maths, 5-credit minimum requirement."
            href="/education-verification"
            badge="From ₦250"
          />
          <FeatureCard
            icon={Building2}
            title="Business Validation (KYB)"
            description="Confirm CAC registration status and Tax Identification Number. Essential for KYB compliance and vendor onboarding."
          />
          <FeatureCard
            icon={Shield}
            title="Fraud Prevention"
            description="Advanced risk scoring that detects name mismatches, DOB inconsistencies, and data anomalies across identity sources. Instant fraud signal."
            href="/background-checks"
            badge="₦50/check"
          />
          <FeatureCard
            icon={Zap}
            title="VTU & Utilities"
            description="Purchase airtime, data bundles, and pay electricity and cable TV bills instantly. Result checker PINs for WAEC and NECO available."
          />
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            <Link href="/nin-verification" className="text-primary hover:underline">NIN Verification</Link>
            {" · "}
            <Link href="/bvn-verification" className="text-primary hover:underline">BVN Verification</Link>
            {" · "}
            <Link href="/kyc-api" className="text-primary hover:underline">KYC API</Link>
            {" · "}
            <Link href="/employment-screening" className="text-primary hover:underline">Employment Screening</Link>
            {" · "}
            <Link href="/education-verification" className="text-primary hover:underline">Education Verification</Link>
            {" · "}
            <Link href="/background-checks" className="text-primary hover:underline">Background Checks</Link>
          </p>
        </div>
      </section>

      {/* ── PRODUCT PREVIEW ── */}
      <section className="container px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/30">
              <Database className="w-3 h-3 mr-1.5" /> Live Dashboard
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold leading-tight">
              One dashboard for all your verification needs
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Track every verification in real time. See PASS/REVIEW/FAIL decisions, wallet balance, and full audit trail — all from your Arapoint dashboard.
            </p>
            <ul className="space-y-3">
              {[
                "Real-time status updates on every verification job",
                "Wallet management with instant Paystack top-up",
                "Full audit trail with timestamps and decision records",
                "Download verification reports as PDF",
                "Multi-user team access with role permissions",
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="text-primary h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/auth/signup">
              <Button className="h-11 px-6">
                Open Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="animate-in slide-in-from-right-5 duration-700 fade-in">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ── EMPLOYMENT SCREENING ── */}
      <section className="container px-4">
        <div className="bg-gradient-to-br from-primary/5 via-background to-blue-500/5 border border-border/50 rounded-2xl sm:rounded-3xl p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/30">
              <BadgeCheck className="w-3 h-3 mr-1.5" /> Employment Screening API
            </div>
            <h2 className="text-3xl font-heading font-bold">One API call. Complete candidate screening.</h2>
            <p className="text-muted-foreground leading-relaxed">
              NIN + BVN + SSCE in a single request. Cross-reference names and dates of birth across all three sources. Automated grade analysis. PASS / REVIEW / FAIL decision in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {[
              { icon: Building2, title: "Fintechs & Neobanks", desc: "Meet CBN KYC requirements. Verify customer identities before onboarding." },
              { icon: CreditCard, title: "Lending & Loan Apps", desc: "Screen borrowers before disbursement. Reduce default risk with identity and credential verification." },
              { icon: Users, title: "Recruiting Agencies", desc: "Validate SSCE results at scale. Confirm credit-level passes and cross-check names against government records." },
              { icon: Briefcase, title: "HR & Corporate", desc: "Automate pre-employment checks. Replace manual certificate verification." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card border border-border/50 rounded-xl p-5 hover:shadow-md transition-all hover:-translate-y-0.5 duration-200">
                <Icon className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-heading font-bold mb-2 text-sm">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
            {[
              { icon: BarChart3, stat: "100-point", label: "Intelligent scoring with PASS / REVIEW / FAIL" },
              { icon: Clock, stat: "< 5 min", label: "NIN + BVN instant, SSCE via automation" },
              { icon: Shield, stat: "10 checks", label: "Identity, name, DOB, SSCE grades in one call" },
            ].map(({ icon: Icon, stat, label }) => (
              <div key={stat} className="bg-card border border-border/50 rounded-xl p-4 text-center">
                <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-lg font-bold text-foreground">{stat}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/employment-screening">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20">
                Learn about Employment Screening <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="bg-muted/40 py-24 border-y border-border/50">
        <div className="container px-4">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-heading font-bold">Go live in minutes</h2>
            <p className="text-muted-foreground text-lg">From signup to first verified identity — in under 5 minutes. No lengthy onboarding, no paperwork.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto relative">
            <div className="hidden md:block absolute top-8 left-[calc(33%-1rem)] right-[calc(33%-1rem)] h-px bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20" />
            {[
              { step: "01", icon: Users, title: "Create Account", desc: "Sign up with your email. Get sandbox access instantly — no credit card, no waiting." },
              { step: "02", icon: Code2, title: "Get API Keys", desc: "Generate a live API key from your developer portal. Copy, paste, done. Test first with our free sandbox." },
              { step: "03", icon: CheckCircle2, title: "Verify Instantly", desc: "Call any endpoint. Get results in real time. Go from test to production in minutes." },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-5 shadow-lg shadow-primary/20 z-10">
                  <Icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <span className="text-xs font-mono text-muted-foreground/60 mb-2">{step}</span>
                <h3 className="text-lg font-heading font-bold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link href="/auth/signup">
              <Button size="lg" className="h-12 px-8 text-base">
                Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── DEVELOPER API ── */}
      <section id="developers" className="container px-4">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-indigo-950/40 text-indigo-400 border-indigo-800">
              <Code2 className="w-3 h-3 mr-1.5" /> Developer API
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold leading-tight">
              Powerful API. <span className="text-primary">Nigerian grade</span> verification.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              RESTful JSON API. NIN, BVN, education, employment screening, fraud scoring. Sandbox + live environments. Webhook support. Pay only for what you use.
            </p>
            <ul className="space-y-3">
              {[
                "NIN Verification — ₦130 per check",
                "BVN Lookup — ₦80 per check",
                "SSCE / Education Verification — ₦250 per check",
                "Employment Screening bundle — ₦391 (15% off)",
                "Fraud scoring — ₦50 per check",
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="text-primary h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/docs">
                <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20">
                  View API Docs <BookOpen className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/developer">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                  Developer Portal <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <AnimatedTerminal />
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Terminal, label: "REST API", desc: "Clean JSON" },
                { icon: Globe, label: "Sandbox", desc: "Free testing" },
                { icon: Webhook, label: "Webhooks", desc: "Real-time events" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="bg-muted rounded-xl p-3 text-center border border-border/50">
                  <Icon className="w-5 h-5 text-primary mx-auto mb-1.5" />
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST SIGNALS ── */}
      <section className="container px-4">
        <div className="bg-gray-950 border border-indigo-900/40 rounded-2xl sm:rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-transparent to-primary/5" />
          <div className="relative z-10 text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white">Built for Nigerian compliance standards</h2>
            <p className="text-gray-400 mt-3">Arapoint connects directly to government and institutional registries. No third-party delays.</p>
          </div>
          <div className="relative z-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Shield, label: "NDPA Compliant", desc: "Built to Nigeria Data Protection Act 2023 standards" },
              { icon: Database, label: "NIMC & CBN Connected", desc: "Direct registry queries — not cached third-party data" },
              { icon: Lock, label: "Bank-grade Security", desc: "TLS 1.3, HMAC-signed webhooks, IP allowlist" },
              { icon: TrendingUp, label: "99.9% Uptime SLA", desc: "Production-grade infrastructure with monitoring" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 text-center">
                <Icon className="w-7 h-7 text-primary mx-auto mb-3" />
                <p className="text-sm font-semibold text-white mb-1">{label}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="relative z-10 mt-8 text-center">
            <div className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full px-4 py-2 text-xs text-gray-400">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="ml-1">Trusted by fintechs, lenders, and HR teams across Nigeria</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="container mb-10 px-4">
        <div className="bg-primary rounded-2xl sm:rounded-3xl p-8 sm:p-14 text-center text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
          <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-3 py-1 text-xs text-primary-foreground/80">
              <Zap className="w-3 h-3" /> Get started in under 5 minutes
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-bold">Ready to verify Nigeria?</h2>
            <p className="text-primary-foreground/80 text-lg">
              Join Nigerian businesses using Arapoint to verify customers, screen employees, and protect against fraud. Free sandbox. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" variant="secondary" className="h-13 px-10 text-base shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5">
                  Create Free Account <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button size="lg" variant="outline" className="h-13 px-10 text-base border-white/30 text-white hover:bg-white/10 hover:-translate-y-0.5 transition-all">
                  Browse API Docs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, href, badge }: {
  icon: any; title: string; description: string; href?: string; badge?: string;
}) {
  const card = (
    <Card className={`border-border/50 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 duration-300 h-full group ${href ? "cursor-pointer" : ""}`}>
      <CardHeader className="pb-3">
        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3 text-primary group-hover:bg-primary/20 transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{title}</CardTitle>
          {badge && <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">{badge}</span>}
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm leading-relaxed">
          {description}
        </CardDescription>
        {href && (
          <div className="mt-3 text-xs font-semibold text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Learn more <ArrowRight className="w-3 h-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href}>{card}</Link>;
  return card;
}
