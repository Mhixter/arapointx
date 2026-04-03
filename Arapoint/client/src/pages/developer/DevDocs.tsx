import { useState } from "react";
import { DevLayout } from "./DevLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, ChevronDown, ChevronRight, Book, Key, Zap, Globe, Shield, AlertTriangle, Code2, Webhook, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = "https://arapoint.com.ng/api/v1/developer";
const DEV_PORTAL = "https://developer.arapoint.com.ng";

const endpoints = [
  {
    method: "POST",
    path: "/verify/nin",
    title: "NIN Verification",
    description: "Verify a National Identification Number or look up by phone number.",
    price: 130,
    request: { nin: "12345678901" },
    response: {
      status: "success",
      code: 200,
      message: "NIN verification completed",
      data: {
        verification: {
          firstName: "JOHN",
          lastName: "DOE",
          dateOfBirth: "1990-01-15",
          gender: "Male",
          phone: "08012345678",
          nin: "12345678901"
        }
      }
    },
    params: [
      { name: "nin", type: "string", required: false, desc: "11-digit National ID Number" },
      { name: "phone", type: "string", required: false, desc: "Phone number (if NIN not provided)" },
    ]
  },
  {
    method: "POST",
    path: "/verify/bvn",
    title: "BVN Verification",
    description: "Verify a Bank Verification Number and retrieve associated identity data.",
    price: 80,
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
          phone: "08012345678"
        }
      }
    },
    params: [
      { name: "bvn", type: "string", required: true, desc: "11-digit Bank Verification Number" },
    ]
  },
  {
    method: "POST",
    path: "/verify/cac",
    title: "CAC Business Lookup",
    description: "Verify CAC registration status and retrieve business details.",
    price: 150,
    request: { rcNumber: "RC1234567" },
    response: {
      status: "success",
      code: 200,
      message: "CAC verification completed",
      data: {
        verification: {
          companyName: "ACME NIGERIA LIMITED",
          rcNumber: "RC1234567",
          status: "ACTIVE",
          dateOfRegistration: "2015-03-22",
          companyType: "Private Limited Company"
        }
      }
    },
    params: [
      { name: "rcNumber", type: "string", required: true, desc: "CAC Registration number (e.g. RC1234567)" },
    ]
  },
  {
    method: "POST",
    path: "/verify/education",
    title: "Education Verification",
    description: "Verify academic results from WAEC, NECO, NABTEB, NBAIS, or JAMB.",
    price: 250,
    request: { provider: "waec", examYear: 2023, registrationNumber: "4190101001", examType: "school_candidate" },
    response: {
      status: "success",
      code: 200,
      message: "Education verification request accepted",
      data: {
        provider: "WAEC",
        examYear: 2023,
        registrationNumber: "4190101001",
        status: "processing",
        requestId: "EDU-abc123def456"
      }
    },
    params: [
      { name: "provider", type: "string", required: true, desc: "One of: waec, neco, nabteb, nbais, jamb" },
      { name: "registrationNumber", type: "string", required: true, desc: "Candidate registration number" },
      { name: "examYear", type: "number", required: true, desc: "Exam year (e.g. 2023)" },
      { name: "examType", type: "string", required: false, desc: "For NECO: school_candidate, gce (optional)" },
    ]
  },
  {
    method: "POST",
    path: "/verify/unified",
    title: "Unified Verification",
    description: "Verify NIN, BVN, and education in a single API call.",
    price: 400,
    request: { nin: "12345678901", bvn: "12345678901", education: true },
    response: {
      status: "success",
      code: 200,
      message: "Unified verification completed",
      data: {
        status: "success",
        requestId: "UNI-abc123def456",
        nin: { firstName: "JOHN", lastName: "DOE" },
        bvn: { firstName: "JOHN", bvn: "12345678901" },
        education: { status: "processing" }
      }
    },
    params: [
      { name: "nin", type: "string", required: false, desc: "NIN to verify (optional)" },
      { name: "bvn", type: "string", required: false, desc: "BVN to verify (optional)" },
      { name: "education", type: "boolean", required: false, desc: "Set true to include education check" },
    ]
  },
  {
    method: "GET",
    path: "/wallet/balance",
    title: "Wallet Balance",
    description: "Retrieve the current wallet balance for your developer account.",
    price: 0,
    request: {},
    response: {
      status: "success",
      code: 200,
      data: { balance: 4500.00, currency: "NGN" }
    },
    params: []
  },
  {
    method: "GET",
    path: "/logs",
    title: "API Logs",
    description: "Retrieve recent API call history for your account.",
    price: 0,
    request: {},
    response: {
      status: "success",
      code: 200,
      data: {
        logs: [
          { id: "log_001", endpoint: "/verify/nin", status: 200, timestamp: "2026-04-03T10:00:00Z", cost: 130 }
        ],
        total: 1
      }
    },
    params: [
      { name: "page", type: "number", required: false, desc: "Page number (default: 1)" },
      { name: "limit", type: "number", required: false, desc: "Results per page (default: 20, max: 100)" },
    ]
  },
];

