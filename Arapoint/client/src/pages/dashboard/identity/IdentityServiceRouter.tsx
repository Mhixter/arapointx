import { tokenStorage } from '@/lib/tokenStorage';
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Search, CheckCircle2, Download, Clock, FileText, AlertCircle, AlertTriangle, Eye, ShieldCheck, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SERVICES } from "../IdentityVerification";
import { useState, useRef, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import slipInfo from '@assets/image_1764211401623.png';
import slipRegular from '@assets/image_1764211451522.png';
import slipStandard from '@assets/image_1764211490940.png';
import slipPremium from '@assets/image_1764211520708.png';

const DEFAULT_SLIP_TYPES = [
  { id: "information", name: "Information Slip", price: 200, image: slipInfo },
  { id: "regular", name: "Regular Slip", price: 250, image: slipRegular },
  { id: "standard", name: "Standard Slip", price: 300, image: slipStandard },
  { id: "premium", name: "Premium Slip", price: 300, image: slipPremium },
];

const IPE_STATUS_OPTION_DEFS = [
  { id: "in_processing_error", name: "InProcessing Error" },
  { id: "still_being_process", name: "Still Being Process" },
  { id: "new_enrollment", name: "New Enrollment For Tracking ID" },
  { id: "invalid_tracking", name: "Invalid Tracking ID" },
];

const VALIDATION_OPTION_DEFS = [
  { id: "no_record_found", name: "No Record Found" },
  { id: "update_record", name: "Update Record" },
  { id: "validate_modification", name: "Validate Modification" },
  { id: "vnin_validation", name: "V-NIN Validation" },
  { id: "photograph_error", name: "Photograph Error" },
  { id: "bypass_nin", name: "Bypass NIN" },
];

const IPE_SLIP_TYPES = [
  { id: "regular", name: "Regular Slip", price: 0, image: slipRegular },
  { id: "premium", name: "Premium Slip", price: 150, image: slipPremium },
];

const VALIDATION_SLIP_TYPES = [
  { id: "no_slip", name: "No Slip", price: 0, image: null },
  { id: "regular", name: "Regular Slip", price: 150, image: slipRegular },
];

const SERVICE_HERO: Record<string, { gradient: string; accent: string; tag: string }> = {
  "nin-verification":  { gradient: "from-green-600 via-emerald-600 to-teal-700",   accent: "bg-green-500",   tag: "Popular" },
  "nin-phone":         { gradient: "from-blue-600 via-blue-700 to-indigo-700",      accent: "bg-blue-500",    tag: "Fast" },
  "nin-tracking":      { gradient: "from-cyan-600 via-teal-600 to-emerald-700",     accent: "bg-cyan-500",    tag: "Tracking" },
  "ipe-clearance":     { gradient: "from-teal-600 via-emerald-700 to-green-800",    accent: "bg-teal-500",    tag: "Instant" },
  "validation":        { gradient: "from-emerald-600 via-green-700 to-teal-800",    accent: "bg-emerald-500", tag: "Instant" },
  "personalization":   { gradient: "from-pink-600 via-rose-600 to-red-600",         accent: "bg-pink-500",    tag: "Premium" },
  "birth-attestation": { gradient: "from-rose-600 via-red-600 to-orange-600",       accent: "bg-rose-500",    tag: "Official" },
};

function StepBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold mr-2 shrink-0">
      {n}
    </span>
  );
}

function SlipCard({ slip, selected, onClick }: { slip: any; selected: boolean; onClick: () => void }) {
  if (slip.maintenance) {
    return (
      <div className="relative rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-3 opacity-70 cursor-not-allowed select-none">
        <div className="text-center mb-2">
          <span className="text-sm font-bold text-gray-400">₦{Number(slip.price).toFixed(2)}</span>
        </div>
        <div className="aspect-[3/2] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-2 relative">
          <img src={slip.image} alt={slip.name} className="w-full h-full object-cover grayscale" />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center">
              <span className="text-[10px] font-bold text-yellow-300 bg-yellow-900/70 px-2 py-0.5 rounded-full whitespace-nowrap">🔧 Maintenance</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-center font-semibold text-gray-400">{slip.name}</p>
      </div>
    );
  }
  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer rounded-xl border-2 p-3 transition-all duration-200 hover:shadow-md ${
        selected
          ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary/40 hover:bg-primary/3'
      }`}
    >
      {selected && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className="text-center mb-2">
        <span className="text-sm font-bold text-primary">₦{Number(slip.price).toFixed(2)}</span>
      </div>
      <div className="aspect-[3/2] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-2">
        <img src={slip.image} alt={slip.name} className="w-full h-full object-cover" />
      </div>
      <p className="text-xs text-center font-semibold text-orange-600 dark:text-orange-400">{slip.name}</p>
    </div>
  );
}

function OptionCard({ option, selected, onClick }: { option: any; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
        selected
          ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary/40'
      }`}
    >
      {selected && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
        </div>
      )}
      <span className="block text-sm font-bold text-primary mb-1">₦{Number(option.price).toLocaleString()}</span>
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{option.name}</p>
    </div>
  );
}

function ConsentBox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
      <Checkbox
        id="consent"
        checked={checked}
        onCheckedChange={(v) => onChange(v as boolean)}
        className="mt-0.5"
      />
      <label htmlFor="consent" className="text-sm text-amber-900 dark:text-amber-300 leading-relaxed cursor-pointer">
        By checking this box, you confirm that the owner of the ID has granted you consent to verify his/her identity.
      </label>
    </div>
  );
}

