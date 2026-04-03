import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Code2, Key, Wallet, FileText, ShieldCheck, Webhook,
  ArrowRight, CheckCircle2, Terminal, Globe, Zap, Lock
} from "lucide-react";

const FEATURES = [
  { icon: Key, title: "API Keys & Sandbox", desc: "Generate sandbox and live keys instantly. Test for free before going live." },
  { icon: ShieldCheck, title: "Identity Verification", desc: "NIN, BVN, CAC checks in real-time via a single REST endpoint." },
  { icon: FileText, title: "Education Checks", desc: "Verify WAEC, NECO and JAMB results programmatically." },
  { icon: Wallet, title: "Pay-as-you-go", desc: "No monthly fees. Fund your wallet and pay only for successful calls." },
  { icon: Webhook, title: "Webhooks", desc: "Receive signed real-time events for every verification result." },
  { icon: Zap, title: "Sub-2s Response", desc: "99.9 % uptime SLA with fast, reliable responses." },
];

const PRICING = [
  { service: "NIN Verification", price: "₦130" },
  { service: "BVN Lookup", price: "₦80" },
  { service: "CAC / Business Check", price: "₦200" },
  { service: "Education Credential", price: "₦250" },
  { service: "Employment Check", price: "₦350–450" },
  { service: "Fraud Score", price: "₦50" },
];

export default function DevLanding() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">Arapoint</span>
            <span className="text-indigo-400 text-sm font-medium">Developer Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/developer/login">
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                Log In
              </Button>
            </Link>
            <Link href="/developer/login">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500">
                Get Started <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-indigo-950/60 text-indigo-300 border-indigo-800 mb-6">
            <Globe className="w-3 h-3 mr-1.5" /> Nigeria's Verification API
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 max-w-3xl mx-auto">
            Build identity-first apps with the{" "}
            <span className="text-indigo-400">Arapoint API</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Integrate Nigeria's most comprehensive verification infrastructure — NIN, BVN,
            CAC, education credentials and more — in minutes. Sandbox included, no commitment required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/developer/login">
              <Button size="lg" className="h-12 px-8 text-base bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/40">
                Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/developer/docs">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base border-gray-700 text-gray-300 hover:bg-gray-800">
                <FileText className="mr-2 h-4 w-4" /> Read the Docs
              </Button>
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-6">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 max-w-3xl mx-auto shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-xs text-gray-500 font-mono">verify-nin.js</span>
            </div>
            <pre className="text-sm text-gray-300 font-mono overflow-x-auto leading-relaxed">{`const response = await fetch(
  "https://arapoint.com.ng/api/v1/developer/verify/nin",
  {
    method: "POST",
    headers: {
      "X-API-Key": "ara_sand_your_api_key",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ nin: "12345678901" })
  }
);
const { data } = await response.json();
// { firstName: "JOHN", lastName: "DOE", dateOfBirth: "1990-01-15", ... }`}</pre>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-10">Everything you need to ship fast</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center mb-4">
                  <Icon className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="font-semibold text-white mb-1.5">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-1">Simple, transparent pricing</h2>
            <p className="text-sm text-gray-400 mb-6">Pay only for successful API calls. No subscription.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRICING.map(({ service, price }) => (
                <div key={service} className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50">
                  <p className="text-xs text-gray-400 mb-1">{service}</p>
                  <p className="text-sm font-bold text-indigo-300">{price}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-20">
          <div className="bg-indigo-600 rounded-2xl p-10 text-center max-w-2xl mx-auto">
            <Lock className="w-8 h-8 mx-auto mb-4 text-indigo-200" />
            <h2 className="text-2xl font-bold mb-3">Start building in minutes</h2>
            <p className="text-indigo-200 mb-7 text-sm leading-relaxed">
              Create a free account, get your sandbox key, and make your first API call — no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/developer/login">
                <Button size="lg" className="h-11 px-8 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold">
                  Create Free Account
                </Button>
              </Link>
              <Link href="/developer/login">
                <Button size="lg" variant="outline" className="h-11 px-8 border-indigo-400 text-white hover:bg-indigo-500">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-800 py-6 text-center text-xs text-gray-600">
        <p>© {new Date().getFullYear()} Arapoint Technologies. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-2">
          <a href="https://arapoint.com.ng/privacy" className="hover:text-gray-400 transition-colors">Privacy</a>
          <a href="https://arapoint.com.ng/terms" className="hover:text-gray-400 transition-colors">Terms</a>
          <a href="https://arapoint.com.ng" className="hover:text-gray-400 transition-colors">Main Site</a>
        </div>
      </footer>
    </div>
  );
}
