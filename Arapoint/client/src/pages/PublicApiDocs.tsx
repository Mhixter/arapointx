import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Copy, Check, Search, ChevronRight, ExternalLink, Menu, X,
  ChevronDown, ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import arapointLogo from "@assets/generated_images/arapoint_solution_logo.png";

const BASE_URL = "https://arapoint.com.ng/api/v1/developer";

type LangKey = "cURL" | "JavaScript" | "Python" | "PHP";

interface Endpoint {
  id: string;
  group: string;
  method: "GET" | "POST";
  path: string;
  title: string;
  description: string;
  price: number;
  priceNote?: string;
  isAsync?: boolean;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  params: { name: string; type: string; required: boolean; desc: string }[];
  notes: string[];
}

const ENDPOINTS: Endpoint[] = [
  {
    id: "nin",
    group: "Verification",
    method: "POST",
    path: "/verify/nin",
    title: "NIN Verification",
    description: "Verify a National Identification Number in real-time. Returns full identity data — name, date of birth, gender, phone, and address — directly from the NIMC registry.",
    price: 130,
    isAsync: false,
    request: { nin: "12345678901" },
    response: {
      status: "success",
      code: 200,
      message: "NIN verification completed",
      data: {
        verification: {
          firstName: "CHUKWUEMEKA",
          middleName: "JAMES",
          lastName: "OKONKWO",
          dateOfBirth: "1995-03-14",
          gender: "Male",
          phone: "08012345678",
          nin: "12345678901",
          address: "12 Lagos Street, Abuja"
        },
        source: "ARAPOINT",
        cached: false,
        requestId: "NIN-abc123"
      }
    },
    params: [
      { name: "nin", type: "string", required: false, desc: "11-digit National ID Number. Provide either nin or phone." },
      { name: "phone", type: "string", required: false, desc: "Phone number registered with NIMC (alternative to NIN)." },
    ],
    notes: [
      "Either nin or phone must be provided.",
      "Results are cached for 24 hours to reduce cost on repeated lookups.",
      "Sandbox mode returns mock data instantly at no charge."
    ]
  },
  {
    id: "bvn",
    group: "Verification",
    method: "POST",
    path: "/verify/bvn",
    title: "BVN Lookup",
    description: "Verify a Bank Verification Number and retrieve the associated identity record from the Central Bank of Nigeria network.",
    price: 80,
    isAsync: false,
    request: { bvn: "12345678901" },
    response: {
      status: "success",
      code: 200,
      message: "BVN verification completed",
      data: {
        verification: {
          firstName: "CHUKWUEMEKA",
          lastName: "OKONKWO",
          dateOfBirth: "1995-03-14",
          bvn: "12345678901",
          phone: "08012345678",
          enrollmentBank: "ACCESS BANK",
          enrollmentBranch: "VICTORIA ISLAND"
        },
        source: "CBN",
        cached: false,
        requestId: "BVN-def456"
      }
    },
    params: [
      { name: "bvn", type: "string", required: true, desc: "11-digit Bank Verification Number." },
    ],
    notes: [
      "Results are cached for 24 hours.",
      "Cross-reference with NIN to confirm identity consistency."
    ]
  },
  {
    id: "education",
    group: "Verification",
    method: "POST",
    path: "/verify/education",
    title: "Education Verification",
    description: "Verify academic results from WAEC, NECO, NABTEB, or NBAIS. Returns a jobId immediately — results arrive via webhook or polling within 1 to 3 minutes.",
    price: 250,
    isAsync: true,
    request: {
      provider: "waec",
      registrationNumber: "4190101001",
      examYear: 2023,
      examType: "WASSCE",
      cardPin: "12345678",
      cardSerialNumber: "AA123456789"
    },
    response: {
      status: "success",
      code: 200,
      message: "Education verification queued",
      data: {
        provider: "WAEC",
        examYear: 2023,
        registrationNumber: "4190101001",
        status: "processing",
        jobId: "uuid-job-id-here",
        note: "Results available in 1–3 minutes."
      }
    },
    params: [
      { name: "provider", type: "string", required: true, desc: "Exam body: waec, neco, nabteb, or nbais." },
      { name: "registrationNumber", type: "string", required: true, desc: "Candidate exam registration number." },
      { name: "examYear", type: "number", required: true, desc: "Year the examination was taken." },
      { name: "examType", type: "string", required: true, desc: "WAEC: WASSCE or GCE. NECO: school_candidate or private." },
      { name: "cardPin", type: "string", required: true, desc: "Scratch-card PIN or verification token." },
      { name: "cardSerialNumber", type: "string", required: false, desc: "Required for WAEC and NABTEB only." },
    ],
    notes: [
      "This endpoint is asynchronous. Poll /verify/education/result or configure a webhook.",
      "The charge is deducted when the request is accepted by the queue.",
      "Sandbox mode returns instant mock results at no charge."
    ]
  },
  {
    id: "employment",
    group: "Verification",
    method: "POST",
    path: "/verify/employment-screening",
    title: "Employment Screening",
    description: "NIN, BVN, and SSCE in one API call. Cross-references names and dates of birth across all three sources, analyses SSCE grades, and returns a 100-point PASS, REVIEW, or FAIL decision.",
    price: 391,
    priceNote: "₦130 NIN + ₦80 BVN + ₦250 SSCE = ₦460, with 15% bundle discount = ₦391",
    isAsync: true,
    request: {
      nin: "12345678901",
      bvn: "12345678901",
      educationProvider: "waec",
      registrationNumber: "WA2020/12345",
      examYear: 2020,
      examType: "Internal",
      cardSerialNumber: "CS123456",
      cardPin: "1234"
    },
    response: {
      status: "success",
      code: 200,
      data: {
        requestId: "IDC-abc123",
        decision: "PASS",
        score: 94,
        crossCheck: { ninBvnNameMatch: true, ninBvnDobMatch: true },
        ssceAnalysis: { meetsMinimumRequirement: true, englishCredit: true, mathCredit: true }
      }
    },
    params: [
      { name: "nin", type: "string", required: true, desc: "11-digit NIN." },
      { name: "bvn", type: "string", required: true, desc: "11-digit BVN." },
      { name: "educationProvider", type: "string", required: true, desc: "waec, neco, nabteb, or nbais." },
      { name: "registrationNumber", type: "string", required: true, desc: "SSCE registration number." },
      { name: "examYear", type: "number", required: true, desc: "Year of examination." },
    ],
    notes: [
      "PASS is 85 and above. REVIEW is 60 to 84. FAIL is below 60.",
      "The 15% bundle discount is applied automatically.",
      "Sandbox mode returns an instant composed result at no charge."
    ]
  },
  {
    id: "fraud",
    group: "Verification",
    method: "POST",
    path: "/verify/fraud-score",
    title: "Fraud Score",
    description: "Run identity risk scoring across NIN and BVN records. Detects name mismatches, date-of-birth inconsistencies, and data anomalies.",
    price: 50,
    isAsync: false,
    request: { nin: "12345678901", bvn: "12345678901" },
    response: {
      status: "success",
      code: 200,
      data: { score: 8, riskLevel: "low", signals: {}, flags: [], decision: "PASS" }
    },
    params: [
      { name: "nin", type: "string", required: false, desc: "11-digit NIN (provide at least one identifier)." },
      { name: "bvn", type: "string", required: false, desc: "11-digit BVN (provide at least one identifier)." },
    ],
    notes: [
      "Risk levels: low, medium, or high.",
      "Score of 0 to 100 — lower means less risky."
    ]
  },
];

