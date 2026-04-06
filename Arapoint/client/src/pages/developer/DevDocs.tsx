import { useState, useEffect, useRef } from "react";
import { DevLayout } from "./DevLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Copy, CheckCircle, Book, Key, Zap, Globe, Shield,
  AlertTriangle, Code2, Webhook, CreditCard, FlaskConical, RefreshCw, Lock, BarChart3,
  ArrowRight, Info, Menu, X, ChevronDown, ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = "https://arapoint.com.ng/api/v1/developer";

const endpoints = [
  {
    group: "Verification",
    method: "POST",
    path: "/verify/nin",
    title: "NIN Verification",
    description: "Verify a National Identification Number in real-time. Returns full identity data including name, date of birth, gender, and address from official government identity registries. You can verify by NIN number or by phone number.",
    price: 130,
    auth: "api-key",
    async: false,
    request: { nin: "12345678901" },
    altRequest: { phone: "08012345678" },
    response: {
      status: "success", code: 200, message: "NIN verification completed",
      data: {
        verification: { firstName: "JOHN", middleName: "EMEKA", lastName: "DOE", dateOfBirth: "1990-01-15", gender: "Male", phone: "08012345678", nin: "12345678901", address: "12 Lagos Street, Abuja" },
        source: "ARAPOINT", cached: false, requestId: "NIN-abc123"
      }
    },
    params: [
      { name: "nin", type: "string", required: false, desc: "11-digit National ID Number (provide nin OR phone)" },
      { name: "phone", type: "string", required: false, desc: "Registered phone number (alternative to NIN)" },
    ],
    notes: ["Either nin or phone must be provided — not both required", "Results are cached for 24 hours to reduce costs on repeated lookups", "In sandbox mode, returns mock data instantly"]
  },
  {
    group: "Verification",
    method: "POST",
    path: "/verify/bvn",
    title: "BVN Verification",
    description: "Verify a Bank Verification Number and retrieve the associated identity record from the national banking verification network.",
    price: 80,
    auth: "api-key",
    async: false,
    request: { bvn: "12345678901" },
    response: {
      status: "success", code: 200, message: "BVN verification completed",
      data: {
        verification: { firstName: "JOHN", lastName: "DOE", dateOfBirth: "1990-01-15", bvn: "12345678901", phone: "08012345678", enrollmentBank: "ACCESS BANK", enrollmentBranch: "VICTORIA ISLAND" },
        source: "CBN", cached: false, requestId: "BVN-def456"
      }
    },
    params: [{ name: "bvn", type: "string", required: true, desc: "11-digit Bank Verification Number" }],
    notes: ["Results are cached for 24 hours to reduce costs on repeated lookups", "Cross-reference with NIN to confirm identity consistency"]
  },
  {
    group: "Verification",
    method: "POST",
    path: "/verify/education",
    title: "Education Verification",
    description: "Verify academic results from WAEC, NECO, NABTEB, or NBAIS. This is asynchronous — the API queues the request and returns a jobId immediately. Results are delivered via webhook or can be polled.",
    price: 250,
    auth: "api-key",
    async: true,
    request: { provider: "waec", registrationNumber: "4190101001", examYear: 2023, examType: "WASSCE", cardPin: "12345678", cardSerialNumber: "AA123456789" },
    response: {
      status: "success", code: 200, message: "Education verification queued",
      data: { provider: "WAEC", examYear: 2023, registrationNumber: "4190101001", status: "processing", jobId: "uuid-job-id-here", note: "Results will be available in 1-3 minutes." }
    },
    params: [
      { name: "provider", type: "string", required: true, desc: "Exam body: waec, neco, nabteb, nbais" },
      { name: "registrationNumber", type: "string", required: true, desc: "Candidate exam number" },
      { name: "examYear", type: "number", required: true, desc: "Year of examination (e.g. 2023)" },
      { name: "examType", type: "string", required: true, desc: "WAEC: WASSCE or GCE | NECO: school_candidate or private" },
      { name: "cardPin", type: "string", required: true, desc: "Scratch-card PIN or verification token" },
      { name: "cardSerialNumber", type: "string", required: false, desc: "WAEC & NABTEB only: scratch-card serial number" },
    ],
    notes: ["ASYNC — results are NOT returned immediately. Poll or use webhooks.", "Charge is deducted when the request is accepted, not when the result arrives"]
  },
  {
    group: "Verification",
    method: "GET",
    path: "/verify/education/result",
    title: "Poll Education Result",
    description: "Poll the status and result of a previously submitted education verification request. Use this if you are not using webhooks.",
    price: 0,
    auth: "api-key",
    async: false,
    request: {},
    response: {
      status: "success", code: 200, message: "Result fetched",
      data: { requestId: "EDU-abc123def456", status: "completed", provider: "WAEC", examYear: 2023, results: [{ subject: "Mathematics", grade: "A1" }, { subject: "English Language", grade: "B2" }] }
    },
    params: [{ name: "requestId", type: "string", required: true, desc: "The requestId from POST /verify/education (query param)" }],
    notes: ["Status values: processing | completed | failed", "Poll every 10–30 seconds — most results arrive within 2 minutes", "This endpoint is free — no additional charge"]
  },
  {
    group: "Verification",
    method: "POST",
    path: "/verify/unified",
    title: "Unified Verification",
    description: "Combine NIN, BVN, and education verification in a single API call at a discounted bundle price. NIN and BVN results are synchronous; education is async.",
    price: 400,
    auth: "api-key",
    async: false,
    request: { nin: "12345678901", bvn: "12345678901", education: { provider: "waec", examYear: 2023, registrationNumber: "4190101001" } },
    response: {
      status: "success", code: 200, message: "Unified verification completed",
      data: { requestId: "UNI-abc123def456", nin: { firstName: "JOHN", lastName: "DOE" }, bvn: { firstName: "JOHN", bvn: "12345678901" }, education: { status: "processing", requestId: "EDU-xyz789" } }
    },
    params: [
      { name: "nin", type: "string", required: false, desc: "NIN to verify (optional — include at least one)" },
      { name: "bvn", type: "string", required: false, desc: "BVN to verify (optional)" },
      { name: "education", type: "object", required: false, desc: "Education object with provider, examYear, registrationNumber" },
    ],
    notes: ["At least one of nin, bvn, or education must be provided", "Cheaper than calling each endpoint separately"]
  },
  {
    group: "Verification",
    method: "POST",
    path: "/verify/employment",
    title: "Employment Background Check",
    description: "Submit an employment background check that cross-references NIN, BVN, and optional SSCE certificate results. Asynchronous — returns a requestId immediately. Poll or use webhooks for the final decision.",
    price: 350,
    auth: "api-key",
    async: true,
    request: { nin: "12345678901", bvn: "12345678901", fullName: "John Emeka Doe", dateOfBirth: "1990-01-15", employmentYear: 2015, level: "degree" },
    response: {
      status: "accepted", code: 202, message: "Employment verification queued.",
      data: { requestId: "EMP-xyz789abc123", queueStatus: "queued", submittedAt: "2026-04-04T10:00:00.000Z", pollUrl: "GET /verify/employment/result/EMP-xyz789abc123" }
    },
    params: [
      { name: "nin", type: "string", required: true, desc: "11-digit National ID Number" },
      { name: "bvn", type: "string", required: true, desc: "11-digit Bank Verification Number" },
      { name: "fullName", type: "string", required: true, desc: "Full name to cross-reference" },
      { name: "dateOfBirth", type: "string", required: false, desc: "Date of birth YYYY-MM-DD" },
      { name: "employmentYear", type: "number", required: false, desc: "Year of employment/graduation" },
      { name: "level", type: "string", required: false, desc: "'degree' or 'higher'" },
      { name: "ssce", type: "object", required: false, desc: "SSCE certificate details for cross-referencing" },
    ],
    notes: ["ASYNC — HTTP 202 immediately, NOT the final result", "Decision values: PASS (score ≥ 85) | REVIEW (60–84) | FAIL (< 60)", "Charge is deducted when queued, not when result arrives"]
  },
  {
    group: "Verification",
    method: "GET",
    path: "/verify/employment/result/:requestId",
    title: "Poll Employment Result",
    description: "Poll the status and final decision of a previously submitted employment background check.",
    price: 0,
    auth: "api-key",
    async: false,
    request: {},
    response: {
      status: "success", code: 200, message: "Employment verification completed",
      data: { requestId: "EMP-xyz789abc123", queueStatus: "completed", decision: "PASS", finalScore: 90, breakdown: { ninScore: 20, bvnScore: 20, nameMatchScore: "0.97", dobMatch: true, ssceScore: 15 } }
    },
    params: [{ name: "requestId", type: "string", required: true, desc: "The requestId from POST /verify/employment (URL path param)" }],
    notes: ["queueStatus values: queued | processing | completed | failed", "Returns HTTP 202 if still processing", "This endpoint is free"]
  },
  {
    group: "Verification",
    method: "POST",
    path: "/verify/fraud-score",
    title: "Fraud Risk Score",
    description: "Run a lightweight identity fraud check. Compares NIN and BVN records to detect name mismatches, DOB inconsistencies, and data anomalies. Returns a risk score (0–100) and risk level.",
    price: 50,
    auth: "api-key",
    async: false,
    request: { nin: "12345678901", bvn: "12345678901" },
    response: {
      status: "success", code: 200, message: "Fraud score calculated",
      data: { requestId: "FRD-abc999", riskScore: 12, riskLevel: "low", flags: [], summary: "Identity records are consistent — low fraud risk" }
    },
    params: [
      { name: "nin", type: "string", required: true, desc: "National ID Number to check" },
      { name: "bvn", type: "string", required: true, desc: "BVN to cross-reference against NIN" },
    ],
    notes: ["riskLevel: low (0–30) | medium (31–60) | high (61–80) | critical (81–100)", "Cheapest verification endpoint — good for initial screening"]
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
    notes: ["Requires Authorization: Bearer <jwt_token> header (not X-API-Key)"]
  },
  {
    group: "Account",
    method: "GET",
    path: "/transactions",
    title: "Transaction History",
    description: "Retrieve the full transaction history for your wallet — includes top-ups and API charges.",
    price: 0,
    auth: "jwt",
    async: false,
    request: {},
    response: { status: "success", code: 200, data: { transactions: [{ id: "tx_001", transactionType: "wallet_funding", amount: "5000.00" }, { id: "tx_002", transactionType: "api_charge", amount: "-130.00" }] } },
    params: [],
    notes: ["Requires JWT auth header"]
  },
  {
    group: "Account",
    method: "GET",
    path: "/logs",
    title: "API Call Logs",
    description: "Retrieve your API call history with endpoint, status code, cost, duration, and timestamp for each request.",
    price: 0,
    auth: "jwt",
    async: false,
    request: {},
    response: { status: "success", code: 200, data: { logs: [{ id: "log_001", endpoint: "/verify/nin", statusCode: 200, cost: 130, durationMs: 340 }], total: 1 } },
    params: [
      { name: "page", type: "number", required: false, desc: "Page number (default: 1)" },
      { name: "limit", type: "number", required: false, desc: "Results per page (default: 20)" },
    ],
    notes: ["Requires JWT auth header"]
  },
  {
    group: "Account",
    method: "GET",
    path: "/analytics",
    title: "Analytics",
    description: "Get a detailed analytics breakdown of your API usage — total calls, success rate, spend, and per-endpoint breakdown.",
    price: 0,
    auth: "jwt",
    async: false,
    request: {},
    response: { status: "success", code: 200, data: { period: "30 days", summary: { totalCalls: 240, successRate: 97, totalSpent: "28500.00" } } },
    params: [{ name: "days", type: "number", required: false, desc: "Time period: 7, 30, or 90 (default: 30)" }],
    notes: ["Requires JWT auth header"]
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
  { id: "ratelimits", label: "Rate Limits", icon: Shield },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "security", label: "IP Allowlist", icon: Lock },
  { id: "sdks", label: "Code Examples", icon: Globe },
  { id: "billing", label: "Billing & Pricing", icon: CreditCard },
];

