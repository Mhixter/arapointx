import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wifi, Loader2, AlertCircle, ArrowLeft, Check, History, Receipt, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "@/lib/api/services";
import mtnLogo from '@assets/image_1764220436168.png';
import airtelLogo from '@assets/image_1764220472886.png';
import gloLogo from '@assets/image_1764220529748.png';
import ninemobileLogo from '@assets/image_1764220562186.png';

const networks = [
  { id: 'mtn', name: 'MTN', logo: mtnLogo },
  { id: 'airtel', name: 'Airtel', logo: airtelLogo },
  { id: 'glo', name: 'Glo', logo: gloLogo },
  { id: '9mobile', name: '9mobile', logo: ninemobileLogo },
];

const networkPrefixes: Record<string, string[]> = {
  mtn: ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916', '0704'],
  airtel: ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912'],
  glo: ['0805', '0807', '0705', '0815', '0811', '0905', '0915'],
  '9mobile': ['0809', '0817', '0818', '0908', '0909'],
};

function detectNetwork(phoneNumber: string): string | null {
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length < 4) return null;
  
  const prefix = cleaned.startsWith('234') ? '0' + cleaned.slice(3, 6) : cleaned.slice(0, 4);
  
  for (const [network, prefixes] of Object.entries(networkPrefixes)) {
    if (prefixes.includes(prefix)) {
      return network;
    }
  }
  return null;
}

const getAuthToken = () => localStorage.getItem('accessToken');

