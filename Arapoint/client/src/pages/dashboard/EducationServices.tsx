import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  ArrowLeft, 
  Award, 
  Download, 
  Printer,
  BookOpen,
  FileUp,
  FileText,
  FileCheck,
  Gift,
  RotateCw,
  CheckCircle2,
  Activity,
  AlertCircle,
  History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { servicesApi, WAECCheckRequest } from "@/lib/api/services";
import { handleApiError } from "@/lib/api/client";
import { Link } from "wouter";
import waecLogo from '@assets/kisspng-west-african-senior-school-certificate-examination-domestic-energy-performance-certificates-5b0dc33eecc3f6.4371727315276286069698-removebg-preview_1764215404355.png';
import nbaisLogo from '@assets/nbais-logo_1764215925986.png';
import jambLogo from '@assets/Official_JAMB_logo-removebg-preview_1764215962098.png';
import necoLogo from '@assets/neco-logo.df6f9256-removebg-preview_1764215976622.png';
import nabtebLogo from '@assets/images-removebg-preview_1764215992683.png';

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River",
  "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

const EDUCATION_SERVICES = [
  { 
    id: "jamb-result", 
    name: "JAMB Result Check", 
    icon: Award, 
    color: "text-green-600", 
    bg: "bg-green-100 dark:bg-green-900/20", 
    desc: "Check your JAMB UTME/DE results",
    logo: jambLogo,
    price: 500
  },
  { 
    id: "jamb-services", 
    name: "JAMB Services", 
    icon: BookOpen, 
    color: "text-blue-600", 
    bg: "bg-blue-100 dark:bg-blue-900/20", 
    desc: "Upload O'Levels, admission letters, PIN vending",
    logo: jambLogo
  },
  { 
    id: "waec-result", 
    name: "WAEC Result Check", 
    icon: FileCheck, 
    color: "text-orange-600", 
    bg: "bg-orange-100 dark:bg-orange-900/20", 
    desc: "Check your WAEC examination results",
    logo: waecLogo,
    price: 1000
  },
  { 
    id: "neco-result", 
    name: "NECO Result Check", 
    icon: FileCheck, 
    color: "text-purple-600", 
    bg: "bg-purple-100 dark:bg-purple-900/20", 
    desc: "Check your NECO examination results",
    logo: necoLogo,
    price: 800
  },
  { 
    id: "nabteb-result", 
    name: "NABTEB Result Check", 
    icon: FileCheck, 
    color: "text-pink-600", 
    bg: "bg-pink-100 dark:bg-pink-900/20", 
    desc: "Check your NABTEB examination results",
    logo: nabtebLogo,
    price: 800
  },
  { 
    id: "nbais-result", 
    name: "NBAIS Result Check", 
    icon: FileCheck, 
    color: "text-indigo-600", 
    bg: "bg-indigo-100 dark:bg-indigo-900/20", 
    desc: "Check your NBAIS examination results",
    logo: nbaisLogo,
    price: 800
  },
];

const JAMB_SUB_SERVICES = [
  { id: "olevel-upload", name: "O'Level Upload", icon: FileUp, desc: "Upload and verify O'Level results", price: 2000 },
  { id: "admission-letter", name: "Admission Letter", icon: FileText, desc: "Check and download admission status", price: 1500 },
  { id: "original-result", name: "Original Result", icon: FileCheck, desc: "Retrieve original JAMB results", price: 1800 },
  { id: "pin-vending", name: "PIN Vending", icon: Gift, desc: "Purchase JAMB result checker PINs", price: 0 },
  { id: "reprinting-caps", name: "Reprinting & Caps", icon: RotateCw, desc: "Request reprinting of documents", price: 3000 },
];

