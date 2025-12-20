import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Search, CheckCircle2, Download, Printer, Clock, FileText, AlertCircle, AlertTriangle } from "lucide-react";
import { SERVICES } from "../IdentityVerification";
import { useState, useRef } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import slipInfo from '@assets/image_1764211401623.png';
import slipRegular from '@assets/image_1764211451522.png';
import slipStandard from '@assets/image_1764211490940.png';
import slipPremium from '@assets/image_1764211520708.png';

const SLIP_TYPES = [
  { id: "information", name: "Information Slip", price: 200, image: slipInfo },
  { id: "regular", name: "Regular Slip", price: 250, image: slipRegular },
  { id: "standard", name: "Standard Slip", price: 300, image: slipStandard },
  { id: "premium", name: "Premium Slip", price: 300, image: slipPremium },
];

const IPE_STATUS_OPTIONS = [
  { id: "in_processing_error", name: "InProcessing Error", price: 1000 },
  { id: "still_being_process", name: "Still Being Process", price: 1000 },
  { id: "new_enrollment", name: "New Enrollment For Tracking ID", price: 1000 },
  { id: "invalid_tracking", name: "Invalid Tracking ID", price: 1000 },
];

const VALIDATION_OPTIONS = [
  { id: "no_record_found", name: "No Record Found", price: 1000 },
  { id: "update_record", name: "Update Record", price: 1000 },
  { id: "validate_modification", name: "Validate Modification", price: 1000 },
  { id: "vnin_validation", name: "V-NIN Validation", price: 1000 },
  { id: "photograph_error", name: "Photograph Error", price: 1000 },
  { id: "bypass_nin", name: "Bypass NIN", price: 1000 },
];

const IPE_SLIP_TYPES = [
  { id: "regular", name: "Regular Slip", price: 0, image: slipRegular },
  { id: "premium", name: "Premium Slip", price: 150, image: slipPremium },
];

const VALIDATION_SLIP_TYPES = [
  { id: "no_slip", name: "No Slip", price: 0, image: null },
  { id: "regular", name: "Regular Slip", price: 150, image: slipRegular },
];