const groupOrder = ["Verification", "Account"];
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

export default function DevDocs() {
  const [activeSection, setActiveSection] = useState("overview");
  const [activeEndpoint, setActiveEndpoint] = useState(endpoints[0].path);
  const [activeLang, setActiveLang] = useState<Lang>("cURL");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [endpointsExpanded, setEndpointsExpanded] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  const endpoint = endpoints.find(e => e.path === activeEndpoint) || endpoints[0];
  const groups = groupOrder.map(g => ({ name: g, items: endpoints.filter(e => e.group === g) }));
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
    const el = document.getElementById("endpoints");
    if (el && contentRef.current) {
      contentRef.current.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const onScroll = () => {
      const scrollTop = container.scrollTop;
      for (const section of docSections) {
        const el = document.getElementById(section.id);
        if (el && el.offsetTop - 80 <= scrollTop) {
          setActiveSection(section.id);
        }
      }
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{ background: "#0D0D0D" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #1F2937" }}>
        <div>
          <p className="text-xs font-bold text-white uppercase tracking-widest">API Docs</p>
          <p className="text-xs mt-0.5" style={{ color: "#4B5563" }}>v2.0 — arapoint.com.ng</p>
        </div>
        <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(false)}><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-2">
        {/* Doc sections */}
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest px-2 mb-1.5" style={{ color: "#4B5563" }}>Guide</p>
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

        {/* API Endpoints */}
        <div>
          <button
            onClick={() => setEndpointsExpanded(v => !v)}
            className="w-full flex items-center justify-between px-2 mb-1.5"
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#4B5563" }}>API Endpoints</p>
            {endpointsExpanded
              ? <ChevronDown className="w-3 h-3" style={{ color: "#4B5563" }} />
              : <ChevronRight className="w-3 h-3" style={{ color: "#4B5563" }} />}
          </button>

          {endpointsExpanded && groups.map(group => (
            <div key={group.name} className="mb-3">
              <p className="text-xs px-3 py-1 font-medium" style={{ color: "#374151" }}>{group.name}</p>
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
                      {ep.async && <span className="text-xs" style={{ color: "#7C3AED" }}>async</span>}
                    </div>
                    <p className="text-xs font-medium leading-snug" style={{ color: active ? "#FFFFFF" : "#9CA3AF" }}>{ep.title}</p>
                    {ep.price > 0
                      ? <p className="text-xs mt-0.5" style={{ color: "#4B5563" }}>₦{ep.price}/req</p>
                      : <p className="text-xs mt-0.5" style={{ color: "#065F46" }}>Free</p>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-3" style={{ borderTop: "1px solid #1F2937" }}>
        <div className="rounded-lg p-3" style={{ background: "#111827" }}>
          <p className="text-xs font-semibold text-white mb-1">Base URL</p>
          <code className="text-xs break-all" style={{ color: "#0B5FFF" }}>{BASE_URL}</code>
        </div>
      </div>
    </div>
  );

  return (
    <DevLayout>
      <div className="flex -m-4 lg:-m-6" style={{ height: "calc(100vh - 0px)", minHeight: 600 }}>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Docs sidebar — mobile (drawer) */}
        <aside
          className={`fixed lg:hidden inset-y-0 left-0 z-50 w-64 transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          style={{ borderRight: "1px solid #1F2937" }}
        >
          <Sidebar />
        </aside>

        {/* Docs sidebar — desktop (always visible) */}
        <aside
          className="hidden lg:flex flex-col flex-shrink-0"
          style={{ width: 240, borderRight: "1px solid #1F2937", background: "#0D0D0D" }}
        >
          <Sidebar />
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: "#0A0A0A" }}>
          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #1F2937" }}>
            <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                {activeSection === "endpoints"
                  ? endpoint.title
                  : docSections.find(s => s.id === activeSection)?.label || "Documentation"}
              </p>
              <p className="text-xs" style={{ color: "#4B5563" }}>Arapoint Developer API Reference</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs text-green-400 border-green-800 bg-green-950/20">v2.0</Badge>
              <Badge variant="outline" className="text-xs text-blue-400 border-blue-800 bg-blue-950/20">REST/JSON</Badge>
            </div>
          </div>

          {/* Scrollable content */}
          <div ref={contentRef} className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-6 space-y-10">

              {/* ── Overview ─────────────────────────────────────────────── */}
              <section id="overview" className="scroll-mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Book className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-lg font-bold text-white">Overview</h2>
                </div>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-5 space-y-4 text-sm text-gray-400">
                    <p>The <span className="text-white font-medium">Arapoint Developer API</span> gives you programmatic access to Nigeria's identity and verification infrastructure. Verify NINs, BVNs, academic results, assess fraud risk, and run employment background checks — all through a single RESTful JSON interface.</p>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {[
                        { label: "Base URL", value: BASE_URL, mono: true },
                        { label: "Protocol", value: "HTTPS only", mono: false },
                        { label: "Response Format", value: "JSON (application/json)", mono: false },
                      ].map(item => (
                        <div key={item.label} className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                          <p className={`text-xs text-white break-all ${item.mono ? "font-mono" : ""}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="bg-indigo-950/30 border border-indigo-800/50 rounded-lg p-4">
                        <p className="text-xs text-indigo-300 font-semibold mb-2">What you can verify</p>
                        <ul className="space-y-1.5 text-xs text-indigo-200">
                          {["National Identity Numbers (NIN)", "Bank Verification Numbers (BVN)", "Academic results — WAEC, NECO, NABTEB, NBAIS", "Employment background checks", "Identity fraud risk scoring"].map(item => (
                            <li key={item} className="flex items-start gap-2"><CheckCircle className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" /><span>{item}</span></li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4">
                        <p className="text-xs text-gray-300 font-semibold mb-2">API characteristics</p>
                        <ul className="space-y-1.5 text-xs text-gray-400">
                          {["RESTful — standard HTTP verbs and status codes", "All requests/responses in JSON", "Authentication via X-API-Key header", "Prepaid wallet — no monthly fees", "Sandbox environment for safe testing", "Webhook support for async results"].map(item => (
                            <li key={item} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" /><span>{item}</span></li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ── Quick Start ───────────────────────────────────────────── */}
              <section id="quickstart" className="scroll-mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-lg font-bold text-white">Quick Start</h2>
                </div>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-5 space-y-5 text-sm text-gray-400">
                    <p>Go from zero to your first successful API call in under 5 minutes.</p>
                    <div className="space-y-4">
                      {[
                        { step: "1", title: "Create a developer account", desc: "Register at the developer login page. Your account starts in Sandbox mode — no payment needed to begin testing.", code: null },
                        { step: "2", title: "Generate an API Key", desc: "Go to API Keys in your dashboard → click Generate New Key. Copy both the API key and secret key — the secret is only shown once.", code: null },
                        { step: "3", title: "Make your first API call", desc: "In sandbox mode, you can test immediately without funding your wallet.", code: `curl -X POST "${BASE_URL}/verify/nin" \\\n  -H "X-API-Key: ara_your_api_key_here" \\\n  -H "Content-Type: application/json" \\\n  -d '{"nin": "12345678901"}'` },
                        { step: "4", title: "Go live", desc: "Complete Business Verification (KYB), fund your wallet via Paystack, and generate a live API key.", code: null },
                      ].map(item => (
                        <div key={item.step} className="flex gap-4">
                          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">{item.step}</div>
                          <div className="flex-1">
                            <p className="text-white font-medium text-sm mb-1">{item.title}</p>
                            <p className="text-xs text-gray-400 mb-2">{item.desc}</p>
                            {item.code && <CopyableCode code={item.code} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ── Authentication ────────────────────────────────────────── */}
              <section id="authentication" className="scroll-mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-lg font-bold text-white">Authentication</h2>
                </div>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-5 space-y-4 text-sm text-gray-400">
                    <p>Arapoint uses two authentication methods depending on the action you are performing:</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-2">
                        <Badge variant="outline" className="text-indigo-400 border-indigo-700 text-xs">X-API-Key</Badge>
                        <p className="text-xs text-gray-400">For all <code className="bg-gray-700 px-1 rounded text-indigo-300">/verify/*</code> endpoints. Generate these from the API Keys page.</p>
                        <CopyableCode code={`X-API-Key: ara_your_api_key_here`} />
                      </div>
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-2">
                        <Badge variant="outline" className="text-purple-400 border-purple-700 text-xs">Bearer JWT</Badge>
                        <p className="text-xs text-gray-400">For account management actions: profile, logs, analytics, billing.</p>
                        <CopyableCode code={`Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...`} />
                      </div>
                    </div>
                    <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-lg p-3">
                      <p className="text-xs text-yellow-300 font-semibold mb-1">Security notice</p>
                      <p className="text-xs text-yellow-200">Never embed your API key in frontend JavaScript, mobile apps, or public repositories. Always make API calls from your backend server.</p>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ── Sandbox & Live ─────────────────────────────────────────── */}
              <section id="sandbox" className="scroll-mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <FlaskConical className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-bold text-white">Sandbox & Live Environments</h2>
                </div>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-5 space-y-4 text-sm text-gray-400">
                    <p>Every developer account starts in <span className="text-white font-medium">Sandbox mode</span>. Test all API flows without hitting real government databases or spending money.</p>
                    <div className="border border-gray-800 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-3 p-3 bg-gray-800/50 text-xs text-gray-400 font-medium border-b border-gray-700">
                        <span>Feature</span><span className="text-cyan-400">Sandbox</span><span className="text-green-400">Live</span>
                      </div>
                      {[
                        ["Data source", "Mock / simulated data", "Official government registries"],
                        ["Wallet deduction", "No charges", "Real ₦ deducted"],
                        ["Rate limit", "100 calls/day", "10,000 calls/day"],
                        ["KYB required", "No", "Yes"],
                        ["Webhook delivery", "Yes (test events)", "Yes (real events)"],
                      ].map(([feature, sandbox, live], i) => (
                        <div key={feature} className={`grid grid-cols-3 p-3 text-xs ${i < 4 ? "border-b border-gray-800" : ""}`}>
                          <span className="text-gray-300">{feature}</span>
                          <span className="text-cyan-300">{sandbox}</span>
                          <span className="text-green-300">{live}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ── API Endpoints ─────────────────────────────────────────── */}
              <section id="endpoints" className="scroll-mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Code2 className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-lg font-bold text-white">API Endpoints</h2>
                  <p className="text-xs text-gray-500 ml-auto">Select an endpoint from the sidebar →</p>
                </div>

                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader className="pb-3 border-b border-gray-800">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <MethodBadge method={endpoint.method} />
                          <code className="text-sm text-gray-200 font-mono">{endpoint.path}</code>
                          {endpoint.async && <Badge variant="outline" className="text-purple-400 border-purple-800 bg-purple-950/20 text-xs">async</Badge>}
                          <Badge variant="outline" className={`text-xs ${endpoint.auth === "jwt" ? "text-purple-400 border-purple-800" : "text-indigo-400 border-indigo-800"}`}>
                            {endpoint.auth === "jwt" ? "JWT auth" : "X-API-Key"}
                          </Badge>
                        </div>
                        <CardTitle className="text-white text-base">{endpoint.title}</CardTitle>
                      </div>
                      {endpoint.price > 0
                        ? <Badge variant="outline" className="text-yellow-400 border-yellow-800 bg-yellow-950/20">₦{endpoint.price} / request</Badge>
                        : <Badge variant="outline" className="text-green-400 border-green-800 bg-green-950/20">Free</Badge>}
                    </div>
                    <p className="text-sm text-gray-400 mt-2">{endpoint.description}</p>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-5">
                    {endpoint.notes && endpoint.notes.length > 0 && (
                      <div className="bg-indigo-950/20 border border-indigo-800/40 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-2"><Info className="w-3.5 h-3.5 text-indigo-400" /><span className="text-xs text-indigo-300 font-semibold">Notes</span></div>
                        <ul className="space-y-1">
                          {endpoint.notes.map(note => <li key={note} className="text-xs text-indigo-200 flex items-start gap-1.5"><span className="text-indigo-400 mt-0.5">•</span>{note}</li>)}
                        </ul>
                      </div>
                    )}

                    {endpoint.params && endpoint.params.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-2">Request Parameters</p>
                        <div className="border border-gray-800 rounded-lg overflow-hidden">
                          {endpoint.params.map((param, i) => (
                            <div key={param.name} className={`flex items-start gap-3 p-3 ${i < endpoint.params.length - 1 ? "border-b border-gray-800" : ""}`}>
                              <code className="text-xs text-indigo-300 font-mono w-40 flex-shrink-0">{param.name}</code>
                              <code className="text-xs text-gray-500 w-14 flex-shrink-0">{param.type}</code>
                              <Badge className={`text-xs flex-shrink-0 ${param.required ? "bg-red-900/60 text-red-300 border-red-800" : "bg-gray-800 text-gray-400 border-gray-700"}`}>
                                {param.required ? "required" : "optional"}
                              </Badge>
                              <p className="text-xs text-gray-400">{param.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        {LANG_TABS.map(lang => (
                          <button key={lang} onClick={() => setActiveLang(lang)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeLang === lang ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"}`}>
                            {lang}
                          </button>
                        ))}
                      </div>
                      <CopyableCode code={codeExample} />
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4">
                      {Object.keys(endpoint.request).length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 font-medium mb-2">Request Body</p>
                          <CopyableCode code={JSON.stringify(endpoint.request, null, 2)} />
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-2">Response</p>
                        <CopyableCode code={JSON.stringify(endpoint.response, null, 2)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Endpoint quick-list */}
                <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {endpoints.map(ep => (
                    <button key={ep.path} onClick={() => selectEndpoint(ep.path)}
                      className={`text-left p-3 rounded-lg border transition-all ${activeEndpoint === ep.path ? "bg-indigo-950/40 border-indigo-700" : "bg-gray-900 border-gray-800 hover:border-gray-700"}`}>
                      <div className="flex items-center gap-1.5 mb-1"><MethodBadge method={ep.method} />{ep.async && <span className="text-xs text-purple-400">async</span>}</div>
                      <p className={`text-xs font-medium leading-snug ${activeEndpoint === ep.path ? "text-white" : "text-gray-400"}`}>{ep.title}</p>
                    </button>
                  ))}
                </div>
              </section>

              {/* ── Async Flow ───────────────────────────────────────────── */}
              <section id="async-flow" className="scroll-mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <RefreshCw className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-bold text-white">Async Verification Flow</h2>
                </div>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-5 space-y-4 text-sm text-gray-400">
                    <p>Education and employment verification endpoints are asynchronous. They return a <code className="bg-gray-800 px-1 rounded text-indigo-300 text-xs">jobId</code> / <code className="bg-gray-800 px-1 rounded text-indigo-300 text-xs">requestId</code> immediately (HTTP 200 or 202). The actual result arrives later.</p>
                    <div className="bg-purple-950/20 border border-purple-800/40 rounded-lg p-4">
                      <p className="text-xs text-purple-300 font-semibold mb-2">Two ways to receive results</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {[
                          { label: "Polling (simpler)", desc: "Call the result endpoint every 10–30 seconds until status = completed." },
                          { label: "Webhooks (recommended)", desc: "Configure a webhook URL — Arapoint will POST the result to your server automatically." },
                        ].map(opt => (
                          <div key={opt.label} className="bg-purple-950/30 rounded p-3">
                            <p className="text-xs text-purple-200 font-medium mb-1">{opt.label}</p>
                            <p className="text-xs text-purple-300">{opt.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-2">Polling example (JavaScript)</p>
                      <CopyableCode code={`async function pollResult(jobId, apiKey) {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(
      \`${BASE_URL}/verify/education/result?jobId=\${jobId}\`,
      { headers: { "X-API-Key": apiKey } }
    );
    const data = await res.json();
    if (data.data.status === "completed") return data.data.results;
    if (data.data.status === "failed") throw new Error(data.message);
    await new Promise(r => setTimeout(r, 20000)); // wait 20s
  }
  throw new Error("Timed out");
}`} />
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ── Error Handling ────────────────────────────────────────── */}
              <section id="errors" className="scroll-mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-lg font-bold text-white">Error Handling</h2>
                </div>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-5 space-y-4">
                    <p className="text-sm text-gray-400">All errors use a consistent JSON structure with HTTP status code and <code className="bg-gray-800 px-1 py-0.5 rounded text-indigo-300 text-xs">code</code> field.</p>
                    <CopyableCode code={JSON.stringify({ status: "error", code: 400, message: "The 'nin' field must be exactly 11 digits", errors: [{ field: "nin", message: "Invalid NIN format" }] }, null, 2)} />
                    <div className="space-y-1">
                      {[
                        { code: 200, label: "OK", desc: "Request completed successfully", color: "green" },
                        { code: 400, label: "Bad Request", desc: "Missing or invalid parameters", color: "yellow" },
                        { code: 401, label: "Unauthorized", desc: "Invalid, revoked, or missing X-API-Key header", color: "yellow" },
                        { code: 402, label: "Payment Required", desc: "Insufficient wallet balance", color: "yellow" },
                        { code: 403, label: "Forbidden", desc: "Your IP is not on the allowlist", color: "orange" },
                        { code: 404, label: "Not Found", desc: "NIN/BVN record not found (not charged)", color: "yellow" },
                        { code: 429, label: "Rate Limited", desc: "Exceeded daily call limit — check Retry-After header", color: "orange" },
                        { code: 500, label: "Server Error", desc: "Internal error — retry with exponential backoff", color: "red" },
                      ].map(err => (
                        <div key={err.code} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                          <Badge variant="outline" className={`w-12 justify-center text-xs flex-shrink-0 font-mono ${err.code === 200 ? "text-green-400 border-green-800" : err.code >= 500 ? "text-red-400 border-red-800" : err.code >= 429 ? "text-orange-400 border-orange-800" : "text-yellow-400 border-yellow-800"}`}>{err.code}</Badge>
                          <span className="text-xs font-medium text-gray-300 w-28 flex-shrink-0">{err.label}</span>
                          <span className="text-xs text-gray-500">{err.desc}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ── Rate Limits ───────────────────────────────────────────── */}
              <section id="ratelimits" className="scroll-mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-lg font-bold text-white">Rate Limits</h2>
                </div>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-5 space-y-4 text-sm text-gray-400">
                    <p>Rate limits are applied per API key on a 24-hour rolling window.</p>
                    <div className="border border-gray-800 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-3 p-3 bg-gray-800/50 text-xs text-gray-400 font-medium border-b border-gray-700">
                        <span>Environment</span><span>Daily Limit</span><span>Window</span>
                      </div>
                      {[
                        { env: "Sandbox", limit: "100 calls/day", window: "24-hour rolling" },
                        { env: "Live (standard)", limit: "10,000 calls/day", window: "24-hour rolling" },
                        { env: "Live (custom)", limit: "Contact us", window: "Negotiated" },
                      ].map((row, i) => (
                        <div key={row.env} className={`grid grid-cols-3 p-3 text-xs ${i < 2 ? "border-b border-gray-800" : ""}`}>
                          <span className="text-white font-medium">{row.env}</span>
                          <span className="text-yellow-400">{row.limit}</span>
                          <span className="text-gray-400">{row.window}</span>
                        </div>
                      ))}
                    </div>
                    <CopyableCode code={`X-RateLimit-Limit: 10000\nX-RateLimit-Remaining: 9874\nX-RateLimit-Reset: 1712145600\nRetry-After: 3600   ← only present when rate limited (429)`} />
                  </CardContent>
                </Card>
              </section>

              {/* ── Webhooks ──────────────────────────────────────────────── */}
              <section id="webhooks" className="scroll-mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Webhook className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-bold text-white">Webhooks</h2>
                </div>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-5 space-y-4 text-sm text-gray-400">
                    <p>Webhooks let Arapoint push real-time event notifications to your server. Essential for async education and employment verification results.</p>
                    <div className="space-y-2">
                      <p className="text-xs text-gray-300 font-semibold">Event types</p>
                      <div className="border border-gray-800 rounded-lg overflow-hidden">
                        {[
                          { event: "verification.completed", desc: "NIN, BVN, or education verification returned a successful result" },
                          { event: "verification.failed", desc: "Verification could not be completed — check the error field" },
                          { event: "employment.completed", desc: "Employment background check finished — includes decision & score" },
                          { event: "employment.failed", desc: "Employment check failed — check the error field" },
                          { event: "verification.test", desc: "Manually triggered test event — confirms your endpoint is reachable" },
                        ].map((ev, i) => (
                          <div key={ev.event} className={`flex items-start gap-3 p-3 ${i < 4 ? "border-b border-gray-800" : ""}`}>
                            <code className="text-xs text-purple-300 font-mono flex-shrink-0 w-48">{ev.event}</code>
                            <span className="text-xs text-gray-400">{ev.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-2">Verifying webhook signatures</p>
                      <CopyableCode code={`const crypto = require("crypto");

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.headers["x-arapoint-signature"];
  const expected = crypto.createHmac("sha256", process.env.WEBHOOK_SECRET)
    .update(req.body).digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))) {
    return res.status(401).send("Invalid signature");
  }

  const event = JSON.parse(req.body);
  // Handle event.event types here
  res.status(200).send("OK");
});`} />
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ── IP Allowlist ──────────────────────────────────────────── */}
              <section id="security" className="scroll-mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-green-400" />
                  <h2 className="text-lg font-bold text-white">IP Allowlist</h2>
                </div>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-5 space-y-4 text-sm text-gray-400">
                    <p>Restrict API access to specific IP addresses or CIDR blocks. Requests from unlisted IPs are rejected with <code className="bg-gray-800 px-1 py-0.5 rounded text-indigo-300 text-xs">403 Forbidden</code> even with a valid key.</p>
                    <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4 space-y-2">
                      <p className="text-xs text-gray-300 font-semibold">How to configure</p>
                      <ol className="space-y-1.5 text-xs text-gray-400">
                        {["Go to Webhooks & Security in your developer dashboard", "Scroll to the IP Allowlist section", "Add your server IP or CIDR block (e.g. 192.168.1.0/24)", "Save — the allowlist is active immediately"].map((step, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-green-800 flex items-center justify-center text-xs text-white flex-shrink-0">{i + 1}</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-lg p-3">
                      <p className="text-xs text-yellow-300 font-semibold mb-1">Important</p>
                      <p className="text-xs text-yellow-200">If your server's IP changes after enabling an allowlist, your API calls will be blocked. Update the list from the developer dashboard (which uses JWT auth, not IP-restricted).</p>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ── Code Examples ─────────────────────────────────────────── */}
              <section id="sdks" className="scroll-mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-green-400" />
                  <h2 className="text-lg font-bold text-white">Code Examples</h2>
                </div>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-5 space-y-5 text-sm text-gray-400">
                    <p>Official SDKs are in development. Use the REST API directly or copy the helper below as a starting point.</p>
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-2">Node.js / TypeScript SDK wrapper</p>
                      <CopyableCode code={`class ArapointClient {
  constructor(private apiKey: string) {}
  private baseUrl = "${BASE_URL}";

  private async request(method: string, path: string, body?: object) {
    const res = await fetch(\`\${this.baseUrl}\${path}\`, {
      method,
      headers: { "X-API-Key": this.apiKey, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || \`API error \${res.status}\`);
    return data;
  }

  verifyNIN(nin: string) { return this.request("POST", "/verify/nin", { nin }); }
  verifyBVN(bvn: string) { return this.request("POST", "/verify/bvn", { bvn }); }
  fraudScore(nin: string, bvn: string) { return this.request("POST", "/verify/fraud-score", { nin, bvn }); }
  verifyEducation(payload: object) { return this.request("POST", "/verify/education", payload); }
  getEducationResult(jobId: string) { return this.request("GET", \`/verify/education/result?jobId=\${jobId}\`); }
  verifyEmployment(payload: object) { return this.request("POST", "/verify/employment", payload); }
  getEmploymentResult(id: string) { return this.request("GET", \`/verify/employment/result/\${id}\`); }
}

const arapoint = new ArapointClient("ara_your_api_key_here");
const result = await arapoint.verifyNIN("12345678901");
console.log(result.data.verification.firstName); // "JOHN"`} />
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ── Billing & Pricing ─────────────────────────────────────── */}
              <section id="billing" className="scroll-mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-lg font-bold text-white">Billing & Pricing</h2>
                </div>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-5 space-y-4 text-sm text-gray-400">
                    <p>Arapoint uses a prepaid wallet model — no subscriptions, no monthly fees. Pay only for the API calls you make.</p>
                    <div className="border border-gray-800 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-4 p-3 bg-gray-800/50 text-xs text-gray-400 font-medium border-b border-gray-700">
                        <span className="col-span-2">Endpoint</span><span>Price</span><span>Notes</span>
                      </div>
                      {endpoints.filter(e => e.group === "Verification").map((ep, i) => (
                        <div key={ep.path} className={`grid grid-cols-4 p-3 text-xs ${i < endpoints.filter(e => e.group === "Verification").length - 1 ? "border-b border-gray-800" : ""}`}>
                          <span className="col-span-2 text-gray-300 font-medium">{ep.title}</span>
                          <span className={ep.price > 0 ? "text-yellow-400" : "text-green-400"}>{ep.price > 0 ? `₦${ep.price}` : "Free"}</span>
                          <span className="text-gray-500">{ep.async ? "Charged on queue" : ep.price === 0 ? "No charge" : "Per request"}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4">
                      <p className="text-xs text-gray-300 font-semibold mb-2">How to fund your wallet</p>
                      <ol className="space-y-1.5 text-xs text-gray-400">
                        {["Go to the Billing page in your developer dashboard", "Click Fund Wallet — you'll be redirected to Paystack", "Pay by card, bank transfer, or USSD", "Your wallet is credited instantly"].map((step, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-yellow-800 flex items-center justify-center text-xs text-white flex-shrink-0">{i + 1}</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <div className="h-16" />
            </div>
          </div>
        </div>
      </div>
    </DevLayout>
  );
}
