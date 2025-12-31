import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Loader2, AlertCircle, ArrowLeft, Check, UserCheck, Copy, History, Receipt, Download } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "@/lib/api/services";

const DISCO_OPTIONS = [
  { id: 'ikeja-electric', name: 'Ikeja Electric (IKEDC)' },
  { id: 'eko-electric', name: 'Eko Electric (EKEDC)' },
  { id: 'abuja-electric', name: 'Abuja Electric (AEDC)' },
  { id: 'enugu-electric', name: 'Enugu Electric (EEDC)' },
  { id: 'portharcourt-electric', name: 'Port Harcourt Electric (PHEDC)' },
  { id: 'ibadan-electric', name: 'Ibadan Electric (IBEDC)' },
  { id: 'kaduna-electric', name: 'Kaduna Electric (KEDC)' },
  { id: 'benin-electric', name: 'Benin Electric (BEDC)' },
  { id: 'jos-electric', name: 'Jos Electric (JEDC)' },
  { id: 'kano-electric', name: 'Kano Electric (KEDCO)' },
  { id: 'yola-electric', name: 'Yola Electric (YEDC)' },
];

const getAuthToken = () => localStorage.getItem('accessToken');

export default function ElectricityServices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: servicesApi.dashboard.getStats,
    staleTime: 30000,
  });

  const electricityTotal = dashboardData?.stats?.electricityTotal || 0;
  const electricitySuccess = dashboardData?.stats?.electricitySuccess || 0;

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/electricity/history?limit=50', {
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
    if (field === 'disco') setCustomerInfo(null);
  };

  const handleValidate = async () => {
    if (!formData.disco || !formData.meterNumber) {
      toast({ title: "Missing Information", description: "Please select company and enter meter number.", variant: "destructive" });
      return;
    }
    setValidating(true);
    setCustomerInfo(null);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/electricity/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ discoName: formData.disco, meterNumber: formData.meterNumber, meterType: formData.meterType || 'prepaid' })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setCustomerInfo(data.data);
        toast({ title: "Validated", description: `Customer: ${data.data.customerName}` });
      } else {
        toast({ title: "Validation Failed", description: data.message || "Could not validate meter", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Validation failed", variant: "destructive" });
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.disco || !formData.meterNumber || !formData.amount) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (parseInt(formData.amount) < 500) {
      toast({ title: "Invalid Amount", description: "Minimum amount is ₦500.", variant: "destructive" });
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/electricity/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ discoName: formData.disco, meterNumber: formData.meterNumber, amount: parseInt(formData.amount), meterType: formData.meterType || 'prepaid', phone: formData.phone || '08000000000' })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setSelectedTransaction({ ...data.data, disco: formData.disco, meterNumber: formData.meterNumber });
        setShowConfirmation(false);
        setShowReceipt(true);
        setFormData({});
        setCustomerInfo(null);
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        fetchHistory();
      } else {
        toast({ title: "Failed", description: data.message || "Electricity purchase failed", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Transaction failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      toast({ title: "Copied!", description: "Token copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", description: "Please copy manually", variant: "destructive" });
    }
  };

  const viewReceipt = (tx: any) => {
    setSelectedTransaction(tx);
    setShowReceipt(true);
  };

  const printReceipt = () => window.print();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-primary text-primary-foreground border-none">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">Total Tokens Purchased</p>
              <h3 className="text-3xl font-bold mt-1">{electricityTotal.toLocaleString()}</h3>
            </div>
            <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center"><Zap className="h-6 w-6" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Successful Transactions</p>
              <h3 className="text-3xl font-bold mt-1">{electricitySuccess.toLocaleString()}</h3>
            </div>
            <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center"><Check className="h-6 w-6 text-green-600" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/dashboard/subscriptions"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight flex items-center gap-2"><Zap className="h-8 w-8 text-yellow-600" />Electricity Top-up</h2>
          <p className="text-muted-foreground">Buy prepaid meter tokens</p>
        </div>
      </div>

      <Tabs defaultValue="buy" onValueChange={(val) => val === 'history' && fetchHistory()}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="buy">Buy Token</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-2" />Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="buy">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Buy Electricity Token</CardTitle>
              <CardDescription>Sandbox: Prepaid - 1111111111111, Postpaid - 1010101010101</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Electricity Company</Label>
                  <Select value={formData.disco || ''} onValueChange={(val) => handleInputChange('disco', val)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select Company" /></SelectTrigger>
                    <SelectContent>{DISCO_OPTIONS.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Meter Type</Label>
                  <Select value={formData.meterType || 'prepaid'} onValueChange={(val) => handleInputChange('meterType', val)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select Meter Type" /></SelectTrigger>
                    <SelectContent><SelectItem value="prepaid">Prepaid</SelectItem><SelectItem value="postpaid">Postpaid</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Meter Number</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Enter Meter Number" className="flex-1" value={formData.meterNumber || ''} onChange={(e) => handleInputChange('meterNumber', e.target.value)} />
                    <Button type="button" variant="outline" onClick={handleValidate} disabled={validating}>
                      {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {customerInfo && (
                  <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2"><Check className="h-5 w-5 text-green-600" /><span className="font-medium text-green-700 dark:text-green-400">Meter Verified</span></div>
                      <p className="text-sm"><strong>Name:</strong> {customerInfo.customerName}</p>
                      <p className="text-sm"><strong>Address:</strong> {customerInfo.address}</p>
                    </CardContent>
                  </Card>
                )}
                <div className="space-y-2">
                  <Label>Amount (₦)</Label>
                  <Input placeholder="Minimum ₦500" className="w-full" type="number" min="500" value={formData.amount || ''} onChange={(e) => handleInputChange('amount', e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Transaction History</CardTitle>
              <CardDescription>View all your electricity purchases</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Zap className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No transactions yet</p></div>
              ) : (
                <div className="space-y-3">
                  {history.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center"><Zap className="h-5 w-5 text-yellow-600" /></div>
                        <div>
                          <p className="font-medium">{tx.discoName?.toUpperCase()}</p>
                          <p className="text-sm text-muted-foreground">Meter: {tx.meterNumber}</p>
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
            <DialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-amber-500" />Confirm Electricity Purchase</DialogTitle>
            <DialogDescription>Please review the details before confirming.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-l-4 border-primary pl-4"><p className="text-sm text-muted-foreground">Company</p><p className="font-semibold">{DISCO_OPTIONS.find(d => d.id === formData.disco)?.name}</p></div>
            <div className="border-l-4 border-primary pl-4"><p className="text-sm text-muted-foreground">Meter Number</p><p className="font-semibold">{formData.meterNumber}</p></div>
            {customerInfo && <div className="border-l-4 border-green-500 pl-4"><p className="text-sm text-muted-foreground">Customer</p><p className="font-semibold">{customerInfo.customerName}</p></div>}
            <div className="border-l-4 border-primary pl-4"><p className="text-sm text-muted-foreground">Amount</p><p className="font-semibold text-lg">₦{parseInt(formData.amount || 0).toLocaleString()}</p></div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmation(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-[340px] sm:max-w-[380px] p-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2 no-print">
            <DialogTitle className="flex items-center gap-2 text-green-600 text-base"><Receipt className="h-4 w-4" />Receipt</DialogTitle>
            <DialogDescription>Electricity purchase details</DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-3 text-sm print-receipt" id="receipt-content">
              <div className="text-center border-b pb-2">
                <h3 className="text-base font-bold">ARAPOINT</h3>
                <p className="text-xs text-muted-foreground">Electricity Token</p>
              </div>
              {selectedTransaction.token && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-500">
                  <p className="text-xs text-muted-foreground mb-1">Your Token</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-bold flex-1 break-all">{selectedTransaction.token}</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 no-print" onClick={() => copyToken(selectedTransaction.token)}><Copy className="h-3 w-3" /></Button>
                  </div>
                </div>
              )}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Reference:</span><span className="font-mono truncate max-w-[140px]">{selectedTransaction.reference}</span></div>
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Trans. ID:</span><span className="font-mono truncate max-w-[140px]">{selectedTransaction.transactionId}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Company:</span><span className="font-semibold">{selectedTransaction.disco || selectedTransaction.discoName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Meter:</span><span className="font-semibold">{selectedTransaction.meterNumber}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span className="font-bold">₦{parseFloat(selectedTransaction.amount).toLocaleString()}</span></div>
                {selectedTransaction.units && <div className="flex justify-between"><span className="text-muted-foreground">Units:</span><span className="font-semibold">{selectedTransaction.units}</span></div>}
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