const docSections = [
  { id: "overview", label: "Overview", icon: Book },
  { id: "quickstart", label: "Quick Start", icon: Zap },
  { id: "authentication", label: "Authentication", icon: Key },
  { id: "endpoints", label: "API Endpoints", icon: Code2 },
  { id: "errors", label: "Error Handling", icon: AlertTriangle },
  { id: "ratelimits", label: "Rate Limits", icon: Shield },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "sdks", label: "SDKs & Libraries", icon: Globe },
  { id: "billing", label: "Billing & Pricing", icon: CreditCard },
];

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
      <pre className="bg-gray-800 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto leading-relaxed">{code}</pre>
      <button onClick={copy} className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 transition-colors">
        {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

function SectionAnchor({ id, children }: { id: string; children: React.ReactNode }) {
  return <div id={id} className="scroll-mt-6">{children}</div>;
}

function CollapsibleCard({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="bg-gray-900 border-gray-800">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left">
        <span className="text-white text-sm font-semibold">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <CardContent className="pt-0 pb-4">{children}</CardContent>}
    </Card>
  );
}

export default function DevDocs() {
  const [activeEndpoint, setActiveEndpoint] = useState(endpoints[0].path);
  const [activeSection, setActiveSection] = useState("overview");
  const endpoint = endpoints.find(e => e.path === activeEndpoint) || endpoints[0];

  const curlExample = endpoint.method === "GET"
    ? `curl -X GET "${BASE_URL}${endpoint.path}" \\
  -H "X-API-Key: ara_your_api_key_here"`
    : `curl -X ${endpoint.method} "${BASE_URL}${endpoint.path}" \\
  -H "X-API-Key: ara_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(endpoint.request, null, 2)}'`;

  const jsExample = endpoint.method === "GET"
    ? `const response = await fetch("${BASE_URL}${endpoint.path}", {
  method: "GET",
  headers: {
    "X-API-Key": "ara_your_api_key_here"
  }
});
const data = await response.json();
console.log(data);`
    : `const response = await fetch("${BASE_URL}${endpoint.path}", {
  method: "${endpoint.method}",
  headers: {
    "X-API-Key": "ara_your_api_key_here",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${JSON.stringify(endpoint.request, null, 4)})
});
const data = await response.json();
console.log(data);`;

  const pythonExample = endpoint.method === "GET"
    ? `import requests

response = requests.get(
    "${BASE_URL}${endpoint.path}",
    headers={"X-API-Key": "ara_your_api_key_here"}
)
print(response.json())`
    : `import requests

response = requests.post(
    "${BASE_URL}${endpoint.path}",
    headers={
        "X-API-Key": "ara_your_api_key_here",
        "Content-Type": "application/json"
    },
    json=${JSON.stringify(endpoint.request, null, 4).replace(/:/g, ":").replace(/"([^"]+)":/g, '"$1":')}
)
print(response.json())`;

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <DevLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">API Documentation</h1>
          <p className="text-sm text-gray-400 mt-0.5">Complete reference for the Arapoint Developer API — <span className="text-indigo-400 font-mono">{DEV_PORTAL}</span></p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Sidebar nav */}
          <div className="xl:col-span-1 space-y-1">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3 px-2">Documentation</p>
            {docSections.map(s => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all ${activeSection === s.id ? "bg-indigo-950/60 border border-indigo-700 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
              >
                <s.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className="xl:col-span-4 space-y-8">

            {/* Overview */}
            <SectionAnchor id="overview">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Book className="w-4 h-4 text-indigo-400" /> Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-400">
                  <p>
                    The <span className="text-white font-medium">Arapoint Developer API</span> gives you programmatic access to Nigeria's most comprehensive identity and verification infrastructure. Verify NINs, BVNs, CAC registrations, and academic results in real-time — all through a single RESTful interface.
                  </p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      { label: "Base URL", value: BASE_URL, mono: true },
                      { label: "Protocol", value: "HTTPS only", mono: false },
                      { label: "Format", value: "JSON (application/json)", mono: false },
                    ].map(item => (
                      <div key={item.label} className="bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                        <p className={`text-xs text-white break-all ${item.mono ? "font-mono" : ""}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-indigo-950/40 border border-indigo-800 rounded-lg p-4 space-y-2">
                    <p className="text-xs text-indigo-300 font-semibold">What you can do with the API</p>
                    <ul className="space-y-1.5 text-xs text-indigo-200">
                      {[
                        "Verify NIN and BVN identity records directly from source databases",
                        "Look up business registration details from the CAC registry",
                        "Validate WAEC, NECO, NABTEB, and JAMB academic results",
                        "Run unified multi-check verifications in a single request",
                        "Query your API call logs and wallet balance programmatically",
                      ].map(item => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* Quick Start */}
            <SectionAnchor id="quickstart">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" /> Quick Start
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 text-sm text-gray-400">
                  <p>Get from zero to your first successful API call in under 5 minutes.</p>

                  <div className="space-y-4">
                    {[
                      {
                        step: "1",
                        title: "Create a developer account",
                        desc: `Sign up at ${DEV_PORTAL}/register — it's free with no credit card required.`,
                      },
                      {
                        step: "2",
                        title: "Generate an API key",
                        desc: "Go to API Keys in your developer dashboard and click Generate New Key. Copy it — it's only shown once.",
                      },
                      {
                        step: "3",
                        title: "Fund your wallet",
                        desc: "Add credits via the Billing page. All verification calls deduct from your prepaid balance.",
                      },
                      {
                        step: "4",
                        title: "Make your first call",
                        desc: "Use cURL, any HTTP client, or our SDKs. Replace ara_your_api_key_here with your actual key.",
                      },
                    ].map(item => (
                      <div key={item.step} className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">{item.step}</div>
                        <div>
                          <p className="text-white font-medium text-sm mb-1">{item.title}</p>
                          <p className="text-xs text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">First API Call — NIN Verification</p>
                    <CopyableCode code={`curl -X POST "${BASE_URL}/verify/nin" \\
  -H "X-API-Key: ara_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"nin": "12345678901"}'`} />
                  </div>

                  <div className="bg-green-950/30 border border-green-800 rounded-lg p-3">
                    <p className="text-xs text-green-300 font-semibold mb-1">Expected Response</p>
                    <CopyableCode code={JSON.stringify({ status: "success", code: 200, data: { verification: { firstName: "JOHN", lastName: "DOE", dateOfBirth: "1990-01-15", nin: "12345678901" } } }, null, 2)} />
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* Authentication */}
            <SectionAnchor id="authentication">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Key className="w-4 h-4 text-indigo-400" /> Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-400">
                  <p>
                    Every request to the Arapoint API must include your API key. Pass it in the <code className="bg-gray-800 px-1.5 py-0.5 rounded text-indigo-300 text-xs">X-API-Key</code> HTTP header.
                  </p>
                  <CopyableCode code={`X-API-Key: ara_your_api_key_here`} />
                  <div className="space-y-3">
                    <div className="bg-yellow-950/30 border border-yellow-800 rounded-lg p-3">
                      <p className="text-xs text-yellow-300 font-semibold mb-1">Security Notice</p>
                      <p className="text-xs text-yellow-200">Never expose your API key in client-side code or public repositories. Always make API calls from your backend server. If you suspect a key has been compromised, revoke it immediately from the API Keys page.</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                      <p className="text-xs text-white font-semibold">API Key format</p>
                      <p className="text-xs">Keys follow the pattern <code className="bg-gray-700 px-1 py-0.5 rounded text-indigo-300">ara_</code> followed by a 40-character alphanumeric string. Example: <code className="bg-gray-700 px-1 py-0.5 rounded text-indigo-300">ara_sk_live_AbCdEf1234...</code></p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">Full authenticated request example</p>
                    <CopyableCode code={`curl -X POST "${BASE_URL}/verify/bvn" \\
  -H "X-API-Key: ara_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -d '{"bvn": "12345678901"}'`} />
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* Endpoints */}
            <SectionAnchor id="endpoints">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-white text-base font-semibold">API Endpoints</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Select Endpoint</p>
                    {endpoints.map(ep => (
                      <button
                        key={ep.path}
                        onClick={() => setActiveEndpoint(ep.path)}
                        className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${activeEndpoint === ep.path ? "bg-indigo-950/60 border-indigo-700 text-white" : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300"}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-xs ${ep.method === "GET" ? "text-blue-400 border-blue-800 bg-blue-950/30" : "text-green-400 border-green-800 bg-green-950/30"}`}>
                            {ep.method}
                          </Badge>
                        </div>
                        <p className="font-medium text-xs">{ep.title}</p>
                        {ep.price > 0 && <p className="text-xs text-gray-500 mt-0.5">₦{ep.price}/req</p>}
                        {ep.price === 0 && <p className="text-xs text-green-600 mt-0.5">Free</p>}
                      </button>
                    ))}
                  </div>

                  <div className="lg:col-span-3 space-y-4">
                    <Card className="bg-gray-900 border-gray-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={`${endpoint.method === "GET" ? "text-blue-400 border-blue-800 bg-blue-950/30" : "text-green-400 border-green-800 bg-green-950/30"}`}>{endpoint.method}</Badge>
                              <code className="text-sm text-gray-200 font-mono">{endpoint.path}</code>
                            </div>
                            <CardTitle className="text-white text-base">{endpoint.title}</CardTitle>
                          </div>
                          {endpoint.price > 0 ? (
                            <Badge variant="outline" className="text-yellow-400 border-yellow-800 bg-yellow-950/30 flex-shrink-0">
                              ₦{endpoint.price}/request
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-400 border-green-800 bg-green-950/30 flex-shrink-0">Free</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{endpoint.description}</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {endpoint.params.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-400 font-medium mb-2">Request Parameters</p>
                            <div className="border border-gray-800 rounded-lg overflow-hidden">
                              {endpoint.params.map((param, i) => (
                                <div key={param.name} className={`flex items-start gap-3 p-3 ${i < endpoint.params.length - 1 ? "border-b border-gray-800" : ""}`}>
                                  <code className="text-xs text-indigo-300 font-mono w-32 flex-shrink-0">{param.name}</code>
                                  <code className="text-xs text-gray-500 w-16 flex-shrink-0">{param.type}</code>
                                  <Badge variant={param.required ? "default" : "secondary"}
                                    className={`text-xs flex-shrink-0 ${param.required ? "bg-red-900/60 text-red-300" : "bg-gray-800 text-gray-400"}`}>
                                    {param.required ? "required" : "optional"}
                                  </Badge>
                                  <p className="text-xs text-gray-400">{param.desc}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-xs text-gray-400 font-medium mb-2">cURL Example</p>
                          <CopyableCode code={curlExample} />
                        </div>

                        <div>
                          <p className="text-xs text-gray-400 font-medium mb-2">JavaScript / Node.js</p>
                          <CopyableCode code={jsExample} />
                        </div>

                        <div>
                          <p className="text-xs text-gray-400 font-medium mb-2">Python</p>
                          <CopyableCode code={pythonExample} />
                        </div>

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

            {/* Error Handling */}
            <SectionAnchor id="errors">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" /> Error Handling
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-400">
                    All errors follow a consistent JSON structure. Always check the HTTP status code and the <code className="bg-gray-800 px-1 py-0.5 rounded text-indigo-300 text-xs">code</code> field in the response body.
                  </p>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">Error Response Format</p>
                    <CopyableCode code={JSON.stringify({ status: "error", code: 400, message: "The 'nin' field must be exactly 11 digits", errors: [{ field: "nin", message: "Invalid NIN format" }] }, null, 2)} />
                  </div>
                  <div className="space-y-2">
                    {[
                      { code: 200, label: "Success", desc: "Request completed successfully", color: "green" },
                      { code: 400, label: "Bad Request", desc: "Missing or invalid parameters — check the errors array for details", color: "yellow" },
                      { code: 401, label: "Unauthorized", desc: "Invalid, expired, or missing X-API-Key header", color: "yellow" },
                      { code: 402, label: "Payment Required", desc: "Insufficient wallet balance — top up from the Billing page", color: "yellow" },
                      { code: 404, label: "Not Found", desc: "Record not found in the source database", color: "yellow" },
                      { code: 422, label: "Unprocessable", desc: "The verification could not be completed due to source data issues", color: "orange" },
                      { code: 429, label: "Too Many Requests", desc: "Rate limit exceeded — back off and retry after the Retry-After header value", color: "orange" },
                      { code: 500, label: "Server Error", desc: "Internal error on our side — retry with exponential backoff", color: "red" },
                      { code: 503, label: "Service Unavailable", desc: "Source provider is temporarily down — check status page", color: "red" },
                    ].map(err => (
                      <div key={err.code} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                        <Badge variant="outline"
                          className={`w-12 justify-center text-xs flex-shrink-0 ${err.code === 200 ? "text-green-400 border-green-800" : err.code >= 500 ? "text-red-400 border-red-800" : err.code === 429 || err.code === 422 ? "text-orange-400 border-orange-800" : "text-yellow-400 border-yellow-800"}`}>
                          {err.code}
                        </Badge>
                        <span className="text-xs font-medium text-gray-300 w-28 flex-shrink-0">{err.label}</span>
                        <span className="text-xs text-gray-500">{err.desc}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">Recommended retry strategy</p>
                    <CopyableCode code={`async function verifyWithRetry(payload, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch("${BASE_URL}/verify/nin", {
      method: "POST",
      headers: {
        "X-API-Key": "ara_your_api_key_here",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.status !== 429 && res.status !== 503) {
      return res.json();
    }

    const retryAfter = res.headers.get("Retry-After") || attempt * 2;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  }
  throw new Error("Max retries exceeded");
}`} />
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* Rate Limits */}
            <SectionAnchor id="ratelimits">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-400" /> Rate Limits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-400">
                  <p>Rate limits protect the platform and ensure fair usage. All limits are applied per API key.</p>
                  <div className="border border-gray-800 rounded-lg overflow-hidden">
                    {[
                      { plan: "Standard (default)", rpm: "60 req/min", daily: "5,000 req/day", burst: "10 req/sec" },
                      { plan: "Growth", rpm: "300 req/min", daily: "50,000 req/day", burst: "30 req/sec" },
                      { plan: "Enterprise", rpm: "Unlimited", daily: "Custom", burst: "Custom" },
                    ].map((row, i) => (
                      <div key={row.plan} className={`grid grid-cols-4 gap-3 p-3 text-xs ${i < 2 ? "border-b border-gray-800" : ""}`}>
                        <span className="text-white font-medium">{row.plan}</span>
                        <span className="text-gray-400">{row.rpm}</span>
                        <span className="text-gray-400">{row.daily}</span>
                        <span className="text-gray-400">{row.burst}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs">When rate limited, the response will include a <code className="bg-gray-800 px-1 py-0.5 rounded text-indigo-300">Retry-After</code> header indicating how many seconds to wait before retrying. Contact support to upgrade your plan.</p>
                  <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-white font-semibold">Rate limit response headers</p>
                    <CopyableCode code={`X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1712145600
Retry-After: 15`} />
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* Webhooks */}
            <SectionAnchor id="webhooks">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Webhook className="w-4 h-4 text-purple-400" /> Webhooks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-400">
                  <p>
                    Asynchronous verifications (such as education results) send a webhook notification to your configured URL when the result is ready. Configure your webhook URL in the Account settings page.
                  </p>
                  <div className="space-y-3">
                    <p className="text-xs text-gray-300 font-semibold">Supported events</p>
                    {[
                      { event: "verification.completed", desc: "A verification has returned a final result" },
                      { event: "verification.failed", desc: "A verification could not be completed" },
                      { event: "wallet.low_balance", desc: "Your wallet balance drops below ₦500" },
                    ].map(ev => (
                      <div key={ev.event} className="flex items-start gap-3 py-2 border-b border-gray-800 last:border-0">
                        <code className="text-xs text-indigo-300 font-mono flex-shrink-0 w-48">{ev.event}</code>
                        <span className="text-xs text-gray-400">{ev.desc}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">Webhook payload example</p>
                    <CopyableCode code={JSON.stringify({
                      event: "verification.completed",
                      timestamp: "2026-04-03T10:00:00Z",
                      data: {
                        requestId: "EDU-abc123def456",
                        type: "education",
                        provider: "WAEC",
                        status: "completed",
                        result: { subject: "Mathematics", grade: "A1" }
                      }
                    }, null, 2)} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">Verifying webhook signatures</p>
                    <CopyableCode code={`const crypto = require("crypto");

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}`} />
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* SDKs */}
            <SectionAnchor id="sdks">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Globe className="w-4 h-4 text-green-400" /> SDKs & Libraries
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-400">
                  <p>Official SDKs are currently in development. In the meantime, you can use the REST API directly with any HTTP client or use the code snippets below as a starting point.</p>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { lang: "Node.js / TypeScript", status: "Coming soon", icon: "🟩" },
                      { lang: "Python", status: "Coming soon", icon: "🐍" },
                      { lang: "PHP", status: "Coming soon", icon: "🐘" },
                      { lang: "Go", status: "Coming soon", icon: "🔵" },
                    ].map(sdk => (
                      <div key={sdk.lang} className="bg-gray-800 rounded-lg p-4 flex items-center gap-3">
                        <span className="text-2xl">{sdk.icon}</span>
                        <div>
                          <p className="text-xs text-white font-medium">{sdk.lang}</p>
                          <Badge variant="outline" className="text-xs text-gray-500 border-gray-700 mt-1">{sdk.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">Minimal Node.js helper class</p>
                    <CopyableCode code={`class ArapointClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "${BASE_URL}";
  }

  async request(method, path, body = null) {
    const res = await fetch(\`\${this.baseUrl}\${path}\`, {
      method,
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error(\`API Error \${res.status}\`);
    return res.json();
  }

  verifyNIN(nin) { return this.request("POST", "/verify/nin", { nin }); }
  verifyBVN(bvn) { return this.request("POST", "/verify/bvn", { bvn }); }
  verifyCAC(rcNumber) { return this.request("POST", "/verify/cac", { rcNumber }); }
  getBalance() { return this.request("GET", "/wallet/balance"); }
}

// Usage
const arapoint = new ArapointClient("ara_your_api_key_here");
const result = await arapoint.verifyNIN("12345678901");
console.log(result.data.verification.firstName);`} />
                  </div>
                </CardContent>
              </Card>
            </SectionAnchor>

            {/* Billing */}
            <SectionAnchor id="billing">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-green-400" /> Billing & Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-400">
                  <p>Arapoint uses a prepaid, pay-as-you-go model. There are no monthly fees or subscriptions — you only pay for successful verifications.</p>

                  <div className="border border-gray-800 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-3 gap-3 p-3 bg-gray-800 text-xs text-gray-400 font-medium border-b border-gray-700">
                      <span>Service</span>
                      <span>Cost per Request</span>
                      <span>Notes</span>
                    </div>
                    {[
                      { service: "NIN Verification", cost: "₦130", note: "Instant result" },
                      { service: "BVN Verification", cost: "₦80", note: "Instant result" },
                      { service: "CAC Lookup", cost: "₦150", note: "Instant result" },
                      { service: "Education Verification", cost: "₦250", note: "Async — webhook on completion" },
                      { service: "Unified Verification", cost: "₦400", note: "NIN + BVN + Education" },
                      { service: "Wallet Balance / Logs", cost: "Free", note: "No deduction" },
                    ].map((row, i) => (
                      <div key={row.service} className={`grid grid-cols-3 gap-3 p-3 text-xs ${i < 5 ? "border-b border-gray-800" : ""}`}>
                        <span className="text-gray-300">{row.service}</span>
                        <span className={row.cost === "Free" ? "text-green-400" : "text-yellow-400"}>{row.cost}</span>
                        <span className="text-gray-500">{row.note}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-indigo-950/40 border border-indigo-800 rounded-lg p-4 space-y-2">
                    <p className="text-xs text-indigo-300 font-semibold">Billing rules</p>
                    <ul className="space-y-1.5 text-xs text-indigo-200">
                      {[
                        "Charges are deducted only on successful verifications (HTTP 200 responses)",
                        "Failed lookups (404 Not Found) are not charged",
                        "Minimum wallet top-up is ₦1,000 via bank transfer or card",
                        "Volume discounts are available for accounts exceeding 10,000 requests/month — contact sales",
                        "Sandbox mode is always free and does not deduct wallet credits",
                      ].map(item => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <a href={`${DEV_PORTAL}/billing`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs">
                        Fund Wallet
                      </Button>
                    </a>
                    <a href={`${DEV_PORTAL}/logs`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300">
                        View Usage Logs
                      </Button>
                    </a>
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