const GUIDE_SECTIONS = [
  { id: "welcome", label: "Welcome" },
  { id: "authentication", label: "Authentication" },
  { id: "sandbox", label: "Sandbox and Live" },
  { id: "async-flow", label: "Async Verification" },
  { id: "errors", label: "Error Codes" },
  { id: "webhooks", label: "Webhooks" },
  { id: "pricing", label: "Pricing" },
];

function buildCode(lang: LangKey, method: string, path: string, body: Record<string, unknown>): string {
  const url = `${BASE_URL}${path}`;
  const hasBody = method !== "GET" && Object.keys(body).length > 0;
  if (lang === "cURL") {
    return method === "GET"
      ? `curl "${url}" \\\n  -H "X-API-Key: ara_live_your_key_here"`
      : `curl -X POST "${url}" \\\n  -H "X-API-Key: ara_live_your_key_here" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body, null, 2)}'`;
  }
  if (lang === "JavaScript") {
    return `const res = await fetch("${url}", {\n  method: "${method}",\n  headers: {\n    "X-API-Key": "ara_live_your_key_here"${hasBody ? `,\n    "Content-Type": "application/json"` : ""}\n  }${hasBody ? `,\n  body: JSON.stringify(${JSON.stringify(body, null, 2)})` : ""}\n});\nconst data = await res.json();\nconsole.log(data);`;
  }
  if (lang === "Python") {
    return `import requests\n\nres = requests.${method.toLowerCase()}(\n    "${url}",\n    headers={"X-API-Key": "ara_live_your_key_here"}${hasBody ? `,\n    json=${JSON.stringify(body, null, 2)}` : ""}\n)\nprint(res.json())`;
  }
  if (lang === "PHP") {
    return `<?php\n$ch = curl_init("${url}");\ncurl_setopt_array($ch, [\n  CURLOPT_RETURNTRANSFER => true,\n  CURLOPT_HTTPHEADER => [\n    "X-API-Key: ara_live_your_key_here",${hasBody ? `\n    "Content-Type: application/json",` : ""}\n  ],${hasBody ? `\n  CURLOPT_POST => true,\n  CURLOPT_POSTFIELDS => json_encode(${JSON.stringify(body, null, 2)}),` : ""}\n]);\necho curl_exec($ch);`;
  }
  return "";
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied" });
  };
  return (
    <div className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-950">
      {lang && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900">
          <span className="text-xs text-gray-400 font-mono uppercase tracking-widest">{lang}</span>
          <button onClick={copy} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
            {copied ? <><Check className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Copied</span></> : <><Copy className="w-3.5 h-3.5" />Copy</>}
          </button>
        </div>
      )}
      {!lang && (
        <button onClick={copy} className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 transition-colors z-10">
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
      <pre className="p-4 text-xs text-gray-300 overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

function MethodPill({ method }: { method: string }) {
  const cls = method === "POST"
    ? "bg-green-100 text-green-700 border border-green-200"
    : "bg-blue-100 text-blue-700 border border-blue-200";
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold font-mono ${cls}`}>{method}</span>;
}

function AsyncPill() {
  return <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">async</span>;
}

export default function PublicApiDocs() {
  const [activeSection, setActiveSection] = useState("welcome");
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<LangKey>("cURL");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const endpoint = ENDPOINTS.find(e => e.id === activeEndpoint) ?? null;

  const filteredEndpoints = search.trim()
    ? ENDPOINTS.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.path.toLowerCase().includes(search.toLowerCase())
      )
    : ENDPOINTS;

  const filteredGuide = search.trim()
    ? GUIDE_SECTIONS.filter(s => s.label.toLowerCase().includes(search.toLowerCase()))
    : GUIDE_SECTIONS;

  function goTo(sectionId: string, endpointId?: string) {
    if (endpointId) {
      setActiveSection("endpoint");
      setActiveEndpoint(endpointId);
    } else {
      setActiveSection(sectionId);
      setActiveEndpoint(null);
    }
    setSidebarOpen(false);
    if (contentRef.current) contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="px-3 py-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="search"
            placeholder="Search docs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        <div>
          <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400">Getting Started</p>
          {filteredGuide.map(s => {
            const active = activeSection === s.id && !activeEndpoint;
            return (
              <button
                key={s.id}
                onClick={() => goTo(s.id)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all mb-0.5 ${active ? "bg-green-50 text-green-700 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
              >
                {active && <ChevronRight className="w-3 h-3 flex-shrink-0" />}
                {!active && <span className="w-3 flex-shrink-0" />}
                {s.label}
              </button>
            );
          })}
        </div>

        <div>
          <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400">API Endpoints</p>
          {["Verification"].map(group => (
            <div key={group} className="mb-2">
              <p className="px-2 py-1 text-xs font-medium text-gray-400">{group}</p>
              {filteredEndpoints.filter(e => e.group === group).map(ep => {
                const active = activeEndpoint === ep.id;
                return (
                  <button
                    key={ep.id}
                    onClick={() => goTo("endpoint", ep.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-all mb-0.5 ${active ? "bg-green-50 text-green-700 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                  >
                    <div className="flex items-center gap-2">
                      {active && <ChevronRight className="w-3 h-3 flex-shrink-0 text-green-500" />}
                      {!active && <span className="w-3 flex-shrink-0" />}
                      <span className="flex-1 truncate">{ep.title}</span>
                      <MethodPill method={ep.method} />
                    </div>
                    {ep.isAsync && (
                      <div className="pl-5 mt-0.5">
                        <AsyncPill />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-gray-100 space-y-2">
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
          <p className="text-xs font-semibold text-gray-700 mb-1">Base URL</p>
          <code className="text-xs text-green-700 break-all font-mono">{BASE_URL}</code>
        </div>
        <Link href="/auth/signup">
          <Button size="sm" className="w-full h-8 text-xs bg-green-600 hover:bg-green-700 text-white">
            Get API Keys <ExternalLink className="w-3 h-3 ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex bg-white" style={{ fontFamily: "'Inter', sans-serif", minHeight: "calc(100vh - 4rem)" }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile sidebar drawer — starts below the sticky main header (top-16) */}
      <aside className={`fixed lg:hidden top-16 bottom-0 left-0 z-50 transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`} style={{ width: 260 }}>
        <div className="h-full overflow-hidden">
          <SidebarContent />
        </div>
      </aside>

      {/* Desktop sidebar — sticky below the main site header */}
      <aside className="hidden lg:block flex-shrink-0" style={{ width: 260 }}>
        <div className="sticky top-16 overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>
          <SidebarContent />
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Mobile hamburger strip */}
        <div className="flex lg:hidden items-center gap-3 px-4 py-2.5 border-b border-gray-100 bg-white sticky top-16 z-20">
          <button className="text-gray-500 hover:text-gray-800" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600 font-medium">
            {activeEndpoint ? endpoint?.title : GUIDE_SECTIONS.find(s => s.id === activeSection)?.label ?? "Docs"}
          </span>
        </div>

        <div ref={contentRef} className="max-w-3xl mx-auto px-6 py-10">
          {!activeEndpoint && activeSection === "welcome" && <WelcomeSection onGetStarted={() => goTo("endpoint", "nin")} />}
          {!activeEndpoint && activeSection === "authentication" && <AuthSection />}
          {!activeEndpoint && activeSection === "sandbox" && <SandboxSection />}
          {!activeEndpoint && activeSection === "async-flow" && <AsyncSection />}
          {!activeEndpoint && activeSection === "errors" && <ErrorsSection />}
          {!activeEndpoint && activeSection === "webhooks" && <WebhooksSection />}
          {!activeEndpoint && activeSection === "pricing" && <PricingSection />}
          {activeEndpoint && endpoint && (
            <EndpointSection
              endpoint={endpoint}
              activeLang={activeLang}
              setActiveLang={setActiveLang}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8 pb-6 border-b border-gray-100">
      <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h1>
      {description && <p className="text-gray-500 text-base leading-relaxed">{description}</p>}
    </div>
  );
}

function InfoBox({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warning" | "success" }) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    success: "bg-green-50 border-green-200 text-green-800",
  };
  return (
    <div className={`rounded-lg border p-4 text-sm leading-relaxed my-4 ${styles[variant]}`}>
      {children}
    </div>
  );
}

function WelcomeSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div>
      <SectionHeader
        title="Welcome to Arapoint"
        description="The Arapoint API lets you verify Nigerian identities, education credentials, and screen employees — all through a single RESTful JSON API."
      />

      <div className="rounded-xl border border-green-200 bg-green-50 p-5 mb-8">
        <p className="text-sm font-semibold text-green-800 mb-1">Free Sandbox Access</p>
        <p className="text-sm text-green-700 mb-3">All endpoints are available at zero cost in sandbox mode. No credit card required.</p>
        <div className="flex gap-2">
          <Link href="/auth/signup">
            <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white">Create Account <ArrowRight className="w-3 h-3 ml-1.5" /></Button>
          </Link>
          <Button size="sm" variant="outline" onClick={onGetStarted} className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50">
            View NIN Endpoint
          </Button>
        </div>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Key Features</h2>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          { title: "Real-time", desc: "NIN and BVN verified in under 2 seconds from NIMC and CBN registries." },
          { title: "Secure", desc: "TLS 1.3, HMAC-signed webhooks, IP allowlist, and NDPA compliant." },
          { title: "Pay as you go", desc: "No monthly fees. Fund your wallet and pay per successful API call." },
        ].map(f => (
          <div key={f.title} className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-900 mb-1">{f.title}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Development Environments</h2>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <p className="text-sm font-semibold text-gray-900">Sandbox</p>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">Instant mock responses. No wallet balance needed. All endpoints available. Returns fictional data only.</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-sm font-semibold text-gray-900">Live</p>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">Real registry queries. Actual verification results. Webhook delivery. Requires wallet balance.</p>
        </div>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Quick Start</h2>
      <div className="space-y-3 mb-6">
        {[
          { n: "1", t: "Create an account", d: "Sign up at arapoint.com.ng. Sandbox access is instant — no credit card needed." },
          { n: "2", t: "Generate API keys", d: "Developer Portal → API Keys → Create Key. Your key starts with ara_." },
          { n: "3", t: "Make your first call", d: "Pass your key in the X-API-Key header. Start with sandbox mode." },
        ].map(s => (
          <div key={s.n} className="flex gap-4 rounded-xl border border-gray-200 p-4">
            <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{s.n}</div>
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-0.5">{s.t}</p>
              <p className="text-xs text-gray-500">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
      <CodeBlock lang="cURL" code={`curl -X POST "${BASE_URL}/verify/nin" \\\n  -H "X-API-Key: ara_your_key_here" \\\n  -H "Content-Type: application/json" \\\n  -d '{"nin": "12345678901"}'`} />
    </div>
  );
}

function AuthSection() {
  return (
    <div>
      <SectionHeader title="Authentication" description="Arapoint uses two authentication methods depending on the endpoint type." />
      <h2 className="text-base font-bold text-gray-900 mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>API Key — Verification Endpoints</h2>
      <p className="text-sm text-gray-500 mb-3">Pass your API key in the X-API-Key header. Keys begin with <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-700">ara_</code>.</p>
      <CodeBlock lang="HTTP" code={`X-API-Key: ara_live_your_key_here`} />
      <h2 className="text-base font-bold text-gray-900 mb-3 mt-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Bearer Token — Account Endpoints</h2>
      <p className="text-sm text-gray-500 mb-3">For profile, billing, and analytics endpoints, pass your JWT in the Authorization header.</p>
      <CodeBlock lang="HTTP" code={`Authorization: Bearer your_jwt_token_here`} />
      <InfoBox variant="warning">Never expose your API key in client-side code. All Arapoint API calls must be made from your server.</InfoBox>
      <h2 className="text-base font-bold text-gray-900 mb-3 mt-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Rotating Keys</h2>
      <p className="text-sm text-gray-500">You can create, view, and revoke API keys at any time from Developer Portal → API Keys. Revoked keys are rejected immediately with HTTP 401.</p>
    </div>
  );
}

function SandboxSection() {
  return (
    <div>
      <SectionHeader title="Sandbox and Live Mode" description="Your account defaults to Sandbox. Switch to Live mode from the Developer Portal when you are ready to go to production." />
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <p className="text-sm font-bold text-yellow-800 mb-3">Sandbox Mode</p>
          <ul className="space-y-2 text-xs text-yellow-700">
            {["Instant mock responses", "Zero cost per call", "All endpoints available", "Returns fictional data only"].map(t => (
              <li key={t} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 flex-shrink-0" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-bold text-green-800 mb-3">Live Mode</p>
          <ul className="space-y-2 text-xs text-green-700">
            {["Real NIMC and CBN registry queries", "Actual verification results", "Webhook delivery", "Wallet balance required"].map(t => (
              <li key={t} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 flex-shrink-0" />{t}</li>
            ))}
          </ul>
        </div>
      </div>
      <InfoBox variant="info">Switching between sandbox and live does not change your API key — the same key works in both modes. Mode is controlled from your developer profile settings.</InfoBox>
    </div>
  );
}

function AsyncSection() {
  return (
    <div>
      <SectionHeader title="Async Verification Flow" description="Education and employment screening endpoints are asynchronous. They accept the request immediately and process results in the background." />
      <div className="space-y-3 mb-8">
        {[
          { label: "POST request", desc: "Submit verification. Response contains a requestId or jobId immediately." },
          { label: "Processing", desc: "Arapoint queries the relevant registry — 1 to 3 minutes for SSCE results." },
          { label: "Webhook delivery", desc: "Result is POSTed to your configured callbackUrl with HMAC signature." },
          { label: "Polling (optional)", desc: "GET /verify/.../result?requestId=IDC-... until status is completed." },
        ].map((s, i) => (
          <div key={i} className="flex items-start gap-4 rounded-xl border border-gray-200 p-4">
            <span className="text-xs font-mono font-bold text-green-600 bg-green-50 border border-green-200 rounded px-2 py-1 flex-shrink-0">{i + 1}</span>
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-0.5">{s.label}</p>
              <p className="text-xs text-gray-500">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <InfoBox variant="success">Charges are deducted when the job is accepted by the queue, not when results are returned. Sandbox mode returns instant mock results at no charge.</InfoBox>
    </div>
  );
}

function ErrorsSection() {
  const errors = [
    { code: "200", text: "OK", desc: "Request succeeded." },
    { code: "400", text: "Bad Request", desc: "Missing or invalid parameters." },
    { code: "401", text: "Unauthorized", desc: "Invalid or missing API key or token." },
    { code: "402", text: "Payment Required", desc: "Insufficient wallet balance." },
    { code: "404", text: "Not Found", desc: "No record found for the provided identifier." },
    { code: "409", text: "Conflict", desc: "Request already exists or is being processed." },
    { code: "422", text: "Unprocessable", desc: "Portal or provider temporarily unavailable." },
    { code: "429", text: "Rate Limited", desc: "Too many requests. Slow down and retry." },
    { code: "500", text: "Server Error", desc: "Internal error. Try again or contact support." },
  ];
  return (
    <div>
      <SectionHeader title="Error Codes" description="All errors return JSON with a status field of error and a human-readable message." />
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-6">
        {errors.map((e, i) => (
          <div key={e.code} className={`flex items-start gap-4 px-5 py-3.5 text-sm ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${i < errors.length - 1 ? "border-b border-gray-100" : ""}`}>
            <span className={`font-mono font-bold text-xs rounded px-1.5 py-0.5 flex-shrink-0 ${e.code === "200" ? "bg-green-100 text-green-700" : e.code.startsWith("4") ? "bg-amber-100 text-amber-700" : e.code.startsWith("5") ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>{e.code}</span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-gray-900 text-xs">{e.text}</span>
              <span className="text-gray-500 text-xs ml-2">{e.desc}</span>
            </div>
          </div>
        ))}
      </div>
      <CodeBlock lang="JSON" code={`{\n  "status": "error",\n  "code": 401,\n  "message": "Invalid API key. Please check your X-API-Key header."\n}`} />
    </div>
  );
}

