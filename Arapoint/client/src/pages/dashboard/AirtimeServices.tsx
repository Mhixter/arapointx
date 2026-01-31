import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, Loader2, AlertCircle, ArrowLeft, Check, History, Receipt, Download, RefreshCw } from "lucide-react";
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

export default function AirtimeServices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'menu' | 'purchase'>('menu');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [formData, setFormData] = useState<any>({ network: '', phone: '', amount: '' });
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

  useEffect(() => {
    fetchHistory();
  }, []);

  const handlePhoneChange = (value: string) => {
    setFormData({ ...formData, phone: value });
    const detected = detectNetwork(value);
    if (detected && !autoDetected) {
      setFormData((prev: any) => ({ ...prev, phone: value, network: detected }));
      setAutoDetected(true);
    } else if (!detected) {
      setAutoDetected(false);
    }
  };

  const handlePurchase = async () => {
    if (!formData.network || !formData.phone || !formData.amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount < 50) {
      toast({
        title: "Invalid Amount",
        description: "Minimum airtime amount is ₦50",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmation(true);
  };

  const confirmPurchase = async () => {
    setLoading(true);
    setShowConfirmation(false);

    try {
      const token = getAuthToken();
      const response = await fetch('/api/airtime/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          network: formData.network,
          phone: formData.phone,
          amount: parseFloat(formData.amount)
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        setSelectedTransaction(data.data.transaction);
        setShowReceipt(true);
        setFormData({ network: '', phone: '', amount: '' });
        setAutoDetected(false);
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
        fetchHistory();
        toast({
          title: "Airtime Purchased",
          description: `₦${parseFloat(formData.amount).toLocaleString()} airtime sent to ${formData.phone}`,
        });
      } else {
        toast({
          title: "Purchase Failed",
          description: data.message || "Failed to purchase airtime",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const services = [
    { icon: Smartphone, title: "Buy Airtime", description: "MTN, Airtel, Glo, 9mobile", action: () => setView('purchase'), color: "text-green-600" },
    { icon: RefreshCw, title: "Airtime to Cash", description: "Convert airtime to cash", href: "/dashboard/airtime-to-cash", color: "text-blue-600" }
  ];

  if (view === 'menu') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/vtu">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to VTU
            </Button>
          </Link>
        </div>
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">Airtime Services</h2>
          <p className="text-muted-foreground">Buy airtime or convert airtime to cash.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {services.map((service, index) => (
            service.href ? (
              <Link key={index} href={service.href}>
                <Card className="h-full flex flex-col cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all">
                  <CardHeader>
                    <div className={`h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 ${service.color}`}>
                      <service.icon className="h-5 w-5" />
                    </div>
                    <CardTitle>{service.title}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-primary font-medium">Continue →</p>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <Card 
                key={index} 
                className="h-full flex flex-col cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
                onClick={service.action}
              >
                <CardHeader>
                  <div className={`h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 ${service.color}`}>
                    <service.icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-primary font-medium">Continue →</p>
                </CardContent>
              </Card>
            )
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setView('menu')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight">Buy Airtime</h2>
        <p className="text-muted-foreground">Purchase airtime for any network instantly.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{airtimeTotal}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{airtimeSuccess}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{airtimeTotal > 0 ? Math.round((airtimeSuccess / airtimeTotal) * 100) : 0}%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="purchase" className="space-y-4">
        <TabsList>
          <TabsTrigger value="purchase">
            <Smartphone className="h-4 w-4 mr-2" />
            Purchase
          </TabsTrigger>
          <TabsTrigger value="history" onClick={fetchHistory}>
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchase">
          <Card>
            <CardHeader>
              <CardTitle>Buy Airtime</CardTitle>
              <CardDescription>Select network and enter amount</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  maxLength={11}
                />
                {autoDetected && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Network detected: {networks.find(n => n.id === formData.network)?.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Select Network</Label>
                <div className="grid grid-cols-4 gap-3">
                  {networks.map((network) => (
                    <div
                      key={network.id}
                      onClick={() => setFormData({ ...formData, network: network.id })}
                      className={`p-3 border rounded-lg cursor-pointer transition-all flex flex-col items-center gap-2 ${
                        formData.network === network.id
                          ? 'border-primary bg-primary/5 ring-2 ring-primary'
                          : 'hover:border-gray-300'
                      }`}
                    >
                      <img src={network.logo} alt={network.name} className="h-10 w-10 object-contain" />
                      <span className="text-xs font-medium">{network.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amount (₦)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount (min ₦50)"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  min={50}
                />
                <div className="flex gap-2 flex-wrap">
                  {[100, 200, 500, 1000, 2000, 5000].map((amt) => (
                    <Button
                      key={amt}
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, amount: amt.toString() })}
                      className={formData.amount === amt.toString() ? 'border-primary' : ''}
                    >
                      ₦{amt.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handlePurchase}
                disabled={loading || !formData.network || !formData.phone || !formData.amount}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Buy Airtime'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
              <CardDescription>Your recent airtime purchases</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No purchase history yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedTransaction(item)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <Smartphone className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">{item.phone}</p>
                          <p className="text-sm text-muted-foreground">{item.network?.toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₦{parseFloat(item.amount).toLocaleString()}</p>
                        <p className={`text-xs ${item.status === 'success' ? 'text-green-600' : item.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>
                          {item.status}
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

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Airtime Purchase</DialogTitle>
            <DialogDescription>Please review your purchase details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Network</span>
              <span className="font-medium">{networks.find(n => n.id === formData.network)?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Phone Number</span>
              <span className="font-medium">{formData.phone}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">₦{parseFloat(formData.amount || '0').toLocaleString()}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>Cancel</Button>
            <Button onClick={confirmPurchase} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Transaction Receipt
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
                  selectedTransaction.status === 'success' ? 'bg-green-100' : 
                  selectedTransaction.status === 'failed' ? 'bg-red-100' : 'bg-yellow-100'
                }`}>
                  {selectedTransaction.status === 'success' ? (
                    <Check className="h-8 w-8 text-green-600" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  )}
                </div>
                <h3 className="mt-4 text-lg font-semibold capitalize">{selectedTransaction.status}</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono">{selectedTransaction.reference}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Network</span>
                  <span>{selectedTransaction.network?.toUpperCase()}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{selectedTransaction.phone}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Amount</span>
                  <span>₦{parseFloat(selectedTransaction.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Date</span>
                  <span>{new Date(selectedTransaction.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceipt(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