const PIN_SERVICES = [
  { id: "waec-pin", examType: "waec", name: "WAEC PIN", logo: waecLogo, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/20", desc: "Buy WAEC result checker PIN", instant: true },
  { id: "neco-pin", examType: "neco", name: "NECO PIN", logo: necoLogo, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/20", desc: "Buy NECO result checker PIN", instant: true },
  { id: "nabteb-pin", examType: "nabteb", name: "NABTEB PIN", logo: nabtebLogo, color: "text-pink-600", bg: "bg-pink-100 dark:bg-pink-900/20", desc: "Buy NABTEB result checker PIN", instant: true },
  { id: "nbais-pin", examType: "nbais", name: "NBAIS PIN", logo: nbaisLogo, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/20", desc: "Buy NBAIS result checker PIN", instant: true },
];

export default function EducationServices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedJAMBSub, setSelectedJAMBSub] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pinStock, setPinStock] = useState<Record<string, { available: boolean; price: number }>>({});
  const [purchasedPin, setPurchasedPin] = useState<any>(null);
  const [pinLoading, setPinLoading] = useState(false);
  
  const [waecYear, setWaecYear] = useState(new Date().getFullYear().toString());
  const [waecType, setWaecType] = useState('WASSCE');
  const [nabtebYear, setNabtebYear] = useState(new Date().getFullYear().toString());
  const [nabtebType, setNabtebType] = useState('may');
  const [nbaisYear, setNbaisYear] = useState(new Date().getFullYear().toString());
  const [nbaisMonth, setNbaisMonth] = useState('06');
  const [nbaisState, setNbaisState] = useState('');

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: servicesApi.dashboard.getStats,
    staleTime: 30000,
  });

  const educationTotal = dashboardData?.stats?.educationVerifications || 0;
  const educationSuccess = dashboardData?.stats?.educationVerifications || 0;

  // Fetch PIN stock on component mount
  const fetchPinStock = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/education/pins/stock', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.status === 'success') {
        setPinStock(result.data?.stock || {});
      }
    } catch (error: any) {
      console.error('Failed to fetch PIN stock', error);
    }
  };

  // Handle PIN purchase
  const handlePinPurchase = async (examType: string) => {
    try {
      setPinLoading(true);
      setError(null);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/education/pins/purchase', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ examType }),
      });

      const result = await response.json();
      if (response.ok && result.status === 'success') {
        setPurchasedPin(result.data);
        toast({
          title: "PIN Delivered!",
          description: `Your ${examType.toUpperCase()} PIN has been delivered successfully.`,
        });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        fetchPinStock();
      } else {
        setError(result.message || 'Failed to purchase PIN');
        toast({
          title: "Purchase Failed",
          description: result.message || 'Failed to purchase PIN',
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setError(error.message || 'Failed to purchase PIN');
      toast({
        title: "Error",
        description: "Failed to purchase PIN. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPinLoading(false);
    }
  };

  // Load PIN stock on mount
  useEffect(() => {
    fetchPinStock();
  }, []);

  const pollJobStatus = async (jobId: string, maxAttempts = 60): Promise<any> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      setStatusMessage(`Processing your request... (${attempt + 1}/${maxAttempts})`);
      
      try {
        const jobStatus = await servicesApi.education.getJobStatus(jobId);
        
        if (jobStatus.status === 'completed') {
          return jobStatus.resultData;
        } else if (jobStatus.status === 'failed') {
          return {
            ...jobStatus.resultData,
            verificationStatus: jobStatus.resultData?.verificationStatus || 'error',
            errorMessage: jobStatus.errorMessage || jobStatus.resultData?.errorMessage || 'Verification failed',
            error: true,
          };
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err: any) {
        if (attempt === maxAttempts - 1) {
          throw err;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Verification timed out. Please try again later.');
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setStatusMessage('Submitting your request...');
    
    const form = e.target as HTMLFormElement;
    
    try {
      let jobResponse: { jobId: string; price: number };
      
      switch (selectedService) {
        case 'jamb-result': {
          const regNumber = (form.querySelector('#jamb-reg') as HTMLInputElement)?.value;
          jobResponse = await servicesApi.education.checkJAMB({
            registrationNumber: regNumber,
          });
          break;
        }
        case 'waec-result': {
          const examNum = (form.querySelector('#waec-exam-num') as HTMLInputElement)?.value;
          const pin = (form.querySelector('#waec-pin') as HTMLInputElement)?.value;
          const serial = (form.querySelector('#waec-serial') as HTMLInputElement)?.value;
          
          jobResponse = await servicesApi.education.checkWAEC({
            registrationNumber: examNum,
            examYear: parseInt(waecYear),
            examType: waecType === 'internal' ? 'WASSCE' : 'GCE',
            cardSerialNumber: serial,
            cardPin: pin,
          });
          break;
        }
        case 'neco-result': {
          const regNumber = (form.querySelector('#neco-reg') as HTMLInputElement)?.value;
          const examYear = (form.querySelector('#neco-year') as HTMLSelectElement)?.value;
          const examType = (form.querySelector('#neco-type') as HTMLSelectElement)?.value;
          const token = (form.querySelector('#neco-token') as HTMLInputElement)?.value;
          
          jobResponse = await servicesApi.education.checkNECO({
            registrationNumber: regNumber,
            examYear: parseInt(examYear || new Date().getFullYear().toString()),
            examType: examType || 'school_candidate',
            cardPin: token,
          });
          break;
        }
        case 'nabteb-result': {
          const candNumber = (form.querySelector('#nabteb-cand') as HTMLInputElement)?.value;
          jobResponse = await servicesApi.education.checkNABTEB({
            registrationNumber: candNumber,
            examYear: parseInt(nabtebYear),
          });
          break;
        }
        case 'nbais-result': {
          const examNumber = (form.querySelector('#nbais-number') as HTMLInputElement)?.value;
          jobResponse = await servicesApi.education.checkNBAIS({
            registrationNumber: examNumber,
            examYear: parseInt(nbaisYear),
          });
          break;
        }
        default:
          throw new Error('Unknown service selected');
      }
      
      toast({
        title: "Request Submitted",
        description: `Your request has been submitted. ₦${jobResponse.price} deducted from your wallet.`,
      });
      
      const resultData = await pollJobStatus(jobResponse.jobId);
      
      if (resultData?.error || resultData?.errorMessage || resultData?.verificationStatus === 'error' || resultData?.verificationStatus === 'not_found') {
        const errorMsg = resultData.errorMessage || resultData.message || 'Verification failed. Please check your details and try again.';
        setResult(resultData);
        setCurrentJobId(jobResponse.jobId);
        setError(errorMsg);
        setStatusMessage('');
        toast({
          title: "Verification Failed",
          description: errorMsg,
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        return;
      }
      
      setResult(resultData);
      setCurrentJobId(jobResponse.jobId);
      setStatusMessage('');
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      
      toast({
        title: "Result Retrieved Successfully",
        description: "Your examination result has been verified. Opening PDF for printing...",
      });
      
      setTimeout(async () => {
        const opened = await openPdfForPrint(jobResponse.jobId);
        if (!opened) {
          toast({
            title: "PDF Ready",
            description: "Click the Download button to view your result.",
          });
        }
      }, 1000);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err.message || 'Failed to process request';
      setError(errorMessage);
      setStatusMessage('');
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJAMBSubService = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      const service = JAMB_SUB_SERVICES.find(s => s.id === selectedJAMBSub);
      toast({
        title: "Request Submitted",
        description: `Your ${service?.name} request has been submitted successfully.`,
      });
    }, 2000);
  };

  const openPdfForPrint = async (jobId: string) => {
    try {
      const token = localStorage.getItem('token');
      const previewUrl = `/api/education/job/${jobId}/preview`;
      
      const newWindow = window.open('about:blank', '_blank');
      if (newWindow) {
        const response = await fetch(previewUrl, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          newWindow.location.href = blobUrl;
          return true;
        } else {
          newWindow.close();
          return false;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDownloadResult = async () => {
    setDownloading(true);
    try {
      // If PDF is already in the result, download directly
      if (result?.pdfBase64) {
        const byteCharacters = atob(result.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedService}_result_${result?.registrationNumber || 'download'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Download Successful",
          description: "Your result PDF has been downloaded.",
        });
        return;
      }

      // Fallback to screenshot if no PDF
      if (result?.screenshotBase64) {
        const byteCharacters = atob(result.screenshotBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedService}_result_${result?.registrationNumber || 'download'}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Download Successful",
          description: "Your result screenshot has been downloaded.",
        });
        return;
      }

      // If no local data, try API endpoint
      if (!currentJobId) {
        throw new Error("No result available for download.");
      }

      const response = await fetch(`/api/education/job/${currentJobId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Download failed');
      }

      const contentType = response.headers.get('Content-Type');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = contentType?.includes('pdf') 
        ? `${selectedService}_result.pdf` 
        : `${selectedService}_result.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Successful",
        description: "Your result has been downloaded.",
      });
    } catch (err: any) {
      toast({
        title: "Download Error",
        description: err.message || "Failed to download result. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintResult = () => {
    window.print();
  };

  // PIN Purchase Flow
  const pinService = PIN_SERVICES.find(p => p.id === selectedService);
  if (pinService) {
    const stock = pinStock[pinService.examType];
    
    if (purchasedPin) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-heading font-bold tracking-tight">PIN Delivered!</h2>
              <p className="text-muted-foreground">Your {pinService.name} has been delivered</p>
            </div>
            <Button variant="outline" onClick={() => { setSelectedService(null); setPurchasedPin(null); }}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Services
            </Button>
          </div>

          <Card className="max-w-lg border-green-200 bg-green-50 dark:bg-green-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-6 w-6" />
                PIN Successfully Delivered
              </CardTitle>
              <CardDescription>Keep this information safe - No refunds after delivery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <img src={pinService.logo} alt={pinService.name} className="h-16 w-16 object-contain" />
                <div>
                  <p className="font-bold text-lg">{purchasedPin.examType?.toUpperCase()} PIN</p>
                  <p className="text-sm text-muted-foreground">Order ID: {purchasedPin.orderId?.substring(0, 8)}...</p>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                <Label className="text-xs text-muted-foreground">PIN Code</Label>
                <p className="font-mono text-xl font-bold tracking-wider">{purchasedPin.pin}</p>
              </div>
              
              {purchasedPin.serialNumber && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <Label className="text-xs text-muted-foreground">Serial Number</Label>
                  <p className="font-mono text-lg font-medium">{purchasedPin.serialNumber}</p>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span>This PIN has been sent to your registered email as well.</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => { setSelectedService(null); setPurchasedPin(null); }} className="w-full">
                Done
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">Buy {pinService.name}</h2>
            <p className="text-muted-foreground">{pinService.desc}</p>
          </div>
          <Button variant="outline" onClick={() => setSelectedService(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <img src={pinService.logo} alt={pinService.name} className="h-12 w-12 object-contain" />
              <span>{pinService.name}</span>
            </CardTitle>
            <CardDescription>Instant delivery to your account and email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="text-muted-foreground">Price:</span>
              <span className="text-2xl font-bold text-primary">
                ₦{(stock?.price || 0).toLocaleString()}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {stock?.available ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">In Stock - Instant Delivery</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Out of Stock</span>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                No refund after PIN delivery. Please confirm before proceeding.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => handlePinPurchase(pinService.examType)}
              disabled={pinLoading || !stock?.available}
              className="w-full"
            >
              {pinLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Buy Now - ₦{(stock?.price || 0).toLocaleString()}</>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Service selection hub
  if (!selectedService) {
    return (
      <div className="space-y-6">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-primary text-primary-foreground border-none">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">Total Checks</p>
                <h3 className="text-3xl font-bold mt-1">{educationTotal.toLocaleString()}</h3>
              </div>
              <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
               <div>
                <p className="text-sm font-medium text-muted-foreground">Successful Results</p>
                <h3 className="text-3xl font-bold mt-1">{educationSuccess.toLocaleString()}</h3>
              </div>
              <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">Education Services</h2>
            <p className="text-muted-foreground">Select an education service to get started.</p>
          </div>
          <Link href="/dashboard/education/history">
            <Button variant="outline">
              <History className="h-4 w-4 mr-2" />
              View History
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EDUCATION_SERVICES.map((service) => (
            <Card 
              key={service.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group"
              onClick={() => setSelectedService(service.id)}
              data-testid={`card-service-${service.id}`}
            >
              <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full">
                {service.logo ? (
                  <img src={service.logo} alt={service.name} className="h-16 w-16 object-contain" />
                ) : (
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${service.bg} ${service.color}`}>
                    <service.icon className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="font-bold text-lg">{service.name}</h3>
                    {service.price && <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">₦{service.price.toLocaleString()}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{service.desc}</p>
                </div>
                <Button className="w-full mt-2" size="sm">
                  Select
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Buy Exam PINs Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-heading font-bold tracking-tight">Buy Exam PINs</h3>
              <p className="text-muted-foreground text-sm">Instant delivery - No refunds after delivery</p>
            </div>
            <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/20 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Instant Delivery</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PIN_SERVICES.map((pin) => (
              <Card 
                key={pin.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group border-2 border-dashed hover:border-primary"
                onClick={() => setSelectedService(pin.id)}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                  <img src={pin.logo} alt={pin.name} className="h-12 w-12 object-contain" />
                  <div>
                    <h4 className="font-bold text-sm">{pin.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{pin.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 text-green-600 text-xs">
                    <Activity className="h-3 w-3" />
                    <span>Instant</span>
                  </div>
                  <Button size="sm" className="w-full" variant="outline">
                    Buy Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // JAMB Services Sub-service Selection
  if (selectedService === 'jamb-services' && !selectedJAMBSub) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">JAMB Services</h2>
            <p className="text-muted-foreground">Select a JAMB service</p>
          </div>
          <Button variant="outline" onClick={() => setSelectedService(null)} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {JAMB_SUB_SERVICES.map((service) => (
            <Card 
              key={service.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
              onClick={() => setSelectedJAMBSub(service.id)}
              data-testid={`card-jamb-sub-${service.id}`}
            >
              <CardContent className="p-6 flex flex-col items-start gap-4">
                <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg">
                  <service.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{service.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{service.desc}</p>
                </div>
                {service.price > 0 && (
                  <p className="text-sm font-semibold text-primary">₦{service.price.toLocaleString()}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // JAMB Sub-service Form
  if (selectedService === 'jamb-services' && selectedJAMBSub && !submitted) {
    const service = JAMB_SUB_SERVICES.find(s => s.id === selectedJAMBSub);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">{service?.name}</h2>
            <p className="text-muted-foreground">{service?.desc}</p>
          </div>
          <Button variant="outline" onClick={() => setSelectedJAMBSub(null)} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Service Request Form</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJAMBSubService} className="space-y-6">
              {selectedJAMBSub === 'olevel-upload' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" placeholder="Your full name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg">Registration Number</Label>
                      <Input id="reg" placeholder="Your registration number" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">Exam Year</Label>
                      <Input id="year" type="number" placeholder="2023" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="body">Exam Body</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select exam body" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="waec">WAEC</SelectItem>
                          <SelectItem value="neco">NECO</SelectItem>
                          <SelectItem value="nbais">NBAIS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc">Upload O'Level Certificate</Label>
                    <Input id="doc" type="file" accept=".pdf,.jpg,.png" required />
                  </div>
                </>
              )}

              {selectedJAMBSub === 'admission-letter' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="jamb-reg">JAMB Registration Number</Label>
                    <Input id="jamb-reg" placeholder="Your JAMB reg number" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="your@email.com" required />
                  </div>
                </>
              )}

              {selectedJAMBSub === 'original-result' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="jamb-reg2">JAMB Registration Number</Label>
                    <Input id="jamb-reg2" placeholder="Your JAMB reg number" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pin">JAMB Result PIN</Label>
                    <Input id="pin" placeholder="Your result PIN" required />
                  </div>
                </>
              )}

              {selectedJAMBSub === 'pin-vending' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="qty">Quantity of PINs</Label>
                    <Input id="qty" type="number" placeholder="10" required />
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900">Each PIN: ₦1,500</p>
                  </div>
                </>
              )}

              {selectedJAMBSub === 'reprinting-caps' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="jamb-reg3">JAMB Registration Number</Label>
                    <Input id="jamb-reg3" placeholder="Your JAMB reg number" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item">Item Type</Label>
                    <Input id="item" placeholder="e.g., Certificate, Transcript, Cap" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qty2">Quantity</Label>
                    <Input id="qty2" type="number" placeholder="1" required />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full h-11" disabled={loading} data-testid="button-submit">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // JAMB Sub-service Success
  if (selectedService === 'jamb-services' && submitted) {
    const service = JAMB_SUB_SERVICES.find(s => s.id === selectedJAMBSub);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">Request Submitted</h2>
            <p className="text-muted-foreground">Your {service?.name} request is being processed</p>
          </div>
          <Button variant="outline" onClick={() => {
            setSelectedService(null);
            setSelectedJAMBSub(null);
            setSubmitted(false);
          }} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="max-w-2xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <CardContent className="pt-8">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-green-900">Request Submitted Successfully</h3>
                <p className="text-green-700">Your {service?.name} request has been received and is under review.</p>
              </div>

              <div className="bg-white rounded-lg p-6 w-full space-y-4 border border-green-200">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Service</p>
                  <p className="text-lg font-medium text-foreground mt-1">{service?.name}</p>
                </div>
                {service?.price !== undefined && service?.price > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Amount</p>
                    <p className="text-lg font-bold text-primary mt-1">₦{service.price.toLocaleString()}</p>
                  </div>
                )}
              </div>

              <Button 
                onClick={() => {
                  setSelectedService(null);
                  setSelectedJAMBSub(null);
                  setSubmitted(false);
                }}
                className="w-full h-11"
                data-testid="button-new-request"
              >
                Request Another Service
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Result Check Query View
  if (!result) {
    const serviceName = EDUCATION_SERVICES.find(s => s.id === selectedService)?.name;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">{serviceName}</h2>
            <p className="text-muted-foreground">Enter your examination details to retrieve your result.</p>
          </div>
          <Button variant="outline" onClick={() => setSelectedService(null)} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Check Your Result</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleQuery} className="space-y-6">
              {selectedService === 'jamb-result' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jamb-reg">JAMB Registration Number</Label>
                      <Input id="jamb-reg" placeholder="e.g., 1234567890" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jamb-pin">Result PIN</Label>
                      <Input id="jamb-pin" placeholder="Enter PIN" required />
                    </div>
                  </div>
                </>
              )}

              {selectedService === 'waec-result' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="waec-exam-num">Examination Number</Label>
                      <Input id="waec-exam-num" placeholder="e.g., 1234567890" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="waec-year">Examination Year</Label>
                      <Select value={waecYear} onValueChange={setWaecYear}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 12}, (_, i) => new Date().getFullYear() + 1 - i).map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="waec-type">Candidate Type</Label>
                      <Select value={waecType} onValueChange={setWaecType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal Candidate (WASSCE)</SelectItem>
                          <SelectItem value="private">Private Candidate (GCE)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="waec-pin">PIN</Label>
                      <Input id="waec-pin" placeholder="Enter PIN" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="waec-serial">Serial Number</Label>
                    <Input id="waec-serial" placeholder="Enter Serial Number" required />
                  </div>
                </>
              )}

              {selectedService === 'neco-result' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="neco-reg">Registration Number</Label>
                    <Input id="neco-reg" placeholder="e.g., 1234567890" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="neco-year">Exam Year</Label>
                      <Select name="neco-year" defaultValue={new Date().getFullYear().toString()}>
                        <SelectTrigger id="neco-year">
                          <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 25 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="neco-type">Exam Type</Label>
                      <Select name="neco-type" defaultValue="school_candidate">
                        <SelectTrigger id="neco-type">
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="school_candidate">School Candidate (Internal)</SelectItem>
                          <SelectItem value="private_candidate">Private Candidate (GCE)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="neco-token">Token</Label>
                    <Input id="neco-token" placeholder="Enter 12-digit Token" required />
                  </div>
                </>
              )}

              {selectedService === 'nabteb-result' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nabteb-cand">Candidate Number</Label>
                      <Input id="nabteb-cand" placeholder="e.g., 1234567890" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nabteb-type">Examination Type</Label>
                      <Select defaultValue="may">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="may">MAY/JUN</SelectItem>
                          <SelectItem value="nov">NOV/DEC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nabteb-year">Examination Year</Label>
                      <Select value={nabtebYear} onValueChange={setNabtebYear}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 12}, (_, i) => new Date().getFullYear() + 1 - i).map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nabteb-serial">Card Serial Number</Label>
                      <Input id="nabteb-serial" placeholder="Enter Serial Number" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nabteb-pin">PIN</Label>
                    <Input id="nabteb-pin" placeholder="Enter PIN" required />
                  </div>
                </>
              )}

              {selectedService === 'nbais-result' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nbais-state">State</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent>
                          {NIGERIAN_STATES.map(state => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nbais-school">School Name</Label>
                      <Input id="nbais-school" placeholder="Enter School Name" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nbais-year">Exam Year</Label>
                      <Select value={nbaisYear} onValueChange={setNbaisYear}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 12}, (_, i) => new Date().getFullYear() + 1 - i).map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nbais-month">Exam Month</Label>
                      <Select defaultValue="06">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                            <SelectItem key={i} value={(i + 1).toString().padStart(2, '0')}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nbais-number">Exam Number</Label>
                      <Input id="nbais-number" placeholder="e.g., 1234567890" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nbais-pin">PIN</Label>
                      <Input id="nbais-pin" placeholder="Enter PIN" required />
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}
              
              {statusMessage && (
                <div className="bg-primary/10 text-primary p-4 rounded-lg flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
                  <p className="text-sm font-medium">{statusMessage}</p>
                </div>
              )}

              <Button type="submit" className="w-full h-11" disabled={loading} data-testid="button-check">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {statusMessage ? 'Processing...' : 'Checking...'}
                  </>
                ) : "Check Result"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Result Display View
  const serviceName = EDUCATION_SERVICES.find(s => s.id === selectedService)?.name || 'Education';
  const hasSubjects = result?.subjects && result.subjects.length > 0;
  const hasScreenshot = result?.screenshotBase64;
  const hasPdf = result?.pdfBase64;
  const isError = result?.verificationStatus === 'error' || 
                  result?.verificationStatus === 'not_found' || 
                  result?.error === true || 
                  !!result?.errorMessage;
  const isVerified = result?.verificationStatus === 'verified' && !isError && (hasPdf || hasScreenshot);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">
            {isError ? 'Verification Failed' : 'Result Retrieved'}
          </h2>
          <p className="text-muted-foreground">
            {isError ? 'There was an issue verifying your result.' : 'Your examination result has been verified'}
          </p>
        </div>
        <Button variant="outline" onClick={() => {
          setResult(null);
          setSelectedService(null);
          setCurrentJobId(null);
          setError(null);
        }} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {isError ? (
        <Card className="max-w-2xl border-2 border-destructive/20">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">
                  {result?.verificationStatus === 'not_found' ? 'Result Not Found' : 'Verification Error'}
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {result?.message || result?.errorMessage || 'We could not verify your examination result. Please check your details and try again.'}
                </p>
              </div>
              
              {!result?.message?.toLowerCase().includes('refund') && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 w-full max-w-sm">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    Your wallet has been automatically refunded for this failed verification.
                  </p>
                </div>
              )}
              
              <div className="bg-muted/50 rounded-lg p-4 w-full max-w-sm text-left space-y-2">
                <p className="text-sm"><span className="font-medium">Registration Number:</span> {result?.registrationNumber}</p>
                <p className="text-sm"><span className="font-medium">Exam Type:</span> {result?.examType}</p>
                <p className="text-sm"><span className="font-medium">Exam Year:</span> {result?.examYear}</p>
              </div>
              <Button onClick={() => {
                setResult(null);
                setError(null);
              }} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : result?.isOfficialPdf ? (
        // Official PDF Download View - Simple interface for official exam body PDFs
        <Card className="max-w-2xl border-2 border-green-500/30">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">
                  Result Retrieved Successfully!
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Your official {serviceName} result has been retrieved from the exam portal.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 w-full max-w-sm text-left space-y-2">
                {result?.candidateName && (
                  <p className="text-sm"><span className="font-medium">Candidate:</span> {result.candidateName}</p>
                )}
                <p className="text-sm"><span className="font-medium">Registration Number:</span> {result?.registrationNumber}</p>
                <p className="text-sm"><span className="font-medium">Exam Year:</span> {result?.examYear}</p>
                {result?.subjects && result.subjects.length > 0 && (
                  <p className="text-sm"><span className="font-medium">Subjects:</span> {result.subjects.length} subjects found</p>
                )}
              </div>

              <Button 
                size="lg" 
                className="mt-4 gap-2" 
                onClick={handleDownloadResult}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Download Official {serviceName} Result (PDF)
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                This is the official result document from {serviceName}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-4xl border-2 border-primary/20 overflow-hidden print:border-none print:shadow-none">
          <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground print:bg-primary print:text-white">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">{serviceName} - Result Slip</CardTitle>
                <p className="text-primary-foreground/80 text-sm mt-1">Official Verification Copy</p>
              </div>
              <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center print:hidden">
                <Award className="h-6 w-6" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-8 pb-8 space-y-8">
            {/* Candidate Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {result?.candidateName && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Candidate Name</p>
                  <p className="font-bold text-lg mt-1">{result.candidateName}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Registration Number</p>
                <p className="font-mono font-bold text-lg mt-1">{result?.registrationNumber || result?.regNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Exam Year</p>
                <p className="font-bold text-lg mt-1">{result?.examYear}</p>
              </div>
              {result?.examType && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Exam Type</p>
                  <p className="font-bold text-lg mt-1">{result.examType}</p>
                </div>
              )}
            </div>

            {/* Subjects and Grades - if available */}
            {hasSubjects && (
              <div className="border rounded-lg p-4 bg-muted/10">
                <div className="flex justify-between items-center mb-4 pb-2 border-b font-semibold">
                  <span>Subject</span>
                  <span>Grade</span>
                </div>
                <div className="space-y-3">
                  {result.subjects.map((sub: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span>{sub.subject || sub.name}</span>
                      <span className="font-mono font-bold">{sub.grade || sub.score}</span>
                    </div>
                  ))}
                </div>
                {result?.score && (
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="font-bold">Total Score</span>
                    <span className="font-mono font-bold text-xl text-primary">{result.score}</span>
                  </div>
                )}
              </div>
            )}

            {/* Screenshot of Result - Primary Display */}
            {hasScreenshot && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 p-3 border-b">
                  <p className="text-sm font-medium">Official Result Screenshot</p>
                </div>
                <div className="p-4 bg-white">
                  <img 
                    src={`data:image/png;base64,${result.screenshotBase64}`}
                    alt="Examination Result"
                    className="w-full h-auto rounded border"
                  />
                </div>
              </div>
            )}

            {/* Status if available */}
            {(result?.status || result?.institution) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                {result?.status && (
                  <p className="text-sm">
                    <span className="font-semibold">Admission Status:</span>{" "}
                    <span className="font-bold text-green-600">{result.status}</span>
                  </p>
                )}
                {result?.institution && (
                  <p className="text-xs text-muted-foreground mt-1">{result.institution}</p>
                )}
              </div>
            )}

            {/* Verification timestamp */}
            <div className="text-xs text-muted-foreground text-center border-t pt-4">
              Verified on {new Date().toLocaleDateString('en-NG', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </CardContent>

          <CardFooter className="bg-muted/30 flex gap-4 justify-between print:hidden">
            <Button variant="outline" size="sm" onClick={handlePrintResult}>
              <Printer className="h-4 w-4 mr-2" />
              Print Result
            </Button>
            <div className="flex gap-2">
              {hasScreenshot && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `data:image/png;base64,${result.screenshotBase64}`;
                    link.download = `${selectedService}_result_screenshot.png`;
                    link.click();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Screenshot
                </Button>
              )}
              {(hasPdf || currentJobId) && (
                <Button size="sm" onClick={handleDownloadResult} disabled={downloading}>
                  {downloading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
