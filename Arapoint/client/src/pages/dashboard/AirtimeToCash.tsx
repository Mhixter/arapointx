import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Smartphone, ArrowRight, Clock, Info, CheckCircle2, AlertCircle, Copy, History, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const MTN_LOGO = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.svg/512px-New-mtn-logo.svg.png";

const DEFAULT_NETWORKS = [
  { id: "mtn", name: "MTN", color: "bg-yellow-500", rate: 80, logo: MTN_LOGO },
  { id: "airtel", name: "Airtel", color: "bg-red-500", rate: 75, logo: "" },
  { id: "glo", name: "Glo", color: "bg-green-500", rate: 70, logo: "" },
  { id: "9mobile", name: "9Mobile", color: "bg-green-600", rate: 70, logo: "" },
];

const NIGERIAN_BANKS = [
  "Access Bank",
  "First Bank",
  "GTBank",
  "UBA",
  "Zenith Bank",
  "Kuda Bank",
  "Opay",
  "Palmpay",
  "Moniepoint",
  "Sterling Bank",
  "Union Bank",
  "Wema Bank",
  "Fidelity Bank",
  "FCMB",
  "Ecobank",
  "Stanbic IBTC",
  "Polaris Bank",
  "Jaiz Bank",
  "Keystone Bank",
  "Heritage Bank",
  "Globus Bank",
  "Providus Bank",
  "SunTrust Bank",
  "Unity Bank",
  "Titan Trust Bank",
  "TAJ Bank",
  "VFD MFB",
  "Other",
];