export default function IdentityServiceRouter() {
  const [match, params] = useRoute("/dashboard/identity/:service");
  const serviceId = params?.service;
  const service = SERVICES.find(s => s.id === serviceId);

  if (!service) {
    return <div>Service not found</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/identity">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
            <service.icon className={`h-6 w-6 ${service.color}`} />
            {service.name}
          </h2>
          <p className="text-muted-foreground">{service.desc}</p>
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
  const [selectedSlip, setSelectedSlip] = useState("information");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const slipContainerRef = useRef<HTMLDivElement>(null);

  const getAuthToken = () => {
    return localStorage.getItem('accessToken');
  };

  const getSlipPrice = () => {
    const slip = SLIP_TYPES.find(s => s.id === selectedSlip);
    return slip?.price || 200;
  };

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!consentChecked) {
      toast({
        title: "Consent Required",
        description: "Please check the consent box to proceed",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData(e.currentTarget);
    const inputValue = formData.get("input") as string;
    const phoneValue = formData.get("phone") as string;
    const trackingId = formData.get("trackingId") as string;

    setError("");
    setIsLoading(true);
    setResult(null);
    setSlipHtml(null);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Please login to continue");
      }

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
        body = { 
          trackingId: trackingId || inputValue, 
          statusType: selectedStatus,
          slipType: selectedSlip 
        };
      } else if (service.id === "validation") {
        endpoint = '/api/identity/validation';
        body = { 
          nin: inputValue, 
          validationType: selectedStatus,
          slipType: selectedSlip 
        };
      } else if (service.id === "personalization") {
        endpoint = '/api/identity/personalization';
        body = { trackingId: inputValue };
      } else if (service.id === "birth-attestation") {
        const fullName = formData.get("fullName") as string;
        const dateOfBirth = formData.get("dateOfBirth") as string;
        const placeOfBirth = formData.get("placeOfBirth") as string;
        endpoint = '/api/identity/birth-attestation';
        body = { fullName, dateOfBirth, placeOfBirth };
      } else {
        throw new Error("Unknown service type");
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      setResult(data.data?.data || data.data);
      if (data.data?.slip?.html) {
        setSlipHtml(data.data.slip.html);
      }
      
      const agentProcessedServices = ['ipe-clearance', 'validation', 'personalization', 'birth-attestation', 'nin-tracking'];
      if (agentProcessedServices.includes(service.id)) {
        setRequestStatus("pending");
        toast({
          title: "Request Submitted",
          description: data.data?.message || `Your ${service.name} request has been submitted`,
        });
      } else {
        setRequestStatus("completed");
        toast({
          title: "Verification Successful",
          description: `${service.name} completed successfully`,
        });
      }

    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setRequestStatus("error");
      toast({
        title: "Verification Failed",
        description: err.message || 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadSlip = () => {
    if (!slipHtml) return;

    const blob = new Blob([slipHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${service.id}-slip-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Slip Downloaded",
      description: "Open the HTML file in your browser and print it",
    });
  };

  const handlePrintSlip = () => {
    if (!slipHtml) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(slipHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  if (requestStatus === "pending") {
    return (
      <Card className="max-w-lg mx-auto text-center border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
        <CardContent className="pt-10 pb-10 space-y-4">
          <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto text-yellow-600">
            <Clock className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-bold text-yellow-800 dark:text-yellow-400">Request Submitted</h3>
          <p className="text-yellow-700 dark:text-yellow-300 max-w-xs mx-auto">
            Your {service.name} request has been submitted successfully. 
            Requests are processed the same day - often within 1-30 minutes depending on traffic.
          </p>
          <p className="text-sm text-muted-foreground">
            Thank you for your continued support!
          </p>
          <Button onClick={() => setRequestStatus("idle")} variant="outline" className="mt-4">Submit Another Request</Button>
        </CardContent>
      </Card>
    );
  }

  if (requestStatus === "error") {
    return (
      <Card className="max-w-lg mx-auto text-center border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
        <CardContent className="pt-10 pb-10 space-y-4">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-bold text-red-800 dark:text-red-400">Verification Failed</h3>
          <p className="text-red-700 dark:text-red-300 max-w-xs mx-auto">
            {error || 'An error occurred during verification. Please try again.'}
          </p>
          <Button onClick={() => { setRequestStatus("idle"); setError(""); }} variant="outline" className="mt-4">Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  if (service.id === "nin-verification") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-primary">NIN Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">1. Slip Layout</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {SLIP_TYPES.map((slip) => (
                    <div
                      key={slip.id}
                      onClick={() => setSelectedSlip(slip.id)}
                      className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all ${
                        selectedSlip === slip.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center mb-2">
                        <span className="text-sm font-bold text-primary">₦{slip.price.toFixed(2)}</span>
                      </div>
                      <div className="aspect-[3/2] bg-gray-100 rounded overflow-hidden mb-2">
                        <img src={slip.image} alt={slip.name} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-xs text-center text-orange-600 font-medium">{slip.name}</p>
                      <div className="flex justify-center mt-2">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedSlip === slip.id ? 'border-primary bg-primary' : 'border-gray-300'
                        }`}>
                          {selectedSlip === slip.id && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">2. Supply ID Number</Label>
                <div className="space-y-2">
                  <Input 
                    name="input"
                    placeholder="NIN NUMBER" 
                    maxLength={11} 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required 
                    className="h-12 font-mono text-lg tracking-widest uppercase bg-gray-50" 
                  />
                  <p className="text-xs text-muted-foreground">We'll never share your details with anyone else.</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="consent" 
                  checked={consentChecked}
                  onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
                />
                <label htmlFor="consent" className="text-sm text-muted-foreground leading-tight">
                  By checking this box, you agreed that the owner of the ID has granted you consent to verify his/her identity.
                </label>
              </div>

              <Button type="submit" size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={isLoading || !consentChecked}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Verify
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && <ResultSection result={result} slipHtml={slipHtml} onDownload={handleDownloadSlip} onPrint={handlePrintSlip} slipContainerRef={slipContainerRef} />}
      </div>
    );
  }

  if (service.id === "nin-phone") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-primary">NIN With Phone Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">1. Slip Layout</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {SLIP_TYPES.map((slip) => (
                    <div
                      key={slip.id}
                      onClick={() => setSelectedSlip(slip.id)}
                      className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all ${
                        selectedSlip === slip.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center mb-2">
                        <span className="text-sm font-bold text-primary">₦{slip.price.toFixed(2)}</span>
                      </div>
                      <div className="aspect-[3/2] bg-gray-100 rounded overflow-hidden mb-2">
                        <img src={slip.image} alt={slip.name} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-xs text-center text-orange-600 font-medium">{slip.name}</p>
                      <div className="flex justify-center mt-2">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedSlip === slip.id ? 'border-primary bg-primary' : 'border-gray-300'
                        }`}>
                          {selectedSlip === slip.id && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">2. Supply ID Number</Label>
                <div className="space-y-2">
                  <Input 
                    name="input"
                    placeholder="PHONE NUMBER" 
                    maxLength={11} 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required 
                    className="h-12 font-mono text-lg tracking-widest uppercase bg-gray-50" 
                  />
                  <p className="text-xs text-muted-foreground">We'll never share your details with anyone else.</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="consent" 
                  checked={consentChecked}
                  onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
                />
                <label htmlFor="consent" className="text-sm text-muted-foreground leading-tight">
                  By checking this box, you agreed that the owner of the ID has granted you consent to verify his/her identity.
                </label>
              </div>

              <Button type="submit" size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={isLoading || !consentChecked}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Verify
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && <ResultSection result={result} slipHtml={slipHtml} onDownload={handleDownloadSlip} onPrint={handlePrintSlip} slipContainerRef={slipContainerRef} />}
      </div>
    );
  }

  if (service.id === "nin-tracking") {
    return (
      <div className="space-y-6">
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>NOTE:</strong> Dear customers, requests are processed the same day - often within 1-30 minutes depending on the traffic. Thank you for your continued support!
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-primary">NIN With Tracking ID Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">1. Slip Layout</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
                  <div
                    onClick={() => setSelectedSlip("standard")}
                    className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all ${
                      selectedSlip === "standard"
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center mb-2">
                      <span className="text-sm font-bold text-primary">₦250.00</span>
                    </div>
                    <div className="aspect-[3/2] bg-gray-100 rounded overflow-hidden mb-2">
                      <img src={slipStandard} alt="Standard Slip" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex justify-center mt-2">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedSlip === "standard" ? 'border-primary bg-primary' : 'border-gray-300'
                      }`}>
                        {selectedSlip === "standard" && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">2. Supply ID Number</Label>
                <div className="space-y-2">
                  <Input 
                    name="input"
                    placeholder="TRACKING ID" 
                    required 
                    className="h-12 font-mono text-lg tracking-widest uppercase bg-gray-50" 
                  />
                  <p className="text-xs text-muted-foreground">We'll never share your details with anyone else.</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="consent" 
                  checked={consentChecked}
                  onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
                />
                <label htmlFor="consent" className="text-sm text-muted-foreground leading-tight">
                  By checking this box, you agreed that the owner of the ID has granted you consent to verify his/her identity.
                </label>
              </div>

              <Button type="submit" size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={isLoading || !consentChecked}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Verify
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && <ResultSection result={result} slipHtml={slipHtml} onDownload={handleDownloadSlip} onPrint={handlePrintSlip} slipContainerRef={slipContainerRef} />}
      </div>
    );
  }

  if (service.id === "ipe-clearance") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-primary">IPE CLEARANCE (instantly)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">1. Details Needed</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {IPE_STATUS_OPTIONS.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setSelectedStatus(option.id)}
                      className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all ${
                        selectedStatus === option.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center mb-2">
                        <span className="text-sm font-bold text-primary">₦{option.price.toLocaleString()}.00</span>
                      </div>
                      <p className="text-xs text-center text-gray-600">{option.name}</p>
                      <div className="flex justify-center mt-2">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedStatus === option.id ? 'border-primary bg-primary' : 'border-gray-300'
                        }`}>
                          {selectedStatus === option.id && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">2. Slip Type (for clearance)</Label>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  {IPE_SLIP_TYPES.map((slip) => (
                    <div
                      key={slip.id}
                      onClick={() => setSelectedSlip(slip.id)}
                      className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all ${
                        selectedSlip === slip.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center mb-2">
                        <span className="text-sm font-bold text-primary">₦{slip.price.toFixed(1)}</span>
                      </div>
                      {slip.image && (
                        <div className="aspect-[3/2] bg-gray-100 rounded overflow-hidden mb-2">
                          <img src={slip.image} alt={slip.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <p className="text-xs text-center text-orange-600 font-medium">{slip.name}</p>
                      <div className="flex justify-center mt-2">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedSlip === slip.id ? 'border-primary bg-primary' : 'border-gray-300'
                        }`}>
                          {selectedSlip === slip.id && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">3. Supply Tracking ID</Label>
                <div className="space-y-2">
                  <Input 
                    name="trackingId"
                    placeholder="Enter Tracking ID" 
                    required 
                    className="h-12 bg-gray-50" 
                  />
                  <p className="text-xs text-muted-foreground">We'll never share your details with anyone else.</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="consent" 
                  checked={consentChecked}
                  onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
                />
                <label htmlFor="consent" className="text-sm text-muted-foreground leading-tight">
                  By checking this box, you agreed that the owner of the ID has granted you consent to verify his/her identity.
                </label>
              </div>

              <Button type="submit" size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={isLoading || !consentChecked || !selectedStatus}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Submit
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (service.id === "validation") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-primary">VALIDATION (instantly)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">1. Details Needed</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {VALIDATION_OPTIONS.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setSelectedStatus(option.id)}
                      className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all ${
                        selectedStatus === option.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center mb-2">
                        <span className="text-sm font-bold text-primary">₦{option.price.toLocaleString()}.00</span>
                      </div>
                      <p className="text-xs text-center text-gray-600">{option.name}</p>
                      <div className="flex justify-center mt-2">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedStatus === option.id ? 'border-primary bg-primary' : 'border-gray-300'
                        }`}>
                          {selectedStatus === option.id && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">2. Slip Type</Label>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  {VALIDATION_SLIP_TYPES.map((slip) => (
                    <div
                      key={slip.id}
                      onClick={() => setSelectedSlip(slip.id)}
                      className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all ${
                        selectedSlip === slip.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center mb-2">
                        <span className="text-sm font-bold text-primary">₦{slip.price.toFixed(1)}</span>
                      </div>
                      {slip.image ? (
                        <div className="aspect-[3/2] bg-gray-100 rounded overflow-hidden mb-2">
                          <img src={slip.image} alt={slip.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="aspect-[3/2] bg-gray-100 rounded flex items-center justify-center mb-2">
                          <span className="text-gray-400 text-sm">No Slip</span>
                        </div>
                      )}
                      <p className="text-xs text-center text-orange-600 font-medium">{slip.name}</p>
                      <div className="flex justify-center mt-2">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedSlip === slip.id ? 'border-primary bg-primary' : 'border-gray-300'
                        }`}>
                          {selectedSlip === slip.id && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">2. Supply NIN</Label>
                <div className="space-y-2">
                  <Input 
                    name="input"
                    placeholder="Enter NIN" 
                    maxLength={11}
                    required 
                    className="h-12 bg-gray-50" 
                  />
                  <p className="text-xs text-muted-foreground">We'll never share your details with anyone else.</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="consent" 
                  checked={consentChecked}
                  onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
                />
                <label htmlFor="consent" className="text-sm text-muted-foreground leading-tight">
                  By checking this box, you agreed that the owner of the ID has granted you consent to verify his/her identity.
                </label>
              </div>

              <Button type="submit" size="lg" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={isLoading || !consentChecked || !selectedStatus}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Submit
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (service.id === "personalization") {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Personalization Request</CardTitle>
          <CardDescription>Submit a request to personalize your identity details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
             <div className="space-y-2">
              <Label>Tracking ID / Reference</Label>
              <Input 
                name="input" 
                placeholder="Enter Tracking ID"
                className="h-12" 
                required 
              />
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="consent" 
                checked={consentChecked}
                onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
              />
              <label htmlFor="consent" className="text-sm text-muted-foreground leading-tight">
                By checking this box, you agreed that the owner of the ID has granted you consent to verify his/her identity.
              </label>
            </div>
             <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" size="lg" disabled={isLoading || !consentChecked}>
               {isLoading ? <Loader2 className="animate-spin" /> : `Submit Request`}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (service.id === "birth-attestation") {
    return (
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Birth Attestation Certificate Request</CardTitle>
            <CardDescription>Request an NPC birth certificate or attestation document.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input id="full-name" name="input" placeholder="Enter full name as on birth certificate" className="h-12" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" name="dob" type="date" className="h-12" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select name="gender" className="h-12 w-full rounded-md border border-input bg-background px-3 py-2" required>
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State of Registration</Label>
                <Input id="state" name="state" placeholder="State where birth was registered" className="h-12" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lga">Local Government Area (LGA)</Label>
                <Input id="lga" name="lga" placeholder="LGA of registration" className="h-12" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parents">Parents/Guardian Name</Label>
                <Input id="parents" name="parents" placeholder="Name of parent or guardian" className="h-12" required />
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="consent" 
                  checked={consentChecked}
                  onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
                />
                <label htmlFor="consent" className="text-sm text-muted-foreground leading-tight">
                  By checking this box, you agreed that the owner of the ID has granted you consent to verify his/her identity.
                </label>
              </div>
              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" size="lg" disabled={isLoading || !consentChecked}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Request...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Request Certificate
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
    <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/10 border-dashed">
      <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${service.bg} ${service.color}`}>
        <service.icon className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-bold mb-2">{service.name}</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        This service is currently being set up. Please check back later.
      </p>
      <Link href="/dashboard/identity">
        <Button variant="outline">Back to Services</Button>
      </Link>
    </div>
  );
}

function ResultSection({ result, slipHtml, onDownload, onPrint, slipContainerRef }: any) {
  const fullName = `${result.lastName || ''} ${result.firstName || ''} ${result.middleName || ''}`.trim();
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-primary/50 shadow-md overflow-hidden">
        <div className="bg-primary/10 p-4 border-b border-primary/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <CheckCircle2 className="h-5 w-5" />
            Identity Verified
          </div>
          <span className="text-xs text-muted-foreground font-mono">{new Date().toLocaleString()}</span>
        </div>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              {result.photo ? (
                <img 
                  src={result.photo.startsWith('data:') ? result.photo : `data:image/jpeg;base64,${result.photo}`} 
                  alt="Face" 
                  className="w-32 h-32 rounded-lg object-cover border border-border shadow-sm bg-muted" 
                />
              ) : (
                <div className="w-32 h-32 rounded-lg border border-border shadow-sm bg-muted flex items-center justify-center text-muted-foreground">
                  No Photo
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 flex-1">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Full Name</p>
                <p className="font-medium text-lg">{fullName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Date of Birth</p>
                <p className="font-medium">{result.dateOfBirth || result.dob || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Gender</p>
                <p className="font-medium">{result.gender || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Phone</p>
                <p className="font-medium">{result.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">State</p>
                <p className="font-medium">{result.state || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">LGA</p>
                <p className="font-medium">{result.lga || 'N/A'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground uppercase">Address</p>
                <p className="font-medium">{result.address || 'N/A'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {slipHtml && (
        <Card>
          <CardHeader>
            <CardTitle>Download Result Slip</CardTitle>
            <CardDescription>Your verified identity slip is ready</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={slipContainerRef} className="border rounded-lg overflow-hidden mb-6">
              <iframe 
                srcDoc={slipHtml} 
                className="w-full h-96 border-0"
                title="Identity Slip Preview"
              />
            </div>
            <div className="flex gap-4 justify-end">
              <Button variant="outline" onClick={onPrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print Slip
              </Button>
              <Button onClick={onDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download Slip
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
