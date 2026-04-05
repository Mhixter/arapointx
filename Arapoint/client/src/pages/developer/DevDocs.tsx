import { useState } from "react";
import { DevLayout } from "./DevLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Copy, CheckCircle, ChevronDown, ChevronRight, Book, Key, Zap, Globe, Shield,
  AlertTriangle, Code2, Webhook, CreditCard, FlaskConical, RefreshCw, Lock, BarChart3,
  ArrowRight, Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = "https://arapoint.com.ng/api/v1/developer";

// ─── All API endpoints with full documentation ────────────────────────────────
const endpoints = [
  // ── Verification endpoints ──────────────────────────────────────────────────
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
      status: "success",
      code: 200,
      message: "NIN verification completed",
      data: {
        verification: {
          firstName: "JOHN",
          middleName: "EMEKA",
          lastName: "DOE",
          dateOfBirth: "1990-01-15",
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
      { name: "nin", type: "string", required: false, desc: "11-digit National ID Number (provide nin OR phone)" },
      { name: "phone", type: "string", required: false, desc: "Registered phone number (alternative to NIN)" },
    ],
    notes: [
      "Either nin or phone must be provided — not both required",
      "Results are cached for 24 hours to reduce costs on repeated lookups",
      "In sandbox mode, returns mock data instantly",
    ]
  },
  {
    group: "Verification",
    method: "POST",
    path: "/verify/bvn",
    title: "BVN Verification",
    description: "Verify a Bank Verification Number and retrieve the associated identity record from the national banking verification network. Used to confirm a person's banking identity and cross-reference with other identity documents.",
    price: 80,
    auth: "api-key",
    async: false,
    request: { bvn: "12345678901" },
    response: {
      status: "success",
      code: 200,
      message: "BVN verification completed",
      data: {
        verification: {
          firstName: "JOHN",
          lastName: "DOE",
          dateOfBirth: "1990-01-15",
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
      { name: "bvn", type: "string", required: true, desc: "11-digit Bank Verification Number" },
    ],
    notes: [
      "Results are cached for 24 hours to reduce costs on repeated lookups",
      "Cross-reference with NIN to confirm identity consistency",
    ]
  },
  {
    group: "Verification",
    method: "POST",
    path: "/verify/education",
    title: "Education Verification",
    description: "Verify academic results from WAEC, NECO, NABTEB, or NBAIS. This is asynchronous — the API queues the request and returns a jobId immediately. Results are delivered via webhook or can be polled. Each exam body requires different fields — see parameters below.",
    price: 250,
    auth: "api-key",
    async: true,
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
        note: "Results will be available in 1-3 minutes. Poll GET /verify/education/result?jobId=<jobId>"
      }
    },
    params: [
      { name: "provider", type: "string", required: true, desc: "Exam body. One of: waec, neco, nabteb, nbais" },
      { name: "registrationNumber", type: "string", required: true, desc: "WAEC/NABTEB: Examination Number | NECO: Registration Number | NBAIS: Exam Number" },
      { name: "examYear", type: "number", required: true, desc: "Year of examination (e.g. 2023)" },
      { name: "examType", type: "string", required: true, desc: "WAEC: WASSCE or GCE | NECO: school_candidate or private | NABTEB: MAY/JUN or NOV/DEC | NBAIS: AISSCE" },
      { name: "cardPin", type: "string", required: true, desc: "WAEC/NABTEB/NBAIS: scratch-card PIN | NECO: verification token" },
      { name: "cardSerialNumber", type: "string", required: true, desc: "WAEC & NABTEB only: scratch-card serial number. Not required for NECO or NBAIS." },
      { name: "state", type: "string", required: true, desc: "NBAIS only: candidate state of origin (e.g. Kano). Not required for other providers." },
      { name: "schoolName", type: "string", required: true, desc: "NBAIS only: candidate school name. Not required for other providers." },
      { name: "examMonth", type: "string", required: true, desc: "NBAIS only: exam month — MAY or NOV. Not required for other providers." },
    ],
    notes: [
      "ASYNC — results are NOT returned immediately. Poll or use webhooks.",
      "NECO requires: registrationNumber, examYear, examType (school_candidate/private), cardPin (token)",
      "WAEC requires: registrationNumber, examYear, examType (WASSCE/GCE), cardPin (PIN), cardSerialNumber",
      "NABTEB requires: registrationNumber, examYear, examType (MAY/JUN or NOV/DEC), cardPin (PIN), cardSerialNumber",
      "NBAIS requires: registrationNumber, examYear, examType, examMonth (MAY/NOV), state, schoolName, cardPin (PIN)",
      "Charge is deducted when the request is accepted, not when the result arrives",
    ]
  },
  {
    group: "Verification",
    method: "GET",
    path: "/verify/education/result",
    title: "Poll Education Result",
    description: "Poll the status and result of a previously submitted education verification request. Use this if you are not using webhooks. Pass the requestId returned by POST /verify/education.",
    price: 0,
    auth: "api-key",
    async: false,
    request: {},
    response: {
      status: "success",
      code: 200,
      message: "Result fetched",
      data: {
        requestId: "EDU-abc123def456",
        status: "completed",
        provider: "WAEC",
        examYear: 2023,
        registrationNumber: "4190101001",
        results: [
          { subject: "Mathematics", grade: "A1" },
          { subject: "English Language", grade: "B2" },
          { subject: "Physics", grade: "B3" }
        ]
      }
    },
    params: [
      { name: "requestId", type: "string", required: true, desc: "The requestId from POST /verify/education (query param)" },
    ],
    notes: [
      "Status values: processing | completed | failed",
      "Poll every 10–30 seconds — most results arrive within 2 minutes",
      "This endpoint is free — no additional charge",
    ]
  },
  {
    group: "Verification",
    method: "POST",
    path: "/verify/unified",
    title: "Unified Verification",
    description: "Combine NIN, BVN, and education verification in a single API call at a discounted bundle price. Ideal for onboarding flows where you need to verify all three at once. Returns NIN and BVN results immediately; education result is delivered asynchronously.",
    price: 400,
    auth: "api-key",
    async: false,
    request: { nin: "12345678901", bvn: "12345678901", education: { provider: "waec", examYear: 2023, registrationNumber: "4190101001" } },
    response: {
      status: "success",
      code: 200,
      message: "Unified verification completed",
      data: {
        requestId: "UNI-abc123def456",
        nin: { firstName: "JOHN", lastName: "DOE", dateOfBirth: "1990-01-15" },
        bvn: { firstName: "JOHN", bvn: "12345678901" },
        education: { status: "processing", requestId: "EDU-xyz789" }
      }
    },
    params: [
      { name: "nin", type: "string", required: false, desc: "NIN to verify (optional — include at least one)" },
      { name: "bvn", type: "string", required: false, desc: "BVN to verify (optional)" },
      { name: "education", type: "object", required: false, desc: "Education object with provider, examYear, registrationNumber" },
    ],
    notes: [
      "At least one of nin, bvn, or education must be provided",
      "NIN and BVN results are synchronous; education is async",
      "Cheaper than calling each endpoint separately",
    ]
  },
  {
    group: "Verification",
    method: "POST",
    path: "/verify/employment",
    title: "Employment Background Check",
    description: "Submit an employment background check that cross-references NIN, BVN, and optional SSCE certificate results. This is an asynchronous operation — the API accepts the request and returns a requestId and HTTP 202 immediately. The check runs in the background using Arapoint's verification engine. Poll the result endpoint or configure webhooks to receive the final decision.",
    price: 350,
    auth: "api-key",
    async: true,
    request: {
      nin: "12345678901",
      bvn: "12345678901",
      fullName: "John Emeka Doe",
      dateOfBirth: "1990-01-15",
      employmentYear: 2015,
      level: "degree",
      ssce: {
        provider: "waec",
        registrationNumber: "4190101001",
        examYear: 2009,
        cardPin: "12345678",
        cardSerialNumber: "AA12345678"
      }
    },
    response: {
      status: "accepted",
      code: 202,
      message: "Employment verification queued. Poll the result endpoint for status.",
      data: {
        requestId: "EMP-xyz789abc123",
        queueStatus: "queued",
        submittedAt: "2026-04-04T10:00:00.000Z",
        pollUrl: "GET /verify/employment/result/EMP-xyz789abc123"
      }
    },
    params: [
      { name: "nin", type: "string", required: true, desc: "11-digit National ID Number of the subject" },
      { name: "bvn", type: "string", required: true, desc: "11-digit Bank Verification Number of the subject" },
      { name: "fullName", type: "string", required: true, desc: "Full name of the subject to cross-reference" },
      { name: "dateOfBirth", type: "string", required: false, desc: "Date of birth in YYYY-MM-DD format" },
      { name: "employmentYear", type: "number", required: false, desc: "Year the subject claims to have started work / graduated" },
      { name: "level", type: "string", required: false, desc: "Education level: 'degree' or 'higher' (postgrad/masters)" },
      { name: "ssce", type: "object", required: false, desc: "SSCE certificate details for cross-referencing (see below)" },
      { name: "ssce.provider", type: "string", required: false, desc: "One of: waec, neco, nabteb, nbais" },
      { name: "ssce.registrationNumber", type: "string", required: false, desc: "Candidate's exam registration number" },
      { name: "ssce.examYear", type: "number", required: false, desc: "Year the exam was sat (e.g. 2009)" },
      { name: "ssce.cardPin", type: "string", required: false, desc: "Scratch-card PIN (required for all providers when ssce is included)" },
      { name: "ssce.cardSerialNumber", type: "string", required: false, desc: "Scratch-card serial number (required for WAEC, NABTEB, NBAIS; not needed for NECO)" },
    ],
    notes: [
      "This is ASYNC — you will receive HTTP 202 immediately, NOT the final result",
      "Poll GET /verify/employment/result/:requestId for the decision",
      "Or configure webhooks to receive the employment.completed event",
      "Decision values: PASS (score ≥ 85) | REVIEW (60–84) | FAIL (< 60)",
      "Score breakdown: NIN 20pts + BVN 20pts + Name match 20pts + DOB 15pts + Timeline 10pts + SSCE 15pts = 100",
      "If no SSCE is provided, max possible score is 85 — PASS threshold still applies",
      "SSCE cardSerialNumber is required for WAEC, NABTEB, NBAIS — NECO only needs cardPin",
      "Charge is deducted when the request is accepted (queued), not when result arrives",
    ]
  },
  {
    group: "Verification",
    method: "GET",
    path: "/verify/employment/result/:requestId",
    title: "Poll Employment Result",
    description: "Poll the status and final decision of a previously submitted employment background check. Use this if you are not using webhooks. Pass the requestId returned by POST /verify/employment.",
    price: 0,
    auth: "api-key",
    async: false,
    request: {},
    response: {
      status: "success",
      code: 200,
      message: "Employment verification completed",
      data: {
        requestId: "EMP-xyz789abc123",
        queueStatus: "completed",
        decision: "PASS",
        finalScore: 90,
        breakdown: {
          ninScore: 20,
          bvnScore: 20,
          nameMatchScore: "0.97",
          dobMatch: true,
          timelineValid: true,
          ssceScore: 15,
          flags: []
        },
        completedAt: "2026-04-04T10:02:35.000Z"
      }
    },
    params: [
      { name: "requestId", type: "string", required: true, desc: "The requestId from POST /verify/employment (URL path param)" },
    ],
    notes: [
      "queueStatus values: queued | processing | completed | failed",
      "Returns HTTP 202 if still queued or processing — check queueStatus field",
      "Returns HTTP 200 with full result when queueStatus = 'completed'",
      "Returns HTTP 500 with error detail when queueStatus = 'failed'",
      "Poll every 10–30 seconds — most checks complete within 2–3 minutes",
      "This endpoint is free — no additional charge",
    ]
  },
  {
    group: "Verification",
    method: "POST",
    path: "/verify/fraud-score",
    title: "Fraud Risk Score",
    description: "Run a lightweight identity fraud check. Compares NIN and BVN records to detect name mismatches, DOB inconsistencies, and data anomalies. Returns a risk score (0–100), a risk level, and specific flag descriptions.",
    price: 50,
    auth: "api-key",
    async: false,
    request: { nin: "12345678901", bvn: "12345678901" },
    response: {
      status: "success",
      code: 200,
      message: "Fraud score calculated",
      data: {
        requestId: "FRD-abc999",
        riskScore: 12,
        riskLevel: "low",
        flags: [],
        summary: "Identity records are consistent — low fraud risk",
        details: {
          nameConsistency: 98,
          dobConsistency: true,
          ninValid: true,
          bvnValid: true
        }
      }
    },
    params: [
      { name: "nin", type: "string", required: true, desc: "National ID Number to check" },
      { name: "bvn", type: "string", required: true, desc: "BVN to cross-reference against NIN" },
    ],
    notes: [
      "riskLevel: low (0–30) | medium (31–60) | high (61–80) | critical (81–100)",
      "flags array lists specific anomalies detected (e.g. 'name_mismatch', 'dob_inconsistency')",
      "Cheapest verification endpoint — good for initial screening before deeper checks",
    ]
  },
  // ── Account / utility endpoints ─────────────────────────────────────────────
  {
    group: "Account",
    method: "GET",
    path: "/profile",
    title: "Get Profile",
    description: "Retrieve your developer account profile including wallet balance, KYB status, and environment mode. Uses your dashboard JWT token, not your API key.",
    price: 0,
    auth: "jwt",
    async: false,
    request: {},
    response: {
      status: "success",
      code: 200,
      data: {
        id: "dev_abc123",
        name: "John Doe",
        email: "john@acme.com",
        company: "Acme Ltd",
        walletBalance: 4500.00,
        environmentMode: "sandbox",
        kycStatus: "approved",
        isActive: true
      }
    },
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
    response: {
      status: "success",
      code: 200,
      data: {
        transactions: [
          { id: "tx_001", transactionType: "wallet_funding", amount: "5000.00", description: "Wallet funded via Paystack", created_at: "2026-04-03T10:00:00Z" },
          { id: "tx_002", transactionType: "api_charge", amount: "-130.00", description: "NIN Verification", created_at: "2026-04-03T10:05:00Z" }
        ]
      }
    },
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
    response: {
      status: "success",
      code: 200,
      data: {
        logs: [
          { id: "log_001", endpoint: "/verify/nin", statusCode: 200, cost: 130, durationMs: 340, createdAt: "2026-04-03T10:00:00Z" }
        ],
        total: 1
      }
    },
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
    description: "Get a detailed analytics breakdown of your API usage over the last N days — total calls, success rate, spend, and per-endpoint breakdown.",
    price: 0,
    auth: "jwt",
    async: false,
    request: {},
    response: {
      status: "success",
      code: 200,
      data: {
        period: "30 days",
        summary: { totalCalls: 240, successCalls: 232, errorCalls: 8, successRate: 97, totalSpent: "28500.00", avgDurationMs: 320 },
        daily: [{ day: "2026-04-01", calls: 12, success: 12, spent: "1430.00" }],
        endpoints: [{ endpoint: "/verify/nin", calls: 120, spent: "15600.00" }]
      }
    },
    params: [
      { name: "days", type: "number", required: false, desc: "Time period: 7, 30, or 90 (default: 30)" },
    ],
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

function SectionAnchor({ id, children }: { id: string; children: React.ReactNode }) {
  return <div id={id} className="scroll-mt-6">{children}</div>;
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "text-blue-400 border-blue-800 bg-blue-950/30",
    POST: "text-green-400 border-green-800 bg-green-950/30",
    DELETE: "text-red-400 border-red-800 bg-red-950/30",
    PUT: "text-orange-400 border-orange-800 bg-orange-950/30",
    PATCH: "text-yellow-400 border-yellow-800 bg-yellow-950/30",
  };
  return (
    <Badge variant="outline" className={`text-xs font-mono ${colors[method] || "text-gray-400 border-gray-700"}`}>
      {method}
    </Badge>
  );
}

const groupOrder = ["Verification", "Account"];

export default function DevDocs() {
  const [activeEndpoint, setActiveEndpoint] = useState(endpoints[0].path);
  const [activeSection, setActiveSection] = useState("overview");
  const [activeLang, setActiveLang] = useState<Lang>("cURL");
  const endpoint = endpoints.find(e => e.path === activeEndpoint) || endpoints[0];

  const groups = groupOrder.map(g => ({
    name: g,
    items: endpoints.filter(e => e.group === g),
  }));

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const codeExample = buildExample(activeLang, endpoint.method, endpoint.path, endpoint.request);

  return (
    <DevLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">API Documentation</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Complete reference for integrating with the Arapoint Developer API
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Sidebar nav */}
          <div className="xl:col-span-1 space-y-0.5 xl:sticky xl:top-4 xl:self-start">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3 px-2">Contents</p>
            {docSections.map(s => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                  activeSection === s.id
                    ? "bg-indigo-950/60 border border-indigo-700 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <s.icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span className="text-xs leading-snug whitespace-normal">{s.label}</span>
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className="xl:col-span-4 space-y-8">

            {/* ── Overview ───────────────────────────────────────────────── */}
            <SectionAnchor id="overview">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Book className="w-4 h-4 text-indigo-400" /> Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-400">
                  <p>
                    The <span className="text-white font-medium">Arapoint Developer API</span> gives you programmatic access to Nigeria's identity and verification infrastructure. Verify NINs, BVNs, academic results, assess fraud risk, and run employment background checks — all through a single RESTful JSON interface.
                  </p>
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
                        {[
                          "National Identity Numbers (NIN) — official government registry",
                          "Bank Verification Numbers (BVN) — national banking network",
                          "Academic results — WAEC, NECO, NABTEB, NBAIS, JAMB",
                          "Multi-factor employment background checks",
                          "Identity fraud risk scoring",
                        ].map(item => (
                          <li key={item} className="flex items-start gap-2">
                            <CheckCircle className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4">
                      <p className="text-xs text-gray-300 font-semibold mb-2">API characteristics</p>
                      <ul className="space-y-1.5 text-xs text-gray-400">
                        {[
                          "RESTful — standard HTTP verbs and status codes",
                          "All requests/responses in JSON",
                          "Authentication via X-API-Key header",
                          "Prepaid wallet — no monthly fees",
                          "Sandbox environment for safe testing",
                          "Webhook support for async results",
                        ].map(item => (
                          <li key={item} className="flex items-start gap-2">
                            <ArrowRight className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* ── Quick Start ─────────────────────────────────────────────── */}
            <SectionAnchor id="quickstart">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" /> Quick Start
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 text-sm text-gray-400">
                  <p>Go from zero to your first successful API call in under 5 minutes.</p>
                  <div className="space-y-4">
                    {[
                      {
                        step: "1",
                        title: "Create a developer account",
                        desc: "Register at the developer login page. Your account starts in Sandbox mode — no payment needed to begin testing.",
                        code: null,
                      },
                      {
                        step: "2",
                        title: "Generate an API Key",
                        desc: "Go to API Keys in your dashboard → click Generate New Key. Copy both the API key and secret key — the secret is only shown once.",
                        code: null,
                      },
                      {
                        step: "3",
                        title: "Make your first API call",
                        desc: "In sandbox mode, you can test immediately without funding your wallet. The response will contain realistic mock data.",
                        code: `curl -X POST "${BASE_URL}/verify/nin" \\\n  -H "X-API-Key: ara_your_api_key_here" \\\n  -H "Content-Type: application/json" \\\n  -d '{"nin": "12345678901"}'`,
                      },
                      {
                        step: "4",
                        title: "Go live",
                        desc: "Complete Business Verification (KYB) in your dashboard, then fund your wallet via Paystack to switch from sandbox to live mode.",
                        code: null,
                      },
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
                  <div className="bg-green-950/20 border border-green-800/40 rounded-lg p-3">
                    <p className="text-xs text-green-300 font-semibold mb-1">Expected sandbox response</p>
                    <CopyableCode code={JSON.stringify({
                      status: "success", code: 200, message: "NIN verification completed",
                      data: {
                        verification: { firstName: "JOHN", lastName: "DOE", dateOfBirth: "1990-01-15", nin: "12345678901", gender: "Male" },
                        source: "SANDBOX_MOCK", cached: false
                      }
                    }, null, 2)} />
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* ── Authentication ──────────────────────────────────────────── */}
            <SectionAnchor id="authentication">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Key className="w-4 h-4 text-indigo-400" /> Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-400">
                  <p>Arapoint uses two authentication methods depending on the action you are performing:</p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-indigo-400 border-indigo-700 text-xs">X-API-Key</Badge>
                        <span className="text-xs text-gray-300 font-medium">For verification calls</span>
                      </div>
                      <p className="text-xs text-gray-400">Used for all <code className="bg-gray-700 px-1 rounded text-indigo-300">/verify/*</code> endpoints. Generate these from the API Keys page. Each key is tied to an environment (sandbox or live).</p>
                      <CopyableCode code={`X-API-Key: ara_your_api_key_here`} />
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-purple-400 border-purple-700 text-xs">Bearer JWT</Badge>
                        <span className="text-xs text-gray-300 font-medium">For account management</span>
                      </div>
                      <p className="text-xs text-gray-400">Used for dashboard actions: profile, logs, analytics, billing. Obtained by logging in through the developer portal.</p>
                      <CopyableCode code={`Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...`} />
                    </div>
                  </div>

                  <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-lg p-3">
                    <p className="text-xs text-yellow-300 font-semibold mb-1">Security notice</p>
                    <p className="text-xs text-yellow-200">Never embed your API key in frontend JavaScript, mobile apps, or public repositories. Always make API calls from your backend server. If a key is compromised, revoke it immediately from your API Keys page.</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">Full authenticated request example</p>
                    <CopyableCode code={`curl -X POST "${BASE_URL}/verify/bvn" \\\n  -H "X-API-Key: ara_your_api_key_here" \\\n  -H "Content-Type: application/json" \\\n  -H "Accept: application/json" \\\n  -d '{"bvn": "12345678901"}'`} />
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* ── Sandbox & Live ───────────────────────────────────────────── */}
            <SectionAnchor id="sandbox">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-cyan-400" /> Sandbox & Live Environments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-400">
                  <p>Every developer account starts in <span className="text-white font-medium">Sandbox mode</span>. This lets you fully test all API flows without hitting real government databases or spending money. Switch to Live after completing Business Verification (KYB).</p>

                  <div className="border border-gray-800 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-3 p-3 bg-gray-800/50 text-xs text-gray-400 font-medium border-b border-gray-700">
                      <span>Feature</span>
                      <span className="text-cyan-400">Sandbox</span>
                      <span className="text-green-400">Live</span>
                    </div>
                    {[
                      ["Data source", "Mock / simulated data", "Official government registries"],
                      ["Wallet deduction", "No charges", "Real ₦ deducted"],
                      ["Rate limit", "100 calls/day", "10,000 calls/day"],
                      ["KYB required", "No", "Yes"],
                      ["Webhook delivery", "Yes (test events)", "Yes (real events)"],
                      ["Certificate verification", "Mock response", "Live registry lookup"],
                    ].map(([feature, sandbox, live], i) => (
                      <div key={feature} className={`grid grid-cols-3 p-3 text-xs ${i < 5 ? "border-b border-gray-800" : ""}`}>
                        <span className="text-gray-300">{feature}</span>
                        <span className="text-cyan-300">{sandbox}</span>
                        <span className="text-green-300">{live}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-cyan-950/20 border border-cyan-800/40 rounded-lg p-4">
                    <p className="text-xs text-cyan-300 font-semibold mb-2">How to tell which environment you are in</p>
                    <p className="text-xs text-cyan-200 mb-3">Every API response includes a <code className="bg-cyan-950/40 px-1 rounded">source</code> field. When in sandbox, you will see <code className="bg-cyan-950/40 px-1 rounded">"source": "SANDBOX_MOCK"</code>. In live mode you will see <code className="bg-cyan-950/40 px-1 rounded">"source": "ARAPOINT"</code>.</p>
                    <p className="text-xs text-cyan-300 font-semibold mb-1">Sandbox mock data</p>
                    <p className="text-xs text-cyan-200">In sandbox, any valid-format input (e.g. any 11-digit NIN) returns a consistent mock identity record so you can build and test your full integration flow reliably.</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-300 font-semibold mb-2">Steps to go live</p>
                    <ol className="space-y-1.5 text-xs text-gray-400">
                      {[
                        "Complete your Business Verification (KYB) from the Business Verification page",
                        "Wait for admin approval — usually within 24 hours",
                        "Fund your wallet via the Billing page (Paystack — card, bank transfer, or USSD)",
                        "Generate a live API key from the API Keys page",
                        "Replace your sandbox key in your code with the new live key",
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white flex-shrink-0 mt-0.5">{i + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* ── API Endpoints interactive browser ────────────────────────── */}
            <SectionAnchor id="endpoints">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-white text-base font-semibold">API Endpoints</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {/* Endpoint selector */}
                  <div className="space-y-3">
                    {groups.map(group => (
                      <div key={group.name}>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1.5">{group.name}</p>
                        <div className="space-y-1">
                          {group.items.map(ep => (
                            <button
                              key={ep.path}
                              onClick={() => setActiveEndpoint(ep.path)}
                              className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                                activeEndpoint === ep.path
                                  ? "bg-indigo-950/60 border-indigo-700 text-white"
                                  : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <MethodBadge method={ep.method} />
                                {ep.async && <Badge variant="outline" className="text-purple-400 border-purple-800 bg-purple-950/20 text-xs">async</Badge>}
                              </div>
                              <p className="font-medium text-xs leading-snug">{ep.title}</p>
                              {ep.price > 0
                                ? <p className="text-xs text-gray-500 mt-0.5">₦{ep.price}/req</p>
                                : <p className="text-xs text-green-600 mt-0.5">Free</p>}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Endpoint detail */}
                  <div className="lg:col-span-3 space-y-4">
                    <Card className="bg-gray-900 border-gray-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <MethodBadge method={endpoint.method} />
                              <code className="text-sm text-gray-200 font-mono">{endpoint.path}</code>
                              {endpoint.async && (
                                <Badge variant="outline" className="text-purple-400 border-purple-800 bg-purple-950/20 text-xs">async</Badge>
                              )}
                              <Badge variant="outline" className={`text-xs ${endpoint.auth === "jwt" ? "text-purple-400 border-purple-800" : "text-indigo-400 border-indigo-800"}`}>
                                {endpoint.auth === "jwt" ? "JWT auth" : "X-API-Key"}
                              </Badge>
                            </div>
                            <CardTitle className="text-white text-base">{endpoint.title}</CardTitle>
                          </div>
                          {endpoint.price > 0
                            ? <Badge variant="outline" className="text-yellow-400 border-yellow-800 bg-yellow-950/20 flex-shrink-0">₦{endpoint.price} / request</Badge>
                            : <Badge variant="outline" className="text-green-400 border-green-800 bg-green-950/20 flex-shrink-0">Free</Badge>}
                        </div>
                        <p className="text-sm text-gray-400 mt-2">{endpoint.description}</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Notes */}
                        {endpoint.notes && endpoint.notes.length > 0 && (
                          <div className="bg-indigo-950/20 border border-indigo-800/40 rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Info className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="text-xs text-indigo-300 font-semibold">Notes</span>
                            </div>
                            <ul className="space-y-1">
                              {endpoint.notes.map(note => (
                                <li key={note} className="text-xs text-indigo-200 flex items-start gap-1.5">
                                  <span className="text-indigo-400 mt-0.5">•</span>{note}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Params */}
                        {endpoint.params && endpoint.params.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-400 font-medium mb-2">Request Parameters</p>
                            <div className="border border-gray-800 rounded-lg overflow-hidden">
                              {endpoint.params.map((param, i) => (
                                <div key={param.name} className={`flex items-start gap-3 p-3 ${i < endpoint.params.length - 1 ? "border-b border-gray-800" : ""}`}>
                                  <code className="text-xs text-indigo-300 font-mono w-36 flex-shrink-0">{param.name}</code>
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

                        {/* Code examples with language tabs */}
                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            {LANG_TABS.map(lang => (
                              <button
                                key={lang}
                                onClick={() => setActiveLang(lang)}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                  activeLang === lang
                                    ? "bg-indigo-600 text-white"
                                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                                }`}
                              >{lang}</button>
                            ))}
                          </div>
                          <CopyableCode code={codeExample} />
                        </div>

                        {/* Response */}
                        <div>
                          <p className="text-xs text-gray-400 font-medium mb-2">Example Response</p>
                          <CopyableCode code={JSON.stringify(endpoint.response, null, 2)} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </SectionAnchor>

            {/* ── Async Verification Flow ──────────────────────────────────── */}
            <SectionAnchor id="async-flow">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-purple-400" /> Async Verification Flow
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-400">
                  <p>
                    Two endpoints are asynchronous — they return <code className="bg-gray-800 px-1 py-0.5 rounded text-indigo-300 text-xs">202 Accepted</code> immediately and deliver results later:
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-3">
                      <p className="text-xs text-white font-semibold mb-1">Education Verification</p>
                      <p className="text-xs text-gray-400">Retrieves results directly from WAEC, NECO, NABTEB, NBAIS, and JAMB certificate portals via Arapoint's automated verification engine. Results typically arrive within <span className="text-white">1–5 minutes</span>.</p>
                      <p className="text-xs text-gray-500 mt-1.5">Poll: <code className="text-indigo-300">GET /verify/education/result?jobId=xxx</code></p>
                      <p className="text-xs text-gray-500">Webhook event: <code className="text-purple-300">verification.completed</code></p>
                    </div>
                    <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-3">
                      <p className="text-xs text-white font-semibold mb-1">Employment Background Check</p>
                      <p className="text-xs text-gray-400">Cross-references NIN, BVN, and SSCE certificate data using Arapoint's verification engine in the background. Produces a PASS / REVIEW / FAIL decision. Results typically arrive within <span className="text-white">2–3 minutes</span>.</p>
                      <p className="text-xs text-gray-500 mt-1.5">Poll: <code className="text-indigo-300">GET /verify/employment/result/:requestId</code></p>
                      <p className="text-xs text-gray-500">Webhook event: <code className="text-purple-300">employment.completed</code></p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-purple-950/20 border border-purple-800/40 rounded-lg p-4">
                      <p className="text-xs text-purple-300 font-semibold mb-2">Option A — Webhooks (recommended)</p>
                      <ol className="space-y-1.5 text-xs text-purple-200">
                        {[
                          "Configure your webhook URL in the Webhooks & Security page",
                          "Submit the async request → receive requestId + 202",
                          "Arapoint sends POST to your webhook when result is ready",
                          "Handle verification.completed or employment.completed",
                        ].map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-purple-700 flex items-center justify-center text-xs text-white flex-shrink-0">{i + 1}</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div className="bg-blue-950/20 border border-blue-800/40 rounded-lg p-4">
                      <p className="text-xs text-blue-300 font-semibold mb-2">Option B — Polling</p>
                      <ol className="space-y-1.5 text-xs text-blue-200">
                        {[
                          "Submit the async request → receive requestId + 202",
                          "Call the corresponding poll endpoint with your requestId",
                          "Check the status field: queued | processing | completed | failed",
                          "Repeat every 15–30 seconds until status is completed",
                        ].map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-blue-700 flex items-center justify-center text-xs text-white flex-shrink-0">{i + 1}</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">Employment result polling example (JavaScript)</p>
                    <CopyableCode code={`async function pollEmploymentResult(requestId, apiKey) {
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      \`${BASE_URL}/verify/employment/result/\${requestId}\`,
      { headers: { "X-API-Key": apiKey } }
    );

    // 202 = still queued/processing
    if (res.status === 202) {
      await new Promise(r => setTimeout(r, 20000));
      continue;
    }

    const data = await res.json();

    if (res.status === 200) {
      console.log("Decision:", data.data.decision); // "PASS" | "REVIEW" | "FAIL"
      console.log("Score:", data.data.finalScore);
      return data.data;
    }

    throw new Error(data.message || "Verification failed");
  }
  throw new Error("Timed out waiting for result");
}`} />
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">Education result polling example (JavaScript)</p>
                    <CopyableCode code={`async function pollEducationResult(jobId, apiKey) {
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      \`${BASE_URL}/verify/education/result?jobId=\${jobId}\`,
      { headers: { "X-API-Key": apiKey } }
    );
    const data = await res.json();

    if (data.data.status === "completed") {
      return data.data.results; // ✅ Done
    }
    if (data.data.status === "failed") {
      throw new Error("Verification failed");
    }
    // Still processing — wait 20 seconds then retry
    await new Promise(r => setTimeout(r, 20000));
  }
  throw new Error("Timed out waiting for result");
}`} />
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* ── Error Handling ────────────────────────────────────────────── */}
            <SectionAnchor id="errors">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" /> Error Handling
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-400">
                    All errors use a consistent JSON structure. Always check both the HTTP status code and the <code className="bg-gray-800 px-1 py-0.5 rounded text-indigo-300 text-xs">code</code> field in the response body.
                  </p>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">Error response format</p>
                    <CopyableCode code={JSON.stringify({
                      status: "error",
                      code: 400,
                      message: "The 'nin' field must be exactly 11 digits",
                      errors: [{ field: "nin", message: "Invalid NIN format — expected 11 digits, got 9" }]
                    }, null, 2)} />
                  </div>
                  <div className="space-y-1">
                    {[
                      { code: 200, label: "OK", desc: "Request completed successfully", color: "green" },
                      { code: 400, label: "Bad Request", desc: "Missing or invalid parameters — check the errors array for field-level detail", color: "yellow" },
                      { code: 401, label: "Unauthorized", desc: "Invalid, revoked, or missing X-API-Key header", color: "yellow" },
                      { code: 402, label: "Payment Required", desc: "Insufficient wallet balance — fund your wallet from the Billing page", color: "yellow" },
                      { code: 403, label: "Forbidden", desc: "Your IP is not on the allowlist configured for this key", color: "orange" },
                      { code: 404, label: "Not Found", desc: "NIN/BVN record not found in the source database (not charged)", color: "yellow" },
                      { code: 422, label: "Unprocessable", desc: "Verification could not be completed — source data issue", color: "orange" },
                      { code: 429, label: "Rate Limited", desc: "You've exceeded your daily call limit. Back off and retry after the Retry-After header value", color: "orange" },
                      { code: 500, label: "Server Error", desc: "Internal error on our side — retry with exponential backoff", color: "red" },
                      { code: 503, label: "Unavailable", desc: "Source provider is temporarily down — check back shortly", color: "red" },
                    ].map(err => (
                      <div key={err.code} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                        <Badge variant="outline" className={`w-12 justify-center text-xs flex-shrink-0 font-mono ${
                          err.code === 200 ? "text-green-400 border-green-800" :
                          err.code >= 500 ? "text-red-400 border-red-800" :
                          err.code === 429 || err.code === 422 || err.code === 403 ? "text-orange-400 border-orange-800" :
                          "text-yellow-400 border-yellow-800"
                        }`}>{err.code}</Badge>
                        <span className="text-xs font-medium text-gray-300 w-28 flex-shrink-0">{err.label}</span>
                        <span className="text-xs text-gray-500">{err.desc}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">Retry with exponential backoff</p>
                    <CopyableCode code={`async function verifyWithRetry(endpoint, payload, apiKey, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(\`${BASE_URL}\${endpoint}\`, {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    // Don't retry on auth or validation errors
    if (res.status === 400 || res.status === 401 || res.status === 402) {
      return res.json();
    }

    if (res.ok) return res.json();

    const retryAfter = res.headers.get("Retry-After") || Math.pow(2, attempt);
    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, Number(retryAfter) * 1000));
    }
  }
  throw new Error("Max retries exceeded");
}`} />
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* ── Rate Limits ──────────────────────────────────────────────── */}
            <SectionAnchor id="ratelimits">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-400" /> Rate Limits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-400">
                  <p>Rate limits are applied per API key on a 24-hour rolling window. Limits differ between sandbox and live environments.</p>
                  <div className="border border-gray-800 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-3 p-3 bg-gray-800/50 text-xs text-gray-400 font-medium border-b border-gray-700">
                      <span>Environment</span>
                      <span>Daily Limit</span>
                      <span>Window</span>
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
                  <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-white font-semibold">Rate limit response headers</p>
                    <p className="text-xs text-gray-400">Every API response includes these headers so you can track usage in real time:</p>
                    <CopyableCode code={`X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9874
X-RateLimit-Reset: 1712145600
Retry-After: 3600   ← only present when rate limited (429)`} />
                  </div>
                  <div className="bg-orange-950/20 border border-orange-800/40 rounded-lg p-3">
                    <p className="text-xs text-orange-300 font-semibold mb-1">When you hit a 429 rate limit</p>
                    <p className="text-xs text-orange-200">Read the <code className="bg-orange-950/40 px-1 rounded">Retry-After</code> header to know when your limit resets. Do not retry before this time — repeated 429s will not accelerate the reset. Contact support if you need a higher limit.</p>
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* ── Webhooks ─────────────────────────────────────────────────── */}
            <SectionAnchor id="webhooks">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Webhook className="w-4 h-4 text-purple-400" /> Webhooks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-400">
                  <p>
                    Webhooks let Arapoint push real-time event notifications to your server. They are essential for receiving async education verification results and for building reactive integrations.
                  </p>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-300 font-semibold">How to set up webhooks</p>
                    <ol className="space-y-1.5 text-xs text-gray-400">
                      {[
                        "Go to Webhooks & Security in your developer dashboard",
                        "Enter your webhook URL (must be HTTPS and publicly reachable)",
                        "Enable the webhook — you will receive a webhook secret",
                        "Save the secret securely — you will use it to verify incoming payloads",
                        "Use the Test button to send a sample event and confirm your endpoint responds with 200",
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-purple-700 flex items-center justify-center text-xs text-white flex-shrink-0">{i + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-300 font-semibold">Event types</p>
                    <div className="border border-gray-800 rounded-lg overflow-hidden">
                      {[
                        { event: "verification.completed", desc: "A NIN, BVN, or education verification has returned a successful result" },
                        { event: "verification.failed", desc: "A NIN, BVN, or education verification could not be completed — check the error field" },
                        { event: "employment.completed", desc: "An employment background check has finished — includes decision (PASS/REVIEW/FAIL), score, and full breakdown" },
                        { event: "employment.failed", desc: "An employment background check failed — check the error field for details" },
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
                    <p className="text-xs text-gray-400 font-medium mb-2">Webhook payload structure</p>
                    <CopyableCode code={JSON.stringify({
                      event: "verification.completed",
                      timestamp: "2026-04-03T10:00:00.000Z",
                      developerId: "dev_abc123",
                      data: {
                        requestId: "EDU-abc123def456",
                        verificationType: "education",
                        provider: "WAEC",
                        status: "completed",
                        results: [
                          { subject: "Mathematics", grade: "A1" },
                          { subject: "English Language", grade: "B2" }
                        ]
                      }
                    }, null, 2)} />
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">Verifying webhook signatures</p>
                    <p className="text-xs text-gray-400 mb-2">Every webhook request includes an <code className="bg-gray-800 px-1 rounded text-indigo-300">X-Arapoint-Signature</code> header. Always verify this before processing the payload to ensure it came from Arapoint.</p>
                    <CopyableCode code={`const crypto = require("crypto");

// Express.js example
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.headers["x-arapoint-signature"];
  const webhookSecret = process.env.ARAPOINT_WEBHOOK_SECRET;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(req.body) // raw body buffer
    .digest("hex");

  const isValid = crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex")
  );

  if (!isValid) {
    return res.status(401).send("Invalid signature");
  }

  const event = JSON.parse(req.body);
  if (event.event === "verification.completed") {
    // Handle completed verification
    console.log("Result:", event.data.results);
  }

  res.status(200).send("OK"); // Must respond 200 within 10 seconds
});`} />
                  </div>

                  <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-3">
                    <p className="text-xs text-white font-semibold mb-1">Retry schedule</p>
                    <p className="text-xs text-gray-400 mb-2">If your endpoint returns a non-200 response or times out, Arapoint automatically retries with the following schedule:</p>
                    <div className="flex gap-3 flex-wrap">
                      {["Attempt 1: Immediate", "Attempt 2: +1 minute", "Attempt 3: +5 minutes", "Attempt 4: +15 minutes", "Final: +1 hour"].map((a, i) => (
                        <div key={i} className="bg-gray-900 border border-gray-700 rounded px-2 py-1">
                          <span className="text-xs text-gray-300">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* ── IP Allowlist ─────────────────────────────────────────────── */}
            <SectionAnchor id="security">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Lock className="w-4 h-4 text-green-400" /> IP Allowlist
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-400">
                  <p>
                    For additional security, you can restrict API access to specific IP addresses or CIDR blocks. When an allowlist is configured, any request from an IP not on the list will be rejected with a <code className="bg-gray-800 px-1 py-0.5 rounded text-indigo-300 text-xs">403 Forbidden</code> response — even with a valid API key.
                  </p>
                  <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4 space-y-3">
                    <p className="text-xs text-gray-300 font-semibold">How to configure</p>
                    <ol className="space-y-1.5 text-xs text-gray-400">
                      {[
                        "Go to the Webhooks & Security page in your developer dashboard",
                        "Scroll to the IP Allowlist section",
                        "Add your server's IP address or CIDR block (e.g. 192.168.1.0/24)",
                        "Save — the allowlist is active immediately",
                        "To remove all restrictions, delete all entries from the allowlist",
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-green-800 flex items-center justify-center text-xs text-white flex-shrink-0">{i + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-lg p-3">
                    <p className="text-xs text-yellow-300 font-semibold mb-1">Important</p>
                    <p className="text-xs text-yellow-200">If you enable an IP allowlist and your server's IP changes (e.g. after a cloud provider reassignment), your API calls will be blocked. Always keep your allowlist up to date. If you are locked out, update the list from the developer dashboard (which uses JWT auth, not IP-restricted API key auth).</p>
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* ── Code Examples ─────────────────────────────────────────────── */}
            <SectionAnchor id="sdks">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Globe className="w-4 h-4 text-green-400" /> Code Examples & SDK
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 text-sm text-gray-400">
                  <p>Official SDKs are in development. Use the REST API directly or copy the helper class below as a starting point for your integration.</p>

                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">Node.js / TypeScript SDK wrapper</p>
                    <CopyableCode code={`class ArapointClient {
  private apiKey: string;
  private baseUrl = "${BASE_URL}";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request(method: string, path: string, body?: object) {
    const res = await fetch(\`\${this.baseUrl}\${path}\`, {
      method,
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || \`API error \${res.status}\`);
    return data;
  }

  // Verification
  verifyNIN(nin: string) {
    return this.request("POST", "/verify/nin", { nin });
  }
  verifyNINByPhone(phone: string) {
    return this.request("POST", "/verify/nin", { phone });
  }
  verifyBVN(bvn: string) {
    return this.request("POST", "/verify/bvn", { bvn });
  }
  verifyEducation(payload: {
    provider: string; registrationNumber: string; examYear: number; examType: string;
    cardPin: string; cardSerialNumber?: string;
    state?: string; schoolName?: string; examMonth?: string;
  }) {
    return this.request("POST", "/verify/education", payload);
  }
  getEducationResult(jobId: string) {
    return this.request("GET", \`/verify/education/result?jobId=\${jobId}\`);
  }
  verifyUnified(nin?: string, bvn?: string, education?: object) {
    return this.request("POST", "/verify/unified", { nin, bvn, education });
  }
  verifyEmployment(payload: {
    nin: string; bvn: string; fullName: string;
    dateOfBirth?: string; employmentYear?: number; level?: string;
    ssce?: { provider: string; registrationNumber: string; examYear: number; cardPin: string; cardSerialNumber?: string };
  }) {
    return this.request("POST", "/verify/employment", payload);
  }
  getEmploymentResult(requestId: string) {
    return this.request("GET", \`/verify/employment/result/\${requestId}\`);
  }
  fraudScore(nin: string, bvn: string) {
    return this.request("POST", "/verify/fraud-score", { nin, bvn });
  }
}

// Usage
const arapoint = new ArapointClient("ara_your_api_key_here");

const ninResult = await arapoint.verifyNIN("12345678901");
console.log(ninResult.data.verification.firstName); // "JOHN"

const bvnResult = await arapoint.verifyBVN("12345678901");
const risk = await arapoint.fraudScore("12345678901", "12345678901");
console.log(\`Risk level: \${risk.data.riskLevel}\`); // "low"`} />
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">Python example</p>
                    <CopyableCode code={`import requests

class ArapointClient:
    BASE_URL = "${BASE_URL}"

    def __init__(self, api_key: str):
        self.headers = {
            "X-API-Key": api_key,
            "Content-Type": "application/json"
        }

    def verify_nin(self, nin: str):
        return requests.post(
            f"{self.BASE_URL}/verify/nin",
            headers=self.headers,
            json={"nin": nin}
        ).json()

    def verify_bvn(self, bvn: str):
        return requests.post(
            f"{self.BASE_URL}/verify/bvn",
            headers=self.headers,
            json={"bvn": bvn}
        ).json()

    def fraud_score(self, nin: str, bvn: str):
        return requests.post(
            f"{self.BASE_URL}/verify/fraud-score",
            headers=self.headers,
            json={"nin": nin, "bvn": bvn}
        ).json()

# Usage
client = ArapointClient("ara_your_api_key_here")
result = client.verify_nin("12345678901")
print(result["data"]["verification"]["firstName"])`} />
                  </div>

                  <div className="grid sm:grid-cols-4 gap-3">
                    {[
                      { lang: "Node.js / TypeScript", icon: "🟩", status: "Community wrapper above" },
                      { lang: "Python", icon: "🐍", status: "Community wrapper above" },
                      { lang: "PHP", icon: "🐘", status: "Coming soon" },
                      { lang: "Go", icon: "🔵", status: "Coming soon" },
                    ].map(sdk => (
                      <div key={sdk.lang} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex items-center gap-2">
                        <span className="text-xl">{sdk.icon}</span>
                        <div>
                          <p className="text-xs text-white font-medium">{sdk.lang}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{sdk.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* ── Billing & Pricing ─────────────────────────────────────────── */}
            <SectionAnchor id="billing">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-green-400" /> Billing & Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-400">
                  <p>Arapoint uses a <span className="text-white font-medium">prepaid, pay-as-you-go</span> model. There are no monthly subscriptions or minimum commitments — you only pay for successful verifications.</p>

                  <div className="border border-gray-800 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-4 p-3 bg-gray-800/50 text-xs text-gray-400 font-medium border-b border-gray-700">
                      <span>Service</span>
                      <span>Price</span>
                      <span>Speed</span>
                      <span>Notes</span>
                    </div>
                    {[
                      { service: "NIN Verification", cost: "₦130", speed: "Instant", note: "Lookup by NIN or phone" },
                      { service: "BVN Verification", cost: "₦80", speed: "Instant", note: "CBN database" },
                      { service: "Education Verification", cost: "₦250", speed: "1–5 minutes", note: "WAEC, NECO, JAMB, NABTEB" },
                      { service: "Unified (NIN+BVN+Edu)", cost: "₦400", speed: "Mixed", note: "Bundle discount" },
                      { service: "Employment Background Check", cost: "₦350", speed: "2–3 minutes", note: "NIN + BVN + SSCE async" },
                      { service: "Fraud Risk Score", cost: "₦50", speed: "Instant", note: "NIN vs BVN comparison" },
                      { service: "Education Result Poll", cost: "Free", speed: "Instant", note: "No additional charge" },
                      { service: "Employment Result Poll", cost: "Free", speed: "Instant", note: "No additional charge" },
                      { service: "API Logs / Analytics", cost: "Free", speed: "Instant", note: "Dashboard endpoints" },
                    ].map((row, i) => (
                      <div key={row.service} className={`grid grid-cols-4 p-3 text-xs ${i < 8 ? "border-b border-gray-800" : ""}`}>
                        <span className="text-gray-300">{row.service}</span>
                        <span className={row.cost === "Free" ? "text-green-400 font-medium" : "text-yellow-400 font-medium"}>{row.cost}</span>
                        <span className="text-gray-400">{row.speed}</span>
                        <span className="text-gray-500">{row.note}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-lg p-4 space-y-2">
                      <p className="text-xs text-indigo-300 font-semibold">Billing rules</p>
                      <ul className="space-y-1.5 text-xs text-indigo-200">
                        {[
                          "Charged on HTTP 200 (sync) or HTTP 202 (async/queued) success responses",
                          "Employment check: charged when queued (202), not when result arrives",
                          "404 Not Found (record doesn't exist) — not charged",
                          "400 Bad Request (your error) — not charged",
                          "5xx Server errors — not charged",
                          "Deduction is atomic — no double-charges",
                          "Sandbox mode — no real charges ever",
                        ].map(rule => (
                          <li key={rule} className="flex items-start gap-1.5">
                            <CheckCircle className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-green-950/20 border border-green-800/40 rounded-lg p-4 space-y-2">
                      <p className="text-xs text-green-300 font-semibold">How to fund your wallet</p>
                      <ul className="space-y-1.5 text-xs text-green-200">
                        {[
                          "Go to Billing in your developer dashboard",
                          "Click Fund Wallet and enter an amount (min ₦100)",
                          "You are redirected to Paystack checkout",
                          "Pay via card, bank transfer, or USSD",
                          "Wallet is credited instantly after payment",
                          "Transaction history is available in the Billing page",
                        ].map(step => (
                          <li key={step} className="flex items-start gap-1.5">
                            <ArrowRight className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-3">
                    <p className="text-xs text-gray-300 font-semibold mb-1">Check your balance programmatically</p>
                    <CopyableCode code={`curl -X GET "${BASE_URL}/profile" \\
  -H "Authorization: Bearer your_jwt_token_here"

# Response includes:
# "walletBalance": 4500.00`} />
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

          </div>
        </div>
      </div>
    </DevLayout>
  );
}
