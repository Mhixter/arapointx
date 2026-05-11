import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy, CheckCircle, Book, Key, Zap, Globe, Shield,
  AlertTriangle, Code2, Webhook, CreditCard, FlaskConical,
  RefreshCw, Lock, BarChart3, ArrowRight, Menu, X,
  ChevronDown, ChevronRight, ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = "https://arapoint.com.ng/api/v1/developer";

const endpoints = [
  {
    group: "Verification",
    method: "POST",
    path: "/verify/nin",
    title: "NIN Verification",
    description: "Verify a National Identification Number in real-time. Returns full identity data including name, date of birth, gender, and address from NIMC.",
    price: 130,
    auth: "api-key",
    async: false,
    request: { nin: "12345678901" },
    response: {
      status: "success", code: 200, message: "NIN verification completed",
      data: {
        verification: { firstName: "CHUKWUEMEKA", middleName: "JAMES", lastName: "OKONKWO", dateOfBirth: "1995-03-14", gender: "Male", phone: "08012345678", nin: "12345678901", address: "12 Lagos Street, Abuja" },
        source: "ARAPOINT", cached: false, requestId: "NIN-abc123"
      }
    },
    params: [
      { name: "nin", type: "string", required: false, desc: "11-digit National ID Number (provide nin OR phone)" },
      { name: "phone", type: "string", required: false, desc: "Registered phone number (alternative to NIN)" },
    ],
    notes: ["Either nin or phone must be provided", "Results cached 24h to reduce cost on repeated lookups", "Sandbox returns mock data instantly"]
  },
  {
    group: "Verification",
    method: "POST",
    path: "/verify/bvn",
    title: "BVN Verification",
    description: "Verify a Bank Verification Number and retrieve the associated identity record from the Central Bank of Nigeria network.",
    price: 80,
    auth: "api-key",
    async: false,
    request: { bvn: "12345678901" },
    response: {
      status: "success", code: 200, message: "BVN verification completed",
      data: {
        verification: { firstName: "CHUKWUEMEKA", lastName: "OKONKWO", dateOfBirth: "1995-03-14", bvn: "12345678901", phone: "08012345678", enrollmentBank: "ACCESS BANK", enrollmentBranch: "VICTORIA ISLAND" },
        source: "CBN", cached: false, requestId: "BVN-def456"
      }
    },
    params: [{ name: "bvn", type: "string", required: true, desc: "11-digit Bank Verification Number" }],
    notes: ["Results cached 24h", "Cross-reference with NIN to confirm identity consistency"]
  },
  {
    group: "Verification",
    method: "POST",
    path: "/verify/education",
    title: "Education Verification",
    description: "Verify academic results from WAEC, NECO, NABTEB, or NBAIS. Async — returns a jobId immediately. Results delivered via webhook or polling.",
    price: 250,
    auth: "api-key",
    async: true,
    request: { provider: "waec", registrationNumber: "4190101001", examYear: 2023, examType: "WASSCE", cardPin: "12345678", cardSerialNumber: "AA123456789" },
    response: {
      status: "success", code: 200, message: "Education verification queued",
      data: { provider: "WAEC", examYear: 2023, registrationNumber: "4190101001", status: "processing", jobId: "uuid-job-id-here", note: "Results available in 1–3 minutes." }
    },
    params: [
      { name: "provider", type: "string", required: true, desc: "Exam body: waec | neco | nabteb | nbais" },
      { name: "registrationNumber", type: "string", required: true, desc: "Candidate exam number" },
      { name: "examYear", type: "number", required: true, desc: "Year of examination" },
      { name: "examType", type: "string", required: true, desc: "WAEC: WASSCE or GCE — NECO: school_candidate or private" },
      { name: "cardPin", type: "string", required: true, desc: "Scratch-card PIN or verification token" },
      { name: "cardSerialNumber", type: "string", required: false, desc: "WAEC & NABTEB only: scratch-card serial" },
    ],
    notes: ["ASYNC — poll or use webhooks for results", "Charge deducted when request is accepted"]
  },
  {
    group: "Verification",
    method: "POST",
    path: "/verify/employment-screening",
    title: "Employment Screening",
    description: "NIN + BVN + SSCE in one API call. Cross-references names and DOB across all three sources, analyzes SSCE grades, and returns a 100-point PASS/REVIEW/FAIL score.",
    price: 391,
    priceNote: "NIN ₦130 + BVN ₦80 + SSCE ₦250 = ₦460 — 15% bundle = ₦391",
    auth: "api-key",
    async: true,
    request: { nin: "12345678901", bvn: "12345678901", educationProvider: "waec", registrationNumber: "WA2020/12345", examYear: 2020, examType: "Internal", cardSerialNumber: "CS123456", cardPin: "1234" },
    response: {
      status: "success", code: 200,
      data: { requestId: "IDC-abc123", decision: "PASS", score: 94, crossCheck: { ninBvnNameMatch: true, ninBvnDobMatch: true }, ssceAnalysis: { meetsMinimumRequirement: true, englishCredit: true, mathCredit: true } }
    },
    params: [
      { name: "nin", type: "string", required: true, desc: "11-digit NIN" },
      { name: "bvn", type: "string", required: true, desc: "11-digit BVN" },
      { name: "educationProvider", type: "string", required: true, desc: "waec | neco | nabteb | nbais" },
      { name: "registrationNumber", type: "string", required: true, desc: "SSCE registration number" },
      { name: "examYear", type: "number", required: true, desc: "Year of examination" },
    ],
    notes: ["PASS ≥ 85 | REVIEW 60–84 | FAIL < 60", "15% bundle discount applied automatically", "Sandbox returns instant result"]
  },
  {
    group: "Verification",
    method: "POST",
    path: "/verify/fraud-score",
    title: "Fraud Score",
    description: "Run identity risk scoring across NIN and BVN records. Detects name mismatches, DOB inconsistencies, and data anomalies.",
    price: 50,
    auth: "api-key",
    async: false,
    request: { nin: "12345678901", bvn: "12345678901" },
    response: { status: "success", code: 200, data: { score: 8, riskLevel: "low", signals: {}, flags: [], decision: "PASS" } },
    params: [
      { name: "nin", type: "string", required: false, desc: "11-digit NIN" },
      { name: "bvn", type: "string", required: false, desc: "11-digit BVN" },
    ],
    notes: ["riskLevel: low | medium | high", "score 0–100 (lower = less risky)"]
  },
  {
    group: "Account",
    method: "GET",
    path: "/profile",
    title: "Get Profile",
    description: "Retrieve your developer account profile including wallet balance, KYB status, and environment mode.",
    price: 0,
    auth: "jwt",
    async: false,
    request: {},
    response: { status: "success", code: 200, data: { id: "dev_abc123", name: "John Doe", email: "john@acme.com", walletBalance: 4500.00, environmentMode: "sandbox", kycStatus: "approved" } },
    params: [],
    notes: ["Requires Authorization: Bearer <jwt_token> header"]
  },
];

