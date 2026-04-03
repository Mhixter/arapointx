import { tokenStorage } from '@/lib/tokenStorage';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Loader2,
  Download,
  ArrowLeft,
  FileSearch,
  FilePenLine,
  CheckCircle2,
  Printer,
  AlertCircle,
  Shield,
  History,
  CreditCard,
  ChevronRight,
  Lock,
  User,
  Phone,
  MapPin,
  Calendar,
  Building,
  Globe,
  Heart,
  Flag,
  AlertTriangle,
  Eye,
  ArrowRight,
  Clock,
  Hash,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BVN_SERVICES = [
  { id: "retrieval", name: "BVN Retrieval", icon: FileSearch, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-900/20", border: "border-cyan-200 dark:border-cyan-800", accent: "bg-cyan-600", desc: "Recover lost BVN details instantly. Get full name, photo, and all registered information.", price: 100 },
  { id: "modification", name: "BVN Modification", icon: FilePenLine, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-200 dark:border-violet-800", accent: "bg-violet-600", desc: "Update name or date of birth on your BVN. Agent enrollment only — not for bank-enrolled BVNs.", price: 2500 },
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
  const [nin, setNin] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [modificationHistory, setModificationHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);

  const getAuthToken = () => tokenStorage.getItem('accessToken');

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bvn.trim() || bvn.length !== 11) {
      toast({ title: "Invalid BVN", description: "BVN must be exactly 11 digits.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Please login to continue");
      const response = await fetch('/api/bvn/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ bvn, slipType: 'standard' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'BVN verification failed');
      const resultData = data.data?.data || data.data;
      const hasValidResult = resultData && (resultData.firstName || resultData.lastName || resultData.dateOfBirth || resultData.first_name || resultData.last_name);
      if (!hasValidResult) throw new Error('No record found for the provided BVN. Please double-check and try again.');
      setRetrievedData(resultData);
      if (data.data?.slip?.html) setSlipHtml(data.data.slip.html);
      toast({ title: "BVN Retrieved Successfully", variant: "success", description: "Your BVN details have been retrieved." });
    } catch (err: any) {
      setError(err.message || 'BVN verification failed');
      toast({ title: "BVN Verification Failed", description: err.message || 'An error occurred', variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchModificationHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/bvn/history', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (data.status === 'success') {
        setModificationHistory((data.data?.history || []).filter((h: any) => h.serviceType === 'modification'));
      }
    } catch { } finally { setLoadingHistory(false); }
  };

  const validateModificationForm = () => {
    if (!bvn.trim() || bvn.length !== 11) { toast({ title: "Invalid BVN", description: "BVN must be exactly 11 digits.", variant: "destructive" }); return false; }
    if (!changeCategory) { toast({ title: "Category Required", description: "Please select a category of change.", variant: "destructive" }); return false; }
    if (changeCategory === "name" && (!oldName.trim() || !newName.trim())) { toast({ title: "Name Fields Required", description: "Please enter both old and new names.", variant: "destructive" }); return false; }
    if (changeCategory === "dob" && (!oldDOB.trim() || !newDOB.trim())) { toast({ title: "Date of Birth Fields Required", description: "Please enter both old and new dates of birth.", variant: "destructive" }); return false; }
    if (!phoneNumber.trim()) { toast({ title: "Phone Number Required", description: "Please enter your phone number.", variant: "destructive" }); return false; }
    return true;
  };

  const handleModificationFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateModificationForm()) setShowConfirmDialog(true);
  };

  const handleModificationSubmit = async () => {
    setShowConfirmDialog(false);
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Please login to continue");
      const response = await fetch('/api/bvn/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ bvn, nin: nin.trim() || undefined, phone: phoneNumber, changeCategory, oldValue: changeCategory === 'name' ? oldName : oldDOB, newValue: changeCategory === 'name' ? newName : newDOB, address }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Modification request failed');
      setSubmitted(true);
      toast({ title: "Modification Request Submitted", variant: "success", description: "Your BVN modification request has been submitted successfully." });
    } catch (err: any) {
      toast({ title: "Request Failed", description: err.message || 'An error occurred', variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleDownloadSlip = () => {
    if (!slipHtml) { toast({ title: "No Slip Available", description: "Please complete verification first.", variant: "destructive" }); return; }
    const blob = new Blob([slipHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bvn-slip-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Slip Downloaded", variant: "success", description: "Open the HTML file in your browser and print it" });
  };

  const handlePrintSlip = () => {
    if (!slipHtml) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(slipHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); }, 500);
    }
  };

  const resetAll = () => {
    setSelectedService(null); setBvn(""); setNin(""); setError(""); setChangeCategory(""); setOldName(""); setNewName(""); setOldDOB(""); setNewDOB(""); setPhoneNumber(""); setAddress(""); setSubmitted(false); setRetrievedData(null); setSlipHtml(null);
  };

  /* ────────────── Service Selection ────────────── */
  if (!selectedService) {
    return (
      <div className="space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-700 p-7 text-white shadow-lg">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white -translate-y-1/3 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white translate-y-1/3 -translate-x-1/3" />
          </div>
          <div className="relative space-y-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-6 w-6 opacity-90" />
              <span className="text-sm font-semibold uppercase tracking-wider opacity-80">BVN Services</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">Bank Verification Number</h1>
            <p className="text-blue-100 text-sm max-w-lg">
              Retrieve your BVN details or request a modification to your registered name or date of birth through our secure agent platform.
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Shield className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-200">Legal Disclaimer</p>
            <p className="text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
              Arapoint is an independent service provider and is <strong>NOT</strong> an official partner or affiliate of the Nigeria Inter-Bank Settlement System (NIBSS).
              We act as authorized agents to assist you with BVN services. Your data is handled in compliance with Nigerian data protection regulations (NDPR).
            </p>
          </div>
        </div>

        {/* Service Cards */}
        <div className="space-y-3">
          <h3 className="text-base font-bold">Choose a Service</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BVN_SERVICES.map((service) => (
              <button
                key={service.id}
                onClick={() => setSelectedService(service.id)}
                className={`group text-left w-full rounded-2xl border-2 ${service.border} ${service.bg} p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
              >
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${service.bg} ${service.color} border ${service.border} group-hover:scale-110 transition-transform`}>
                    <service.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-bold text-base ${service.color}`}>{service.name}</h4>
                      <span className={`text-sm font-bold ${service.color} bg-white dark:bg-background rounded-full px-3 py-1 border ${service.border}`}>
                        ₦{service.price.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{service.desc}</p>
                  </div>
                </div>
                <div className={`mt-4 flex items-center gap-2 text-sm font-semibold ${service.color}`}>
                  Get Started
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
          <Lock className="h-5 w-5 text-slate-500 flex-shrink-0" />
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Your BVN data is retrieved in real-time and is not stored on Arapoint's servers. All transactions are encrypted and secured.
          </p>
        </div>
      </div>
    );
  }

  /* ────────────── Modification Form ────────────── */
  if (selectedService === 'modification' && !submitted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={resetAll} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">BVN Modification</h2>
            <p className="text-sm text-muted-foreground">Agent enrollment only · ₦2,500 (includes affidavit fees)</p>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-semibold text-amber-800 dark:text-amber-200">Important — Agent Enrollment Only</p>
            <p className="text-amber-700 dark:text-amber-300">
              <strong>DO NOT submit if your BVN was enrolled at a BANK.</strong> This service is ONLY for BVNs enrolled by agents.
              If you enrolled at a bank branch, please visit the bank for modifications.
            </p>
            <p className="text-amber-700 dark:text-amber-300 font-medium">Cost: ₦2,500 · Processing: 3–5 business days</p>
          </div>
        </div>

        <Tabs defaultValue="request" className="w-full max-w-2xl" onValueChange={(v) => { if (v === 'history') fetchModificationHistory(); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="request">New Request</TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="mt-4">
            <Card className="border-2">
              <CardContent className="pt-6">
                <form onSubmit={handleModificationFormSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bvn" className="font-medium">BVN (Bank Verification Number)</Label>
                      <Input
                        id="bvn"
                        placeholder="Enter 11-digit BVN"
                        maxLength={11}
                        value={bvn}
                        onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))}
                        className="h-12 font-mono text-lg tracking-widest text-center"
                      />
                      <p className="text-xs text-muted-foreground">{bvn.length}/11 digits</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nin" className="font-medium">
                        NIN (National Identification Number) <span className="text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <Input
                        id="nin"
                        placeholder="Enter 11-digit NIN"
                        maxLength={11}
                        value={nin}
                        onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))}
                        className="h-12 font-mono text-lg tracking-widest text-center"
                      />
                      <p className="text-xs text-muted-foreground">{nin.length}/11 digits</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="font-medium">Category of Change</Label>
                    <Select value={changeCategory} onValueChange={(value: any) => setChangeCategory(value)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select what you want to change" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Change of Name</SelectItem>
                        <SelectItem value="dob">Change of Date of Birth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {changeCategory === "name" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/40 rounded-xl">
                      <div className="space-y-2">
                        <Label htmlFor="oldName">Current Name (on BVN)</Label>
                        <Input id="oldName" placeholder="Your current registered name" value={oldName} onChange={(e) => setOldName(e.target.value)} className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newName">New Name</Label>
                        <Input id="newName" placeholder="Your correct name" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-11" />
                      </div>
                    </div>
                  )}

                  {changeCategory === "dob" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/40 rounded-xl">
                      <div className="space-y-2">
                        <Label htmlFor="oldDOB">Current Date of Birth (on BVN)</Label>
                        <Input id="oldDOB" type="date" value={oldDOB} onChange={(e) => setOldDOB(e.target.value)} className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newDOB">Correct Date of Birth</Label>
                        <Input id="newDOB" type="date" value={newDOB} onChange={(e) => setNewDOB(e.target.value)} className="h-11" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="font-medium">Phone Number</Label>
                    <Input id="phone" type="tel" placeholder="08012345678" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="h-11" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="font-medium">Address <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                    <textarea
                      id="address"
                      placeholder="Enter your residential address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-20 resize-none text-sm"
                    />
                  </div>

                  <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</> : "Submit Modification Request — ₦2,500"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  Modification Request History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : modificationHistory.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground space-y-2">
                    <History className="h-10 w-10 mx-auto opacity-30" />
                    <p className="text-sm">No modification requests yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {modificationHistory.map((request) => (
                      <button
                        key={request.id}
                        onClick={() => setSelectedHistoryItem(request)}
                        className="w-full text-left flex items-center justify-between p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 hover:border-violet-300 dark:hover:border-violet-700 transition-all group"
                      >
                        <div className="space-y-1">
                          <p className="font-medium font-mono text-sm">BVN: {request.bvn?.substring(0, 4)}****{request.bvn?.substring(8)}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              {new Date(request.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                            {request.responseData?.changeCategory && (
                              <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                                · {request.responseData.changeCategory === 'name' ? 'Name Change' : 'Date of Birth Change'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${request.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : request.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                            {request.status?.charAt(0).toUpperCase() + request.status?.slice(1)}
                          </span>
                          <Eye className="h-4 w-4 text-muted-foreground group-hover:text-violet-600 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Request Detail Dialog ── */}
        <Dialog open={!!selectedHistoryItem} onOpenChange={(open) => { if (!open) setSelectedHistoryItem(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FilePenLine className="h-5 w-5 text-violet-600" />
                BVN Modification Request
              </DialogTitle>
            </DialogHeader>

            {selectedHistoryItem && (
              <div className="space-y-4 py-1">
                {/* Status banner */}
                <div className={`flex items-center justify-between p-3 rounded-xl border ${
                  selectedHistoryItem.status === 'completed'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : selectedHistoryItem.status === 'rejected'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <Clock className={`h-4 w-4 ${
                      selectedHistoryItem.status === 'completed' ? 'text-green-600' :
                      selectedHistoryItem.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                    }`} />
                    <span className="text-sm font-medium">
                      {selectedHistoryItem.status === 'pending' && 'Under Review — 3–5 business days'}
                      {selectedHistoryItem.status === 'completed' && 'Modification Completed'}
                      {selectedHistoryItem.status === 'rejected' && 'Request Rejected'}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedHistoryItem.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                    selectedHistoryItem.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                  }`}>
                    {selectedHistoryItem.status?.charAt(0).toUpperCase() + selectedHistoryItem.status?.slice(1)}
                  </span>
                </div>

                {/* BVN, NIN & Reference */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/40 border space-y-0.5">
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <CreditCard className="h-3 w-3" /> BVN
                    </p>
                    <p className="font-mono font-bold text-sm">
                      {selectedHistoryItem.bvn?.substring(0, 4)}****{selectedHistoryItem.bvn?.substring(8)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border space-y-0.5">
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <User className="h-3 w-3" /> NIN
                    </p>
                    {selectedHistoryItem.responseData?.nin ? (
                      <p className="font-mono font-bold text-sm">
                        {selectedHistoryItem.responseData.nin.substring(0, 4)}****{selectedHistoryItem.responseData.nin.substring(8)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Not provided</p>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border col-span-2 space-y-0.5">
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Hash className="h-3 w-3" /> Reference
                    </p>
                    <p className="font-mono text-xs font-semibold break-all">
                      {selectedHistoryItem.requestId || selectedHistoryItem.id?.slice(0, 12) + '...'}
                    </p>
                  </div>
                </div>

                {/* Change details */}
                {selectedHistoryItem.responseData && (
                  <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-violet-200 dark:border-violet-800">
                      <p className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">Modification Details</p>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Type of Change</span>
                        <span className="text-sm font-semibold capitalize">
                          {selectedHistoryItem.responseData.changeCategory === 'name' ? 'Change of Name' :
                           selectedHistoryItem.responseData.changeCategory === 'dob' ? 'Change of Date of Birth' :
                           selectedHistoryItem.responseData.changeCategory || '—'}
                        </span>
                      </div>
                      {selectedHistoryItem.responseData.oldValue && (
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs text-muted-foreground pt-0.5">Current Value</span>
                          <span className="text-sm font-mono font-medium text-red-600 dark:text-red-400 text-right">
                            {selectedHistoryItem.responseData.oldValue}
                          </span>
                        </div>
                      )}
                      {selectedHistoryItem.responseData.oldValue && selectedHistoryItem.responseData.newValue && (
                        <div className="flex justify-center">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      {selectedHistoryItem.responseData.newValue && (
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs text-muted-foreground pt-0.5">Requested New Value</span>
                          <span className="text-sm font-mono font-medium text-green-700 dark:text-green-400 text-right">
                            {selectedHistoryItem.responseData.newValue}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Extra info */}
                <div className="space-y-2 text-sm">
                  {selectedHistoryItem.phone && (
                    <div className="flex items-center justify-between py-1.5 border-b">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> Phone
                      </span>
                      <span className="font-medium">{selectedHistoryItem.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-1.5 border-b">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Date Submitted
                    </span>
                    <span className="font-medium">
                      {new Date(selectedHistoryItem.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-bold text-primary">₦2,500</span>
                  </div>
                </div>

                {selectedHistoryItem.status === 'pending' && (
                  <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p>Your request is being processed by our identity agents. You will be notified via email and SMS once completed.</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setSelectedHistoryItem(null)} className="w-full">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm BVN Modification Request</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <p className="text-amber-800 dark:text-amber-200 text-sm font-semibold">
                      This service is ONLY for agent-enrolled BVNs. If your BVN was enrolled at a bank, please visit the bank instead.
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">BVN</span><span className="font-mono font-medium">{bvn.substring(0, 4)}****{bvn.substring(8)}</span></div>
                    {nin.trim() && <div className="flex justify-between"><span className="text-muted-foreground">NIN</span><span className="font-mono font-medium">{nin.substring(0, 4)}****{nin.substring(8)}</span></div>}
                    <div className="flex justify-between"><span className="text-muted-foreground">Change Type</span><span className="font-medium">{changeCategory === 'name' ? 'Name Change' : 'Date of Birth Change'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{phoneNumber}</span></div>
                    <div className="flex justify-between border-t pt-2"><span className="font-semibold">Cost</span><span className="font-bold text-primary">₦2,500</span></div>
                  </div>
                  <p className="text-xs text-muted-foreground">Amount includes affidavit and agent processing fees. Processing typically takes 3–5 business days.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleModificationSubmit}>Confirm & Submit</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  /* ────────────── Modification Success ────────────── */
  if (selectedService === 'modification' && submitted) {
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <Button variant="ghost" size="sm" onClick={resetAll} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to BVN Services
        </Button>

        <div className="text-center space-y-6 py-6">
          <div className="relative inline-flex">
            <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Request Submitted!</h2>
            <p className="text-muted-foreground text-sm">Your BVN modification request is now under review</p>
          </div>

          <Card className="text-left border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">BVN Number</p>
                  <p className="text-lg font-mono font-bold mt-0.5">{bvn}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category of Change</p>
                  <p className="text-base font-semibold mt-0.5">{changeCategory === 'name' ? 'Change of Name' : 'Change of Date of Birth'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-200 text-left space-y-1">
            <p className="font-semibold">What happens next?</p>
            <p>Your request will be processed within 3–5 business days. You will receive a confirmation via email and SMS once completed.</p>
          </div>
        </div>
      </div>
    );
  }

  /* ────────────── BVN Retrieval Form ────────────── */
  if (!retrievedData) {
    const service = BVN_SERVICES.find(s => s.id === selectedService);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={resetAll} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{service?.name}</h2>
            <p className="text-sm text-muted-foreground">Enter your 11-digit BVN · Fee: ₦{service?.price}</p>
          </div>
        </div>

        <div className="max-w-md space-y-4">
          {error && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <Card className="border-2">
            <CardContent className="pt-6">
              <form onSubmit={handleQuery} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="bvn" className="font-medium">Bank Verification Number</Label>
                  <Input
                    id="bvn"
                    placeholder="Enter your 11-digit BVN"
                    maxLength={11}
                    value={bvn}
                    onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))}
                    className="h-14 font-mono text-xl tracking-widest text-center"
                    autoFocus
                  />
                  <p className="text-xs text-center text-muted-foreground">{bvn.length}/11 digits · Numbers only</p>
                </div>

                <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground text-center">
                  By proceeding, ₦{service?.price} will be deducted from your wallet
                </div>

                <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading || bvn.length !== 11}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Verifying...</> : `Retrieve BVN Details — ₦${service?.price}`}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
            <Lock className="h-3.5 w-3.5" />
            <span>Secured with end-to-end encryption · Powered by YouVerify</span>
          </div>
        </div>
      </div>
    );
  }

  /* ────────────── BVN Result ────────────── */
  const fullName = `${retrievedData.lastName || retrievedData.surname || ''} ${retrievedData.firstName || retrievedData.firstname || ''} ${retrievedData.middleName || retrievedData.othername || ''}`.trim();

  const infoGroups = [
    {
      title: "Personal Information",
      icon: User,
      fields: [
        { label: 'BVN Number', value: retrievedData.id || bvn, mono: true },
        { label: 'Surname', value: retrievedData.lastName || retrievedData.surname },
        { label: 'First Name', value: retrievedData.firstName || retrievedData.firstname },
        { label: 'Middle Name', value: retrievedData.middleName || retrievedData.othername },
        { label: 'Date of Birth', value: retrievedData.dateOfBirth },
        { label: 'Gender', value: retrievedData.gender },
        { label: 'Nationality', value: retrievedData.nationality },
        { label: 'Marital Status', value: retrievedData.maritalStatus },
      ].filter(f => f.value),
    },
    {
      title: "Contact & Location",
      icon: Phone,
      fields: [
        { label: 'Phone Number', value: retrievedData.phone },
        { label: 'Email', value: retrievedData.email },
        { label: 'Residential Address', value: retrievedData.residentialAddress || retrievedData.address },
        { label: 'State of Origin', value: retrievedData.stateOfOrigin },
        { label: 'LGA of Origin', value: retrievedData.lgaOfOrigin },
        { label: 'State of Residence', value: retrievedData.stateOfResidence },
        { label: 'LGA of Residence', value: retrievedData.lgaOfResidence },
      ].filter(f => f.value),
    },
    {
      title: "Enrollment Information",
      icon: Building,
      fields: [
        { label: 'Enrollment Branch', value: retrievedData.enrollmentBranch },
        { label: 'Enrollment Institution', value: retrievedData.enrollmentInstitution },
        { label: 'Enrollment Bank', value: retrievedData.enrollmentBank },
        { label: 'Registration Date', value: retrievedData.registrationDate },
      ].filter(f => f.value),
    },
  ];

  const watchListed = retrievedData.watchListed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={resetAll} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-bold">BVN Verification Result</h2>
            <p className="text-xs text-muted-foreground">Your verified BVN information</p>
          </div>
        </div>
        <div className="flex gap-2">
          {slipHtml && (
            <>
              <Button variant="outline" size="sm" onClick={handlePrintSlip} className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button size="sm" onClick={handleDownloadSlip} className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <Card className="border-2 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 h-16" />
        <CardContent className="pt-0 pb-6">
          <div className="flex items-end gap-4 -mt-8 mb-4">
            <div className="relative">
              {retrievedData.photo ? (
                <img
                  src={retrievedData.photo.startsWith('data:') ? retrievedData.photo : `data:image/jpeg;base64,${retrievedData.photo}`}
                  alt="Photo"
                  className="w-20 h-24 rounded-xl object-cover border-4 border-background shadow-lg bg-muted"
                />
              ) : (
                <div className="w-20 h-24 rounded-xl border-4 border-background shadow-lg bg-muted flex items-center justify-center">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <div className="pb-1">
              <h3 className="text-xl font-bold">{fullName || 'N/A'}</h3>
              <p className="font-mono text-sm text-muted-foreground">{retrievedData.id || bvn}</p>
            </div>
          </div>

          {watchListed !== undefined && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-2 ${watchListed ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
              {watchListed ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {watchListed ? 'WATCHLISTED' : 'NOT WATCHLISTED'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Groups */}
      <div className="space-y-4">
        {infoGroups.map((group) => {
          if (group.fields.length === 0) return null;
          return (
            <Card key={group.title}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  <group.icon className="h-4 w-4" />
                  {group.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                  {group.fields.map((field, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="text-xs text-muted-foreground font-medium">{field.label}</p>
                      <p className={`text-sm font-semibold ${(field as any).mono ? 'font-mono' : ''}`}>{field.value || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
