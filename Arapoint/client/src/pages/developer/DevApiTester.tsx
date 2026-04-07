import { useState, useRef, useEffect } from "react";
import { DevLayout } from "./DevLayout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Play, Copy, ChevronDown, ChevronRight, Clock, CheckCircle, XCircle,
  Key, Send, Zap, Shield, Globe, RefreshCw, Terminal, Code2
} from "lucide-react";

const C = {
  bg: "#0B0F1A", card: "#111827", cardAlt: "#1a2236", border: "#1e293b",
  accent: "#22c55e", accentDim: "#166534", text: "#e2e8f0", muted: "#94a3b8",
  error: "#ef4444", warn: "#f59e0b", blue: "#3b82f6",
};

type EndpointDef = {
  id: string; method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string; label: string; category: string; auth: "apikey" | "jwt" | "none";
  description: string; price?: number;
  bodyFields?: { name: string; type: string; required?: boolean; placeholder?: string; options?: string[] }[];
  queryFields?: { name: string; type: string; placeholder?: string }[];
  pathParams?: { name: string; placeholder?: string }[];
};

const ENDPOINTS: EndpointDef[] = [
  {
    id: "nin", method: "POST", path: "/verify/nin", label: "Verify NIN",
    category: "Verification", auth: "apikey", price: 130,
    description: "Verify a Nigerian National Identification Number (11 digits).",
    bodyFields: [
      { name: "nin", type: "text", required: true, placeholder: "12345678901" },
      { name: "phone", type: "text", placeholder: "+2348012345678" },
    ],
  },
  {
    id: "bvn", method: "POST", path: "/verify/bvn", label: "Verify BVN",
    category: "Verification", auth: "apikey", price: 80,
    description: "Verify a Bank Verification Number (11 digits).",
    bodyFields: [
      { name: "bvn", type: "text", required: true, placeholder: "22345678901" },
    ],
  },
  {
    id: "education", method: "POST", path: "/verify/education", label: "Verify Education",
    category: "Verification", auth: "apikey", price: 250,
    description: "Verify education credentials (WAEC, NECO, NABTEB, NBAIS, JAMB).",
    bodyFields: [
      { name: "provider", type: "select", required: true, options: ["waec", "neco", "nabteb", "nbais", "jamb"] },
      { name: "examYear", type: "text", required: true, placeholder: "2020" },
      { name: "examType", type: "text", required: true, placeholder: "WASSCE" },
      { name: "registrationNumber", type: "text", required: true, placeholder: "4250101001" },
      { name: "cardSerialNumber", type: "text", placeholder: "NOV/2020/123456" },
      { name: "cardPin", type: "text", placeholder: "123456789012" },
      { name: "state", type: "text", placeholder: "Lagos" },
      { name: "schoolName", type: "text", placeholder: "Example High School" },
    ],
  },
  {
    id: "education-result", method: "GET", path: "/verify/education/result", label: "Education Result",
    category: "Verification", auth: "apikey",
    description: "Retrieve async education verification result by job ID.",
    queryFields: [
      { name: "jobId", type: "text", placeholder: "job-uuid-here" },
    ],
  },
  {
    id: "employment", method: "POST", path: "/verify/employment", label: "Verify Employment",
    category: "Verification", auth: "apikey", price: 350,
    description: "Submit employment background check (async). Requires NIN, BVN, and candidate consent.",
    bodyFields: [
      { name: "nin", type: "text", required: true, placeholder: "12345678901" },
      { name: "bvn", type: "text", required: true, placeholder: "22345678901" },
      { name: "consent", type: "select", required: true, options: ["true", "false"] },
      { name: "level", type: "select", options: ["standard", "higher"] },
      { name: "employment_year", type: "text", placeholder: "2023" },
      { name: "ssce", type: "text", placeholder: "WAEC registration number (optional)" },
    ],
  },
  {
    id: "employment-result", method: "GET", path: "/verify/employment/result/{requestId}", label: "Employment Result",
    category: "Verification", auth: "apikey",
    description: "Check status / result of an employment verification request.",
    pathParams: [{ name: "requestId", placeholder: "req_abc123" }],
  },
  {
    id: "unified", method: "POST", path: "/verify/unified", label: "Unified Verification",
    category: "Verification", auth: "apikey", price: 400,
    description: "Enterprise endpoint — run identity, education, employment, and fraud checks in one call.",
    bodyFields: [
      { name: "body", type: "json", required: true, placeholder: JSON.stringify({
        reference: "ref-001",
        callbackUrl: "https://example.com/webhook",
        identity: { nin: "12345678901", bvn: "22345678901", fullName: "John Doe" },
        checks: { education: [{ type: "waec", examYear: "2020", examNumber: "4250101001" }], fraudCheck: true }
      }, null, 2) },
    ],
  },
  {
    id: "unified-result", method: "GET", path: "/verify/unified/result/{requestId}", label: "Unified Result",
    category: "Verification", auth: "apikey",
    description: "Retrieve result of a unified verification request.",
    pathParams: [{ name: "requestId", placeholder: "req_abc123" }],
  },
  {
    id: "fraud", method: "POST", path: "/verify/fraud-score", label: "Fraud Score",
    category: "Verification", auth: "apikey", price: 50,
    description: "Cross-reference NIN and BVN to generate a fraud risk score.",
    bodyFields: [
      { name: "nin", type: "text", required: true, placeholder: "12345678901" },
      { name: "bvn", type: "text", required: true, placeholder: "22345678901" },
    ],
  },
  {
    id: "pricing", method: "GET", path: "/pricing", label: "Get Pricing",
    category: "Info", auth: "none",
    description: "Retrieve current pricing for all API endpoints.",
  },
  {
    id: "profile", method: "GET", path: "/profile", label: "Get Profile",
    category: "Account", auth: "jwt",
    description: "Retrieve your developer account details, wallet balance, and settings.",
  },
  {
    id: "update-profile", method: "PUT", path: "/profile", label: "Update Profile",
    category: "Account", auth: "jwt",
    description: "Update your developer profile (name, company).",
    bodyFields: [
      { name: "name", type: "text", placeholder: "John Doe" },
      { name: "company", type: "text", placeholder: "Acme Corp" },
    ],
  },
  {
    id: "change-password", method: "PUT", path: "/profile/password", label: "Change Password",
    category: "Account", auth: "jwt",
    description: "Change your account password.",
    bodyFields: [
      { name: "currentPassword", type: "text", required: true, placeholder: "old-password" },
      { name: "newPassword", type: "text", required: true, placeholder: "new-password" },
    ],
  },
  {
    id: "dashboard-stats", method: "GET", path: "/dashboard/stats", label: "Dashboard Stats",
    category: "Account", auth: "jwt",
    description: "Get overview stats: API calls today, wallet balance, recent activity.",
    queryFields: [{ name: "environment", type: "text", placeholder: "sandbox" }],
  },
  {
    id: "switch-mode", method: "PATCH", path: "/mode", label: "Switch Environment",
    category: "Account", auth: "jwt",
    description: "Toggle between sandbox and live mode.",
    bodyFields: [
      { name: "mode", type: "select", required: true, options: ["sandbox", "live"] },
    ],
  },
  {
    id: "api-keys-list", method: "GET", path: "/api-keys", label: "List API Keys",
    category: "API Keys", auth: "jwt",
    description: "List all your API keys.",
  },
  {
    id: "api-keys-create", method: "POST", path: "/api-keys", label: "Create API Key",
    category: "API Keys", auth: "jwt",
    description: "Generate a new API key for sandbox or live environment.",
    bodyFields: [
      { name: "keyName", type: "text", required: true, placeholder: "my-production-key" },
      { name: "environment", type: "select", required: true, options: ["sandbox", "live"] },
    ],
  },
  {
    id: "api-keys-delete", method: "DELETE", path: "/api-keys/{id}", label: "Delete API Key",
    category: "API Keys", auth: "jwt",
    description: "Revoke and delete an API key.",
    pathParams: [{ name: "id", placeholder: "key-uuid" }],
  },
  {
    id: "transactions", method: "GET", path: "/transactions", label: "Transactions",
    category: "Billing", auth: "jwt",
    description: "List wallet transactions (funding, API charges, refunds).",
    queryFields: [
      { name: "page", type: "text", placeholder: "1" },
      { name: "limit", type: "text", placeholder: "20" },
      { name: "environment", type: "text", placeholder: "sandbox" },
    ],
  },
  {
    id: "billing-status", method: "GET", path: "/billing/gateway-status", label: "Payment Gateway Status",
    category: "Billing", auth: "jwt",
    description: "Check if the payment gateway (Paystack) is configured and available.",
  },
  {
    id: "billing-initiate", method: "POST", path: "/billing/initiate", label: "Initiate Funding",
    category: "Billing", auth: "jwt",
    description: "Start a wallet funding session via Paystack.",
    bodyFields: [
      { name: "amount", type: "text", required: true, placeholder: "5000" },
    ],
  },
  {
    id: "billing-verify", method: "GET", path: "/billing/verify/{reference}", label: "Verify Payment",
    category: "Billing", auth: "jwt",
    description: "Verify a Paystack payment by reference.",
    pathParams: [{ name: "reference", placeholder: "PSK_ref_abc123" }],
  },
  {
    id: "webhook-get", method: "GET", path: "/webhook", label: "Get Webhook Config",
    category: "Webhooks", auth: "jwt",
    description: "Get your current webhook URL and secret.",
  },
  {
    id: "webhook-set", method: "POST", path: "/webhook", label: "Set Webhook",
    category: "Webhooks", auth: "jwt",
    description: "Configure or update your webhook URL.",
    bodyFields: [
      { name: "webhookUrl", type: "text", required: true, placeholder: "https://example.com/arapoint-webhook" },
      { name: "enabled", type: "select", required: true, options: ["true", "false"] },
    ],
  },
  {
    id: "webhook-delete", method: "DELETE", path: "/webhook", label: "Delete Webhook",
    category: "Webhooks", auth: "jwt",
    description: "Remove your webhook configuration.",
  },
  {
    id: "webhook-logs", method: "GET", path: "/webhook/logs", label: "Webhook Logs",
    category: "Webhooks", auth: "jwt",
    description: "View recent webhook delivery attempts and their status.",
    queryFields: [
      { name: "page", type: "text", placeholder: "1" },
      { name: "limit", type: "text", placeholder: "20" },
    ],
  },
  {
    id: "webhook-test", method: "POST", path: "/webhook/test", label: "Test Webhook",
    category: "Webhooks", auth: "jwt",
    description: "Send a test event to your configured webhook endpoint.",
  },
  {
    id: "logs", method: "GET", path: "/logs", label: "API Logs",
    category: "Analytics", auth: "jwt",
    description: "Retrieve paginated API call logs.",
    queryFields: [
      { name: "page", type: "text", placeholder: "1" },
      { name: "limit", type: "text", placeholder: "20" },
      { name: "environment", type: "text", placeholder: "sandbox" },
    ],
  },
  {
    id: "analytics", method: "GET", path: "/analytics", label: "Analytics",
    category: "Analytics", auth: "jwt",
    description: "Get usage analytics: total calls, success/error rates, daily breakdown, top endpoints.",
    queryFields: [
      { name: "days", type: "text", placeholder: "30" },
      { name: "environment", type: "text", placeholder: "sandbox" },
    ],
  },
  {
    id: "ip-list", method: "GET", path: "/security/ip-allowlist", label: "List IP Allowlist",
    category: "Security", auth: "jwt",
    description: "Get your IP allowlist for API key restrictions.",
  },
  {
    id: "ip-add", method: "POST", path: "/security/ip-allowlist", label: "Add IP",
    category: "Security", auth: "jwt",
    description: "Add an IP address or CIDR range to your allowlist.",
    bodyFields: [
      { name: "ip", type: "text", required: true, placeholder: "102.89.23.0/24" },
    ],
  },
  {
    id: "ip-remove", method: "DELETE", path: "/security/ip-allowlist", label: "Remove IP",
    category: "Security", auth: "jwt",
    description: "Remove an IP address from your allowlist.",
    bodyFields: [
      { name: "ip", type: "text", required: true, placeholder: "102.89.23.0/24" },
    ],
  },
  {
    id: "kyc-status", method: "GET", path: "/kyc/status", label: "KYB Status",
    category: "KYB", auth: "jwt",
    description: "Check your Know Your Business verification status.",
  },
  {
    id: "kyc-submit", method: "POST", path: "/kyc/submit", label: "Submit KYB",
    category: "KYB", auth: "jwt",
    description: "Submit KYB verification. Set accountType and provide kybData for business/enterprise accounts.",
    bodyFields: [
      { name: "body", type: "json", required: true, placeholder: JSON.stringify({
        accountType: "business",
        kybData: {
          companyInfo: { legalName: "Acme Corp Ltd", cacNumber: "RC123456", address: "123 Marina, Lagos" },
          directors: [{ fullName: "John Doe", nin: "12345678901" }],
          apiUseCase: { purpose: "Identity verification for fintech app", expectedVolume: "1000/month" },
          compliance: { agreedToTerms: true }
        }
      }, null, 2) },
    ],
  },
  {
    id: "send-otp", method: "POST", path: "/auth/send-otp", label: "Send OTP",
    category: "Auth", auth: "none",
    description: "Send a one-time password to an email address for registration.",
    bodyFields: [
      { name: "email", type: "text", required: true, placeholder: "dev@example.com" },
    ],
  },
  {
    id: "register", method: "POST", path: "/auth/register", label: "Register",
    category: "Auth", auth: "none",
    description: "Create a new developer account.",
    bodyFields: [
      { name: "email", type: "text", required: true, placeholder: "dev@example.com" },
      { name: "password", type: "text", required: true, placeholder: "SecurePass123!" },
      { name: "name", type: "text", required: true, placeholder: "John Doe" },
      { name: "company", type: "text", placeholder: "Acme Corp" },
      { name: "otpCode", type: "text", required: true, placeholder: "123456" },
    ],
  },
  {
    id: "login", method: "POST", path: "/auth/login", label: "Login",
    category: "Auth", auth: "none",
    description: "Authenticate and receive a JWT token.",
    bodyFields: [
      { name: "email", type: "text", required: true, placeholder: "dev@example.com" },
      { name: "password", type: "text", required: true, placeholder: "SecurePass123!" },
    ],
  },
];