const docSections = [
  { id: "overview", label: "Overview", icon: Book },
  { id: "quickstart", label: "Quick Start", icon: Zap },
  { id: "authentication", label: "Authentication", icon: Key },
  { id: "sandbox", label: "Sandbox & Live", icon: FlaskConical },
  { id: "endpoints", label: "API Endpoints", icon: Code2 },
  { id: "async-flow", label: "Async Verification", icon: RefreshCw },
  { id: "errors", label: "Error Handling", icon: AlertTriangle },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "billing", label: "Billing & Pricing", icon: CreditCard },
];

const LANG_TABS = ["cURL", "JavaScript", "Python", "PHP"] as const;
type Lang = typeof LANG_TABS[number];

function buildExample(lang: Lang, method: string, path: string, request: object): string {
  const url = `${BASE_URL}${path}`;
  const hasBody = method !== "GET" && Object.keys(request).length > 0;
  const bodyStr = JSON.stringify(request, null, 2);
  if (lang === "cURL") {
    return method === "GET"
      ? `curl -X GET "${url}" \\\n  -H "X-API-Key: ara_your_api_key_here"`
      : `curl -X POST "${url}" \\\n  -H "X-API-Key: ara_your_api_key_here" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(request)}'`;
  }
  if (lang === "JavaScript") {
    return `const response = await fetch("${url}", {\n  method: "${method}",\n  headers: {\n    "X-API-Key": "ara_your_api_key_here"${hasBody ? `,\n    "Content-Type": "application/json"` : ""}\n  }${hasBody ? `,\n  body: JSON.stringify(${bodyStr})` : ""}\n});\nconst data = await response.json();\nconsole.log(data);`;
  }
  if (lang === "Python") {
    return `import requests\n\nresponse = requests.${method.toLowerCase()}(\n    "${url}",\n    headers={"X-API-Key": "ara_your_api_key_here"}${hasBody ? `,\n    json=${bodyStr}` : ""}\n)\nprint(response.json())`;
  }
  if (lang === "PHP") {
    return `<?php\n$ch = curl_init("${url}");\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n  "X-API-Key: ara_your_api_key_here",${hasBody ? `\n  "Content-Type: application/json"` : ""}\n]);${hasBody ? `\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(${bodyStr}));` : ""}\n$result = curl_exec($ch);\necho $result;`;
  }
  return "";
}