function SubmitBtn({ loading, disabled, label = "Submit", icon: Icon = Search }: { loading: boolean; disabled: boolean; label?: string; icon?: any }) {
  return (
    <Button
      type="submit"
      size="lg"
      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md w-full sm:w-auto px-10"
      disabled={loading || disabled}
    >
      {loading ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
      ) : (
        <><Icon className="mr-2 h-4 w-4" />{label}</>
      )}
    </Button>
  );
}

export default function IdentityServiceRouter() {
  const [match, params] = useRoute("/dashboard/identity/:service");
  const serviceId = params?.service;
  const service = SERVICES.find(s => s.id === serviceId);

  if (!service) {
    return <div>Service not found</div>;
  }

  const hero = SERVICE_HERO[service.id] || { gradient: "from-gray-600 to-gray-800", accent: "bg-gray-500", tag: "" };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Gradient Hero Banner */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${hero.gradient} p-6 text-white shadow-lg`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white translate-y-1/3 -translate-x-1/3" />
        </div>
        <div className="relative flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Link href="/dashboard/identity">
              <button className="flex items-center gap-1 text-white/70 hover:text-white text-sm transition-colors mb-1">
                <ArrowLeft className="h-4 w-4" /> Back to Services
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <service.icon className="h-6 w-6 opacity-90" />
              <span className="text-xs font-semibold uppercase tracking-wider opacity-75">NIN Services</span>
              {hero.tag && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-medium">{hero.tag}</span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">{service.name}</h1>
            <p className="text-white/75 text-sm max-w-md">{service.desc}</p>
          </div>
          <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 shrink-0">
            <service.icon className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      <ServiceContent service={service} />
    </div>
  );
}

function ServiceContent({ service }: { service: any }) {
  const [isLoading, setIsLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState<"idle" | "pending" | "completed" | "error">("idle");
  const [result, setResult] = useState<any>(null);
  const [slipHtml, setSlipHtml] = useState<string | null>(null);
  const [slipDownloadUrl, setSlipDownloadUrl] = useState<string | null>(null);
  const [slipReference, setSlipReference] = useState<string | null>(null);
  const [selectedSlip, setSelectedSlip] = useState("regular");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState("");
  const [submittedTrackingId, setSubmittedTrackingId] = useState<string | null>(null);
  const [agentResult, setAgentResult] = useState<any>(null);
  const { toast } = useToast();
  const slipContainerRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (requestStatus !== "pending" || !submittedTrackingId) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const token = tokenStorage.getItem('accessToken');

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/identity-agent/my-requests/${submittedTrackingId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const req = json.data?.request;
        if (!req) return;

        if (req.status === 'completed' || req.status === 'rejected') {
          setAgentResult(req);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch {
      }
    };

    checkStatus();
    pollIntervalRef.current = setInterval(checkStatus, 15000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [requestStatus, submittedTrackingId]);

  const { data: pricingData } = useQuery({
    queryKey: ['/api/identity/pricing'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/identity/pricing');
        const json = await res.json();
        return json.data?.pricing || null;
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  const SLIP_TYPES = useMemo(() => {
    const pricing = pricingData;
    return [
      { id: "information", name: "Full Information Slip", price: pricing?.information || 200, image: slipInfo, maintenance: true },
      { id: "regular",     name: "Regular Slip",     price: pricing?.regular     || 250, image: slipRegular },
      { id: "standard",    name: "Standard Slip",    price: pricing?.standard    || 300, image: slipStandard },
      { id: "premium",     name: "Premium Slip",     price: pricing?.premium     || 300, image: slipPremium },
    ];
  }, [pricingData]);

  const IPE_STATUS_OPTIONS = useMemo(() => {
    const p = pricingData?.ipe_clearance || 1000;
    return IPE_STATUS_OPTION_DEFS.map(o => ({ ...o, price: p }));
  }, [pricingData]);

  const VALIDATION_OPTIONS = useMemo(() => {
    const p = pricingData?.nin_validation || 1000;
    return VALIDATION_OPTION_DEFS.map(o => ({ ...o, price: p }));
  }, [pricingData]);

  const getAuthToken = () => tokenStorage.getItem('accessToken');

  const getSlipPrice = () => {
    const slip = SLIP_TYPES.find(s => s.id === selectedSlip);
    return slip?.price || 200;
  };

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!consentChecked) {
      toast({ title: "Consent Required", description: "Please check the consent box to proceed", variant: "destructive" });
      return;
    }

    const formData = new FormData(e.currentTarget);
    const inputValue = formData.get("input") as string;
    const trackingId = formData.get("trackingId") as string;

    setError(""); setIsLoading(true); setResult(null);
    setSlipHtml(null); setSlipDownloadUrl(null); setSlipReference(null);

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Please login to continue");

      let endpoint = '';
      let body: any = {};

      if (service.id === "nin-verification") {
        endpoint = '/api/identity/nin';
        body = { nin: inputValue, slipType: selectedSlip };
      } else if (service.id === "nin-phone") {
        endpoint = '/api/identity/nin-phone';
        body = { phone: inputValue, slipType: selectedSlip };
      } else if (service.id === "nin-tracking") {
        endpoint = '/api/identity/nin-tracking';
        body = { trackingId: inputValue, slipType: selectedSlip };
      } else if (service.id === "ipe-clearance") {
        endpoint = '/api/identity/ipe-clearance';
        body = { trackingId: trackingId || inputValue, statusType: selectedStatus, slipType: selectedSlip };
      } else if (service.id === "validation") {
        endpoint = '/api/identity/validation';
        body = { nin: inputValue, validationType: selectedStatus, slipType: selectedSlip };
      } else if (service.id === "personalization") {
        endpoint = '/api/identity/personalization';
        body = { trackingId: inputValue };
      } else if (service.id === "birth-attestation") {
        const fullName     = formData.get("fullName") as string;
        const dateOfBirth  = formData.get("dateOfBirth") as string;
        const placeOfBirth = formData.get("placeOfBirth") as string;
        const gender       = formData.get("gender") as string;
        const lga          = formData.get("lga") as string;
        const parentName   = formData.get("parentName") as string;
        endpoint = '/api/identity/birth-attestation';
        body = { fullName, dateOfBirth, placeOfBirth, gender, lga, parentName };
      } else {
        throw new Error("Unknown service type");
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Verification failed');

      const resultData = data.data?.data || data.data;
      const hasValidResult = resultData && (
        resultData.firstName || resultData.lastName || resultData.dateOfBirth ||
        resultData.firstname || resultData.surname || resultData.message
      );

      setResult(resultData);
      if (data.data?.slip?.html)        setSlipHtml(data.data.slip.html);
      if (data.data?.slip?.downloadUrl) { setSlipDownloadUrl(data.data.slip.downloadUrl); setSlipReference(data.data.slip.slipReference); }

      const agentProcessedServices = ['ipe-clearance', 'validation', 'personalization', 'birth-attestation', 'nin-tracking'];
      if (agentProcessedServices.includes(service.id)) {
        setRequestStatus("pending");
        setAgentResult(null);
        if (data.data?.trackingId) setSubmittedTrackingId(data.data.trackingId);
        toast({ title: "Request Submitted", variant: "success", description: data.data?.message || `Your ${service.name} request has been submitted` });
      } else if (!hasValidResult) {
        throw new Error('No record found for the provided ID. Please double-check and try again.');
      } else {
        setRequestStatus("completed");
        toast({ title: "Verification Successful", variant: "success", description: `${service.name} completed successfully` });
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setRequestStatus("error");
      toast({ title: "Verification Failed", description: err.message || 'An error occurred during verification', variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadSlip = async () => {
    const token = getAuthToken();
    if (slipDownloadUrl && token) {
      try {
        const response = await fetch(slipDownloadUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Download failed');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `NIN-Slip-${slipReference || Date.now()}.pdf`;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link); URL.revokeObjectURL(url);
        toast({ title: "Slip Downloaded", variant: "success", description: "Your NIN slip has been downloaded as PDF" });
      } catch {
        toast({ title: "Download Failed", description: "Failed to download slip. Please try again.", variant: "destructive" });
      }
    } else if (slipHtml) {
      const blob = new Blob([slipHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `${service.id}-slip-${Date.now()}.html`;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(url);
      toast({ title: "Slip Downloaded", variant: "success", description: "Open the HTML file in your browser and print it" });
    }
  };

  /* ── Status screens ─────────────────────────────────────────────── */
  if (requestStatus === "pending") {
    if (agentResult?.status === 'completed') {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-green-200 dark:border-green-800 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-green-400 to-emerald-500" />
            <CardContent className="pt-10 pb-10 text-center space-y-4">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 flex items-center justify-center mx-auto text-green-500">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold text-green-800 dark:text-green-400">Request Completed!</h3>
              <p className="text-green-700 dark:text-green-300 max-w-sm mx-auto text-sm leading-relaxed">
                Your <strong>{service.name}</strong> request has been processed by our team.
              </p>
              {agentResult.resolvedTrackingId && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 text-center max-w-sm mx-auto">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">New NIMC Tracking ID</p>
                  <p className="text-xl font-bold text-green-900 dark:text-green-200 tracking-widest">{agentResult.resolvedTrackingId}</p>
                </div>
              )}
              {agentResult.agentNotes && (
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left max-w-sm mx-auto">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Agent Feedback</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{agentResult.agentNotes}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Check your email for the full result and download link.</p>
              <Button onClick={() => { setRequestStatus("idle"); setAgentResult(null); setSubmittedTrackingId(null); }} variant="outline" className="mt-4">
                Submit Another Request
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (agentResult?.status === 'rejected') {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-red-200 dark:border-red-800 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-red-400 to-rose-500" />
            <CardContent className="pt-10 pb-10 text-center space-y-4">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 flex items-center justify-center mx-auto text-red-500">
                <AlertCircle className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold text-red-800 dark:text-red-400">Request Could Not Be Completed</h3>
              <p className="text-red-700 dark:text-red-300 max-w-sm mx-auto text-sm leading-relaxed">
                Unfortunately, our team was unable to process your <strong>{service.name}</strong> request.
              </p>
              {agentResult.agentNotes && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-left max-w-sm mx-auto">
                  <p className="text-xs font-semibold text-red-500 dark:text-red-400 mb-1">Reason</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{agentResult.agentNotes}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Please contact support if you believe this is an error.</p>
              <Button onClick={() => { setRequestStatus("idle"); setAgentResult(null); setSubmittedTrackingId(null); }} variant="outline" className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-yellow-200 dark:border-yellow-800 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-yellow-400 to-amber-500" />
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/40 dark:to-amber-900/40 flex items-center justify-center mx-auto text-yellow-500">
              <Clock className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold text-yellow-800 dark:text-yellow-400">Request Submitted!</h3>
            <p className="text-yellow-700 dark:text-yellow-300 max-w-sm mx-auto text-sm leading-relaxed">
              Your <strong>{service.name}</strong> request has been submitted successfully.
              Requests are typically processed the same day — often within 1–30 minutes depending on traffic.
            </p>
            {submittedTrackingId && (
              <p className="text-xs text-muted-foreground font-mono">Ref: {submittedTrackingId}</p>
            )}
            <div className="flex items-center justify-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Checking for updates every 15 seconds…</span>
            </div>
            <Button onClick={() => { setRequestStatus("idle"); setSubmittedTrackingId(null); }} variant="outline" className="mt-4">
              Submit Another Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requestStatus === "error") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-red-200 dark:border-red-800 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-red-400 to-rose-500" />
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 flex items-center justify-center mx-auto text-red-500">
              <AlertCircle className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold text-red-800 dark:text-red-400">Verification Failed</h3>
            <p className="text-red-700 dark:text-red-300 max-w-sm mx-auto text-sm leading-relaxed">
              {error || 'An error occurred during verification. Please try again.'}
            </p>
            <Button onClick={() => { setRequestStatus("idle"); setError(""); }} variant="outline" className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── NIN Verification ───────────────────────────────────────────── */
  if (service.id === "nin-verification") {
    return (
      <div className="space-y-5">
        <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-7">
              {/* Step 1 */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <StepBadge n={1} /> Choose Slip Layout
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SLIP_TYPES.map(slip => (
                    <SlipCard key={slip.id} slip={slip} selected={selectedSlip === slip.id} onClick={() => setSelectedSlip(slip.id)} />
                  ))}
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <StepBadge n={2} /> Enter NIN
                </p>
                <Input
                  name="input"
                  placeholder="Enter 11-digit NIN"
                  maxLength={11}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  className="h-12 font-mono text-lg tracking-widest bg-gray-50 dark:bg-gray-800"
                />
                <p className="text-xs text-muted-foreground mt-1.5">We'll never share your details with anyone else.</p>
              </div>

              {/* Consent */}
              <ConsentBox checked={consentChecked} onChange={setConsentChecked} />

              {/* Price + Submit */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total charge:</span>
                  <Badge variant="secondary" className="text-base px-3 py-1 font-bold text-primary">
                    ₦{getSlipPrice().toFixed(2)}
                  </Badge>
                </div>
                <SubmitBtn loading={isLoading} disabled={!consentChecked} label="Verify NIN" />
              </div>
            </form>
          </CardContent>
        </Card>

        {result && (
          <ResultSection result={result} slipHtml={slipHtml} onDownload={handleDownloadSlip} slipContainerRef={slipContainerRef} />
        )}
      </div>
    );
  }

  /* ── NIN With Phone ─────────────────────────────────────────────── */
  if (service.id === "nin-phone") {
    return (
      <div className="space-y-5">
        <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-7">
              {/* Step 1 */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <StepBadge n={1} /> Choose Slip Layout
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SLIP_TYPES.map(slip => (
                    <SlipCard key={slip.id} slip={slip} selected={selectedSlip === slip.id} onClick={() => setSelectedSlip(slip.id)} />
                  ))}
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <StepBadge n={2} /> Enter Phone Number
                </p>
                <Input
                  name="input"
                  placeholder="e.g. 08012345678"
                  maxLength={15}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  className="h-12 font-mono text-lg tracking-widest bg-gray-50 dark:bg-gray-800"
                />
                <p className="text-xs text-muted-foreground mt-1.5">Enter the phone number linked to your NIN.</p>
              </div>

              <ConsentBox checked={consentChecked} onChange={setConsentChecked} />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total charge:</span>
                  <Badge variant="secondary" className="text-base px-3 py-1 font-bold text-primary">
                    ₦{getSlipPrice().toFixed(2)}
                  </Badge>
                </div>
                <SubmitBtn loading={isLoading} disabled={!consentChecked} label="Verify" />
              </div>
            </form>
          </CardContent>
        </Card>

        {result && (
          <ResultSection result={result} slipHtml={slipHtml} onDownload={handleDownloadSlip} slipContainerRef={slipContainerRef} />
        )}
      </div>
    );
  }

  /* ── NIN With Tracking ID ───────────────────────────────────────── */
  if (service.id === "nin-tracking") {
    return (
      <div className="space-y-5">
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
            <strong>Note:</strong> Requests are processed the same day — often within 1–30 minutes depending on traffic. Thank you for your support!
          </AlertDescription>
        </Alert>

        <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="h-1 bg-gradient-to-r from-cyan-500 to-teal-500" />
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-7">
              {/* Step 1 */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <StepBadge n={1} /> Choose Slip Layout
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  {[{ id: "standard", name: "Standard Slip", price: 250, image: slipStandard }].map(slip => (
                    <SlipCard key={slip.id} slip={slip} selected={selectedSlip === "standard"} onClick={() => setSelectedSlip("standard")} />
                  ))}
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <StepBadge n={2} /> Enter NIN Tracking ID
                </p>
                <Input
                  name="input"
                  placeholder="Enter Tracking ID"
                  required
                  className="h-12 font-mono tracking-widest bg-gray-50 dark:bg-gray-800 uppercase"
                />
                <p className="text-xs text-muted-foreground mt-1.5">We'll never share your details with anyone else.</p>
              </div>

              <ConsentBox checked={consentChecked} onChange={setConsentChecked} />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total charge:</span>
                  <Badge variant="secondary" className="text-base px-3 py-1 font-bold text-primary">₦250.00</Badge>
                </div>
                <SubmitBtn loading={isLoading} disabled={!consentChecked} label="Submit Request" />
              </div>
            </form>
          </CardContent>
        </Card>

        {result && (
          <ResultSection result={result} slipHtml={slipHtml} onDownload={handleDownloadSlip} slipContainerRef={slipContainerRef} />
        )}
      </div>
    );
  }

  /* ── IPE Clearance ──────────────────────────────────────────────── */
  if (service.id === "ipe-clearance") {
    const selectedIPEOption = IPE_STATUS_OPTIONS.find(o => o.id === selectedStatus);
    const selectedIPESlip   = IPE_SLIP_TYPES.find(s => s.id === selectedSlip);
    const total = (selectedIPEOption?.price || 0) + (selectedIPESlip?.price || 0);

    return (
      <div className="space-y-5">
        <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-7">
              {/* Step 1 */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <StepBadge n={1} /> Select Issue Type
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {IPE_STATUS_OPTIONS.map(option => (
                    <OptionCard key={option.id} option={option} selected={selectedStatus === option.id} onClick={() => setSelectedStatus(option.id)} />
                  ))}
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <StepBadge n={2} /> Choose Slip Type
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  {IPE_SLIP_TYPES.map(slip => (
                    <SlipCard key={slip.id} slip={slip} selected={selectedSlip === slip.id} onClick={() => setSelectedSlip(slip.id)} />
                  ))}
                </div>
              </div>

              {/* Step 3 */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <StepBadge n={3} /> Enter Tracking ID
                </p>
                <Input
                  name="trackingId"
                  placeholder="Enter your NIN Tracking ID"
                  required
                  className="h-12 bg-gray-50 dark:bg-gray-800 font-mono tracking-widest"
                />
                <p className="text-xs text-muted-foreground mt-1.5">We'll never share your details with anyone else.</p>
              </div>

              <ConsentBox checked={consentChecked} onChange={setConsentChecked} />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total charge:</span>
                  <Badge variant="secondary" className="text-base px-3 py-1 font-bold text-primary">
                    ₦{total.toLocaleString()}.00
                  </Badge>
                </div>
                <SubmitBtn loading={isLoading} disabled={!consentChecked || !selectedStatus} label="Submit Request" icon={Zap} />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Validation ─────────────────────────────────────────────────── */
  if (service.id === "validation") {
    const selectedValOption = VALIDATION_OPTIONS.find(o => o.id === selectedStatus);
    const selectedValSlip   = VALIDATION_SLIP_TYPES.find(s => s.id === selectedSlip);
    const total = (selectedValOption?.price || 0) + (selectedValSlip?.price || 0);

    return (
      <div className="space-y-5">
        <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-green-500" />
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-7">
              {/* Step 1 */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <StepBadge n={1} /> Select Validation Type
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {VALIDATION_OPTIONS.map(option => (
                    <OptionCard key={option.id} option={option} selected={selectedStatus === option.id} onClick={() => setSelectedStatus(option.id)} />
                  ))}
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <StepBadge n={2} /> Choose Slip Type
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  {VALIDATION_SLIP_TYPES.map(slip => (
                    <div
                      key={slip.id}
                      onClick={() => setSelectedSlip(slip.id)}
                      className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
                        selectedSlip === slip.id
                          ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary/40'
                      }`}
                    >
                      {selectedSlip === slip.id && (
                        <div className="absolute top-2 right-2"><CheckCircle2 className="h-4 w-4 text-primary" /></div>
                      )}
                      <span className="block text-sm font-bold text-primary mb-1">₦{slip.price.toFixed(1)}</span>
                      {slip.image ? (
                        <div className="aspect-[3/2] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-2">
                          <img src={slip.image} alt={slip.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="aspect-[3/2] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-2">
                          <span className="text-gray-400 text-xs">No Slip</span>
                        </div>
                      )}
                      <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 text-center">{slip.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3 */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <StepBadge n={3} /> Enter NIN
                </p>
                <Input
                  name="input"
                  placeholder="Enter 11-digit NIN"
                  maxLength={11}
                  required
                  className="h-12 font-mono tracking-widest bg-gray-50 dark:bg-gray-800"
                />
                <p className="text-xs text-muted-foreground mt-1.5">We'll never share your details with anyone else.</p>
              </div>

              <ConsentBox checked={consentChecked} onChange={setConsentChecked} />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total charge:</span>
                  <Badge variant="secondary" className="text-base px-3 py-1 font-bold text-primary">
                    ₦{total.toLocaleString()}.00
                  </Badge>
                </div>
                <SubmitBtn loading={isLoading} disabled={!consentChecked || !selectedStatus} label="Submit Request" icon={Zap} />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Personalization ────────────────────────────────────────────── */
  if (service.id === "personalization") {
    return (
      <div className="space-y-5">
        <Alert className="border-pink-200 bg-pink-50 dark:bg-pink-900/20 dark:border-pink-800 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-pink-600 dark:text-pink-400" />
          <AlertDescription className="text-pink-800 dark:text-pink-300 text-sm">
            <strong>Note:</strong> Requests are processed the same day — often within 1–30 minutes depending on traffic.
          </AlertDescription>
        </Alert>

        <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="h-1 bg-gradient-to-r from-pink-500 to-rose-500" />
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-7">
              {/* Step 1 */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <StepBadge n={1} /> Enter Tracking ID / Reference
                </p>
                <Input
                  name="input"
                  placeholder="Enter your NIN Tracking ID or Reference"
                  required
                  className="h-12 font-mono tracking-widest bg-gray-50 dark:bg-gray-800"
                />
                <p className="text-xs text-muted-foreground mt-1.5">We'll never share your details with anyone else.</p>
              </div>

              <ConsentBox checked={consentChecked} onChange={setConsentChecked} />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Service fee:</span>
                  <Badge variant="secondary" className="text-base px-3 py-1 font-bold text-primary">Agent Quoted</Badge>
                </div>
                <SubmitBtn loading={isLoading} disabled={!consentChecked} label="Submit Request" icon={FileText} />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Birth Attestation ──────────────────────────────────────────── */
  if (service.id === "birth-attestation") {
    return (
      <div className="space-y-5">
        <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="h-1 bg-gradient-to-r from-rose-500 to-orange-500" />
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-7">
              {/* Step 1 */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                  <StepBadge n={1} /> Enter Personal Details
                </p>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-sm">Full Name</Label>
                    <Input id="fullName" name="fullName" placeholder="Full name as on birth certificate" className="h-12 bg-gray-50 dark:bg-gray-800" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="dateOfBirth" className="text-sm">Date of Birth</Label>
                      <Input id="dateOfBirth" name="dateOfBirth" type="date" className="h-12 bg-gray-50 dark:bg-gray-800" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="gender" className="text-sm">Gender</Label>
                      <select name="gender" className="h-12 w-full rounded-lg border border-input bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm" required>
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="placeOfBirth" className="text-sm">State of Registration</Label>
                    <Input id="placeOfBirth" name="placeOfBirth" placeholder="State where birth was registered" className="h-12 bg-gray-50 dark:bg-gray-800" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lga" className="text-sm">Local Government Area (LGA)</Label>
                    <Input id="lga" name="lga" placeholder="LGA of registration" className="h-12 bg-gray-50 dark:bg-gray-800" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="parentName" className="text-sm">Parent / Guardian Name</Label>
                    <Input id="parentName" name="parentName" placeholder="Name of parent or guardian" className="h-12 bg-gray-50 dark:bg-gray-800" required />
                  </div>
                </div>
              </div>

              <ConsentBox checked={consentChecked} onChange={setConsentChecked} />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Service fee:</span>
                  <Badge variant="secondary" className="text-base px-3 py-1 font-bold text-primary">
                    ₦{(pricingData?.birth_attestation || 2000).toLocaleString()}.00
                  </Badge>
                </div>
                <SubmitBtn loading={isLoading} disabled={!consentChecked} label="Request Certificate" icon={FileText} />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (service.id === "transactions") return <TransactionsHistory />;
  if (service.id === "verifications") return <VerificationsHistory />;

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center border rounded-xl bg-muted/10 border-dashed">
      <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${service.bg} ${service.color}`}>
        <service.icon className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-bold mb-2">{service.name}</h3>
      <p className="text-muted-foreground max-w-md mb-6">This service is currently being set up. Please check back later.</p>
      <Link href="/dashboard/identity">
        <Button variant="outline">Back to Services</Button>
      </Link>
    </div>
  );
}

/* ── Transactions History ────────────────────────────────────────────── */
function TransactionsHistory() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const token = tokenStorage.getItem('accessToken');
        const response = await fetch('/api/identity/service-requests', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if (response.ok) setRequests(data.data?.requests || []);
      } catch (error) {
        console.error('Failed to fetch requests', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      pickup:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const getServiceName = (type: string) => {
    const names: Record<string, string> = {
      ipe_clearance: 'IPE Clearance', nin_validation: 'NIN Validation',
      nin_personalization: 'Personalization', birth_attestation: 'Birth Attestation', nin_tracking: 'NIN Tracking',
    };
    return names[type] || type;
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden shadow-sm">
        <div className="h-1 bg-gradient-to-r from-gray-400 to-gray-500" />
        <CardHeader>
          <CardTitle>Service Requests</CardTitle>
          <CardDescription>Track the status of your identity service requests</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No service requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req: any) => {
                const fields = req.updateFields || {};
                const details: { label: string; value: string }[] = [];
                if (req.nin) details.push({ label: 'NIN', value: req.nin });
                if (req.newTrackingId) details.push({ label: 'Submitted Tracking ID', value: req.newTrackingId });
                if (fields.validationType) details.push({ label: 'Validation Type', value: fields.validationType });
                if (fields.statusType) details.push({ label: 'Status Type', value: fields.statusType });
                if (fields.fullName) details.push({ label: 'Full Name', value: fields.fullName });
                if (fields.dateOfBirth) details.push({ label: 'Date of Birth', value: fields.dateOfBirth });
                if (fields.placeOfBirth) details.push({ label: 'Place of Birth', value: fields.placeOfBirth });
                if (fields.gender) details.push({ label: 'Gender', value: fields.gender });
                if (fields.lga) details.push({ label: 'LGA', value: fields.lga });
                if (fields.parentName) details.push({ label: 'Parent/Guardian', value: fields.parentName });
                if (req.customerNotes) details.push({ label: 'Notes', value: req.customerNotes });
                if (req.agentNotes) details.push({ label: 'Agent Notes', value: req.agentNotes });

                const hasResolvedTracking = req.resolvedTrackingId && req.resolvedTrackingId !== req.newTrackingId;

                return (
                  <div key={req.id} className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-semibold">{getServiceName(req.serviceType)}</p>
                        <p className="text-sm text-muted-foreground font-mono">Ref: {req.trackingId}</p>
                        <p className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(req.status)}`}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                        <p className="text-sm font-semibold text-primary">₦{parseFloat(req.fee).toLocaleString()}</p>
                      </div>
                    </div>

                    {hasResolvedTracking && (
                      <div className="px-4 py-3 bg-green-50 dark:bg-green-950/30 border-t border-green-200 dark:border-green-800 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Resolved Tracking ID</p>
                          <p className="text-base font-bold text-green-900 dark:text-green-200 tracking-widest font-mono mt-0.5">{req.resolvedTrackingId}</p>
                        </div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(req.resolvedTrackingId); }}
                          className="text-xs text-green-700 dark:text-green-400 hover:underline flex-shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    )}

                    {details.length > 0 && (
                      <div className="px-4 pb-4 pt-0 bg-muted/20 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 pt-3">Submitted Details</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {details.map((d) => (
                            <div key={d.label} className="flex gap-2 text-xs">
                              <span className="text-muted-foreground min-w-[90px]">{d.label}:</span>
                              <span className="font-mono font-medium break-all">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Verifications History ───────────────────────────────────────────── */
function VerificationsHistory() {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [selectedVerification, setSelectedVerification] = useState<any>(null);

  useEffect(() => {
    const fetchVerifications = async () => {
      try {
        const token = tokenStorage.getItem('accessToken');
        const response = await fetch('/api/identity/history', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if (response.ok) setVerifications(data.data?.history || []);
      } catch (error) {
        console.error('Failed to fetch verifications', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVerifications();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      pickup:    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      failed:    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const getStatusLabel = (status: string) => (
    { pending: 'Pending', pickup: 'In Progress', completed: 'Completed', failed: 'Failed' }[status] || status
  );

  const getServiceLabel = (type: string) => {
    const labels: Record<string, string> = {
      nin_verification: 'NIN Verification', nin_phone: 'NIN by Phone', nin_tracking: 'NIN by Tracking',
      nin_validation: 'NIN Validation', ipe_clearance: 'IPE Clearance', nin_personalization: 'NIN Personalization',
      bvn_verification: 'BVN Verification',
    };
    return labels[type] || type?.toUpperCase().replace(/_/g, ' ') || 'Unknown';
  };

  const handleDownload = async (downloadUrl: string, slipReference: string) => {
    try {
      const token = tokenStorage.getItem('accessToken');
      const response = await fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `NIN-Slip-${slipReference}.pdf`;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(url);
      toast({ title: "Slip Downloaded", variant: "success", description: "Your NIN slip has been downloaded" });
    } catch {
      toast({ title: "Download Failed", description: "Failed to download slip. Please try again.", variant: "destructive" });
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden shadow-sm">
        <div className="h-1 bg-gradient-to-r from-slate-400 to-slate-500" />
        <CardHeader>
          <CardTitle>Verification History</CardTitle>
          <CardDescription>Your past identity verifications with downloadable slips</CardDescription>
        </CardHeader>
        <CardContent>
          {verifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No verifications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {verifications.map((v: any) => (
                <div key={v.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 space-y-2 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{getServiceLabel(v.verificationType)}</p>
                        {v.trackingId && <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{v.trackingId}</span>}
                      </div>
                      {v.nin && <p className="text-sm text-muted-foreground">NIN: {v.nin.substring(0, 4)}****</p>}
                      <p className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {v.source === 'api' && v.downloadUrl && v.status === 'completed' && (
                        <Button size="sm" variant="outline" onClick={() => handleDownload(v.downloadUrl, v.slipReference)} className="gap-1">
                          <Download className="h-3 w-3" /> Download
                        </Button>
                      )}
                      {v.source === 'agent' && v.downloadUrl && v.status === 'completed' && (
                        <Button size="sm" variant="outline" onClick={() => handleDownload(v.downloadUrl, v.trackingId || v.id)} className="gap-1">
                          <Download className="h-3 w-3" /> Slip
                        </Button>
                      )}
                      {v.source === 'agent' && (
                        <Button size="sm" variant="ghost" onClick={() => setSelectedVerification(v)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(v.status)}`}>
                        {getStatusLabel(v.status)}
                      </span>
                    </div>
                  </div>
                  {v.source === 'agent' && v.status === 'completed' && v.agentNotes && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400">Agent Feedback</p>
                      <p className="text-sm mt-1">{v.agentNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedVerification && (
            <Dialog open={!!selectedVerification} onOpenChange={() => setSelectedVerification(null)}>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Request Details</DialogTitle>
                  <DialogDescription className="font-mono text-xs">{selectedVerification.trackingId}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Service</p>
                      <p className="font-medium">{getServiceLabel(selectedVerification.verificationType)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Status</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedVerification.status)}`}>
                        {getStatusLabel(selectedVerification.status)}
                      </span>
                    </div>
                    {selectedVerification.fee && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Fee</p>
                        <p className="font-medium">₦{parseFloat(selectedVerification.fee).toLocaleString()}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Date</p>
                      <p>{new Date(selectedVerification.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Submitted Details */}
                  {(() => {
                    const details: { label: string; value: string }[] = [];
                    if (selectedVerification.nin) details.push({ label: 'NIN', value: selectedVerification.nin });
                    if (selectedVerification.submittedTrackingId) details.push({ label: 'Tracking ID', value: selectedVerification.submittedTrackingId });
                    const uf = selectedVerification.updateFields;
                    if (uf && typeof uf === 'object') {
                      const labelMap: Record<string, string> = {
                        fullName: 'Full Name', dateOfBirth: 'Date of Birth', placeOfBirth: 'Place of Birth',
                        parentName: 'Parent/Guardian', lga: 'LGA', gender: 'Gender',
                        validationType: 'Validation Type', slipType: 'Slip Type', statusType: 'Status Type',
                        trackingId: 'Tracking ID', email: 'Email', phone: 'Phone',
                        firstName: 'First Name', lastName: 'Last Name', middleName: 'Middle Name',
                      };
                      for (const [key, val] of Object.entries(uf)) {
                        if (val && key !== '__typename') {
                          details.push({ label: labelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), value: String(val) });
                        }
                      }
                    }
                    if (details.length === 0) return null;
                    return (
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-muted/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Submitted Details</p>
                        <div className="space-y-1.5">
                          {details.map((d) => (
                            <div key={d.label} className="flex gap-2 text-xs">
                              <span className="text-muted-foreground min-w-[100px] shrink-0">{d.label}:</span>
                              <span className="font-mono font-medium break-all">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {selectedVerification.status === 'completed' && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 space-y-2">
                      <p className="font-semibold text-green-700 dark:text-green-400 text-sm">Request Completed</p>
                      {selectedVerification.agentNotes && (
                        <div>
                          <p className="text-xs text-muted-foreground">Agent Feedback</p>
                          <p className="text-sm mt-1">{selectedVerification.agentNotes}</p>
                        </div>
                      )}
                      {selectedVerification.downloadUrl && (
                        <Button variant="link" className="p-0 h-auto text-blue-600 underline text-sm font-medium" onClick={() => handleDownload(selectedVerification.downloadUrl, selectedVerification.trackingId || selectedVerification.id)}>
                          <Download className="h-4 w-4 mr-1" /> Download Slip
                        </Button>
                      )}
                      {!selectedVerification.agentNotes && !selectedVerification.downloadUrl && (
                        <p className="text-sm text-muted-foreground">No additional feedback provided by the agent.</p>
                      )}
                    </div>
                  )}
                  {selectedVerification.customerNotes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Your Notes</p>
                      <p className="text-sm">{selectedVerification.customerNotes}</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Result Section ─────────────────────────────────────────────────── */
function ResultSection({ result, slipHtml, onDownload, slipContainerRef }: any) {
  const fullName = `${result.lastName || ''} ${result.firstName || ''} ${result.middleName || ''}`.trim();

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="overflow-hidden border-green-200 dark:border-green-800 shadow-md">
        <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
        <div className="bg-green-50 dark:bg-green-900/20 px-6 py-3 border-b border-green-200 dark:border-green-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
            <CheckCircle2 className="h-5 w-5" />
            Identity Verified
          </div>
          <span className="text-xs text-muted-foreground font-mono">{new Date().toLocaleString()}</span>
        </div>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="shrink-0">
              {result.photo ? (
                <img
                  src={result.photo.startsWith('data:') ? result.photo : `data:image/jpeg;base64,${result.photo}`}
                  alt="Face"
                  className="w-32 h-32 rounded-xl object-cover border-2 border-green-200 dark:border-green-800 shadow-sm bg-muted"
                />
              ) : (
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-muted flex items-center justify-center text-muted-foreground text-xs">
                  No Photo
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 flex-1">
              {[
                { label: "Full Name",    value: fullName || 'N/A', span: true },
                { label: "Date of Birth", value: result.dateOfBirth || result.dob || 'N/A' },
                { label: "Gender",       value: result.gender || 'N/A' },
                { label: "Phone",        value: result.phone || 'N/A' },
                { label: "State",        value: result.state || 'N/A' },
                { label: "LGA",          value: result.lga || 'N/A' },
                { label: "Address",      value: result.address || 'N/A', span: true },
              ].map(({ label, value, span }) => (
                <div key={label} className={span ? "md:col-span-2" : ""}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {slipHtml && (
        <div className="flex gap-3 justify-center">
          <Button onClick={onDownload} size="lg" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md">
            <Download className="mr-2 h-5 w-5" /> Download NIN Slip
          </Button>
        </div>
      )}
    </div>
  );
}