const CATEGORIES = ["Verification", "Info", "Account", "API Keys", "Billing", "Webhooks", "Analytics", "Security", "KYB", "Auth"];

const METHOD_COLORS: Record<string, string> = {
  GET: "#22c55e", POST: "#3b82f6", PUT: "#f59e0b", PATCH: "#a855f7", DELETE: "#ef4444"
};

type HistoryEntry = {
  id: string; endpoint: EndpointDef; timestamp: Date;
  status: number; durationMs: number; response: any; url: string;
};

export default function DevApiTester() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState(sessionStorage.getItem("tester_api_key") || "");
  const [jwtToken, setJwtToken] = useState(sessionStorage.getItem("tester_jwt") || "");
  const [baseUrl, setBaseUrl] = useState(sessionStorage.getItem("tester_base_url") || "/api/v1/developer");
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDef | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; headers: Record<string, string>; body: any; durationMs: number } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ Verification: true });
  const [searchQuery, setSearchQuery] = useState("");
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => { sessionStorage.setItem("tester_api_key", apiKey); }, [apiKey]);
  useEffect(() => { sessionStorage.setItem("tester_jwt", jwtToken); }, [jwtToken]);
  useEffect(() => { sessionStorage.setItem("tester_base_url", baseUrl); }, [baseUrl]);

  const toggleCategory = (cat: string) => setExpandedCategories(p => ({ ...p, [cat]: !p[cat] }));

  const selectEndpoint = (ep: EndpointDef) => {
    setSelectedEndpoint(ep);
    setFieldValues({});
    setResponse(null);
  };

  const buildUrl = (): string => {
    if (!selectedEndpoint) return "";
    let url = selectedEndpoint.path;
    selectedEndpoint.pathParams?.forEach(p => {
      url = url.replace(`{${p.name}}`, fieldValues[p.name] || p.placeholder || "");
    });
    const queryParts: string[] = [];
    selectedEndpoint.queryFields?.forEach(q => {
      if (fieldValues[q.name]) queryParts.push(`${q.name}=${encodeURIComponent(fieldValues[q.name])}`);
    });
    return baseUrl + url + (queryParts.length ? "?" + queryParts.join("&") : "");
  };

  const buildHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (selectedEndpoint?.auth === "apikey" && apiKey) h["X-API-Key"] = apiKey;
    if (selectedEndpoint?.auth === "jwt" && jwtToken) h["Authorization"] = `Bearer ${jwtToken}`;
    return h;
  };

  const buildBody = (): string | undefined => {
    if (!selectedEndpoint || selectedEndpoint.method === "GET") return undefined;
    if (!selectedEndpoint.bodyFields?.length) return undefined;
    if (selectedEndpoint.bodyFields.length === 1 && selectedEndpoint.bodyFields[0].type === "json") {
      return fieldValues[selectedEndpoint.bodyFields[0].name] || selectedEndpoint.bodyFields[0].placeholder || "{}";
    }
    const obj: Record<string, any> = {};
    selectedEndpoint.bodyFields.forEach(f => {
      const val = fieldValues[f.name];
      if (val !== undefined && val !== "") {
        if (f.options && (val === "true" || val === "false")) obj[f.name] = val === "true";
        else obj[f.name] = val;
      }
    });
    return JSON.stringify(obj);
  };

  const sendRequest = async () => {
    if (!selectedEndpoint) return;
    setLoading(true);
    setResponse(null);
    const url = buildUrl();
    const headers = buildHeaders();
    const body = buildBody();
    const start = performance.now();
    try {
      const res = await fetch(url, {
        method: selectedEndpoint.method,
        headers,
        body: body,
      });
      const durationMs = Math.round(performance.now() - start);
      const respHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { respHeaders[k] = v; });
      let respBody: any;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("json")) {
        respBody = await res.json();
      } else {
        respBody = await res.text();
      }
      const result = { status: res.status, headers: respHeaders, body: respBody, durationMs };
      setResponse(result);
      setHistory(prev => [{
        id: Date.now().toString(), endpoint: selectedEndpoint, timestamp: new Date(),
        status: res.status, durationMs, response: respBody, url,
      }, ...prev].slice(0, 50));
      if (selectedEndpoint.id === "login" && respBody?.data?.token) {
        setJwtToken(respBody.data.token);
        toast({ title: "JWT token captured automatically" });
      }
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      setResponse({ status: 0, headers: {}, body: { error: err.message || "Network error" }, durationMs });
    }
    setLoading(false);
    setTimeout(() => responseRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const generateCurl = (): string => {
    if (!selectedEndpoint) return "";
    const url = buildUrl();
    const headers = buildHeaders();
    const body = buildBody();
    const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    let cmd = `curl -X ${selectedEndpoint.method} "${fullUrl}"`;
    Object.entries(headers).forEach(([k, v]) => { cmd += ` \\\n  -H "${k}: ${v.length > 20 ? v.substring(0, 8) + "..." : v}"`; });
    if (body) cmd += ` \\\n  -d '${body}'`;
    return cmd;
  };

  const filteredEndpoints = ENDPOINTS.filter(ep =>
    !searchQuery || ep.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ep.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DevLayout>
    <div className="flex flex-col" style={{ color: C.text, minHeight: "calc(100vh - 64px)" }}>
      <div className="flex items-center gap-3 mb-4">
        <Terminal className="w-6 h-6" style={{ color: C.accent }} />
        <div>
          <h1 className="text-lg font-bold">API Tester</h1>
          <p className="text-xs" style={{ color: C.muted }}>Test all Arapoint API endpoints interactively</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden rounded-lg" style={{ border: `1px solid ${C.border}` }}>
        <aside className="w-72 border-r overflow-y-auto flex-shrink-0" style={{ borderColor: C.border, background: C.card }}>
          <div className="p-3">
            <Input
              placeholder="Search endpoints..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="text-sm"
              style={{ background: C.bg, borderColor: C.border, color: C.text }}
            />
          </div>
          <div className="px-2 pb-3 space-y-1">
            <div className="px-2 pb-2 space-y-2">
              <div>
                <Label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>API Key</Label>
                <div className="flex gap-1">
                  <Input
                    type="password" placeholder="ara_..." value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    className="text-xs h-7"
                    style={{ background: C.bg, borderColor: C.border, color: C.text }}
                  />
                  <button onClick={() => setApiKey("")} className="text-xs px-1.5 rounded hover:bg-white/5" style={{ color: C.muted }}>
                    ✕
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>JWT Token</Label>
                <div className="flex gap-1">
                  <Input
                    type="password" placeholder="eyJ..." value={jwtToken}
                    onChange={e => setJwtToken(e.target.value)}
                    className="text-xs h-7"
                    style={{ background: C.bg, borderColor: C.border, color: C.text }}
                  />
                  <button onClick={() => setJwtToken("")} className="text-xs px-1.5 rounded hover:bg-white/5" style={{ color: C.muted }}>
                    ✕
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Base URL</Label>
                <Input
                  value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
                  className="text-xs h-7"
                  style={{ background: C.bg, borderColor: C.border, color: C.text }}
                />
              </div>
            </div>
            <div className="border-t pt-1" style={{ borderColor: C.border }}>
              {CATEGORIES.map(cat => {
                const eps = filteredEndpoints.filter(e => e.category === cat);
                if (eps.length === 0) return null;
                const isExpanded = expandedCategories[cat];
                return (
                  <div key={cat}>
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-semibold uppercase tracking-wider hover:bg-white/5 transition-colors"
                      style={{ color: C.muted }}
                    >
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      {cat}
                      <span className="ml-auto text-[10px] opacity-60">{eps.length}</span>
                    </button>
                    {isExpanded && (
                      <div className="ml-2 space-y-0.5 mb-1">
                        {eps.map(ep => (
                          <button
                            key={ep.id}
                            onClick={() => selectEndpoint(ep)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left ${
                              selectedEndpoint?.id === ep.id ? "bg-white/10" : "hover:bg-white/5"
                            }`}
                          >
                            <span className="font-mono font-bold text-[10px] w-12 text-right flex-shrink-0"
                              style={{ color: METHOD_COLORS[ep.method] }}>
                              {ep.method}
                            </span>
                            <span className="truncate" style={{ color: selectedEndpoint?.id === ep.id ? C.text : C.muted }}>
                              {ep.label}
                            </span>
                            {ep.price && (
                              <span className="ml-auto text-[9px] px-1 rounded" style={{ background: C.accentDim, color: C.accent }}>
                                ₦{ep.price}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          {!selectedEndpoint ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50 gap-4">
              <Zap className="w-16 h-16" style={{ color: C.accent }} />
              <div className="text-center">
                <h2 className="text-xl font-bold mb-2">Select an Endpoint</h2>
                <p style={{ color: C.muted }}>Choose an API endpoint from the sidebar to start testing.</p>
                <div className="mt-4 flex flex-wrap gap-3 justify-center">
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
                    <Key className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />
                    <span>API Key endpoints need X-API-Key header</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
                    <Shield className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
                    <span>JWT endpoints need Bearer token</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
                    <Globe className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />
                    <span>Public endpoints need no auth</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono font-bold text-sm px-2.5 py-0.5 rounded"
                      style={{ background: METHOD_COLORS[selectedEndpoint.method] + "22", color: METHOD_COLORS[selectedEndpoint.method] }}>
                      {selectedEndpoint.method}
                    </span>
                    <h2 className="text-lg font-bold">{selectedEndpoint.label}</h2>
                    {selectedEndpoint.auth === "apikey" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
                        style={{ background: "#f59e0b22", color: "#f59e0b" }}>
                        <Key className="w-2.5 h-2.5" /> API Key
                      </span>
                    )}
                    {selectedEndpoint.auth === "jwt" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
                        style={{ background: "#3b82f622", color: "#3b82f6" }}>
                        <Shield className="w-2.5 h-2.5" /> JWT
                      </span>
                    )}
                    {selectedEndpoint.auth === "none" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
                        style={{ background: "#22c55e22", color: "#22c55e" }}>
                        <Globe className="w-2.5 h-2.5" /> Public
                      </span>
                    )}
                    {selectedEndpoint.price && (
                      <span className="text-xs font-medium" style={{ color: C.accent }}>₦{selectedEndpoint.price}/call</span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: C.muted }}>{selectedEndpoint.description}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(generateCurl())}
                  className="flex-shrink-0 gap-1.5 text-xs" style={{ borderColor: C.border, color: C.muted }}>
                  <Code2 className="w-3.5 h-3.5" /> Copy cURL
                </Button>
              </div>

              <div className="rounded-lg p-3 font-mono text-sm flex items-center gap-2 overflow-x-auto"
                style={{ background: C.cardAlt, border: `1px solid ${C.border}` }}>
                <span style={{ color: METHOD_COLORS[selectedEndpoint.method] }}>{selectedEndpoint.method}</span>
                <span style={{ color: C.muted }}>{buildUrl()}</span>
              </div>

              {(selectedEndpoint.pathParams?.length || selectedEndpoint.bodyFields?.length || selectedEndpoint.queryFields?.length) && (
                <div className="rounded-lg p-4 space-y-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Send className="w-4 h-4" style={{ color: C.accent }} />
                    Parameters
                  </h3>

                  {selectedEndpoint.pathParams?.map(p => (
                    <div key={p.name}>
                      <Label className="text-xs mb-1 block">
                        <span className="font-mono text-xs" style={{ color: "#a855f7" }}>:{p.name}</span>
                        <span className="ml-1 text-[10px] text-red-400">required</span>
                      </Label>
                      <Input
                        placeholder={p.placeholder} value={fieldValues[p.name] || ""}
                        onChange={e => setFieldValues(v => ({ ...v, [p.name]: e.target.value }))}
                        className="font-mono text-sm"
                        style={{ background: C.bg, borderColor: C.border, color: C.text }}
                      />
                    </div>
                  ))}

                  {selectedEndpoint.queryFields?.map(q => (
                    <div key={q.name}>
                      <Label className="text-xs mb-1 block">
                        <span className="font-mono text-xs" style={{ color: C.blue }}>?{q.name}</span>
                      </Label>
                      <Input
                        placeholder={q.placeholder} value={fieldValues[q.name] || ""}
                        onChange={e => setFieldValues(v => ({ ...v, [q.name]: e.target.value }))}
                        className="font-mono text-sm"
                        style={{ background: C.bg, borderColor: C.border, color: C.text }}
                      />
                    </div>
                  ))}

                  {selectedEndpoint.bodyFields?.map(f => (
                    <div key={f.name}>
                      <Label className="text-xs mb-1 block">
                        <span className="font-mono text-xs">{f.name}</span>
                        {f.required && <span className="ml-1 text-[10px] text-red-400">required</span>}
                      </Label>
                      {f.type === "select" ? (
                        <select
                          value={fieldValues[f.name] || ""}
                          onChange={e => setFieldValues(v => ({ ...v, [f.name]: e.target.value }))}
                          className="w-full rounded-md px-3 py-2 text-sm font-mono"
                          style={{ background: C.bg, borderColor: C.border, color: C.text, border: `1px solid ${C.border}` }}
                        >
                          <option value="">Select...</option>
                          {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : f.type === "json" ? (
                        <Textarea
                          placeholder={f.placeholder} value={fieldValues[f.name] || ""}
                          onChange={e => setFieldValues(v => ({ ...v, [f.name]: e.target.value }))}
                          rows={10}
                          className="font-mono text-sm"
                          style={{ background: C.bg, borderColor: C.border, color: C.text }}
                        />
                      ) : (
                        <Input
                          placeholder={f.placeholder} value={fieldValues[f.name] || ""}
                          onChange={e => setFieldValues(v => ({ ...v, [f.name]: e.target.value }))}
                          className="font-mono text-sm"
                          style={{ background: C.bg, borderColor: C.border, color: C.text }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={sendRequest} disabled={loading}
                  className="gap-2 font-semibold"
                  style={{ background: C.accent, color: "#000" }}
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {loading ? "Sending..." : "Send Request"}
                </Button>
                <Button variant="outline" onClick={() => { setFieldValues({}); setResponse(null); }}
                  style={{ borderColor: C.border, color: C.muted }}>
                  Clear
                </Button>
              </div>

              {response && (
                <div ref={responseRef} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: C.cardAlt, borderBottom: `1px solid ${C.border}` }}>
                    <span className="text-sm font-bold flex items-center gap-1.5">
                      {response.status >= 200 && response.status < 300
                        ? <CheckCircle className="w-4 h-4 text-green-400" />
                        : <XCircle className="w-4 h-4 text-red-400" />}
                      <span style={{
                        color: response.status >= 200 && response.status < 300 ? "#22c55e"
                          : response.status >= 400 && response.status < 500 ? "#f59e0b" : "#ef4444"
                      }}>
                        {response.status || "ERR"}
                      </span>
                    </span>
                    <span className="text-xs flex items-center gap-1" style={{ color: C.muted }}>
                      <Clock className="w-3 h-3" />
                      {response.durationMs}ms
                    </span>
                    {response.headers["x-ratelimit-remaining"] && (
                      <span className="text-xs" style={{ color: C.muted }}>
                        Rate limit: {response.headers["x-ratelimit-remaining"]}/{response.headers["x-ratelimit-limit"]}
                      </span>
                    )}
                    <button
                      onClick={() => copyToClipboard(typeof response.body === "string" ? response.body : JSON.stringify(response.body, null, 2))}
                      className="ml-auto p-1 rounded hover:bg-white/10 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" style={{ color: C.muted }} />
                    </button>
                  </div>
                  <div className="p-4 overflow-x-auto" style={{ background: C.card }}>
                    <pre className="text-xs font-mono whitespace-pre-wrap" style={{ color: C.text }}>
                      {typeof response.body === "string" ? response.body : JSON.stringify(response.body, null, 2)}
                    </pre>
                  </div>
                  {Object.keys(response.headers).length > 0 && (
                    <details className="border-t" style={{ borderColor: C.border }}>
                      <summary className="px-4 py-2 text-xs cursor-pointer hover:bg-white/5 transition-colors" style={{ color: C.muted }}>
                        Response Headers ({Object.keys(response.headers).length})
                      </summary>
                      <div className="px-4 pb-3">
                        {Object.entries(response.headers).map(([k, v]) => (
                          <div key={k} className="text-xs font-mono py-0.5">
                            <span style={{ color: C.accent }}>{k}:</span>{" "}
                            <span style={{ color: C.muted }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

              {history.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: C.muted }}>
                    <Clock className="w-4 h-4" />
                    Request History ({history.length})
                  </h3>
                  <div className="space-y-1">
                    {history.map(h => (
                      <button
                        key={h.id}
                        onClick={() => {
                          selectEndpoint(h.endpoint);
                          setResponse({
                            status: h.status, headers: {}, body: h.response, durationMs: h.durationMs
                          });
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded text-xs hover:bg-white/5 transition-colors text-left"
                        style={{ background: C.card, border: `1px solid ${C.border}` }}
                      >
                        <span className="font-mono font-bold w-10 text-right flex-shrink-0"
                          style={{ color: METHOD_COLORS[h.endpoint.method] }}>
                          {h.endpoint.method}
                        </span>
                        <span className="truncate flex-1 font-mono" style={{ color: C.muted }}>{h.url}</span>
                        <span className={`font-bold ${h.status >= 200 && h.status < 300 ? "text-green-400" : h.status >= 400 ? "text-red-400" : "text-yellow-400"}`}>
                          {h.status}
                        </span>
                        <span style={{ color: C.muted }}>{h.durationMs}ms</span>
                        <span style={{ color: C.muted }}>
                          {h.timestamp.toLocaleTimeString()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
    </DevLayout>
  );
}