export default function DataServices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [autoDetected, setAutoDetected] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: servicesApi.dashboard.getStats,
    staleTime: 30000,
  });

  const dataTotal = dashboardData?.stats?.dataTotal || 0;
  const dataSuccess = dashboardData?.stats?.dataSuccess || 0;

  useEffect(() => {
    if (formData.network) {
      fetchPlans(formData.network);
    }
  }, [formData.network]);

  const fetchPlans = async (network: string) => {
    setLoadingPlans(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/data/plans?network=${network}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setPlans(data.data.plans || []);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/data/history?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setHistory(data.data.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    setFormData((prev: any) => ({ ...prev, phoneNumber: value }));
    
    const detectedNetwork = detectNetwork(value);
    if (detectedNetwork) {
      setFormData((prev: any) => ({ ...prev, network: detectedNetwork, plan: undefined }));
      setAutoDetected(true);
    } else {
      setAutoDetected(false);
    }
  };

  const handleNetworkSelect = (networkId: string) => {
    setFormData((prev: any) => ({ ...prev, network: networkId, plan: undefined }));
    setAutoDetected(false);
  };

  const handlePlanSelect = (planCode: string) => {
    const selectedPlan = plans.find(p => p.variation_code === planCode);
    if (selectedPlan) {
      setFormData((prev: any) => ({ 
        ...prev, 
        plan: planCode, 
        planName: selectedPlan.name,
        amount: parseFloat(selectedPlan.variation_amount) 
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.network || !formData.plan || !formData.phoneNumber) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/data/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          network: formData.network,
          phoneNumber: formData.phoneNumber,
          planId: formData.plan,
          planName: formData.planName,
          amount: formData.amount,
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setSelectedTransaction({
          ...data.data,
          network: formData.network,
          phoneNumber: formData.phoneNumber,
          planName: formData.planName,
          amount: formData.amount,
        });
        setShowConfirmation(false);
        setShowReceipt(true);
        setFormData({});
        setPlans([]);
        setAutoDetected(false);
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        fetchHistory();
      } else {
        toast({ title: "Failed", description: data.message || "Data purchase failed", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Transaction failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const viewReceipt = (tx: any) => {
    setSelectedTransaction(tx);
    setShowReceipt(true);
  };

  const printReceipt = () => window.print();

  const selectedNetwork = networks.find(n => n.id === formData.network);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card className="bg-primary text-primary-foreground border-none">
          <CardContent className="p-4 sm:p-6 flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium opacity-80">Total Data Purchased</p>
              <h3 className="text-2xl sm:text-3xl font-bold mt-1">{dataTotal.toLocaleString()}</h3>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white/20 rounded-full flex items-center justify-center">
              <Wifi className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6 flex items-center justify-between">
             <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Successful Transactions</p>
              <h3 className="text-2xl sm:text-3xl font-bold mt-1">{dataSuccess.toLocaleString()}</h3>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-muted rounded-full flex items-center justify-center">
              <Check className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <Link href="/dashboard/services">
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold tracking-tight flex items-center gap-2">
            <Wifi className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            Data Bundles
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Purchase data plans for MTN, Airtel, Glo, and 9mobile</p>
        </div>
      </div>

      <Tabs defaultValue="buy" onValueChange={(val) => val === 'history' && fetchHistory()}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="buy">Buy Data</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-2" />Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="buy">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Buy Data</CardTitle>
              <CardDescription>Test phone: 08011111111</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Phone Number</Label>
                  <Input 
                    placeholder="Enter phone number (e.g. 08031234567)" 
                    className="w-full h-14 text-lg font-medium" 
                    value={formData.phoneNumber || ''} 
                    onChange={(e) => handlePhoneChange(e.target.value)} 
                    maxLength={11}
                  />
                  {autoDetected && selectedNetwork && (
                    <p className="text-sm text-green-600 font-medium flex items-center gap-1 animate-in fade-in duration-300">
                      <Check className="h-4 w-4" />
                      {selectedNetwork.name} network detected automatically
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    {autoDetected ? 'Network (Auto-detected)' : 'Select Network'}
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {networks.map((network) => (
                      <button
                        key={network.id}
                        type="button"
                        onClick={() => handleNetworkSelect(network.id)}
                        className={`relative flex flex-col items-center p-2 sm:p-3 rounded-2xl border-2 transition-all duration-200 hover:shadow-lg ${
                          formData.network === network.id
                            ? 'border-primary bg-primary/5 shadow-md scale-105'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="relative h-12 w-12 sm:h-16 sm:w-16 rounded-full overflow-hidden bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                          <img 
                            src={network.logo} 
                            alt={network.name} 
                            className="h-10 w-10 sm:h-14 sm:w-14 object-contain rounded-full" 
                          />
                          {formData.network === network.id && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 bg-primary rounded-full flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <span className={`mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium ${
                          formData.network === network.id ? 'text-primary' : 'text-gray-700'
                        }`}>
                          {network.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {formData.network && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <Label className="text-base font-semibold">Data Plan</Label>
                    <Select value={formData.plan || ''} onValueChange={handlePlanSelect} disabled={loadingPlans || plans.length === 0}>
                      <SelectTrigger className="w-full h-12 text-base">
                        <SelectValue placeholder={loadingPlans ? "Loading plans..." : "Select Data Plan"} />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan: any) => (
                          <SelectItem key={plan.variation_code} value={plan.variation_code} className="py-3">
                            {plan.name} - ₦{parseInt(plan.variation_amount).toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.amount && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Amount to Pay</p>
                    <p className="text-2xl font-bold">₦{formData.amount.toLocaleString()}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold" 
                  disabled={loading || !formData.network || !formData.plan || !formData.phoneNumber}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Transaction History</CardTitle>
              <CardDescription>View all your data purchases</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Wifi className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No transactions yet</p></div>
              ) : (
                <div className="space-y-3">
                  {history.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Wifi className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{tx.network?.toUpperCase()} - {tx.planName}</p>
                          <p className="text-sm text-muted-foreground">Phone: {tx.phoneNumber}</p>
                          <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₦{parseFloat(tx.amount).toLocaleString()}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${tx.status === 'completed' ? 'bg-green-100 text-green-700' : tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{tx.status}</span>
                        <Button variant="ghost" size="sm" className="ml-2" onClick={() => viewReceipt(tx)}><Receipt className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-[340px] sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirm Data Purchase
            </DialogTitle>
            <DialogDescription>Please review the details before confirming.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              {selectedNetwork && (
                <img 
                  src={selectedNetwork.logo} 
                  alt={selectedNetwork.name} 
                  className="h-12 w-12 rounded-full object-contain border border-gray-200" 
                />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Network</p>
                <p className="font-semibold capitalize">{selectedNetwork?.name}</p>
              </div>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="font-semibold">{formData.planName}</p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <p className="text-sm text-muted-foreground">Phone Number</p>
              <p className="font-semibold">{formData.phoneNumber}</p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="font-semibold text-lg">₦{formData.amount?.toLocaleString()}</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmation(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : ""}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-[340px] sm:max-w-[380px] p-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2 no-print">
            <DialogTitle className="flex items-center gap-2 text-green-600 text-base"><Receipt className="h-4 w-4" />Receipt</DialogTitle>
            <DialogDescription>Data purchase details</DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-3 text-sm print-receipt" id="receipt-content">
              <div className="text-center border-b pb-2">
                <h3 className="text-base font-bold">ARAPOINT</h3>
                <p className="text-xs text-muted-foreground">Data Purchase</p>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Reference:</span><span className="font-mono truncate max-w-[140px]">{selectedTransaction.reference}</span></div>
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Trans. ID:</span><span className="font-mono truncate max-w-[140px]">{selectedTransaction.transactionId}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Network:</span><span className="font-semibold uppercase">{selectedTransaction.network}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phone:</span><span className="font-semibold">{selectedTransaction.phoneNumber}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Plan:</span><span className="font-semibold text-right max-w-[150px] truncate">{selectedTransaction.planName || selectedTransaction.productName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span className="font-bold">₦{parseFloat(selectedTransaction.amount).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><span className={`font-semibold ${selectedTransaction.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>{selectedTransaction.status?.toUpperCase()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date:</span><span className="text-xs">{new Date(selectedTransaction.createdAt || Date.now()).toLocaleString()}</span></div>
              </div>
              <div className="text-center border-t pt-2 text-[10px] text-muted-foreground">
                <p>Thank you for using Arapoint</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 pt-2 no-print">
            <Button variant="outline" size="sm" onClick={() => setShowReceipt(false)}>Close</Button>
            <Button size="sm" onClick={printReceipt}><Download className="h-3 w-3 mr-1" />Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
