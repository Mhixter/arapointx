import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, CheckCircle2, FileUp, FileText, FileCheck, Gift, RotateCw, ArrowRight, ArrowLeft, Clock, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { servicesApi } from "@/lib/api/services";

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
    id: "pin-vending",
    name: "PIN Vending",
    description: "Purchase JAMB result checker PINs in bulk",
    icon: Gift,
    price: 0,
    fields: [
      { name: "quantity", label: "Quantity of PINs", type: "number", required: true },
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
  'pin-vending': "PIN Vending",
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

  const handleFileUpload = async (requestId: string, file: File) => {
    setUploading(true);
    try {
      const { uploadURL } = await servicesApi.jamb.uploadDocument(requestId, file.name, file.type || 'document');
      await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
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
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit request. Please check your balance.",
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
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setView('services')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Services
          </Button>
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold tracking-tight">My JAMB Requests</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">Track your JAMB service requests.</p>
        </div>

        {historyLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No requests yet. Submit your first JAMB service request.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking ID</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((req: any) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-sm">{req.trackingId}</TableCell>
                      <TableCell>{SERVICE_LABELS[req.serviceType] || req.serviceType}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-700'}>
                          {req.status === 'pickup' ? 'Processing' : req.status?.charAt(0).toUpperCase() + req.status?.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>₦{parseFloat(req.fee || '0').toLocaleString()}</TableCell>
                      <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
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