function WebhooksSection() {
  return (
    <div>
      <SectionHeader title="Webhooks" description="Configure a webhook URL in Developer Portal. Arapoint sends a signed POST request to your endpoint when async verifications complete." />
      <h2 className="text-base font-bold text-gray-900 mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Signature Verification</h2>
      <p className="text-sm text-gray-500 mb-4">Every webhook request includes an <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">X-Arapoint-Signature</code> header. Verify it using HMAC-SHA256 with your webhook secret.</p>
      <CodeBlock lang="Node.js" code={`const crypto = require("crypto");\n\napp.post("/webhook", (req, res) => {\n  const sig = req.headers["x-arapoint-signature"];\n  const expected = crypto\n    .createHmac("sha256", process.env.ARAPOINT_WEBHOOK_SECRET)\n    .update(JSON.stringify(req.body))\n    .digest("hex");\n\n  if (sig !== expected) {\n    return res.status(401).json({ error: "Invalid signature" });\n  }\n\n  const { event, data } = req.body;\n  // handle: education.completed, employment.completed\n  console.log(event, data);\n  res.json({ received: true });\n});`} />
      <h2 className="text-base font-bold text-gray-900 mb-3 mt-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Retry Schedule</h2>
      <p className="text-sm text-gray-500 mb-3">Failed deliveries are retried at 1 minute, 5 minutes, 15 minutes, and 1 hour after the initial attempt.</p>
      <InfoBox variant="info">Respond with HTTP 200 as quickly as possible. Process webhook data asynchronously to avoid timeouts.</InfoBox>
    </div>
  );
}