function CopyableCode({ code }: { code: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };
  return (
    <div className="relative group">
      <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">{code}</pre>
      <button onClick={copy} className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 transition-colors">
        {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "text-blue-400 border-blue-800 bg-blue-950/30",
    POST: "text-green-400 border-green-800 bg-green-950/30",
    DELETE: "text-red-400 border-red-800 bg-red-950/30",
  };
  return (
    <Badge variant="outline" className={`text-xs font-mono px-1.5 py-0 ${colors[method] || "text-gray-400 border-gray-700"}`}>
      {method}
    </Badge>
  );
}

export default function PublicApiDocs() {
  const [activeSection, setActiveSection] = useState("overview");
  const [activeEndpoint, setActiveEndpoint] = useState(endpoints[0].path);
  const [activeLang, setActiveLang] = useState<Lang>("cURL");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [endpointsExpanded, setEndpointsExpanded] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  const endpoint = endpoints.find(e => e.path === activeEndpoint) || endpoints[0];
  const groups = [
    { name: "Verification", items: endpoints.filter(e => e.group === "Verification") },
    { name: "Account", items: endpoints.filter(e => e.group === "Account") },
  ];
  const codeExample = buildExample(activeLang, endpoint.method, endpoint.path, endpoint.request);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setSidebarOpen(false);
    const el = document.getElementById(id);
    if (el && contentRef.current) {
      contentRef.current.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" });
    }
  };

  const selectEndpoint = (path: string) => {
    setActiveEndpoint(path);
    setActiveSection("endpoints");
    setSidebarOpen(false);
  };

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const onScroll = () => {
      const scrollTop = container.scrollTop;
      for (const section of docSections) {
        const el = document.getElementById(section.id);
        if (el && el.offsetTop - 80 <= scrollTop) setActiveSection(section.id);
      }
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{ background: "#0B0F1A" }}>
      <div className="px-4 py-4 flex items-center justify-between border-b border-gray-800">
        <div>
          <Link href="/" className="text-sm font-bold text-white flex items-center gap-1.5 hover:text-primary transition-colors">
            ← Arapoint
          </Link>
          <p className="text-xs text-gray-500 mt-1">API Docs v2.0</p>
        </div>
        <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(false)}><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-2">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest px-2 mb-1.5 text-gray-600">Guide</p>
          {docSections.filter(s => s.id !== "endpoints").map(s => {
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all mb-0.5"
                style={{
                  background: active ? "#0B5FFF18" : "transparent",
                  color: active ? "#FFFFFF" : "#6B7280",
                  borderLeft: active ? "2px solid #0B5FFF" : "2px solid transparent",
                }}
              >
                <s.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: active ? "#0B5FFF" : undefined }} />
                <span className="text-xs font-medium">{s.label}</span>
              </button>
            );
          })}
        </div>

        <div>
          <button onClick={() => setEndpointsExpanded(v => !v)} className="w-full flex items-center justify-between px-2 mb-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">API Endpoints</p>
            {endpointsExpanded ? <ChevronDown className="w-3 h-3 text-gray-600" /> : <ChevronRight className="w-3 h-3 text-gray-600" />}
          </button>

          {endpointsExpanded && groups.map(group => (
            <div key={group.name} className="mb-3">
              <p className="text-xs px-3 py-1 font-medium text-gray-600">{group.name}</p>
              {group.items.map(ep => {
                const active = activeEndpoint === ep.path && activeSection === "endpoints";
                return (
                  <button
                    key={ep.path}
                    onClick={() => selectEndpoint(ep.path)}
                    className="w-full text-left px-3 py-2 rounded-lg transition-all mb-0.5"
                    style={{
                      background: active ? "#0B5FFF18" : "transparent",
                      borderLeft: active ? "2px solid #0B5FFF" : "2px solid transparent",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <MethodBadge method={ep.method} />
                      {ep.async && <span className="text-xs text-purple-400">async</span>}
                    </div>
                    <p className="text-xs font-medium leading-snug" style={{ color: active ? "#FFFFFF" : "#9CA3AF" }}>{ep.title}</p>
                    {(ep as any).priceNote
                      ? <p className="text-xs mt-0.5 text-purple-400">Bundle pricing</p>
                      : ep.price > 0
                      ? <p className="text-xs mt-0.5 text-gray-500">₦{ep.price}/req</p>
                      : <p className="text-xs mt-0.5 text-green-600">Free</p>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-3 border-t border-gray-800 space-y-2">
        <div className="rounded-lg p-3" style={{ background: "#111827" }}>
          <p className="text-xs font-semibold text-white mb-1">Base URL</p>
          <code className="text-xs break-all text-blue-400">{BASE_URL}</code>
        </div>
        <Link href="/developer/login">
          <Button className="w-full h-8 text-xs">Get API Keys <ExternalLink className="w-3 h-3 ml-1.5" /></Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: "#0B0F1A", color: "#E5E7EB" }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed lg:hidden inset-y-0 left-0 z-50 w-64 transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ borderRight: "1px solid #1F2937" }}
      >
        <Sidebar />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0"
        style={{ width: 240, borderRight: "1px solid #1F2937", background: "#0B0F1A" }}
      >
        <Sidebar />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0" style={{ background: "#0B0F1A" }}>
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b border-gray-800 sticky top-0 z-20" style={{ background: "#0B0F1A" }}>
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
              {activeSection === "endpoints" ? endpoint.title : docSections.find(s => s.id === activeSection)?.label || "Documentation"}
            </p>
            <p className="text-xs text-gray-500">Arapoint API Reference — arapoint.com.ng</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/auth/signup">
              <Button size="sm" className="h-7 text-xs px-3 hidden sm:flex">Create Account</Button>
            </Link>
            <Link href="/developer/login">
              <Button size="sm" variant="outline" className="h-7 text-xs px-3 border-gray-700 text-gray-300 hover:text-white">Sign In</Button>
            </Link>
          </div>
        </div>

        {/* Docs content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-16">

            {/* CTA Banner */}
            <div className="rounded-xl border border-blue-800/60 bg-blue-950/20 p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-white">Explore & test in the sandbox — no credit card required</p>
                <p className="text-xs text-gray-400 mt-0.5">Create a free developer account to get your API keys and start verifying.</p>
              </div>
              <Link href="/auth/signup">
                <Button className="h-8 text-xs px-4 flex-shrink-0">Get API Keys <ArrowRight className="w-3 h-3 ml-1.5" /></Button>
              </Link>
            </div>

            {/* OVERVIEW */}
            <section id="overview" className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Arapoint API Reference</h1>
                <p className="text-gray-400 leading-relaxed">
                  The Arapoint API lets you verify Nigerian identities, education credentials, and screen employees — all through a single RESTful JSON API. NIN, BVN, WAEC, NECO, NABTEB, and NBAIS supported.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: Zap, title: "Fast", desc: "NIN and BVN verified in under 2 seconds. SSCE in 1–3 minutes." },
                  { icon: Shield, title: "Secure", desc: "HMAC-signed webhooks. TLS 1.3. IP allowlist. NDPA compliant." },
                  { icon: CreditCard, title: "Pay-as-you-go", desc: "No monthly fees. Fund your wallet and pay per successful call." },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
                    <Icon className="w-5 h-5 text-blue-400 mb-2" />
                    <p className="text-sm font-semibold text-white mb-1">{title}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* QUICK START */}
            <section id="quickstart" className="space-y-4">
              <h2 className="text-xl font-bold text-white">Quick Start</h2>
              <p className="text-gray-400 text-sm">Verify your first NIN in under 5 minutes:</p>
              <div className="space-y-3">
                {[
                  { step: "1", title: "Create an account", desc: "Sign up at arapoint.com.ng/auth/signup. Free sandbox access — no credit card needed." },
                  { step: "2", title: "Get your API key", desc: "Go to Developer Portal → API Keys → Create Key. Copy your key." },
                  { step: "3", title: "Make your first request", desc: "Use the example below to verify an NIN. Use sandbox mode for free testing." },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex gap-4 rounded-xl border border-gray-800 bg-gray-900/30 p-4">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{step}</div>
                    <div>
                      <p className="text-sm font-semibold text-white mb-0.5">{title}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <CopyableCode code={`curl -X POST "https://arapoint.com.ng/api/v1/developer/verify/nin" \\\n  -H "X-API-Key: ara_your_api_key_here" \\\n  -H "Content-Type: application/json" \\\n  -d '{"nin": "12345678901"}'`} />
            </section>

            {/* AUTHENTICATION */}
            <section id="authentication" className="space-y-4">
              <h2 className="text-xl font-bold text-white">Authentication</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Arapoint uses two authentication methods: API key for verification endpoints, and JWT Bearer token for account management endpoints.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4 text-green-400" />
                    <p className="text-sm font-semibold text-white">API Key (Verification)</p>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">For all verification endpoints. Passed in the X-API-Key header.</p>
                  <CopyableCode code={`X-API-Key: ara_your_api_key_here`} />
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-blue-400" />
                    <p className="text-sm font-semibold text-white">JWT Bearer (Account)</p>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">For profile, billing, and analytics endpoints.</p>
                  <CopyableCode code={`Authorization: Bearer your_jwt_token_here`} />
                </div>
              </div>
            </section>

            {/* SANDBOX */}
            <section id="sandbox" className="space-y-4">
              <h2 className="text-xl font-bold text-white">Sandbox &amp; Live Mode</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Your account defaults to Sandbox mode. In sandbox, all verification endpoints return instant mock data at zero cost. Switch to Live mode from the Developer Portal when ready.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-yellow-800/50 bg-yellow-950/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FlaskConical className="w-4 h-4 text-yellow-400" />
                    <p className="text-sm font-semibold text-yellow-300">Sandbox Mode</p>
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-400">
                    <li>✓ Instant mock responses</li>
                    <li>✓ No wallet balance required</li>
                    <li>✓ All endpoints available</li>
                    <li>✗ Returns fictional data only</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-green-800/50 bg-green-950/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-green-400" />
                    <p className="text-sm font-semibold text-green-300">Live Mode</p>
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-400">
                    <li>✓ Real registry queries</li>
                    <li>✓ Actual verification results</li>
                    <li>✓ Webhook delivery</li>
                    <li>✗ Wallet balance required</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* ENDPOINTS */}
            <section id="endpoints" className="space-y-6">
              <h2 className="text-xl font-bold text-white">API Endpoints</h2>

              <div className="rounded-xl border border-gray-800 bg-gray-900/20 overflow-hidden">
                {/* Endpoint selector tabs */}
                <div className="flex flex-wrap gap-1 p-2 border-b border-gray-800">
                  {endpoints.map(ep => (
                    <button
                      key={ep.path}
                      onClick={() => selectEndpoint(ep.path)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${activeEndpoint === ep.path ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
                    >
                      <MethodBadge method={ep.method} />
                      <span className="font-medium">{ep.title}</span>
                    </button>
                  ))}
                </div>

                <div className="p-5 space-y-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <MethodBadge method={endpoint.method} />
                        <code className="text-xs text-gray-300 font-mono bg-gray-800 px-2 py-0.5 rounded">{BASE_URL}{endpoint.path}</code>
                        {endpoint.async && <Badge className="bg-purple-900/40 text-purple-400 border border-purple-800 text-xs">async</Badge>}
                      </div>
                      <h3 className="text-base font-bold text-white">{endpoint.title}</h3>
                      <p className="text-sm text-gray-400 mt-1 leading-relaxed max-w-2xl">{endpoint.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {(endpoint as any).priceNote
                        ? <span className="text-xs text-purple-400 font-mono">{(endpoint as any).priceNote}</span>
                        : endpoint.price > 0
                        ? <span className="text-sm font-bold text-white">₦{endpoint.price}<span className="text-xs text-gray-500 font-normal">/req</span></span>
                        : <span className="text-xs text-green-400 font-semibold">Free</span>}
                    </div>
                  </div>

                  {endpoint.params.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Parameters</p>
                      <div className="rounded-lg border border-gray-800 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead><tr className="bg-gray-900/50"><th className="text-left p-2.5 text-gray-500 font-medium">Name</th><th className="text-left p-2.5 text-gray-500 font-medium">Type</th><th className="text-left p-2.5 text-gray-500 font-medium">Required</th><th className="text-left p-2.5 text-gray-500 font-medium">Description</th></tr></thead>
                          <tbody>
                            {endpoint.params.map((p, i) => (
                              <tr key={p.name} className={i % 2 === 0 ? "bg-gray-900/20" : ""}>
                                <td className="p-2.5 font-mono text-blue-300">{p.name}</td>
                                <td className="p-2.5 text-gray-400">{p.type}</td>
                                <td className="p-2.5">{p.required ? <span className="text-red-400">required</span> : <span className="text-gray-500">optional</span>}</td>
                                <td className="p-2.5 text-gray-400">{p.desc}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Request Body</p>
                      <CopyableCode code={JSON.stringify(endpoint.request, null, 2)} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Response</p>
                      <CopyableCode code={JSON.stringify(endpoint.response, null, 2)} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Code Example</p>
                      <div className="flex gap-1">
                        {LANG_TABS.map(lang => (
                          <button
                            key={lang}
                            onClick={() => setActiveLang(lang)}
                            className={`px-2.5 py-1 rounded text-xs transition-all ${activeLang === lang ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white bg-gray-800"}`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    </div>
                    <CopyableCode code={codeExample} />
                  </div>

                  {endpoint.notes.length > 0 && (
                    <div className="rounded-xl border border-blue-900/50 bg-blue-950/10 p-4">
                      <p className="text-xs font-semibold text-blue-300 mb-2">Notes</p>
                      <ul className="space-y-1">
                        {endpoint.notes.map((note, i) => (
                          <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                            <span className="text-blue-400 flex-shrink-0 mt-0.5">→</span> {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ASYNC FLOW */}
            <section id="async-flow" className="space-y-4">
              <h2 className="text-xl font-bold text-white">Async Verification Flow</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Education and employment screening endpoints are asynchronous. They return a <code className="text-blue-300 bg-gray-800 px-1 rounded">requestId</code> immediately and process results in the background (1–3 minutes for SSCE).
              </p>
              <div className="space-y-2">
                {[
                  { step: "POST", desc: "Submit verification request → get requestId" },
                  { step: "WAIT", desc: "Arapoint processes the request (1–3 min for SSCE)" },
                  { step: "WEBHOOK", desc: "Result posted to your callbackUrl (if configured)" },
                  { step: "POLL", desc: "Or GET /verify/.../result?requestId=... until status = completed" },
                ].map(({ step, desc }) => (
                  <div key={step} className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/20 px-4 py-3">
                    <Badge variant="outline" className="text-blue-400 border-blue-800 bg-blue-950/30 font-mono text-xs flex-shrink-0">{step}</Badge>
                    <p className="text-sm text-gray-300">{desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ERRORS */}
            <section id="errors" className="space-y-4">
              <h2 className="text-xl font-bold text-white">Error Handling</h2>
              <div className="rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-gray-900/50"><th className="text-left p-3 text-gray-500 font-medium">Code</th><th className="text-left p-3 text-gray-500 font-medium">Meaning</th></tr></thead>
                  <tbody>
                    {[
                      { code: "400", label: "Bad Request", desc: "Missing or invalid parameters" },
                      { code: "401", label: "Unauthorized", desc: "Invalid or missing API key / token" },
                      { code: "402", label: "Payment Required", desc: "Insufficient wallet balance" },
                      { code: "404", label: "Not Found", desc: "No record found for the provided identifier" },
                      { code: "409", label: "Conflict", desc: "Request already exists" },
                      { code: "422", label: "Unprocessable", desc: "Portal or provider temporarily unavailable" },
                      { code: "429", label: "Rate Limited", desc: "Too many requests — slow down and retry" },
                      { code: "500", label: "Server Error", desc: "Internal error — try again or contact support" },
                    ].map(({ code, label, desc }, i) => (
                      <tr key={code} className={i % 2 === 0 ? "bg-gray-900/20" : ""}>
                        <td className="p-3 font-mono">
                          <Badge variant="outline" className={`text-xs ${code.startsWith("2") ? "text-green-400 border-green-800" : code.startsWith("4") ? "text-yellow-400 border-yellow-800" : "text-red-400 border-red-800"}`}>{code} {label}</Badge>
                        </td>
                        <td className="p-3 text-gray-400">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* WEBHOOKS */}
            <section id="webhooks" className="space-y-4">
              <h2 className="text-xl font-bold text-white">Webhooks</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Configure webhook URLs in the Developer Portal. Arapoint sends a POST request to your endpoint when async verifications complete. Events are signed with HMAC-SHA256.
              </p>
              <CopyableCode code={`// Verify webhook signature\nconst crypto = require('crypto');\nconst sig = req.headers['x-arapoint-signature'];\nconst expected = crypto\n  .createHmac('sha256', process.env.WEBHOOK_SECRET)\n  .update(JSON.stringify(req.body))\n  .digest('hex');\nif (sig !== expected) return res.status(401).send('Invalid signature');`} />
            </section>

            {/* BILLING */}
            <section id="billing" className="space-y-4">
              <h2 className="text-xl font-bold text-white">Billing &amp; Pricing</h2>
              <p className="text-gray-400 text-sm">Pay-as-you-go. Fund your wallet via Paystack. Charged per successful API call.</p>
              <div className="rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-900/50"><th className="text-left p-3 text-gray-400 font-medium">Service</th><th className="text-right p-3 text-gray-400 font-medium">Price</th></tr></thead>
                  <tbody>
                    {[
                      { service: "NIN Verification", price: "₦130 / request" },
                      { service: "BVN Lookup", price: "₦80 / request" },
                      { service: "SSCE / Education Verification", price: "₦250 / request" },
                      { service: "Employment Screening (NIN + BVN + SSCE)", price: "₦391 (15% bundle discount)" },
                      { service: "Fraud Score", price: "₦50 / request" },
                      { service: "Polling (result check)", price: "Free" },
                    ].map(({ service, price }, i) => (
                      <tr key={service} className={i % 2 === 0 ? "bg-gray-900/20" : ""}>
                        <td className="p-3 text-gray-200">{service}</td>
                        <td className="p-3 text-right font-mono text-green-400">{price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-xl border border-green-800/40 bg-green-950/10 p-4 text-xs text-gray-400">
                <p className="text-green-300 font-semibold mb-1">Free Sandbox</p>
                All endpoints available at zero cost in sandbox mode. Switch to Live mode when you're ready to go to production.
              </div>
            </section>

            {/* BOTTOM CTA */}
            <div className="rounded-2xl border border-blue-800/50 bg-blue-950/15 p-8 text-center space-y-4">
              <h3 className="text-xl font-bold text-white">Ready to start verifying?</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto">Create a free developer account to get API keys, access the sandbox, and go live in minutes.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/auth/signup">
                  <Button className="h-10 px-6">Create Free Account <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" className="h-10 px-6 border-gray-700 text-gray-300 hover:text-white">View Full Pricing</Button>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
