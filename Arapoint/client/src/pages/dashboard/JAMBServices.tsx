import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { Loader2, CheckCircle2, FileUp, FileText, FileCheck, RotateCw, ArrowRight, ArrowLeft, Clock, Upload, Download, Eye } from "lucide-react";
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
      { name: "itemType", label: "Item Type", type: "text", placeholder: "e.g., Certificate, Transcript, Cap", required: true },
      { name: "quantity", label: "Quantity", type: "number", required: true },
    ],
    hasFileUpload: false,
  },
];

const SERVICE_LABELS: Record<string, string> = {
  'olevel-upload': "O'Level Upload",
  'admission-letter': "Admission Letter",
  'original-result': "Original Result",

  'reprinting-caps': "Reprinting & Caps",
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

  const downloadDocument = async (requestId: string, docId: string, fileName: string) => {
    setDownloadingDocId(docId);
    try {
      const token = tokenStorage.getItem('accessToken');
      const response = await fetch(`/api/education/jamb-requests/${requestId}/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Download failed');
      }
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
      const token = sessionStorage.getItem('accessToken') || '';
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
          if (form.quantity) fields.push({ label: 'Quantity', value: String(form.quantity) });
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
                          <Button variant="outline" size="sm" className="h-7 text-xs px-3" onClick={() => openHistoryDetail(req)}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View Details
                          </Button>
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

                {selectedHistoryRequest.agentNotes && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Agent Notes</p>
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-sm text-blue-800 dark:text-blue-300">{selectedHistoryRequest.agentNotes}</p>
                    </div>
                  </div>
                )}

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
          {service.price > 0 && (
            <Badge className="mt-2 bg-blue-100 text-blue-700">Fee: ₦{service.price.toLocaleString()}</Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Service Request Form</CardTitle>
            <CardDescription>Fill in the required information to proceed.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {service.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id={field.name}
                    type={field.type}
                    placeholder={field.placeholder || ""}
                    required={field.required}
                    className="h-10"
                    value={formData[field.name] || ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                  />
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
                    Submit Request {service.price > 0 && `(₦${service.price.toLocaleString()})`}
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
                  {svc.price > 0 && (
                    <Badge variant="secondary">₦{svc.price.toLocaleString()}</Badge>
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
