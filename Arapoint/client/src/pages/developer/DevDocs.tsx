import { useState } from "react";
import { DevLayout } from "./DevLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = "https://arapoint.com.ng/api/v1/developer";

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
];

function CopyableCode({ code }: { code: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!" });
  };
  return (
    <div className="relative">
      <pre className="bg-gray-800 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">{code}</pre>
      <button onClick={copy} className="absolute top-2 right-2 text-gray-500 hover:text-gray-300">
        {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function DevDocs() {
  const [activeEndpoint, setActiveEndpoint] = useState(endpoints[0].path);
  const endpoint = endpoints.find(e => e.path === activeEndpoint) || endpoints[0];

  const curlExample = `curl -X ${endpoint.method} ${BASE_URL}${endpoint.path} \\
  -H "X-API-Key: ara_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(endpoint.request, null, 2)}'`;

  const jsExample = `const response = await fetch("${BASE_URL}${endpoint.path}", {
  method: "${endpoint.method}",
  headers: {
    "X-API-Key": "ara_your_api_key_here",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${JSON.stringify(endpoint.request, null, 4)})
});
const data = await response.json();
console.log(data);`;

  return (
    <DevLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">API Documentation</h1>
          <p className="text-sm text-gray-400 mt-0.5">Reference for all Arapoint Developer API endpoints</p>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold">Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-400">
              All verification endpoints require an API key. Pass it via the <code className="bg-gray-800 px-1.5 py-0.5 rounded text-indigo-300 text-xs">X-API-Key</code> request header.
            </p>
            <CopyableCode code={`X-API-Key: ara_your_api_key_here`} />
            <div className="bg-indigo-950/40 border border-indigo-800 rounded-lg p-3">
              <p className="text-xs text-indigo-300">
                <strong>Base URL:</strong> <code className="font-mono">{BASE_URL}</code>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Endpoints</p>
            {endpoints.map(ep => (
              <button
                key={ep.path}
                onClick={() => setActiveEndpoint(ep.path)}
                className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${activeEndpoint === ep.path ? "bg-indigo-950/60 border-indigo-700 text-white" : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs text-green-400 border-green-800 bg-green-950/30">
                    {ep.method}
                  </Badge>
                </div>
                <p className="font-medium text-xs">{ep.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">₦{ep.price}/req</p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-green-400 border-green-800 bg-green-950/30">{endpoint.method}</Badge>
                      <code className="text-sm text-gray-200 font-mono">{endpoint.path}</code>
                    </div>
                    <CardTitle className="text-white text-base">{endpoint.title}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-yellow-400 border-yellow-800 bg-yellow-950/30 flex-shrink-0">
                    ₦{endpoint.price}/request
                  </Badge>
                </div>
                <p className="text-sm text-gray-400 mt-1">{endpoint.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <div>
                  <p className="text-xs text-gray-400 font-medium mb-2">cURL Example</p>
                  <CopyableCode code={curlExample} />
                </div>

                <div>
                  <p className="text-xs text-gray-400 font-medium mb-2">JavaScript Example</p>
                  <CopyableCode code={jsExample} />
                </div>

                <div>
                  <p className="text-xs text-gray-400 font-medium mb-2">Example Response</p>
                  <CopyableCode code={JSON.stringify(endpoint.response, null, 2)} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-semibold">Error Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { code: 200, label: "Success", desc: "Request completed successfully" },
                    { code: 400, label: "Bad Request", desc: "Missing or invalid parameters" },
                    { code: 401, label: "Unauthorized", desc: "Invalid or missing API key" },
                    { code: 402, label: "Payment Required", desc: "Insufficient wallet balance" },
                    { code: 429, label: "Too Many Requests", desc: "Rate limit exceeded" },
                    { code: 500, label: "Server Error", desc: "Internal error, try again" },
                  ].map(err => (
                    <div key={err.code} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                      <Badge variant="outline"
                        className={`w-12 justify-center text-xs ${err.code === 200 ? "text-green-400 border-green-800" : err.code < 500 ? "text-yellow-400 border-yellow-800" : "text-red-400 border-red-800"}`}>
                        {err.code}
                      </Badge>
                      <span className="text-xs font-medium text-gray-300 w-28">{err.label}</span>
                      <span className="text-xs text-gray-500">{err.desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DevLayout>
  );
}
