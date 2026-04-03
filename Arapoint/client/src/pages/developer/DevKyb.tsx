import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { DevLayout } from "./DevLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Users, Code2, ShieldCheck, CheckCircle, Clock, XCircle,
  AlertCircle, ChevronRight, ChevronLeft, Plus, Trash2, RefreshCw,
  Info, Loader2, FileCheck, AlertTriangle, Upload, File, X
} from "lucide-react";

function devFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("dev_token");
  return fetch(`/api/v1/developer${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options?.headers },
  });
}

async function devUploadFile(file: File, docType: string): Promise<string> {
  const token = localStorage.getItem("dev_token");
  const form = new FormData();
  form.append("file", file);
  form.append("docType", docType);
  const res = await fetch("/api/v1/developer/kyc/upload-document", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json();
  if (data.status === "success") return data.data.fileKey;
  throw new Error(data.message || "Upload failed");
}

const STEPS = [
  { id: 1, label: "Company Info", icon: Building2 },
  { id: 2, label: "Directors", icon: Users },
  { id: 3, label: "API Use Case", icon: Code2 },
  { id: 4, label: "Compliance", icon: ShieldCheck },
  { id: 5, label: "Documents", icon: Upload },
  { id: 6, label: "Review & Submit", icon: FileCheck },
];

const BUSINESS_TYPES = [
  "Private Limited Company (Ltd)",
  "Public Limited Company (PLC)",
  "Sole Proprietorship",
  "Partnership",
  "Limited Liability Partnership (LLP)",
  "Cooperative Society",
  "Non-Governmental Organisation (NGO)",
  "Government Agency",
];

const VOLUME_OPTIONS = [
  "Less than 100 requests/month",
  "100 – 1,000 requests/month",
  "1,000 – 10,000 requests/month",
  "10,000 – 100,000 requests/month",
  "100,000+ requests/month",
];

const DATA_TYPES = [
  { id: "nin", label: "NIN Verification" },
  { id: "bvn", label: "BVN Retrieval" },
  { id: "education", label: "Education Verification" },
  { id: "employment", label: "Employment Verification" },
  { id: "cac", label: "Business Registration" },
  { id: "utility", label: "VTU / Utility Services" },
];

const emptyDirector = () => ({
  fullName: "",
  dateOfBirth: "",
  nationality: "Nigerian",
  idType: "nin",
  idNumber: "",
  ownershipPercent: "",
});

type KybStatus = "not_required" | "submitted" | "approved" | "conditional" | "rejected";

export default function DevKyb() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [kybStatus, setKybStatus] = useState<KybStatus>("not_required");
  const [kybReviewNote, setKybReviewNote] = useState("");
  const [kybSubmittedAt, setKybSubmittedAt] = useState<string | null>(null);
  const [existingKybData, setExistingKybData] = useState<any>(null);

  const [uploadedDocuments, setUploadedDocuments] = useState<{
    cac_certificate?: { fileKey: string; name: string };
    status_report?: { fileKey: string; name: string };
    address_verification?: { fileKey: string; name: string };
  }>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const uploadDoc = async (file: File, docType: string) => {
    setUploading(u => ({ ...u, [docType]: true }));
    try {
      const fileKey = await devUploadFile(file, docType);
      setUploadedDocuments(d => ({ ...d, [docType]: { fileKey, name: file.name } }));
      toast({ title: "Document uploaded", description: file.name });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(u => ({ ...u, [docType]: false }));
    }
  };

  const removeDoc = (docType: string) => {
    setUploadedDocuments(d => { const n = { ...d }; delete (n as any)[docType]; return n; });
  };

  const [companyInfo, setCompanyInfo] = useState({
    legalName: "",
    cacNumber: "",
    businessType: "",
    dateOfIncorporation: "",
    businessAddress: "",
    state: "",
    country: "Nigeria",
    tin: "",
    phone: "",
    website: "",
  });

  const [directors, setDirectors] = useState([emptyDirector()]);

  const [apiUseCase, setApiUseCase] = useState({
    purpose: "",
    expectedVolume: "",
    targetCustomers: "",
    revenueModel: "",
    dataTypesNeeded: [] as string[],
    webhookUrl: "",
    appName: "",
  });

  const [compliance, setCompliance] = useState({
    isPEP: false,
    sanctionsCheck: false,
    amlDeclaration: false,
    dataAgreement: false,
    termsAccepted: false,
  });

  useEffect(() => {
    if (kybStatus === "approved") setLocation("/developer/dashboard");
  }, [kybStatus]);

  useEffect(() => {
    devFetch("/kyc/status")
      .then(r => r.json())
      .then(data => {
        if (data.status === "success") {
          setKybStatus(data.data.kycStatus || "not_required");
          setKybReviewNote(data.data.kycReviewNote || "");
          setKybSubmittedAt(data.data.kycSubmittedAt);
          if (data.data.kycDocuments) {
            setExistingKybData(data.data.kycDocuments);
            const d = data.data.kycDocuments;
            if (d.companyInfo) setCompanyInfo(ci => ({ ...ci, ...d.companyInfo }));
            if (d.directors?.length) setDirectors(d.directors);
            if (d.apiUseCase) setApiUseCase(uc => ({ ...uc, ...d.apiUseCase }));
            if (d.compliance) setCompliance(c => ({ ...c, ...d.compliance }));
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const addDirector = () => setDirectors(d => [...d, emptyDirector()]);
  const removeDirector = (i: number) => setDirectors(d => d.filter((_, idx) => idx !== i));
  const updateDirector = (i: number, field: string, value: string) => {
    setDirectors(d => d.map((dir, idx) => idx === i ? { ...dir, [field]: value } : dir));
  };

  const toggleDataType = (id: string) => {
    setApiUseCase(uc => ({
      ...uc,
      dataTypesNeeded: uc.dataTypesNeeded.includes(id)
        ? uc.dataTypesNeeded.filter(x => x !== id)
        : [...uc.dataTypesNeeded, id],
    }));
  };

  const canProceed = () => {
    if (step === 1) {
      return companyInfo.legalName && companyInfo.cacNumber && companyInfo.businessType &&
        companyInfo.businessAddress && companyInfo.phone;
    }
    if (step === 2) {
      return directors.length > 0 && directors.every(d => d.fullName && d.idNumber);
    }
    if (step === 3) {
      return apiUseCase.purpose && apiUseCase.expectedVolume && apiUseCase.targetCustomers && apiUseCase.dataTypesNeeded.length > 0;
    }
    if (step === 4) {
      return compliance.amlDeclaration && compliance.dataAgreement && compliance.termsAccepted;
    }
    if (step === 5) {
      return uploadedDocuments.cac_certificate !== undefined;
    }
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await devFetch("/kyc/submit", {
        method: "POST",
        body: JSON.stringify({
          accountType: "business",
          kybData: { companyInfo, directors, apiUseCase, compliance, uploadedDocuments },
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setKybStatus("submitted");
        setKybSubmittedAt(new Date().toISOString());
        toast({ title: "Business Verification Submitted", description: "Your application is under review. We'll notify you within 24–72 hours." });
      } else {
        toast({ title: "Submission failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DevLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      </DevLayout>
    );
  }

  if (kybStatus === "submitted") {
    return (
      <DevLayout>
        <StatusView
          icon={<Clock className="w-12 h-12 text-yellow-400" />}
          title="Application Under Review"
          description="Your business verification application has been submitted. Our compliance team will review it within 24–72 hours."
          badge={<Badge className="bg-yellow-900/50 text-yellow-300 border-yellow-700">Pending Review</Badge>}
          submittedAt={kybSubmittedAt}
          note={kybReviewNote}
          canResubmit={false}
        />
      </DevLayout>
    );
  }

  if (kybStatus === "approved") return null;

  if (kybStatus === "conditional") {
    return (
      <DevLayout>
        <StatusView
          icon={<AlertTriangle className="w-12 h-12 text-orange-400" />}
          title="Conditional Approval"
          description="Your account has been conditionally approved with limited API access. Please review the compliance note below and resubmit if needed."
          badge={<Badge className="bg-orange-900/50 text-orange-300 border-orange-700">Conditional</Badge>}
          submittedAt={kybSubmittedAt}
          note={kybReviewNote}
          canResubmit={true}
          onResubmit={() => setKybStatus("not_required")}
        />
      </DevLayout>
    );
  }

  if (kybStatus === "rejected") {
    return (
      <DevLayout>
        <StatusView
          icon={<XCircle className="w-12 h-12 text-red-400" />}
          title="Application Rejected"
          description="Your business verification was not approved. Please review the reason below and resubmit with the correct information."
          badge={<Badge className="bg-red-900/50 text-red-300 border-red-700">Rejected</Badge>}
          submittedAt={kybSubmittedAt}
          note={kybReviewNote}
          canResubmit={true}
          onResubmit={() => setKybStatus("not_required")}
        />
      </DevLayout>
    );
  }

  return (
    <DevLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">Business Verification (KYB)</h1>
          <p className="text-sm text-gray-400 mt-0.5">Complete verification to unlock full API access and higher rate limits</p>
        </div>

        <div className="flex items-center gap-0">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => step > s.id && setStep(s.id)}
                className={`flex flex-col items-center gap-1 ${step > s.id ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > s.id ? "bg-indigo-500 text-white" :
                  step === s.id ? "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-gray-950" :
                  "bg-gray-800 text-gray-500"
                }`}>
                  {step > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
                </div>
                <span className={`text-[10px] hidden sm:block ${step === s.id ? "text-indigo-300" : "text-gray-600"}`}>{s.label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${step > s.id ? "bg-indigo-500" : "bg-gray-800"}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              {(() => { const S = STEPS[step - 1]; return <S.icon className="w-4 h-4 text-indigo-400" />; })()}
              {STEPS[step - 1].label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Legal Business Name <span className="text-red-400">*</span></Label>
                    <Input value={companyInfo.legalName} onChange={e => setCompanyInfo(c => ({ ...c, legalName: e.target.value }))}
                      placeholder="As registered with CAC" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">CAC Registration Number <span className="text-red-400">*</span></Label>
                    <Input value={companyInfo.cacNumber} onChange={e => setCompanyInfo(c => ({ ...c, cacNumber: e.target.value }))}
                      placeholder="e.g. RC1234567" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Business Type <span className="text-red-400">*</span></Label>
                    <select value={companyInfo.businessType} onChange={e => setCompanyInfo(c => ({ ...c, businessType: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm">
                      <option value="">Select business type</option>
                      {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Date of Incorporation</Label>
                    <Input type="date" value={companyInfo.dateOfIncorporation} onChange={e => setCompanyInfo(c => ({ ...c, dateOfIncorporation: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Business Address <span className="text-red-400">*</span></Label>
                  <Textarea value={companyInfo.businessAddress} onChange={e => setCompanyInfo(c => ({ ...c, businessAddress: e.target.value }))}
                    placeholder="Full registered business address" rows={2}
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">State</Label>
                    <Input value={companyInfo.state} onChange={e => setCompanyInfo(c => ({ ...c, state: e.target.value }))}
                      placeholder="e.g. Lagos" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Tax Identification Number (TIN)</Label>
                    <Input value={companyInfo.tin} onChange={e => setCompanyInfo(c => ({ ...c, tin: e.target.value }))}
                      placeholder="TIN" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Business Phone <span className="text-red-400">*</span></Label>
                    <Input value={companyInfo.phone} onChange={e => setCompanyInfo(c => ({ ...c, phone: e.target.value }))}
                      placeholder="e.g. 08012345678" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Company Website</Label>
                    <Input value={companyInfo.website} onChange={e => setCompanyInfo(c => ({ ...c, website: e.target.value }))}
                      placeholder="https://yourcompany.com" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="bg-indigo-900/20 border border-indigo-800/50 rounded-lg p-3 flex gap-2 text-sm text-indigo-300">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Add all directors and shareholders with 5% or more ownership (Ultimate Beneficial Owners).</span>
                </div>
                {directors.map((dir, idx) => (
                  <div key={idx} className="border border-gray-700 rounded-lg p-4 space-y-3 relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-300">Director {idx + 1}</span>
                      {directors.length > 1 && (
                        <button onClick={() => removeDirector(idx)} className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-gray-300 text-sm">Full Name <span className="text-red-400">*</span></Label>
                        <Input value={dir.fullName} onChange={e => updateDirector(idx, "fullName", e.target.value)}
                          placeholder="As on ID document" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-gray-300 text-sm">Date of Birth</Label>
                        <Input type="date" value={dir.dateOfBirth} onChange={e => updateDirector(idx, "dateOfBirth", e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-gray-300 text-sm">Nationality</Label>
                        <Input value={dir.nationality} onChange={e => updateDirector(idx, "nationality", e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-gray-300 text-sm">Ownership %</Label>
                        <Input value={dir.ownershipPercent} onChange={e => updateDirector(idx, "ownershipPercent", e.target.value)}
                          placeholder="e.g. 50" type="number" min="0" max="100"
                          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-gray-300 text-sm">ID Type</Label>
                        <select value={dir.idType} onChange={e => updateDirector(idx, "idType", e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm">
                          <option value="nin">NIN</option>
                          <option value="passport">International Passport</option>
                          <option value="drivers_license">Driver's License</option>
                          <option value="voters_card">Voter's Card</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-gray-300 text-sm">ID Number <span className="text-red-400">*</span></Label>
                        <Input value={dir.idNumber} onChange={e => updateDirector(idx, "idNumber", e.target.value)}
                          placeholder="ID number" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addDirector}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 w-full">
                  <Plus className="w-3.5 h-3.5 mr-2" /> Add Another Director
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">What will you use Arapoint APIs for? <span className="text-red-400">*</span></Label>
                  <Textarea value={apiUseCase.purpose} onChange={e => setApiUseCase(uc => ({ ...uc, purpose: e.target.value }))}
                    placeholder="e.g. Identity verification for fintech onboarding, background checks for employment screening..."
                    rows={3} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Expected Monthly Volume <span className="text-red-400">*</span></Label>
                    <select value={apiUseCase.expectedVolume} onChange={e => setApiUseCase(uc => ({ ...uc, expectedVolume: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm">
                      <option value="">Select volume range</option>
                      {VOLUME_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Target Customers <span className="text-red-400">*</span></Label>
                    <Input value={apiUseCase.targetCustomers} onChange={e => setApiUseCase(uc => ({ ...uc, targetCustomers: e.target.value }))}
                      placeholder="e.g. Individuals, Banks, Fintechs..." className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Revenue / Business Model</Label>
                  <Input value={apiUseCase.revenueModel} onChange={e => setApiUseCase(uc => ({ ...uc, revenueModel: e.target.value }))}
                    placeholder="e.g. SaaS subscription, transaction fees..." className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">API Services Needed <span className="text-red-400">*</span></Label>
                  <div className="grid grid-cols-2 gap-2">
                    {DATA_TYPES.map(dt => (
                      <label key={dt.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm ${
                        apiUseCase.dataTypesNeeded.includes(dt.id)
                          ? "border-indigo-500 bg-indigo-900/30 text-indigo-300"
                          : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600"
                      }`}>
                        <input type="checkbox" className="sr-only" checked={apiUseCase.dataTypesNeeded.includes(dt.id)}
                          onChange={() => toggleDataType(dt.id)} />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          apiUseCase.dataTypesNeeded.includes(dt.id) ? "bg-indigo-500 border-indigo-500" : "border-gray-600"
                        }`}>
                          {apiUseCase.dataTypesNeeded.includes(dt.id) && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        {dt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Webhook / Callback URL</Label>
                    <Input value={apiUseCase.webhookUrl} onChange={e => setApiUseCase(uc => ({ ...uc, webhookUrl: e.target.value }))}
                      placeholder="https://your-server.com/webhook" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">App / Product Name</Label>
                    <Input value={apiUseCase.appName} onChange={e => setApiUseCase(uc => ({ ...uc, appName: e.target.value }))}
                      placeholder="Name of the product using the API" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3 flex gap-2 text-sm text-yellow-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Compliance declarations are legally binding. Providing false information may result in account suspension and legal action.</span>
                </div>
                {[
                  {
                    id: "isPEP",
                    label: "Politically Exposed Person (PEP) Declaration",
                    description: "None of the directors or beneficial owners listed are politically exposed persons (current or former government officials, politicians, or their close associates).",
                    trueLabel: "One or more directors are PEPs",
                    falseLabel: "No directors are PEPs",
                    isPEP: true,
                  },
                ].map(item => (
                  <div key={item.id} className="border border-gray-700 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-gray-300">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                    <div className="flex gap-3 mt-2">
                      {[false, true].map(val => (
                        <label key={String(val)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-all ${
                          compliance.isPEP === val
                            ? "border-indigo-500 bg-indigo-900/30 text-indigo-300"
                            : "border-gray-700 text-gray-400 hover:border-gray-600"
                        }`}>
                          <input type="radio" className="sr-only" checked={compliance.isPEP === val}
                            onChange={() => setCompliance(c => ({ ...c, isPEP: val }))} />
                          {val ? item.trueLabel : item.falseLabel}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                {[
                  {
                    id: "amlDeclaration",
                    label: "Anti-Money Laundering (AML) Declaration",
                    text: "I confirm that the business and all associated persons are not subject to any AML investigations and that all business activities comply with applicable laws and regulations.",
                  },
                  {
                    id: "dataAgreement",
                    label: "Data Usage Agreement",
                    text: "I agree that Arapoint API data will only be used for the stated purpose and in compliance with the NDPA 2023. I will not resell raw verification data to third parties without explicit written permission.",
                  },
                  {
                    id: "termsAccepted",
                    label: "Terms & Developer Agreement",
                    text: "I have read and agree to Arapoint's Developer Terms of Service and Privacy Policy, including API rate limits, SLA commitments, and acceptable use policies.",
                  },
                ].map(decl => (
                  <label key={decl.id} className={`flex gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                    (compliance as any)[decl.id]
                      ? "border-green-700 bg-green-900/10"
                      : "border-gray-700 hover:border-gray-600"
                  }`}>
                    <div className={`w-5 h-5 rounded border shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                      (compliance as any)[decl.id] ? "bg-green-500 border-green-500" : "border-gray-600"
                    }`}>
                      {(compliance as any)[decl.id] && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-300">{decl.label} <span className="text-red-400">*</span></p>
                      <p className="text-xs text-gray-500 mt-0.5">{decl.text}</p>
                    </div>
                    <input type="checkbox" className="sr-only" checked={(compliance as any)[decl.id]}
                      onChange={e => setCompliance(c => ({ ...c, [decl.id]: e.target.checked }))} />
                  </label>
                ))}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5">
                <div className="bg-indigo-900/20 border border-indigo-800/50 rounded-lg p-3 text-sm text-indigo-300 flex gap-2">
                  <Upload className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Upload your business documents. The CAC Certificate is required. Status Report and Address Verification are strongly recommended.</span>
                </div>

                {[
                  {
                    id: "cac_certificate",
                    label: "CAC Certificate of Incorporation",
                    description: "Official CAC registration certificate (PDF or image)",
                    required: true,
                  },
                  {
                    id: "status_report",
                    label: "CAC Status Report",
                    description: "Recent status report from CAC portal (within 6 months)",
                    required: false,
                  },
                  {
                    id: "address_verification",
                    label: "Address Verification Document",
                    description: "Utility bill or bank statement showing registered business address (within 3 months)",
                    required: false,
                  },
                ].map(doc => {
                  const uploaded = (uploadedDocuments as any)[doc.id];
                  const isUploading = uploading[doc.id];
                  return (
                    <div key={doc.id} className="border border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-200">
                            {doc.label} {doc.required && <span className="text-red-400">*</span>}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{doc.description}</p>
                        </div>
                        {uploaded && (
                          <button onClick={() => removeDoc(doc.id)} className="text-gray-600 hover:text-red-400 shrink-0 ml-3">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {uploaded ? (
                        <div className="flex items-center gap-2 bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2">
                          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                          <span className="text-xs text-green-300 font-medium truncate">{uploaded.name}</span>
                          <Badge className="ml-auto bg-green-900/50 text-green-400 border-green-700/50 text-[10px]">Uploaded</Badge>
                        </div>
                      ) : (
                        <label className={`flex items-center gap-3 border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                          isUploading ? "border-indigo-700 bg-indigo-950/30" : "border-gray-700 hover:border-indigo-600 hover:bg-indigo-950/20"
                        }`}>
                          {isUploading ? (
                            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
                          ) : (
                            <Upload className="w-5 h-5 text-gray-500 shrink-0" />
                          )}
                          <span className="text-xs text-gray-400">
                            {isUploading ? "Uploading..." : "Click to upload (PDF, JPG, PNG, max 10MB)"}
                          </span>
                          <input
                            type="file" className="sr-only"
                            accept=".pdf,.jpg,.jpeg,.png"
                            disabled={isUploading}
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) uploadDoc(f, doc.id);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {step === 6 && (
              <div className="space-y-5">
                <div className="bg-indigo-900/20 border border-indigo-800/50 rounded-lg p-3 text-sm text-indigo-300">
                  Review your information before submitting. After submission, our compliance team will review your application within 24–72 hours.
                </div>

                <ReviewSection title="Company Information" icon={Building2}>
                  <ReviewRow label="Legal Name" value={companyInfo.legalName} />
                  <ReviewRow label="CAC Number" value={companyInfo.cacNumber} />
                  <ReviewRow label="Business Type" value={companyInfo.businessType} />
                  <ReviewRow label="Address" value={companyInfo.businessAddress} />
                  <ReviewRow label="Phone" value={companyInfo.phone} />
                  <ReviewRow label="TIN" value={companyInfo.tin || "—"} />
                  <ReviewRow label="Website" value={companyInfo.website || "—"} />
                </ReviewSection>

                <ReviewSection title="Directors / UBO" icon={Users}>
                  {directors.map((d, i) => (
                    <div key={i} className="space-y-1">
                      {i > 0 && <div className="border-t border-gray-800 pt-2 mt-2" />}
                      <ReviewRow label={`Director ${i + 1}`} value={d.fullName} />
                      <ReviewRow label="ID" value={`${d.idType.toUpperCase()}: ${d.idNumber}`} />
                      {d.ownershipPercent && <ReviewRow label="Ownership" value={`${d.ownershipPercent}%`} />}
                    </div>
                  ))}
                </ReviewSection>

                <ReviewSection title="API Use Case" icon={Code2}>
                  <ReviewRow label="Purpose" value={apiUseCase.purpose} />
                  <ReviewRow label="Volume" value={apiUseCase.expectedVolume} />
                  <ReviewRow label="Customers" value={apiUseCase.targetCustomers} />
                  <ReviewRow label="Services" value={apiUseCase.dataTypesNeeded.join(", ")} />
                </ReviewSection>

                <ReviewSection title="Compliance" icon={ShieldCheck}>
                  <ReviewRow label="PEP" value={compliance.isPEP ? "Yes" : "None declared"} />
                  <ReviewRow label="AML" value="Declared" />
                  <ReviewRow label="Data Agreement" value="Agreed" />
                  <ReviewRow label="Terms" value="Accepted" />
                </ReviewSection>

                <ReviewSection title="Uploaded Documents" icon={Upload}>
                  <ReviewRow
                    label="CAC Certificate"
                    value={uploadedDocuments.cac_certificate?.name || "Not uploaded"}
                  />
                  <ReviewRow
                    label="Status Report"
                    value={uploadedDocuments.status_report?.name || "Not uploaded"}
                  />
                  <ReviewRow
                    label="Address Verification"
                    value={uploadedDocuments.address_verification?.name || "Not uploaded"}
                  />
                </ReviewSection>

                <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting...</> : "Submit for Compliance Review"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 1}
            className="border-gray-700 text-gray-300 hover:bg-gray-800">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < 6 && (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
              className="bg-indigo-600 hover:bg-indigo-700">
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </DevLayout>
  );
}

function StatusView({ icon, title, description, badge, submittedAt, note, canResubmit, onResubmit }: {
  icon: React.ReactNode; title: string; description: string; badge: React.ReactNode;
  submittedAt: string | null; note: string; canResubmit: boolean; onResubmit?: () => void;
}) {
  return (
    <div className="max-w-lg">
      <Card className="bg-gray-900 border-gray-800 text-center">
        <CardContent className="pt-10 pb-8 space-y-4">
          <div className="flex justify-center">{icon}</div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-gray-400 text-sm">{description}</p>
          </div>
          <div className="flex justify-center">{badge}</div>
          {submittedAt && (
            <p className="text-xs text-gray-500">
              Submitted: {new Date(submittedAt).toLocaleString()}
            </p>
          )}
          {note && (
            <div className="bg-gray-800 rounded-lg p-3 text-left text-sm text-gray-300 border border-gray-700">
              <p className="text-xs text-gray-500 mb-1">Review Note</p>
              {note}
            </div>
          )}
          {canResubmit && onResubmit && (
            <Button onClick={onResubmit} className="bg-indigo-600 hover:bg-indigo-700 w-full mt-2">
              <RefreshCw className="w-4 h-4 mr-2" /> Update & Resubmit
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/60 border-b border-gray-800">
        <Icon className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">{title}</span>
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-gray-200 text-right">{value || "—"}</span>
    </div>
  );
}
