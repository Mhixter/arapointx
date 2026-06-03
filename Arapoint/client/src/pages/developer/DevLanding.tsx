import { Link } from "wouter";
import {
  Code2, Key, Wallet, FileText, ShieldCheck, Webhook,
  ArrowRight, Globe, Zap, Lock, CheckCircle, Users,
  Building2, CreditCard, Search, BarChart3, Clock,
  AlertTriangle, BadgeCheck, Briefcase, GraduationCap
} from "lucide-react";
import { TestimonialsSlider } from "@/components/TestimonialsSlider";

const C = {
  bg: "var(--dev-bg)",
  card: "var(--dev-card)",
  border: "var(--dev-border)",
  text: "var(--dev-text)",
  muted: "var(--dev-muted)",
  blue: "var(--dev-blue)",
  green: "var(--dev-green)",
  amber: "var(--dev-amber)",
};

const FEATURES = [
  { icon: ShieldCheck, title: "Employment Screening API", desc: "Verify NIN + BVN + SSCE in a single request. Cross-reference names, DOB, and education credentials with intelligent scoring.", accent: C.green },
  { icon: Webhook, title: "Webhook Delivery", desc: "Receive real-time notifications for verification results via signed webhooks.", accent: C.blue },
  { icon: Key, title: "API Keys & Sandbox", desc: "Test free with sandbox environment — no credit card required.", accent: C.blue },
  { icon: Lock, title: "Production Security", desc: "NDPA compliant with encryption at rest and in transit.", accent: "#ef4444" },
  { icon: Wallet, title: "Pay-Per-Use Pricing", desc: "Only pay for successful verifications. No subscription fees.", accent: C.green },
  { icon: FileText, title: "Developer Docs", desc: "Complete API reference with code examples in 5+ languages.", accent: C.blue },
];

const USE_CASES = [
  { icon: Briefcase, title: "Fintech & Lending", desc: "Instantly verify borrowers and prevent identity fraud in loan applications.", accent: C.blue },
  { icon: Users, title: "HR & Recruitment", desc: "Screen job candidates and validate educational credentials at scale.", accent: C.green },
  { icon: Building2, title: "Risk & Compliance", desc: "Meet regulatory requirements and reduce operational risk.", accent: C.amber },
];

const SCREENING_CHECKS = [
  { label: "NIN Validity", icon: CheckCircle },
  { label: "BVN Match", icon: CheckCircle },
  { label: "Name Consistency", icon: CheckCircle },
  { label: "DOB Validation", icon: CheckCircle },
  { label: "WAEC Check", icon: CheckCircle },
  { label: "NECO Check", icon: CheckCircle },
  { label: "NABTEB Verify", icon: CheckCircle },
  { label: "Education Match", icon: CheckCircle },
  { label: "Fraud Scoring", icon: CheckCircle },
  { label: "Overall Decision", icon: CheckCircle },
];

const PRICING = [
  { service: "NIN Verification", price: "₦150", accent: C.blue },
  { service: "BVN Verification", price: "₦150", accent: C.green },
  { service: "SSCE Verification", price: "₦150", accent: C.amber },
  { service: "Employment Screening", price: "₦350", accent: C.blue, note: "(15% off bundle)" },
];