function PricingSection() {
  const rows = [
    { service: "NIN Verification", price: "₦130", per: "per request" },
    { service: "BVN Lookup", price: "₦80", per: "per request" },
    { service: "Education Verification (WAEC, NECO, NABTEB, NBAIS)", price: "₦250", per: "per request" },
    { service: "Employment Screening (NIN + BVN + SSCE bundle)", price: "₦391", per: "per request (15% discount)" },
    { service: "Fraud Score", price: "₦50", per: "per request" },
    { service: "Polling (result check)", price: "Free", per: "" },
  ];
  return (
    <div>
      <SectionHeader title="Pricing" description="Pay as you go. Fund your wallet via Paystack. Charges are applied per successful API call." />
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200 px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Service</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Price</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</span>
        </div>
        {rows.map((r, i) => (
          <div key={r.service} className={`grid grid-cols-3 px-5 py-3.5 text-sm ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${i < rows.length - 1 ? "border-b border-gray-100" : ""}`}>
            <span className="text-gray-700 text-xs">{r.service}</span>
            <span className="font-semibold text-gray-900 font-mono text-xs">{r.price}</span>
            <span className="text-gray-400 text-xs">{r.per}</span>
          </div>
        ))}
      </div>
      <InfoBox variant="success">Sandbox mode is always free. All endpoints return mock data at zero cost until you switch to Live mode.</InfoBox>
      <div className="mt-6 rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-gray-900">Ready to go live?</p>
          <p className="text-xs text-gray-500 mt-0.5">Fund your wallet and flip to Live mode in seconds.</p>
        </div>
        <Link href="/auth/signup">
          <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white">
            Create Account <ArrowRight className="w-3 h-3 ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function EndpointSection({ endpoint, activeLang, setActiveLang }: {
  endpoint: Endpoint;
  activeLang: LangKey;
  setActiveLang: (l: LangKey) => void;
}) {
  const code = buildCode(activeLang, endpoint.method, endpoint.path, endpoint.request);
  const langs: LangKey[] = ["cURL", "JavaScript", "Python", "PHP"];
  return (
    <div>
      <div className="mb-8 pb-6 border-b border-gray-100">
        <div className="flex items-center flex-wrap gap-2 mb-3">
          <MethodPill method={endpoint.method} />
          {endpoint.isAsync && <AsyncPill />}
          {endpoint.price > 0
            ? <span className="text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded px-2 py-0.5 font-mono">₦{endpoint.price}/req</span>
            : <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">Free</span>}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{endpoint.title}</h1>
        <p className="text-gray-500 text-sm leading-relaxed">{endpoint.description}</p>
        {endpoint.priceNote && (
          <div className="mt-3 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">{endpoint.priceNote}</div>
        )}
      </div>

      <div className="rounded-lg bg-gray-950 border border-gray-800 px-4 py-2.5 flex items-center gap-2 mb-6">
        <MethodPill method={endpoint.method} />
        <code className="text-xs text-gray-300 font-mono">{BASE_URL}{endpoint.path}</code>
      </div>

      {endpoint.params.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Parameters</h2>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200 px-4 py-2.5">
              {["Name", "Type", "Required", "Description"].map(h => (
                <span key={h} className="text-xs font-semibold uppercase tracking-wide text-gray-400">{h}</span>
              ))}
            </div>
            {endpoint.params.map((p, i) => (
              <div key={p.name} className={`grid grid-cols-4 px-4 py-3 text-xs gap-2 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${i < endpoint.params.length - 1 ? "border-b border-gray-100" : ""}`}>
                <code className="font-mono text-green-700 font-medium">{p.name}</code>
                <span className="text-gray-500 font-mono">{p.type}</span>
                <span className={p.required ? "text-red-600 font-medium" : "text-gray-400"}>
                  {p.required ? "required" : "optional"}
                </span>
                <span className="text-gray-600 leading-relaxed">{p.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6 mb-8">
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Request Body</h2>
          <CodeBlock lang="JSON" code={JSON.stringify(endpoint.request, null, 2)} />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Response</h2>
          <CodeBlock lang="JSON" code={JSON.stringify(endpoint.response, null, 2)} />
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Code Example</h2>
          <div className="flex gap-1">
            {langs.map(l => (
              <button
                key={l}
                onClick={() => setActiveLang(l)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${activeLang === l ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <CodeBlock lang={activeLang} code={code} />
      </div>

      {endpoint.notes.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">Notes</p>
          <ul className="space-y-2">
            {endpoint.notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-500" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
