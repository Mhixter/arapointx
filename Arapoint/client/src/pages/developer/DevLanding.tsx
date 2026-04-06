import { Link } from "wouter";
import {
  Code2, Key, Wallet, FileText, ShieldCheck, Webhook,
  ArrowRight, Globe, Zap, Lock, CheckCircle
} from "lucide-react";

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
  { icon: Key, title: "API Keys & Sandbox", desc: "Get sandbox and live keys instantly. Test free before going live.", accent: C.blue },
  { icon: ShieldCheck, title: "Identity Verification", desc: "NIN, BVN checks in real-time via a single REST endpoint.", accent: C.green },
  { icon: FileText, title: "Education Checks", desc: "Verify WAEC, NECO and JAMB results programmatically.", accent: C.amber },
  { icon: Wallet, title: "Pay-as-you-go", desc: "No monthly fees. Fund your wallet and pay only for successful calls.", accent: C.green },
  { icon: Webhook, title: "Webhooks", desc: "Receive signed real-time events for every verification result.", accent: "#8B5CF6" },
  { icon: Zap, title: "Sub-2s Response", desc: "99.9% uptime SLA with fast, reliable responses.", accent: C.blue },
];

const PRICING = [
  { service: "NIN Verification", price: "₦130", accent: C.blue },
  { service: "BVN Lookup", price: "₦80", accent: C.green },
  { service: "CAC / Business Check", price: "₦200", accent: C.amber },
  { service: "Education Credential", price: "₦250", accent: "#8B5CF6" },
  { service: "Employment Check", price: "₦350–450", accent: "#EC4899" },
  { service: "Fraud Score", price: "₦50", accent: "#EF4444" },
];

export default function DevLanding() {
  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 backdrop-blur-md" style={{ background: `${C.bg}E6`, borderBottom: `1px solid ${C.border}` }}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0B5FFF,#12B76A)" }}>
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-sm">Arapoint</span>
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
        {/* ── Hero ── */}
        <section className="container mx-auto px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-8" style={{ background: `${C.blue}1A`, color: C.blue, border: `1px solid ${C.blue}33` }}>
            <Globe className="w-3.5 h-3.5" /> Nigeria's Identity Verification API
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 max-w-3xl mx-auto">
            Build{" "}
            <span style={{ background: "linear-gradient(135deg,#0B5FFF,#12B76A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              identity-first
            </span>{" "}
            apps for Nigeria
          </h1>
          <p className="text-lg max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: C.muted }}>
            NIN, BVN, education, employment, and fraud checks — all through one simple REST API.
            Start in sandbox for free. Go live in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/developer/login">
              <button className="flex items-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl text-white transition-opacity hover:opacity-90" style={{ background: C.blue, boxShadow: `0 8px 32px ${C.blue}40` }}>
                Create Free Account <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/developer/docs">
              <button className="flex items-center gap-2 text-base font-semibold px-8 py-3.5 rounded-xl transition-colors" style={{ border: `1px solid ${C.border}`, color: C.text }}>
                <FileText className="w-5 h-5" /> Read the Docs
              </button>
            </Link>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12">
            {[
              { icon: CheckCircle, label: "Free sandbox" },
              { icon: CheckCircle, label: "No credit card" },
              { icon: CheckCircle, label: "99.9% uptime SLA" },
              { icon: CheckCircle, label: "Pay per call" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-2 text-sm" style={{ color: C.muted }}>
                <Icon className="w-4 h-4" style={{ color: C.green }} /> {label}
              </span>
            ))}
          </div>
        </section>

        {/* ── Code Preview ── */}
        <section className="container mx-auto px-4 pb-8">
          <div className="max-w-3xl mx-auto rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
            <div className="flex items-center gap-2 px-5 py-3" style={{ background: "#0A0A0A", borderBottom: `1px solid ${C.border}` }}>
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="w-3 h-3 rounded-full" style={{ background: C.green }} />
              <span className="ml-2 text-xs font-mono" style={{ color: C.muted }}>verify-nin.js</span>
            </div>
            <pre className="p-6 text-sm font-mono overflow-x-auto leading-relaxed" style={{ color: "#E5E7EB" }}>{`const response = await fetch(
  "https://arapoint.com.ng/api/v1/developer/verify/nin",
  {
    method: "POST",
    headers: {
      "X-API-Key": "ara_sand_your_api_key_here",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ nin: "12345678901" })
  }
);
const { data } = await response.json();
// ✓ { firstName: "JOHN", lastName: "DOE", dateOfBirth: "1990-01-15" }`}</pre>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white mb-3">Everything you need to ship fast</h2>
            <p className="text-base" style={{ color: C.muted }}>One platform for all Nigeria identity checks</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, accent }) => (
              <div key={title} className="rounded-xl p-6 transition-all" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5" style={{ background: `${accent}1A`, border: `1px solid ${accent}33` }}>
                  <Icon className="w-5 h-5" style={{ color: accent }} />
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="container mx-auto px-4 pb-20">
          <div className="max-w-3xl mx-auto rounded-2xl p-8" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-extrabold text-white mb-2">Simple, transparent pricing</h2>
              <p className="text-sm" style={{ color: C.muted }}>Pay only for successful API calls. No subscription fees.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRICING.map(({ service, price, accent }) => (
                <div key={service} className="rounded-xl p-4" style={{ background: `${accent}0D`, border: `1px solid ${accent}30` }}>
                  <p className="text-xs mb-1.5" style={{ color: C.muted }}>{service}</p>
                  <p className="text-lg font-bold" style={{ color: accent }}>{price}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="container mx-auto px-4 pb-24">
          <div className="max-w-2xl mx-auto rounded-2xl p-10 text-center" style={{ background: "linear-gradient(135deg,#0B5FFF15,#12B76A15)", border: `1px solid ${C.blue}30` }}>
            <Lock className="w-10 h-10 mx-auto mb-5" style={{ color: C.blue }} />
            <h2 className="text-2xl font-extrabold text-white mb-3">Start building in minutes</h2>
            <p className="mb-8 leading-relaxed" style={{ color: C.muted }}>
              Create a free account, get your sandbox key, and make your first API call — no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/developer/login">
                <button className="font-bold px-8 py-3 rounded-xl text-white transition-opacity hover:opacity-90" style={{ background: C.blue }}>
                  Create Free Account
                </button>
              </Link>
              <Link href="/developer/login">
                <button className="font-semibold px-8 py-3 rounded-xl transition-colors" style={{ border: `1px solid ${C.border}`, color: C.text }}>
                  Sign In
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center py-8 text-xs" style={{ borderTop: `1px solid ${C.border}`, color: C.muted }}>
        <p className="mb-2">© {new Date().getFullYear()} Arapoint Technologies. All rights reserved.</p>
        <div className="flex justify-center gap-6">
          <a href="https://arapoint.com.ng/privacy" className="hover:text-white transition-colors">Privacy</a>
          <a href="https://arapoint.com.ng/terms" className="hover:text-white transition-colors">Terms</a>
          <a href="https://arapoint.com.ng" className="hover:text-white transition-colors">Main Site</a>
        </div>
      </footer>
    </div>
  );
}