export default function DevLanding() {
  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text }}>

      <header className="sticky top-0 z-10 backdrop-blur-md" style={{ background: `${C.bg}E6`, borderBottom: `1px solid ${C.border}` }}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0B5FFF,#12B76A)" }}>
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold" style={{ color: C.text }}>Arapoint</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${C.blue}1A`, color: C.blue, border: `1px solid ${C.blue}33` }}>Developer Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/developer/login">
              <button className="text-sm font-medium px-4 py-2 rounded-lg transition-colors" style={{ color: C.text }}>Sign In</button>
            </Link>
            <Link href="/developer/login">
              <button className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90" style={{ background: C.blue }}>
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-8" style={{ background: `${C.green}1A`, color: C.green, border: `1px solid ${C.green}33` }}>
            <ShieldCheck className="w-3.5 h-3.5" /> Employment Screening & Identity Verification API
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 max-w-4xl mx-auto" style={{ color: C.text }}>
            Screen employees.{" "}
            <span style={{ background: "linear-gradient(135deg,#0B5FFF,#12B76A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Verify identity.
            </span>{" "}
            Validate credentials.
          </h1>
          <p className="text-lg max-w-2xl mx-auto mb-6 leading-relaxed" style={{ color: C.muted }}>
            One API call to verify NIN, BVN, and SSCE results together. Cross-reference names and dates of birth across all three sources. Get a clear PASS, REVIEW, or FAIL decision — built for fintechs, recruiters, lenders, and HR teams operating in Nigeria.
          </p>
          <p className="text-sm max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: C.muted }}>
            Trusted by companies who need to know their candidates and customers are who they claim to be.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/developer/login">
              <button className="flex items-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl text-white transition-opacity hover:opacity-90" style={{ background: C.blue, boxShadow: `0 8px 32px ${C.blue}40` }}>
                Create Free Account <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/developer/docs">
              <button className="flex items-center gap-2 text-base font-semibold px-8 py-3.5 rounded-xl transition-colors" style={{ border: `1px solid ${C.border}`, color: C.text }}>
                <FileText className="w-5 h-5" /> View API Documentation
              </button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-12">
            {[
              { icon: CheckCircle, label: "Free sandbox testing" },
              { icon: CheckCircle, label: "No credit card required" },
              { icon: CheckCircle, label: "15% bundle discount" },
              { icon: CheckCircle, label: "Results in minutes" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-2 text-sm" style={{ color: C.muted }}>
                <Icon className="w-4 h-4" style={{ color: C.green }} /> {label}
              </span>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-8">
          <div className="max-w-3xl mx-auto rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
            <div className="flex items-center gap-2 px-5 py-3" style={{ background: "#0A0A0A", borderBottom: `1px solid ${C.border}` }}>
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="w-3 h-3 rounded-full" style={{ background: C.green }} />
              <span className="ml-2 text-xs font-mono" style={{ color: C.muted }}>employment-screening.js</span>
            </div>
            <pre className="p-6 text-sm font-mono overflow-x-auto leading-relaxed" style={{ color: "#E5E7EB" }}>{`const response = await fetch(
  "https://arapoint.com.ng/api/v1/developer/verify/employment-screening",
  {
    method: "POST",
    headers: {
      "X-API-Key": "ara_your_api_key_here",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      nin: "12345678901",
      bvn: "12345678901",
      educationProvider: "waec",
      registrationNumber: "WA2020/12345",
      examYear: 2020,
      examType: "Internal",
      cardSerialNumber: "CS123456",
      cardPin: "1234"
    })
  }
);
const { data } = await response.json();
// data.decision → "PASS"  |  data.score → 100
// data.ssceAnalysis.meetsMinimumRequirement → true
// data.crossCheck.allNamesConsistent → true`}</pre>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-extrabold mb-3" style={{ color: C.text }}>Why businesses choose Arapoint</h2>
            <p className="text-base max-w-2xl mx-auto" style={{ color: C.muted }}>
              Whether you are onboarding borrowers, hiring staff, or meeting regulatory requirements, Arapoint gives you the data confidence to make informed decisions.
            </p>
          </div>
          <p className="text-center text-sm mb-12 max-w-xl mx-auto" style={{ color: C.muted }}>
            Every year, Nigerian businesses lose billions to identity fraud, falsified credentials, and bad hires. Arapoint helps you catch the problems before they cost you.
          </p>
          <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {USE_CASES.map(({ icon: Icon, title, desc, accent }) => (
              <div key={title} className="rounded-xl p-6 transition-all" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5" style={{ background: `${accent}1A`, border: `1px solid ${accent}33` }}>
                  <Icon className="w-5 h-5" style={{ color: accent }} />
                </div>
                <h3 className="font-bold mb-2" style={{ color: C.text }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-20">
          <div className="max-w-4xl mx-auto rounded-2xl p-8" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4" style={{ background: `${C.green}1A`, color: C.green, border: `1px solid ${C.green}33` }}>
                <ShieldCheck className="w-3.5 h-3.5" /> Employment Screening Endpoint
              </div>
              <h2 className="text-2xl font-extrabold mb-2" style={{ color: C.text }}>10 checks in one API call</h2>
              <p className="text-sm max-w-xl mx-auto" style={{ color: C.muted }}>
                Our employment screening endpoint runs a comprehensive battery of identity, consistency, and education checks — then returns a single, clear decision your system can act on.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {SCREENING_CHECKS.map(({ label, icon: Icon }, i) => (
                <div key={label} className="rounded-xl p-3 text-center" style={{ background: `${C.green}08`, border: `1px solid ${C.green}20` }}>
                  <Icon className="w-4 h-4 mx-auto mb-2" style={{ color: C.green }} />
                  <p className="text-xs leading-tight" style={{ color: C.muted }}>{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl p-4" style={{ background: `${C.blue}08`, border: `1px solid ${C.blue}20` }}>
              <p className="text-xs text-center leading-relaxed" style={{ color: C.muted }}>
                <span className="font-semibold" style={{ color: C.text }}>Scoring:</span> Each check contributes to a 100-point score.{" "}
                <span style={{ color: C.green }}>PASS (85+)</span> means all critical checks cleared.{" "}
                <span style={{ color: C.amber }}>REVIEW (60–84)</span> means some flags require manual attention.{" "}
                <span style={{ color: "#EF4444" }}>FAIL (&lt;60)</span> means significant identity or credential issues were found.
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-3" style={{ color: C.text }}>Everything you need to integrate</h2>
            <p className="text-base" style={{ color: C.muted }}>Production-grade infrastructure with developer-first design</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, accent }) => (
              <div key={title} className="rounded-xl p-6 transition-all" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5" style={{ background: `${accent}1A`, border: `1px solid ${accent}33` }}>
                  <Icon className="w-5 h-5" style={{ color: accent }} />
                </div>
                <h3 className="font-bold mb-2" style={{ color: C.text }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-20">
          <div className="max-w-3xl mx-auto rounded-2xl p-8" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-extrabold mb-2" style={{ color: C.text }}>Simple, transparent pricing</h2>
              <p className="text-sm" style={{ color: C.muted }}>Pay only for successful API calls. No subscription fees, no hidden charges.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRICING.map(({ service, price, accent, note }) => (
                <div key={service} className="rounded-xl p-4" style={{ background: `${accent}0D`, border: `1px solid ${accent}30` }}>
                  <p className="text-xs mb-1.5" style={{ color: C.muted }}>{service}</p>
                  <p className="text-lg font-bold" style={{ color: accent }}>{price}</p>
                  {note && <p className="text-xs mt-1" style={{ color: accent, opacity: 0.7 }}>{note}</p>}
                </div>
              ))}
            </div>
            <p className="text-center text-xs mt-6" style={{ color: C.muted }}>
              Employment Screening bundles NIN + BVN + SSCE with an automatic 15% discount. Enterprise volume pricing available on request.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-20">
          <div className="max-w-4xl mx-auto rounded-2xl p-8" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-extrabold mb-2" style={{ color: C.text }}>The cost of not screening</h2>
              <p className="text-sm" style={{ color: C.muted }}>These are real problems Nigerian businesses face every day.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              {[
                {
                  icon: AlertTriangle,
                  stat: "₦4.2B+",
                  label: "Lost annually to identity fraud in Nigerian financial services",
                  accent: "#EF4444",
                },
                {
                  icon: Users,
                  stat: "38%",
                  label: "Of CVs in Nigeria contain falsified or exaggerated academic credentials",
                  accent: C.amber,
                },
                {
                  icon: Clock,
                  stat: "5-14 days",
                  label: "Average time for manual background checks — Arapoint does it in minutes",
                  accent: C.green,
                },
              ].map(({ icon: Icon, stat, label, accent }) => (
                <div key={stat} className="rounded-xl p-5 text-center" style={{ background: `${accent}08`, border: `1px solid ${accent}20` }}>
                  <Icon className="w-6 h-6 mx-auto mb-3" style={{ color: accent }} />
                  <p className="text-2xl font-extrabold mb-2" style={{ color: accent }}>{stat}</p>
                  <p className="text-xs leading-relaxed" style={{ color: C.muted }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ borderTop: `1px solid ${C.border}` }}>
          <TestimonialsSlider dark accentColor="#10b981" />
        </section>

        <section className="container mx-auto px-4 pb-24">
          <div className="max-w-2xl mx-auto rounded-2xl p-10 text-center" style={{ background: "linear-gradient(135deg,#0B5FFF15,#12B76A15)", border: `1px solid ${C.blue}30` }}>
            <Lock className="w-10 h-10 mx-auto mb-5" style={{ color: C.blue }} />
            <h2 className="text-2xl font-extrabold mb-3" style={{ color: C.text }}>Start screening in minutes</h2>
            <p className="mb-4 leading-relaxed" style={{ color: C.muted }}>
              Create a free developer account, get your sandbox API key, and run your first employment screening — all without spending a naira. When you are ready to go live, fund your wallet and switch to production.
            </p>
            <p className="text-sm mb-8" style={{ color: C.muted }}>
              No contracts. No minimum spend. Cancel anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/developer/login">
                <button className="font-bold px-8 py-3 rounded-xl text-white transition-opacity hover:opacity-90" style={{ background: C.blue }}>
                  Create Free Account
                </button>
              </Link>
              <Link href="/developer/docs">
                <button className="font-semibold px-8 py-3 rounded-xl transition-colors" style={{ border: `1px solid ${C.border}`, color: C.text }}>
                  Read the Docs
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center py-8 text-xs" style={{ borderTop: `1px solid ${C.border}`, color: C.muted }}>
        <p className="mb-2">&copy; {new Date().getFullYear()} Arapoint Technologies. All rights reserved.</p>
        <div className="flex justify-center gap-6">
          <a href="https://arapoint.com.ng/privacy" className="hover:text-white transition-colors">Privacy</a>
          <a href="https://arapoint.com.ng/terms" className="hover:text-white transition-colors">Terms</a>
          <a href="https://arapoint.com.ng" className="hover:text-white transition-colors">Main Site</a>
        </div>
      </footer>
    </div>
  );
}