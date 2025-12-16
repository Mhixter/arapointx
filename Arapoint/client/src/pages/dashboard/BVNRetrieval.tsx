import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, 
  Download, 
  ArrowLeft, 
  CreditCard, 
  FileSearch, 
  FilePenLine,
  CheckCircle2,
  Activity,
  Printer,
  AlertCircle,
  Shield
} from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BVN_SERVICES = [
  { id: "retrieval", name: "BVN Retrieval", icon: FileSearch, color: "text-cyan-600", bg: "bg-cyan-100 dark:bg-cyan-900/20", desc: "Recover lost BVN details", price: 100 },
  { id: "card", name: "BVN Card", icon: CreditCard, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/20", desc: "Print BVN Digital Card", price: 500 },
  { id: "modification", name: "BVN Modification", icon: FilePenLine, color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/20", desc: "Update your personal details", price: 1000 },
];

export default function BVNRetrieval() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [bvn, setBvn] = useState("");
  const [retrievedData, setRetrievedData] = useState<any>(null);
  const [slipHtml, setSlipHtml] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const slipContainerRef = useRef<HTMLDivElement>(null);

  const [changeCategory, setChangeCategory] = useState<"name" | "dob" | "">("");
  const [oldName, setOldName] = useState("");
  const [newName, setNewName] = useState("");
  const [oldDOB, setOldDOB] = useState("");
  const [newDOB, setNewDOB] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");

  const getAuthToken = () => {
    return localStorage.getItem('accessToken');
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bvn.trim() || bvn.length !== 11) {
      toast({
        title: "Invalid BVN",
        description: "BVN must be exactly 11 digits.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Please login to continue");
      }

      const endpoint = selectedService === 'card' ? '/api/bvn/digital-card' : '/api/bvn/retrieve';
      const isPremium = selectedService === 'card';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          bvn,
          premium: isPremium,
          slipType: isPremium ? 'premium' : 'standard',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'BVN verification failed');
      }

      setRetrievedData(data.data?.data || data.data);
      if (data.data?.slip?.html) {
        setSlipHtml(data.data.slip.html);
      }
      
      toast({
        title: "BVN Retrieved Successfully",
        description: `Your BVN details have been retrieved via YouVerify.`,
      });
    } catch (err: any) {
      setError(err.message || 'BVN verification failed');
      toast({
        title: "BVN Verification Failed",
        description: err.message || 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bvn.trim() || bvn.length !== 11) {
      toast({
        title: "Invalid BVN",
        description: "BVN must be exactly 11 digits.",
        variant: "destructive",
      });
      return;
    }

    if (!changeCategory) {
      toast({
        title: "Category Required",
        description: "Please select a category of change.",
        variant: "destructive",
      });
      return;
    }

    if (changeCategory === "name" && (!oldName.trim() || !newName.trim())) {
      toast({
        title: "Name Fields Required",
        description: "Please enter both old and new names.",
        variant: "destructive",
      });
      return;
    }

    if (changeCategory === "dob" && (!oldDOB.trim() || !newDOB.trim())) {
      toast({
        title: "Date of Birth Fields Required",
        description: "Please enter both old and new dates of birth.",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your phone number.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Please login to continue");
      }

      const response = await fetch('/api/bvn/modify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          bvn,
          phone: phoneNumber,
          changeCategory,
          oldValue: changeCategory === 'name' ? oldName : oldDOB,
          newValue: changeCategory === 'name' ? newName : newDOB,
          address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Modification request failed');
      }

      setSubmitted(true);
      toast({
        title: "Modification Request Submitted",
        description: "Your BVN modification request has been submitted successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Request Failed",
        description: err.message || 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSlip = () => {
    if (!slipHtml) {
      toast({
        title: "No Slip Available",
        description: "Please complete verification first.",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([slipHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bvn-slip-${Date.now()}.html`;
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

  if (!selectedService) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-200">Legal Disclaimer</p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Arapoint is an independent service provider and is <strong>NOT</strong> an official partner or affiliate of the Nigeria Inter-Bank Settlement System (NIBSS). 
                We act as authorized agents to assist you with BVN verification services. Your personal data is protected and handled in compliance with Nigerian data protection regulations (NDPR). 
                By using this service, you agree to our terms and conditions.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-primary text-primary-foreground border-none">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">BVN Services</p>
                <h3 className="text-3xl font-bold mt-1">Verify Now</h3>
              </div>
              <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
               <div>
                <p className="text-sm font-medium text-muted-foreground">Powered by YouVerify</p>
                <h3 className="text-xl font-bold mt-1">Real-time BVN Data</h3>
              </div>
              <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">BVN Services</h2>
          <p className="text-muted-foreground">Select a BVN service to get started.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BVN_SERVICES.map((service) => (
            <Card 
              key={service.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group"
              onClick={() => setSelectedService(service.id)}
            >
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${service.bg} ${service.color}`}>
                  <service.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{service.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{service.desc}</p>
                  <p className="text-sm font-semibold text-primary mt-2">₦{service.price}</p>
                </div>
                <Button className="w-full mt-2" size="sm">
                  Select
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (selectedService === 'modification' && !submitted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">BVN Modification</h2>
            <p className="text-muted-foreground">Update your BVN personal details. Price: ₦1,000</p>
          </div>
          <Button variant="outline" onClick={() => {
            setSelectedService(null);
            setBvn("");
            setChangeCategory("");
            setOldName("");
            setNewName("");
            setOldDOB("");
            setNewDOB("");
            setPhoneNumber("");
            setAddress("");
          }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Submit Modification Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleModificationSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bvn">Bank Verification Number</Label>
                <Input
                  id="bvn"
                  placeholder="11-digit BVN"
                  maxLength={11}
                  value={bvn}
                  onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))}
                  className="h-11 font-mono text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground">Format: 11 digits only</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category of Change</Label>
                <Select value={changeCategory} onValueChange={(value: any) => setChangeCategory(value)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select category of change" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Change of Name</SelectItem>
                    <SelectItem value="dob">Change of Date of Birth</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {changeCategory === "name" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="oldName">Old Name</Label>
                    <Input
                      id="oldName"
                      placeholder="Your current name"
                      value={oldName}
                      onChange={(e) => setOldName(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newName">New Name</Label>
                    <Input
                      id="newName"
                      placeholder="Your new name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>
              )}

              {changeCategory === "dob" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="oldDOB">Old Date of Birth</Label>
                    <Input
                      id="oldDOB"
                      type="date"
                      value={oldDOB}
                      onChange={(e) => setOldDOB(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newDOB">New Date of Birth</Label>
                    <Input
                      id="newDOB"
                      type="date"
                      value={newDOB}
                      onChange={(e) => setNewDOB(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08012345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <textarea
                  id="address"
                  placeholder="Enter your residential address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-24 resize-none"
                />
              </div>

              <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : "Submit Modification Request (₦1,000)"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedService === 'modification' && submitted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">Modification Submitted</h2>
            <p className="text-muted-foreground">Your request has been successfully submitted</p>
          </div>
          <Button variant="outline" onClick={() => {
            setSelectedService(null);
            setBvn("");
            setChangeCategory("");
            setOldName("");
            setNewName("");
            setOldDOB("");
            setNewDOB("");
            setPhoneNumber("");
            setAddress("");
            setSubmitted(false);
          }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="w-full max-w-2xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <CardContent className="pt-8">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-green-900">Request Submitted Successfully</h3>
                <p className="text-green-700">Your BVN modification request has been received and is under review.</p>
              </div>

              <div className="bg-white rounded-lg p-6 w-full space-y-4 border border-green-200">
                <div className="text-left space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">BVN Number</p>
                    <p className="text-lg font-mono font-bold text-foreground mt-1">{bvn}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Category of Change</p>
                    <p className="text-lg font-medium text-foreground mt-1">{changeCategory === 'name' ? 'Change of Name' : 'Change of Date of Birth'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full text-sm text-blue-900">
                <p><strong>Next Steps:</strong> Your request will be processed within 3-5 business days. You will receive a confirmation via email and SMS.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!retrievedData) {
    const service = BVN_SERVICES.find(s => s.id === selectedService);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">{service?.name}</h2>
            <p className="text-muted-foreground">Enter your 11-digit BVN to proceed. Price: ₦{service?.price}</p>
          </div>
          <Button variant="outline" onClick={() => {
            setSelectedService(null);
            setBvn("");
            setError("");
          }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enter BVN</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleQuery} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bvn">Bank Verification Number</Label>
                <Input
                  id="bvn"
                  placeholder="11-digit BVN"
                  maxLength={11}
                  value={bvn}
                  onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))}
                  className="h-11 font-mono text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground">Format: 11 digits only</p>
              </div>

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verifying with YouVerify...
                  </>
                ) : `Continue (₦${service?.price})`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullName = `${retrievedData.lastName || retrievedData.surname || ''} ${retrievedData.firstName || retrievedData.firstname || ''} ${retrievedData.middleName || retrievedData.othername || ''}`.trim();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">
            {selectedService === 'card' ? 'BVN Digital Card' : 'BVN Slip'}
          </h2>
          <p className="text-muted-foreground">Your verified BVN information from YouVerify</p>
        </div>
        <Button variant="outline" onClick={() => {
          setRetrievedData(null);
          setSlipHtml(null);
          setBvn("");
          setSelectedService(null);
        }}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Card className="w-full max-w-2xl border-primary/30 shadow-lg">
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold">Bank Verification Number</h3>
              <p className="text-primary-foreground/80 text-sm mt-1">Nigeria Inter-Bank Settlement System</p>
            </div>
            <div className="flex gap-2">
              {slipHtml && (
                <>
                  <Button 
                    onClick={handlePrintSlip}
                    variant="secondary"
                    size="sm"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button 
                    onClick={handleDownloadSlip}
                    variant="secondary"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            <div className="flex-shrink-0">
              {retrievedData.photo ? (
                <img 
                  src={retrievedData.photo.startsWith('data:') ? retrievedData.photo : `data:image/jpeg;base64,${retrievedData.photo}`} 
                  alt="Photo" 
                  className="w-32 h-40 rounded-lg object-cover border-2 border-primary/30 shadow-md bg-muted" 
                />
              ) : (
                <div className="w-32 h-40 rounded-lg border-2 border-primary/30 shadow-md bg-muted flex items-center justify-center text-muted-foreground text-sm">
                  No Photo
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="border-b-2 border-dashed border-primary/20 pb-4 mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Full Name</p>
                <p className="text-2xl font-bold text-primary">{fullName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">BVN Number</p>
                <p className="text-3xl font-mono font-bold tracking-[0.15em]">{retrievedData.id || bvn}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Date of Birth</p>
              <p className="text-lg font-medium mt-1">{retrievedData.dateOfBirth || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Gender</p>
              <p className="text-lg font-medium mt-1">{retrievedData.gender || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Phone Number</p>
              <p className="text-lg font-medium mt-1">{retrievedData.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Email</p>
              <p className="text-lg font-medium mt-1">{retrievedData.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Enrollment Branch</p>
              <p className="text-lg font-medium mt-1">{retrievedData.enrollmentBranch || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Enrollment Institution</p>
              <p className="text-lg font-medium mt-1">{retrievedData.enrollmentInstitution || 'N/A'}</p>
            </div>
            {retrievedData.watchListed !== undefined && (
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Watchlist Status</p>
                <p className={`text-lg font-bold mt-1 ${retrievedData.watchListed ? 'text-red-600' : 'text-green-600'}`}>
                  {retrievedData.watchListed ? 'WATCHLISTED' : 'NOT WATCHLISTED'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {slipHtml && (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Printable Slip Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={slipContainerRef} className="border rounded-lg overflow-hidden">
              <iframe 
                srcDoc={slipHtml} 
                className="w-full h-96 border-0"
                title="BVN Slip Preview"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