interface A2CRequest {
  id: string;
  trackingId: string;
  network: string;
  phoneNumber: string;
  airtimeAmount: string;
  cashAmount: string;
  receivingNumber: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
  userConfirmedAt: string | null;
  airtimeReceivedAt: string | null;
  cashPaidAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface StatusHistory {
  id: string;
  requestId: string;
  actorType: string;
  previousStatus: string;
  newStatus: string;
  note: string | null;
  createdAt: string;
}

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pending Confirmation", variant: "secondary" },
  pending_confirmation: { label: "Pending Confirmation", variant: "secondary" },
  completed_and_paid: { label: "Completed & Paid", variant: "default" },
  not_received_contact_support: { label: "Not Received - Contact Support", variant: "destructive" },
  airtime_sent: { label: "Airtime Sent", variant: "outline" },
  airtime_received: { label: "Received", variant: "default" },
  processing: { label: "Processing", variant: "default" },
  completed: { label: "Completed", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default function AirtimeToCash() {
  const [selectedNetwork, setSelectedNetwork] = useState("mtn");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<any>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [requests, setRequests] = useState<A2CRequest[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState("convert");
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<A2CRequest | null>(null);
  const [requestHistory, setRequestHistory] = useState<StatusHistory[]>([]);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [networks, setNetworks] = useState(DEFAULT_NETWORKS);
  const { toast } = useToast();

  const selectedNetworkData = networks.find(n => n.id === selectedNetwork);
  const cashValue = selectedNetworkData ? (parseFloat(amount || "0") * selectedNetworkData.rate / 100) : 0;

  useEffect(() => {
    fetchRates();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchRates = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/airtime/to-cash/rates', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.data?.rates) {
        const rates = data.data.rates;
        setNetworks(prev => prev.map(n => ({
          ...n,
          rate: rates[n.id] || n.rate
        })));
      }
    } catch (err) {
      console.error('Failed to fetch rates', err);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/airtime/to-cash/requests', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setRequests(data.data?.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedNetwork || !amount || !phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!bankName || !accountNumber || !accountName) {
      toast({
        title: "Bank Details Required",
        description: "Please provide your bank details for payout",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(amount) < 100) {
      toast({
        title: "Minimum Amount",
        description: "Minimum amount is ₦100",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(amount) > 50000) {
      toast({
        title: "Maximum Amount",
        description: "Maximum amount is ₦50,000",
        variant: "destructive",
      });
      return;
    }

    if (accountNumber.length !== 10) {
      toast({
        title: "Invalid Account",
        description: "Account number must be 10 digits",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error("Please login to continue");
      }

      const response = await fetch('/api/airtime/to-cash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          network: selectedNetwork,
          amount: parseFloat(amount),
          phone,
          bankName,
          accountNumber,
          accountName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      setCurrentRequest({
        ...data.data,
        id: data.data?.requestId || data.data?.id,
        requestId: data.data?.requestId || data.data?.id,
      });
      setShowConfirmDialog(true);

    } catch (err: any) {
      toast({
        title: "Request Failed",
        description: err.message || 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSent = async () => {
    if (!currentRequest?.id && !currentRequest?.trackingId) return;

    setIsConfirming(true);
    try {
      const token = localStorage.getItem('accessToken');
      const requestId = currentRequest?.id || currentRequest?.requestId || requests.find(r => r.trackingId === currentRequest.trackingId)?.id;
      
      if (!requestId) {
        throw new Error('Request ID not found');
      }
      
      const response = await fetch(`/api/airtime/to-cash/${requestId}/confirm-sent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Confirmation failed');
      }

      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
      
      setAmount("");
      setPhone("");
      setBankName("");
      setAccountNumber("");
      setAccountName("");

    } catch (err: any) {
      toast({
        title: "Confirmation Failed",
        description: err.message || 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Number copied to clipboard",
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto px-2 sm:px-0">
      <div>
        <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">Airtime to Cash</h2>
        <p className="text-muted-foreground text-sm sm:text-base">Convert your excess airtime to cash</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="convert" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Convert
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="convert" className="space-y-4 mt-4">
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              <strong>How it works:</strong> Submit your request, transfer airtime to the number provided, and receive cash in your bank account.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="h-5 w-5 text-primary" />
                Convert Airtime
              </CardTitle>
              <CardDescription className="text-sm">Fill in the details below</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label className="text-sm font-medium mb-2 block">1. Network</Label>
                  <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary bg-yellow-50 dark:bg-yellow-900/20">
                    <img 
                      src={MTN_LOGO} 
                      alt="MTN Logo" 
                      className="w-12 h-12 object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="flex-1">
                      <p className="font-bold text-yellow-700">MTN Nigeria</p>
                      <p className="text-xs text-muted-foreground">Rate: <span className="font-semibold text-primary">80%</span></p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Only MTN airtime is supported</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">2. Airtime Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                      <Input 
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="1000" 
                        min="100"
                        max="50000"
                        className="h-11 pl-8"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Min: ₦100 • Max: ₦50,000</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">3. Your Phone</Label>
                    <Input 
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08012345678" 
                      maxLength={11}
                      className="h-11"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">Number to send airtime from</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-sm font-medium mb-3 block">4. Bank Details for Payout</Label>
                  <div className="space-y-3">
                    <Select value={bankName} onValueChange={setBankName}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select your bank" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[280px]">
                        <ScrollArea className="h-[240px]">
                          {NIGERIAN_BANKS.map(bank => (
                            <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>

                    <Input 
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Account Number (10 digits)" 
                      className="h-11"
                      required
                    />

                    <Input 
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Account Name" 
                      className="h-11"
                      required
                    />
                  </div>
                </div>

                {selectedNetwork && amount && parseFloat(amount) >= 100 && (
                  <Card className="bg-muted/50 border-dashed">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Airtime</p>
                          <p className="font-semibold">₦{parseFloat(amount).toLocaleString()}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="text-right">
                          <p className="text-muted-foreground text-xs">You'll Receive</p>
                          <p className="font-bold text-primary text-lg">₦{cashValue.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12" 
                  disabled={isLoading || !selectedNetwork || !amount || parseFloat(amount) < 100 || !bankName || !accountNumber || !accountName}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Smartphone className="mr-2 h-4 w-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Request History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No requests yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {requests.map((request) => {
                      const statusInfo = STATUS_BADGES[request.status] || STATUS_BADGES.pending;
                      return (
                        <Card 
                          key={request.id} 
                          className="p-3 border cursor-pointer hover:bg-muted/50 transition"
                          onClick={() => {
                            setSelectedRequestDetail(request);
                            setShowDetailDialog(true);
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-mono text-xs text-muted-foreground">{request.trackingId}</p>
                                <Badge variant={statusInfo.variant} className="text-xs">
                                  {statusInfo.label}
                                </Badge>
                              </div>
                              <p className="font-semibold mt-1">₦{parseFloat(request.airtimeAmount).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">
                                → ₦{parseFloat(request.cashAmount).toLocaleString()} to {request.bankName}
                              </p>
                              {request.rejectionReason && (
                                <p className="text-xs text-destructive mt-1">Reason: {request.rejectionReason}</p>
                              )}
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-[340px] sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Transfer Airtime</DialogTitle>
            <DialogDescription className="text-sm">
              Transfer airtime to the number below to complete your request
            </DialogDescription>
          </DialogHeader>
          
          {currentRequest && (
            <div className="space-y-4 py-2">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Send airtime to:</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-bold font-mono">{currentRequest.receivingNumber}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(currentRequest.receivingNumber)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Amount: <span className="font-bold">₦{parseFloat(currentRequest.amount || 0).toLocaleString()}</span>
                </p>
              </div>

              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">You'll receive:</span>
                  <span className="font-bold text-primary">₦{parseFloat(currentRequest.cashValue || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium">{currentRequest.bankDetails?.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account:</span>
                  <span className="font-mono">{currentRequest.bankDetails?.accountNumber}</span>
                </div>
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-xs">
                  After transferring, click "I've Sent It" to confirm. Do not close this popup before transferring.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)} 
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSent} 
              disabled={isConfirming}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              {isConfirming ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              I've Sent It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-[340px] sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Request Details</DialogTitle>
            <DialogDescription className="text-sm">
              {selectedRequestDetail?.trackingId}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequestDetail && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge variant={STATUS_BADGES[selectedRequestDetail.status]?.variant || "secondary"} className="mt-1">
                    {STATUS_BADGES[selectedRequestDetail.status]?.label || selectedRequestDetail.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Network</p>
                  <p className="font-semibold">{selectedRequestDetail.network.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Amount Sent</p>
                  <p className="font-semibold">₦{parseFloat(selectedRequestDetail.airtimeAmount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">You'll Receive</p>
                  <p className="font-semibold text-green-600">₦{parseFloat(selectedRequestDetail.cashAmount).toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-3">Bank Details</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-medium">{selectedRequestDetail.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account:</span>
                    <span className="font-mono">{selectedRequestDetail.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{selectedRequestDetail.accountName}</span>
                  </div>
                </div>
              </div>

              {selectedRequestDetail.rejectionReason && (
                <Alert variant="destructive" className="border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {selectedRequestDetail.rejectionReason}
                  </AlertDescription>
                </Alert>
              )}

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(selectedRequestDetail.createdAt).toLocaleString()}
                </p>
                {selectedRequestDetail.updatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Updated: {new Date(selectedRequestDetail.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          <Button 
            onClick={() => setShowDetailDialog(false)}
            className="w-full"
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-[340px] sm:max-w-md p-4 sm:p-6 text-center">
          <DialogHeader>
            <DialogTitle className="sr-only">Request Submitted</DialogTitle>
            <DialogDescription className="sr-only">Your airtime to cash request is being processed</DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Request Submitted!</h3>
            <p className="text-muted-foreground text-sm">
              We're verifying your airtime transfer. Payment will be sent to your bank account within 5-30 minutes.
            </p>
            {currentRequest && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Tracking ID</p>
                <p className="font-mono font-bold">{currentRequest.trackingId}</p>
              </div>
            )}
          </div>

          <Button 
            onClick={() => { setShowSuccessDialog(false); setActiveTab("history"); fetchHistory(); }}
            className="w-full"
          >
            View Request History
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
