import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

import { Loader2, CheckCircle2, FileUp, FileText, FileCheck, RotateCw, ArrowRight, ArrowLeft, Clock, Upload, Download, Eye, Printer, XCircle, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { servicesApi } from "@/lib/api/services";
import { handleApiError } from "@/lib/api/client";
import { tokenStorage } from "@/lib/tokenStorage";

const JAMB_SERVICES = [
  {
    id: "olevel-upload",
    name: "O'Level Upload",
    description: "Upload and verify your O'Level examination results",
    icon: FileUp,
    price: 2000,
    fields: [
      { name: "fullName", label: "Full Name", type: "text", required: true },
      { name: "regNumber", label: "Registration Number", type: "text", required: true },
      { name: "examYear", label: "Exam Year", type: "number", required: true },
      { name: "examBody", label: "Exam Body (WAEC/NECO/NBAIS)", type: "text", required: true },
    ],
    hasFileUpload: true,
  },
  {
    id: "admission-letter",
    name: "Admission Letter",
    description: "Check and download your admission status and letter",
    icon: FileText,
    price: 1500,
    fields: [
      { name: "jamb-reg", label: "JAMB Registration Number", type: "text", required: true },
      { name: "email", label: "Email Address", type: "email", required: true },
    ],
    hasFileUpload: false,
  },
  {
    id: "original-result",
    name: "Original Result",
    description: "Retrieve your original JAMB UTME/DE examination results",
    icon: FileCheck,
    price: 1800,
    fields: [
      { name: "jamb-reg", label: "JAMB Registration Number", type: "text", required: true },
      { name: "pin", label: "JAMB Result PIN", type: "text", required: true },
    ],
    hasFileUpload: false,
  },
  {
    id: "reprinting-caps",
    name: "Reprinting & Caps",
    description: "Request reprinting of JAMB documents and academic caps",
    icon: RotateCw,
    price: 3000,
    fields: [
      { name: "jamb-reg", label: "JAMB Registration Number", type: "text", required: true },
      {
        name: "itemType",
        label: "Item Type",
        type: "select",
        required: true,
        options: [
          "CHANGE OF COURSE SLIP",
          "REGISTRATION SLIP",
          "REPRINT PIN VENDED",
          "ORIGINAL RESULTS REPRINTS ONLY",
          "CHANGE OF COURSE REFRESH",
          "D.E REGISTRATION SLIP",
          "ADMISSION STATUS ONLY",
          "RETRIEVE PROFILE CODE",
          "OLEVEL RESULT CHECKING ON CAPS",
          "JAMB RESULT SCORE ON CAPS",
          "ACCEPT TRANSFER OFFER",
          "RETRIEVE REGISTRATION NUMBER",
          "TRANSFER APPROVAL CONFIRMATION",
          "ADMISSION STATUS WITH PICTURE",
          "ACCEPT TRANSFER APPROVAL",
          "REFRESH UPLOAD ON CAPS",
          "ACCEPT UNDISCLOSED ADMISSION",
        ],
      },
    ],
    hasFileUpload: false,
  },
];

const SERVICE_LABELS: Record<string, string> = {
  'olevel-upload': "O'Level Upload",
  'admission-letter': "Admission Letter",
  'original-result': "Original Result",
  'reprinting-caps': "Reprinting & Caps",
  'exam-slip': "Exam Slip Printing",
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  pickup: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
};

export default function JAMBServices() {
  const { toast } = useToast();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requestComplete, setRequestComplete] = useState(false);
  const [completedService, setCompletedService] = useState<any>(null);
  const [completedRequestId, setCompletedRequestId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [view, setView] = useState<'services' | 'history'>('services');
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedHistoryRequest, setSelectedHistoryRequest] = useState<any>(null);
  const [historyDocuments, setHistoryDocuments] = useState<any[]>([]);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);
  const [showHistoryDetail, setShowHistoryDetail] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  const [slipRegNo, setSlipRegNo] = useState('');
  const [slipLoading, setSlipLoading] = useState(false);
  const [slipJobId, setSlipJobId] = useState<string | null>(null);
  const [slipStatus, setSlipStatus] = useState<'idle' | 'polling' | 'completed' | 'failed'>('idle');
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [slipProgress, setSlipProgress] = useState(0);
  const [slipSiteClosed, setSlipSiteClosed] = useState(false);
  const [downloadingSlip, setDownloadingSlip] = useState(false);
  const slipPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopSlipPolling = useCallback(() => {
    if (slipPollRef.current) {
      clearInterval(slipPollRef.current);
      slipPollRef.current = null;
    }
  }, []);

  const pollSlipStatus = useCallback(async (jobId: string) => {
    try {
      const token = tokenStorage.getItem('accessToken') || '';
      const res = await fetch(`/api/education/jamb-slip-status/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const job = data?.data;
      if (!job) return;

      setSlipProgress(prev => Math.min(prev + 8, 90));

      if (job.status === 'completed' && job.slipUrl) {
        stopSlipPolling();
        setSlipUrl(job.slipUrl);
        setSlipStatus('completed');
        setSlipProgress(100);
        toast({ title: 'Exam Slip Ready!', description: 'Your JAMB examination slip has been retrieved. Click Download to save it.' });
      } else if (job.status === 'failed') {
        stopSlipPolling();
        setSlipStatus('failed');
        setSlipSiteClosed(!!job.siteClosed);
        setSlipError(job.errorMessage || 'The JAMB portal could not retrieve your slip. Please check your registration number and try again.');
        setSlipProgress(0);
      }
    } catch {}
  }, [stopSlipPolling, toast]);

  const downloadSlipPdf = useCallback(async () => {
    if (!slipJobId) return;
    setDownloadingSlip(true);
    try {
      const token = tokenStorage.getItem('accessToken') || '';
      const res = await fetch(`/api/education/jamb-slip-download-job/${slipJobId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JAMB_Slip_${slipRegNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Download Failed', description: 'Could not download the slip. Please try again.', variant: 'destructive' });
    } finally {
      setDownloadingSlip(false);
    }
  }, [slipJobId, slipRegNo, toast]);

  const handleSlipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slipRegNo.trim()) return;

    setSlipLoading(true);
    setSlipStatus('idle');
    setSlipUrl(null);
    setSlipError(null);
    setSlipProgress(5);
    stopSlipPolling();

    try {
      const token = tokenStorage.getItem('accessToken') || '';
      const res = await fetch('/api/education/jamb-exam-slip', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNumber: slipRegNo.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit request');

      const jobId = data?.data?.jobId;
      setSlipJobId(jobId);
      setSlipStatus('polling');
      setSlipProgress(15);

      slipPollRef.current = setInterval(() => pollSlipStatus(jobId), 5000);
    } catch (err: any) {
      setSlipStatus('failed');
      setSlipError(err.message || 'Failed to submit request');
      setSlipProgress(0);
      toast({ title: 'Request Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSlipLoading(false);
    }
  };

  const resetSlip = () => {
    stopSlipPolling();
    setSlipRegNo('');
    setSlipJobId(null);
    setSlipStatus('idle');
    setSlipUrl(null);
    setSlipError(null);
    setSlipProgress(0);
    setSlipSiteClosed(false);
    setDownloadingSlip(false);
  };

  useEffect(() => stopSlipPolling, [stopSlipPolling]);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('/api/education/jamb-service-prices');
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.prices) setLivePrices(data.data.prices);
        }
      } catch {}
    };
    fetchPrices();
  }, []);

  const getServicePrice = (svc: typeof JAMB_SERVICES[number]) =>
    livePrices[svc.id] !== undefined ? livePrices[svc.id] : svc.price;

  const service = selectedService ? JAMB_SERVICES.find(s => s.id === selectedService) : null;

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const requests = await servicesApi.jamb.getRequests();
      setHistory(requests);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load request history",
        variant: "destructive"
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryDetail = async (req: any) => {
    setSelectedHistoryRequest(req);
    setHistoryDocuments([]);
    setShowHistoryDetail(true);
    setHistoryDetailLoading(true);
    try {
      const docs = await servicesApi.jamb.getDocuments(req.id);
      setHistoryDocuments(docs);
    } catch {
      setHistoryDocuments([]);
    } finally {
      setHistoryDetailLoading(false);
    }
  };

  const downloadDocument = async (requestId: string, docId: string, fileName: string, isExamSlip = false) => {
    setDownloadingDocId(docId);
    try {
      const token = tokenStorage.getItem('accessToken');
      const endpoint = isExamSlip
        ? `/api/education/jamb-slip-download-req/${requestId}`
        : `/api/education/jamb-requests/${requestId}/documents/${docId}/download`;
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'document';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Download Failed", description: "Could not download the document.", variant: "destructive" });
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleFileUpload = async (requestId: string, file: File) => {
    setUploading(true);
    try {
      const token = tokenStorage.getItem('accessToken') || '';
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/education/jamb-request/${requestId}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Upload failed');
      toast({
        title: "Document Uploaded",
        description: "Your document has been uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !service) return;
    
    setIsLoading(true);

    try {
      const result = await servicesApi.jamb.submitRequest(selectedService, formData);
      
      setCompletedRequestId(result.trackingId);

      if (service.hasFileUpload && uploadFile && result.requestId) {
        await handleFileUpload(result.requestId, uploadFile);
      }

      setIsLoading(false);
      setRequestComplete(true);
      setCompletedService(service);

      toast({
        title: "Request Submitted",
        description: `Your ${service.name} request has been submitted successfully (ID: ${result.trackingId}).`,
      });
    } catch (error: any) {
      setIsLoading(false);
      const message = error.response?.data?.message || handleApiError(error);
      toast({
        title: message === 'Insufficient wallet balance' ? "Insufficient Balance" : "Submission Failed",
        description: message === 'Insufficient wallet balance'
          ? "You do not have enough wallet balance to complete this request. Please fund your wallet and try again."
          : message,
        variant: "destructive"
      });
    }
  };

  if (requestComplete && completedService) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold tracking-tight">JAMB Services</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">Request confirmation</p>
        </div>

        <Card className="max-w-2xl mx-auto text-center border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
          <CardContent className="pt-10 pb-10 space-y-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-green-800 dark:text-green-400">Request Submitted Successfully!</h3>
            <p className="text-green-700 dark:text-green-300 max-w-xs mx-auto">
              Your {completedService.name} request has been received and is being processed. You will be notified via email.
            </p>
            {completedRequestId && (
              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 my-4">
                <p className="text-sm text-muted-foreground">Tracking ID</p>
                <p className="font-bold text-lg">{completedRequestId}</p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <Button onClick={() => { setRequestComplete(false); setSelectedService(null); setFormData({}); setUploadFile(null); }} variant="outline">
                Request Another Service
              </Button>
              <Button onClick={() => { setRequestComplete(false); setSelectedService(null); setFormData({}); setUploadFile(null); setView('history'); fetchHistory(); }}>
                View My Requests
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'history') {
    const getStatusLabel = (status: string) => {
      if (status === 'pickup') return 'Processing';
      return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    };

    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'completed': return 'bg-green-100 text-green-700 border-green-200';
        case 'pickup': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case 'failed': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
      }
    };

    const parseFormData = (req: any): Record<string, string> => {
      try {
        if (req.customerNotes) return JSON.parse(req.customerNotes);
      } catch {}
      if (req.requestData && typeof req.requestData === 'object') return req.requestData;
      return {};
    };

    const getServiceIcon = (serviceType: string) => {
      switch (serviceType) {
        case 'olevel-upload': return FileUp;
        case 'admission-letter': return FileText;
        case 'original-result': return FileCheck;
        case 'reprinting-caps': return RotateCw;
        case 'exam-slip': return Printer;
        default: return FileText;
      }
    };

    const getServiceSpecificFields = (req: any): Array<{ label: string; value: string }> => {
      const form = parseFormData(req);
      const fields: Array<{ label: string; value: string }> = [];

      switch (req.serviceType) {
        case 'olevel-upload':
          if (form.fullName || req.candidateName) fields.push({ label: 'Full Name', value: form.fullName || req.candidateName });
          if (form.regNumber || req.registrationNumber) fields.push({ label: "Reg. Number", value: form.regNumber || req.registrationNumber });
          if (form.examYear || req.examYear) fields.push({ label: 'Exam Year', value: String(form.examYear || req.examYear) });
          if (form.examBody) fields.push({ label: 'Exam Body', value: form.examBody });
          break;
        case 'admission-letter':
          if (form['jamb-reg'] || req.registrationNumber) fields.push({ label: 'JAMB Reg. No.', value: form['jamb-reg'] || req.registrationNumber });
          if (form.email) fields.push({ label: 'Email', value: form.email });
          break;
        case 'original-result':
          if (form['jamb-reg'] || req.registrationNumber) fields.push({ label: 'JAMB Reg. No.', value: form['jamb-reg'] || req.registrationNumber });
          if (form.pin) fields.push({ label: 'Result PIN', value: '****' + form.pin?.slice(-4) });
          break;
        case 'reprinting-caps':
          if (form['jamb-reg'] || req.registrationNumber) fields.push({ label: 'JAMB Reg. No.', value: form['jamb-reg'] || req.registrationNumber });
          if (form.itemType) fields.push({ label: 'Item Type', value: form.itemType });
          break;
        case 'exam-slip':
          if (req.registrationNumber) fields.push({ label: 'Registration No.', value: req.registrationNumber });
          break;
      }
      return fields;
    };

    return (
      <>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('services')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Services
          </Button>
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">My JAMB Requests</h2>
          <p className="text-sm text-muted-foreground mt-1">Track all your JAMB service requests and their status.</p>
        </div>

        {historyLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-30" />
              <p className="font-medium text-muted-foreground">No requests yet</p>
              <p className="text-sm text-muted-foreground mt-1">Submit your first JAMB service request to get started.</p>
              <Button className="mt-4" size="sm" onClick={() => setView('services')}>Browse Services</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((req: any) => {
              const ServiceIcon = getServiceIcon(req.serviceType);
              const specificFields = getServiceSpecificFields(req);
              const hasDocuments = true;

              return (
                <Card key={req.id} className="overflow-hidden hover:shadow-md transition-shadow border-0 ring-1 ring-border/60">
                  <CardContent className="p-0">
                    <div className="flex items-start gap-0">
                      <div className={`w-1 self-stretch rounded-l-lg flex-shrink-0 ${
                        req.status === 'completed' ? 'bg-green-500' :
                        req.status === 'pickup' ? 'bg-blue-500' :
                        req.status === 'pending' ? 'bg-yellow-500' :
                        req.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                      }`} />
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              <ServiceIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm leading-tight">{SERVICE_LABELS[req.serviceType] || req.serviceType}</p>
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">{req.trackingId}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-xs flex-shrink-0 ${getStatusStyle(req.status)}`}>
                            {getStatusLabel(req.status)}
                          </Badge>
                        </div>

                        {specificFields.length > 0 && (
                          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 pl-12">
                            {specificFields.map(f => (
                              <div key={f.label}>
                                <span className="text-xs text-muted-foreground">{f.label}: </span>
                                <span className="text-xs font-medium">{f.value}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3 pl-12">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{new Date(req.createdAt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="font-medium text-foreground">₦{parseFloat(req.fee || '0').toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {req.serviceType === 'exam-slip' && req.status === 'completed' && req.resultUrl && (
                              <Button size="sm" className="h-7 text-xs px-3" onClick={() => downloadDocument(req.id, req.id, `JAMB_Slip_${req.registrationNumber || 'slip'}.pdf`)}>
                                {downloadingDocId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                                Download
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="h-7 text-xs px-3" onClick={() => openHistoryDetail(req)}>
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showHistoryDetail} onOpenChange={setShowHistoryDetail}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedHistoryRequest && (() => {
                const Icon = getServiceIcon(selectedHistoryRequest.serviceType);
                return <Icon className="h-5 w-5 text-muted-foreground" />;
              })()}
              {selectedHistoryRequest ? SERVICE_LABELS[selectedHistoryRequest.serviceType] || selectedHistoryRequest.serviceType : 'Request Details'}
            </DialogTitle>
            <DialogDescription className="font-mono">{selectedHistoryRequest?.trackingId}</DialogDescription>
          </DialogHeader>

          {selectedHistoryRequest && (() => {
            const specificFields = getServiceSpecificFields(selectedHistoryRequest);
            return (
              <div className="space-y-4 pt-1">
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  selectedHistoryRequest.status === 'completed' ? 'bg-green-50 dark:bg-green-950/30' :
                  selectedHistoryRequest.status === 'pickup' ? 'bg-blue-50 dark:bg-blue-950/30' :
                  selectedHistoryRequest.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-950/30' :
                  'bg-muted/40'
                }`}>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-semibold">{getStatusLabel(selectedHistoryRequest.status)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Service Fee</p>
                    <p className="font-semibold">₦{parseFloat(selectedHistoryRequest.fee || '0').toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Request Details</p>
                  <div className="space-y-0 divide-y divide-border/50 rounded-lg border overflow-hidden">
                    <div className="flex justify-between items-center px-3 py-2.5 bg-background">
                      <span className="text-xs text-muted-foreground">Service</span>
                      <span className="text-sm font-medium">{SERVICE_LABELS[selectedHistoryRequest.serviceType] || selectedHistoryRequest.serviceType}</span>
                    </div>
                    {specificFields.map(f => (
                      <div key={f.label} className="flex justify-between items-center px-3 py-2.5 bg-background">
                        <span className="text-xs text-muted-foreground">{f.label}</span>
                        <span className="text-sm font-medium font-mono">{f.value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center px-3 py-2.5 bg-background">
                      <span className="text-xs text-muted-foreground">Submitted</span>
                      <span className="text-sm">{new Date(selectedHistoryRequest.createdAt).toLocaleString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {selectedHistoryRequest.completedAt && (
                      <div className="flex justify-between items-center px-3 py-2.5 bg-background">
                        <span className="text-xs text-muted-foreground">Completed</span>
                        <span className="text-sm">{new Date(selectedHistoryRequest.completedAt).toLocaleString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center px-3 py-2.5 bg-background">
                      <span className="text-xs text-muted-foreground">Tracking ID</span>
                      <span className="text-sm font-mono">{selectedHistoryRequest.trackingId}</span>
                    </div>
                  </div>
                </div>

                {selectedHistoryRequest.serviceType === 'exam-slip' && selectedHistoryRequest.status === 'completed' && selectedHistoryRequest.resultUrl && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Exam Slip</p>
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-green-800 dark:text-green-300">Slip ready</p>
                          <p className="text-xs text-green-600 dark:text-green-400">{selectedHistoryRequest.registrationNumber}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={downloadingDocId === selectedHistoryRequest.id}
                        onClick={() => downloadDocument(selectedHistoryRequest.id, selectedHistoryRequest.id, `JAMB_Slip_${selectedHistoryRequest.registrationNumber || 'slip'}.pdf`, true)}
                      >
                        {downloadingDocId === selectedHistoryRequest.id
                          ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                          : <Download className="h-4 w-4 mr-1.5" />}
                        Download PDF
                      </Button>
                    </div>
                  </div>
                )}

                {selectedHistoryRequest.serviceType === 'exam-slip' && selectedHistoryRequest.status === 'failed' && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Exam Slip</p>
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">Retrieval failed</p>
                      <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">Your ₦{parseFloat(selectedHistoryRequest.fee || '0').toLocaleString()} has been refunded. Please try again from the services page.</p>
                    </div>
                  </div>
                )}

                {selectedHistoryRequest.agentNotes && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Agent Notes</p>
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-sm text-blue-800 dark:text-blue-300">{selectedHistoryRequest.agentNotes}</p>
                    </div>
                  </div>
                )}

                {selectedHistoryRequest.serviceType !== 'exam-slip' && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Documents ({historyDetailLoading ? '…' : historyDocuments.length})
                  </p>
                  {historyDetailLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : historyDocuments.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No documents attached to this request yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {historyDocuments.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between border rounded-lg p-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className={`h-4 w-4 flex-shrink-0 ${doc.uploaderRole === 'agent' ? 'text-green-600' : 'text-blue-600'}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{doc.fileName || 'Document'}</p>
                              <Badge variant="outline" className={`text-xs mt-0.5 ${doc.uploaderRole === 'agent' ? 'border-green-200 text-green-700' : 'border-blue-200 text-blue-700'}`}>
                                {doc.uploaderRole === 'agent' ? 'Result from Agent' : 'Your Upload'}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-shrink-0 ml-2"
                            disabled={downloadingDocId === doc.id}
                            onClick={() => downloadDocument(selectedHistoryRequest.id, doc.id, doc.fileName)}
                          >
                            {downloadingDocId === doc.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <><Download className="h-4 w-4 mr-1" />Download</>
                            }
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}

                <Button variant="outline" className="w-full" onClick={() => setShowHistoryDetail(false)}>Close</Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      </>
    );
  }

  if (selectedService && service) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <Button variant="outline" onClick={() => { setSelectedService(null); setFormData({}); setUploadFile(null); }} className="mb-4">
            ← Back to Services
          </Button>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold tracking-tight">{service.name}</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">{service.description}</p>
          {getServicePrice(service) > 0 && (
            <Badge className="mt-2 bg-blue-100 text-blue-700">Fee: ₦{getServicePrice(service).toLocaleString()}</Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Service Request Form</CardTitle>
            <CardDescription>Fill in the required information to proceed.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {service.fields.map((field: any) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </Label>
                  {field.type === "select" ? (
                    <Select
                      value={formData[field.name] || ""}
                      onValueChange={(val) => handleInputChange(field.name, val)}
                      required={field.required}
                    >
                      <SelectTrigger id={field.name} className="h-10">
                        <SelectValue placeholder={`Select ${field.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(field.options || []).map((opt: string) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type}
                      placeholder={field.placeholder || ""}
                      required={field.required}
                      className="h-10"
                      value={formData[field.name] || ""}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                    />
                  )}
                </div>
              ))}

              {service.hasFileUpload && (
                <div className="space-y-2">
                  <Label>
                    Upload Supporting Document
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    />
                    {uploadFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium">{uploadFile.name}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setUploadFile(null)}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">Accepted: PDF, JPG, PNG</p>
                  </div>
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={isLoading || uploading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <service.icon className="mr-2 h-4 w-4" />
                    Submit Request {getServicePrice(service) > 0 && `(₦${getServicePrice(service).toLocaleString()})`}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold tracking-tight">JAMB Services</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">Access all JAMB-related services and requests.</p>
        </div>
        <Button variant="outline" onClick={() => { setView('history'); fetchHistory(); }}>
          <Clock className="h-4 w-4 mr-2" />
          My Requests
        </Button>
      </div>

      {/* ── Exam Slip Printing ── */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Printer className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                Exam Slip Printing
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-normal">Automated</Badge>
              </CardTitle>
              <CardDescription>Print your JAMB examination slip instantly from the JAMB portal.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {slipStatus === 'idle' && (
            <form onSubmit={handleSlipSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="slip-reg-no">JAMB Registration Number</Label>
                <Input
                  id="slip-reg-no"
                  placeholder="e.g. 12345678EF"
                  value={slipRegNo}
                  onChange={e => setSlipRegNo(e.target.value.toUpperCase())}
                  className="h-10 uppercase"
                  required
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={slipLoading || !slipRegNo.trim()} className="w-full sm:w-auto h-10">
                  {slipLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                  Get Slip
                </Button>
              </div>
            </form>
          )}

          {slipStatus === 'polling' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Retrieving your slip from the JAMB portal…</p>
                  <p className="text-xs text-muted-foreground">Registration No: {slipRegNo} · This usually takes 30–90 seconds</p>
                </div>
              </div>
              <Progress value={slipProgress} className="h-2" />
              <Button variant="ghost" size="sm" onClick={resetSlip} className="text-muted-foreground text-xs h-7">
                Cancel
              </Button>
            </div>
          )}

          {slipStatus === 'completed' && slipJobId && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-700">Exam slip ready for {slipRegNo}</p>
                  <p className="text-xs text-muted-foreground">Click the button to download your PDF slip.</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" onClick={downloadSlipPdf} disabled={downloadingSlip}>
                  {downloadingSlip ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
                  Download PDF
                </Button>
                <Button size="sm" variant="outline" onClick={resetSlip}>
                  New Slip
                </Button>
              </div>
            </div>
          )}

          {slipStatus === 'failed' && (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700">
                    {slipSiteClosed ? 'JAMB Slip Printing Portal is Currently Closed' : 'Could not retrieve slip'}
                  </p>
                  <p className="text-xs text-muted-foreground">{slipError}</p>
                </div>
              </div>
              {slipSiteClosed && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Portal Closed — Try JAMB Result Check Instead</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">The exam slip printing portal is currently unavailable. You can check your JAMB result score directly on the JAMB e-Facility portal.</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100" asChild>
                      <a href="https://efacility.jamb.gov.ng/" target="_blank" rel="noopener noreferrer">
                        Check JAMB Results
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href="https://www.jamb.gov.ng/checkresult/" target="_blank" rel="noopener noreferrer">
                        JAMB Score Portal
                      </a>
                    </Button>
                  </div>
                </div>
              )}
              <Button size="sm" variant="outline" onClick={resetSlip}>
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {JAMB_SERVICES.map((svc) => {
          const Icon = svc.icon;
          return (
            <Card key={svc.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedService(svc.id)}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      {svc.name}
                    </CardTitle>
                    <CardDescription>{svc.description}</CardDescription>
                  </div>
                  {getServicePrice(svc) > 0 && (
                    <Badge variant="secondary">₦{getServicePrice(svc).toLocaleString()}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setSelectedService(svc.id)}>
                  Request Service
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
