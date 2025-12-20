import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, Loader2, AlertCircle, ArrowLeft, Check, History, Receipt, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "@/lib/api/services";

const getAuthToken = () => localStorage.getItem('accessToken');
import mtnLogo from '@assets/image_1764220436168.png';
import airtelLogo from '@assets/image_1764220472886.png';
import gloLogo from '@assets/image_1764220529748.png';
import ninemobileLogo from '@assets/image_1764220562186.png';

const networks = [
  { id: 'mtn', name: 'MTN', logo: mtnLogo, color: 'bg-yellow-400' },
  { id: 'airtel', name: 'Airtel', logo: airtelLogo, color: 'bg-red-500' },
  { id: 'glo', name: 'Glo', logo: gloLogo, color: 'bg-green-500' },
  { id: '9mobile', name: '9mobile', logo: ninemobileLogo, color: 'bg-green-600' },
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

export default function AirtimeServices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [autoDetected, setAutoDetected] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: servicesApi.dashboard.getStats,
    staleTime: 30000,
  });

  const airtimeTotal = dashboardData?.stats?.airtimeTotal || 0;
  const airtimeSuccess = dashboardData?.stats?.airtimeSuccess || 0;

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/airtime/history?limit=50', {
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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (value: string) => {
    setFormData((prev: any) => ({ ...prev, phoneNumber: value }));
    
    const detectedNetwork = detectNetwork(value);
    if (detectedNetwork) {
      setFormData((prev: any) => ({ ...prev, network: detectedNetwork }));
      setAutoDetected(true);
    } else {
      setAutoDetected(false);
    }
  };

  const handleNetworkSelect = (networkId: string) => {
    setFormData((prev: any) => ({ ...prev, network: networkId }));
    setAutoDetected(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.network || !formData.phoneNumber || !formData.amount) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const result = await servicesApi.vtu.buyAirtime({
        network: formData.network,
        phoneNumber: formData.phoneNumber,
        amount: parseInt(formData.amount),
      });
      
      setShowConfirmation(false);
      setFormData({});
      setAutoDetected(false);
      toast({ 
        title: "Transaction Successful", 
        description: `Airtime of ₦${Number(formData.amount).toLocaleString()} sent to ${formData.phoneNumber}`,
      });
    } catch (error: any) {
      toast({ 
        title: "Transaction Failed", 
        description: error.response?.data?.message || error.message || "Failed to purchase airtime. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedNetwork = networks.find(n => n.id === formData.network);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card className="bg-primary text-primary-foreground border-none">
          <CardContent className="p-4 sm:p-6 flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium opacity-80">Total Airtime Purchased</p>
              <h3 className="text-2xl sm:text-3xl font-bold mt-1">{airtimeTotal.toLocaleString()}</h3>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white/20 rounded-full flex items-center justify-center">
              <Smartphone className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6 flex items-center justify-between">
             <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Successful Transactions</p>
              <h3 className="text-2xl sm:text-3xl font-bold mt-1">{airtimeSuccess.toLocaleString()}</h3>
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
            <Smartphone className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            Airtime Top-up
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Purchase airtime for MTN, Airtel, Glo, and 9mobile</p>
        </div>
      </div>

      <Tabs defaultValue="purchase" className="w-full" onValueChange={(val) => val === 'history' && fetchHistory()}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="purchase" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Buy Airtime
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchase" className="mt-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Buy Airtime</CardTitle>
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
                    data-testid="input-phone"
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
                        <div className={`relative h-12 w-12 sm:h-16 sm:w-16 rounded-full overflow-hidden bg-white shadow-sm border border-gray-100 flex items-center justify-center`}>
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

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Amount (₦)</Label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[100, 200, 500, 1000, 2000, 5000].map((amt) => (
                      <Button 
                        key={amt} 
                        type="button" 
                        variant={formData.amount === amt.toString() ? "default" : "outline"} 
                        className={`w-full h-10 sm:h-12 text-sm sm:text-base font-semibold ${
                          formData.amount === amt.toString() ? '' : 'hover:bg-primary/10'
                        }`}
                        onClick={() => handleInputChange('amount', amt.toString())} 
                        data-testid={`button-amount-${amt}`}
                      >
                        ₦{amt.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                  <Input 
                    placeholder="Or enter custom amount" 
                    className="w-full h-12" 
                    type="number" 
                    value={formData.amount || ''} 
                    onChange={(e) => handleInputChange('amount', e.target.value)} 
                    data-testid="input-amount" 
                  />
                </div>

                <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading || !formData.network} data-testid="button-continue">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Airtime Purchase History
              </CardTitle>
              <CardDescription>View your recent airtime transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Smartphone className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No airtime purchases yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item: any) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => { setSelectedTransaction(item); setShowReceipt(true); }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          item.status === 'completed' ? 'bg-green-100' : item.status === 'failed' ? 'bg-red-100' : 'bg-yellow-100'
                        }`}>
                          <Smartphone className={`h-5 w-5 ${
                            item.status === 'completed' ? 'text-green-600' : item.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{item.network?.toUpperCase()} Airtime</p>
                          <p className="text-sm text-muted-foreground">{item.phoneNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₦{Number(item.amount).toLocaleString()}</p>
                        <p className={`text-xs font-medium ${
                          item.status === 'completed' ? 'text-green-600' : item.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {item.status === 'completed' ? 'Successful' : item.status === 'failed' ? 'Failed' : 'Pending'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Transaction Receipt
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4 py-4">
              <div className="text-center pb-4 border-b">
                <div className={`inline-flex h-16 w-16 rounded-full items-center justify-center ${
                  selectedTransaction.status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {selectedTransaction.status === 'completed' ? (
                    <Check className="h-8 w-8 text-green-600" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  )}
                </div>
                <p className="mt-2 text-2xl font-bold">₦{Number(selectedTransaction.amount).toLocaleString()}</p>
                <p className={`text-sm font-medium ${
                  selectedTransaction.status === 'completed' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selectedTransaction.status === 'completed' ? 'Successful' : 'Failed'}
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-medium">{selectedTransaction.network?.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone Number</span>
                  <span className="font-medium">{selectedTransaction.phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-medium text-xs">{selectedTransaction.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{new Date(selectedTransaction.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceipt(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirm Airtime Purchase
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
              <p className="text-sm text-muted-foreground">Phone Number</p>
              <p className="font-semibold">{formData.phoneNumber}</p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="font-semibold text-lg">₦{Number(formData.amount).toLocaleString()}</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmation(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={loading} data-testid="button-confirm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : ""}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
