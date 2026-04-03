import { tokenStorage } from '@/lib/tokenStorage';
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, CheckCircle2, ShoppingCart, Plus, Minus, AlertTriangle, RefreshCw, History, CreditCard, Clock, XCircle, Printer, Eye, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "react-qr-code";


const getAuthToken = () => tokenStorage.getItem('accessToken');

interface PINStock {
  available: boolean;
  price: number;
}

interface PINItem {
  id: string;
  name: string;
  description: string;
  examType: string;
  price: number;
  available: boolean;
  quantity: number;
}

interface PINOrder {
  id: string;
  examType: string;
  status: string;
  amount: number;
  deliveredPin?: string;
  deliveredSerial?: string;
  createdAt: string;
}

const PIN_INFO: Record<string, { name: string; description: string }> = {
  waec: { name: "WAEC Scratch Card", description: "West African Examinations Council Result Checker PIN" },
  neco: { name: "NECO Token", description: "National Examinations Council Result Checker Token" },
  nabteb: { name: "NABTEB PIN", description: "National Board of Technical Education Result PIN" },
  nbais: { name: "NBAIS PIN", description: "National Board for Arabic & Islamic Studies PIN" },
};

interface FullPINOrder extends PINOrder {
  deliveredPin: string;
  deliveredSerial?: string;
}

export default function BuyPINs() {
  const { toast } = useToast();
  const [pins, setPins] = useState<PINItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [purchasedPins, setPurchasedPins] = useState<{ examType: string; pin: string; serial?: string }[]>([]);
  const [history, setHistory] = useState<PINOrder[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState("buy");
  const [selectedOrder, setSelectedOrder] = useState<FullPINOrder | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const fetchStock = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/education/pins/stock', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        const stock: Record<string, PINStock> = data.data.stock;
        const pinItems: PINItem[] = Object.entries(stock).map(([examType, info]) => ({
          id: examType,
          examType,
          name: PIN_INFO[examType]?.name || `${examType.toUpperCase()} PIN`,
          description: PIN_INFO[examType]?.description || `${examType.toUpperCase()} examination PIN`,
          price: info.price,
          available: info.available,
          quantity: 0,
        }));
        setPins(pinItems);
      } else {
        toast({ title: "Error", description: "Failed to load PIN stock", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load PIN stock", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/education/pins/orders?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setHistory(data.data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch PIN history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchOrderDetails = async (orderId: string) => {
    setLoadingOrder(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/education/pins/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success' && data.data.order) {
        setSelectedOrder(data.data.order);
        setShowReceipt(true);
      } else {
        toast({ title: "Error", description: "Failed to load order details", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load order details", variant: "destructive" });
    } finally {
      setLoadingOrder(false);
    }
  };

  const buildReceiptHtml = (order: typeof selectedOrder) => {
    if (!order) return '';
    const amount = `₦${parseFloat(String(order.amount || 0)).toLocaleString()}`;
    const date = formatDate(order.createdAt);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PIN Receipt - ${order.examType?.toUpperCase()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f8; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 24px 0; }
    .card { background: #fff; border-radius: 14px; width: 360px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.12); }
    .header { background: linear-gradient(135deg, #16a34a, #15803d); padding: 24px 20px 20px; text-align: center; }
    .logo { font-size: 26px; font-weight: 900; color: #fff; letter-spacing: -0.5px; }
    .subtitle { color: #bbf7d0; font-size: 12px; margin-top: 4px; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 14px; margin-top: 10px; color: #fff; font-size: 11px; font-weight: 600; }
    .body { padding: 20px; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px dashed #e5e7eb; }
    .row:last-child { border-bottom: none; }
    .label { font-size: 12px; color: #6b7280; }
    .value { font-size: 13px; font-weight: 600; color: #111827; text-align: right; max-width: 60%; word-break: break-all; }
    .pin-box { background: #f0fdf4; border: 2px solid #86efac; border-radius: 10px; padding: 16px; margin: 16px 0; text-align: center; }
    .pin-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .pin-value { font-family: 'Courier New', monospace; font-size: 22px; font-weight: 900; color: #16a34a; letter-spacing: 3px; }
    .serial { font-family: monospace; font-size: 11px; color: #6b7280; margin-top: 4px; }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 12px 20px; text-align: center; }
    .footer-text { font-size: 10px; color: #9ca3af; line-height: 1.6; }
    @media print { body { padding: 0; background: #fff; } .card { box-shadow: none; border-radius: 0; width: 100%; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">Arapoint</div>
      <div class="subtitle">Education PIN Receipt</div>
      <div class="badge">✓ PIN Delivered</div>
    </div>
    <div class="body">
      <div class="row"><span class="label">Order ID</span><span class="value">${order.id?.substring(0, 8)}...</span></div>
      <div class="row"><span class="label">Exam Type</span><span class="value">${order.examType?.toUpperCase() || ''}</span></div>
      <div class="row"><span class="label">Amount</span><span class="value">${amount}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${date}</span></div>
      <div class="pin-box">
        <div class="pin-label">Your PIN Code</div>
        <div class="pin-value">${order.deliveredPin || ''}</div>
        ${order.deliveredSerial ? `<div class="serial">Serial: ${order.deliveredSerial}</div>` : ''}
      </div>
    </div>
    <div class="footer">
      <div class="footer-text">Keep this receipt safe — No refunds after delivery<br>© ${new Date().getFullYear()} Arapoint · arapoint.com.ng</div>
    </div>
  </div>
</body>
</html>`;
  };

  const handlePrint = () => {
    if (!selectedOrder) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(buildReceiptHtml(selectedOrder));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 400);
  };

  const handleDownload = async () => {
    if (!selectedOrder) return;
    setIsDownloading(true);
    try {
      const DPR = 2;
      const W = 400, H = 560;
      const canvas = document.createElement('canvas');
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(DPR, DPR);

      const rr = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      ctx.fillStyle = '#f4f6f8';
      ctx.fillRect(0, 0, W, H);

      const CX = 20, CW = W - 40;

      const grd = ctx.createLinearGradient(CX, 0, CX + CW, 110);
      grd.addColorStop(0, '#16a34a');
      grd.addColorStop(1, '#15803d');
      ctx.fillStyle = grd;
      rr(CX, 16, CW, 110, 12);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Arapoint', W / 2, 60);
      ctx.fillStyle = '#bbf7d0';
      ctx.font = '12px Arial';
      ctx.fillText('Education PIN Receipt', W / 2, 82);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      rr(W / 2 - 56, 93, 112, 22, 11);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('✓  PIN DELIVERED', W / 2, 108);

      ctx.fillStyle = '#ffffff';
      rr(CX, 120, CW, H - 140, 12);
      ctx.fill();
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      rr(CX, 120, CW, H - 140, 12);
      ctx.stroke();

      let y = 150;
      const drawRow = (label: string, value: string, last = false) => {
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(label, CX + 16, y);
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(value, CX + CW - 16, y);
        y += 10;
        if (!last) {
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(CX + 16, y);
          ctx.lineTo(CX + CW - 16, y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        y += 16;
      };

      const amount = `\u20A6${parseFloat(String(selectedOrder.amount || 0)).toLocaleString()}`;
      drawRow('Order ID', `${selectedOrder.id?.substring(0, 8)}...`);
      drawRow('Exam Type', selectedOrder.examType?.toUpperCase() || '');
      drawRow('Amount', amount);
      drawRow('Date', formatDate(selectedOrder.createdAt), true);

      y += 8;
      ctx.fillStyle = '#f0fdf4';
      rr(CX + 16, y, CW - 32, 84, 10);
      ctx.fill();
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1.5;
      rr(CX + 16, y, CW - 32, 84, 10);
      ctx.stroke();

      ctx.fillStyle = '#6b7280';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('YOUR PIN CODE', W / 2, y + 20);

      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 22px Courier New, monospace';
      ctx.textAlign = 'center';
      const pinDisplay = (selectedOrder.deliveredPin || '').split('').join(' ');
      ctx.fillText(pinDisplay, W / 2, y + 52);

      if (selectedOrder.deliveredSerial) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px monospace';
        ctx.fillText(`Serial: ${selectedOrder.deliveredSerial}`, W / 2, y + 72);
      }

      y += 100;

      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Keep this receipt safe \u2014 No refunds after delivery', W / 2, y + 10);
      ctx.fillText(`\u00A9 ${new Date().getFullYear()} Arapoint \u00B7 arapoint.com.ng`, W / 2, y + 26);

      const link = document.createElement('a');
      link.download = `Arapoint_${selectedOrder.examType?.toUpperCase()}_PIN_Receipt_${selectedOrder.id?.substring(0, 8)}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Receipt Saved", variant: "success", description: "Your branded receipt has been downloaded." });
    } catch (error) {
      console.error('Download error:', error);
      toast({ title: "Error", description: "Failed to download receipt", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setPins(pins.map(pin =>
      pin.id === id ? { ...pin, quantity: Math.max(0, pin.quantity + delta) } : pin
    ));
  };

  const getTotalItems = () => pins.reduce((sum, pin) => sum + pin.quantity, 0);
  const getTotalAmount = () => pins.reduce((sum, pin) => sum + (pin.price * pin.quantity), 0);

  const handleCheckout = () => {
    if (getTotalItems() === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one PIN to purchase.",
        variant: "destructive",
      });
      return;
    }
    setShowConfirmDialog(true);
  };

  const handlePurchase = async () => {
    setShowConfirmDialog(false);
    setIsPurchasing(true);
    const token = getAuthToken();
    const purchased: { examType: string; pin: string; serial?: string }[] = [];
    let hasError = false;

    for (const pin of pins) {
      if (pin.quantity > 0) {
        for (let i = 0; i < pin.quantity; i++) {
          try {
            const res = await fetch('/api/education/pins/purchase', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ examType: pin.examType })
            });
            const data = await res.json();
            
            if (data.status === 'success' && data.data.pin) {
              purchased.push({
                examType: pin.examType,
                pin: data.data.pin,
                serial: data.data.serialNumber
              });
            } else {
              hasError = true;
              toast({
                title: "Purchase Failed",
                description: data.message || `Failed to purchase ${pin.name}`,
                variant: "destructive",
              });
              break;
            }
          } catch (error) {
            hasError = true;
            toast({
              title: "Error",
              description: "Failed to complete purchase. Please try again.",
              variant: "destructive",
            });
            break;
          }
        }
        if (hasError) break;
      }
    }

    setIsPurchasing(false);
    
    if (purchased.length > 0) {
      setPurchasedPins(purchased);
      setPurchaseComplete(true);
      toast({
        title: "Purchase Successful",
        description: `You have purchased ${purchased.length} PIN(s)`,
      });
    }
  };

  const handleReset = (showHistory: boolean = false) => {
    setPins(pins.map(pin => ({ ...pin, quantity: 0 })));
    setPurchaseComplete(false);
    setPurchasedPins([]);
    fetchStock();
    if (showHistory) {
      setActiveTab("history");
      fetchHistory();
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'completed' || s === 'delivered') {
      return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
    }
    if (s === 'failed') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
    }
    if (s === 'pending' || s === 'paid') {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> {s === 'paid' ? 'Processing' : 'Pending'}</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (purchaseComplete) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold tracking-tight">Buy PINs</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">Order confirmation</p>
        </div>

        <Card className="max-w-2xl mx-auto text-center border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
          <CardContent className="pt-10 pb-10 space-y-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-green-800 dark:text-green-400">Purchase Completed!</h3>
            <p className="text-green-700 dark:text-green-300 max-w-xs mx-auto">
              Your PINs have been purchased successfully. Here are your PIN details:
            </p>
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 my-6 space-y-3 text-left max-h-96 overflow-y-auto">
              {purchasedPins.map((item, idx) => (
                <div key={idx} className="border-b pb-3 last:border-b-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-primary">{item.examType.toUpperCase()}</span>
                    <Badge variant="outline">PIN #{idx + 1}</Badge>
                  </div>
                  <div className="bg-muted p-2 rounded font-mono text-sm break-all">
                    <div><span className="text-muted-foreground">PIN:</span> {item.pin}</div>
                    {item.serial && <div><span className="text-muted-foreground">Serial:</span> {item.serial}</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => handleReset(true)} className="flex-1">
                <History className="mr-2 h-4 w-4" />
                View My PINs
              </Button>
              <Button onClick={() => handleReset(false)} variant="outline" className="flex-1">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Purchase More
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold tracking-tight">Buy Exam Result PINs</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">Purchase result checker PINs for all major examination bodies.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); if (val === 'history') fetchHistory(); }}>
        <TabsList>
          <TabsTrigger value="buy"><CreditCard className="h-4 w-4 mr-2" />Buy PINs</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-2" />Purchase History</TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button variant="outline" size="sm" onClick={fetchStock}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pins.map((pin) => (
              <PinCard 
                key={pin.id} 
                pin={pin} 
                onUpdateQuantity={updateQuantity} 
              />
            ))}
          </div>

          {getTotalItems() > 0 && (
            <Card className="sticky bottom-4 mt-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Items: <span className="font-bold text-primary">{getTotalItems()}</span></p>
                    <p className="text-2xl font-bold">₦{getTotalAmount().toLocaleString()}</p>
                  </div>
                  <Button
                    onClick={handleCheckout}
                    size="lg"
                    disabled={isPurchasing}
                    className="w-full sm:w-auto"
                  >
                    {isPurchasing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Checkout Now
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Purchase History</CardTitle>
              <CardDescription>View your PIN purchase history</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No PIN purchases yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((order) => (
                    <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          order.status === 'completed' || order.status === 'delivered' ? 'bg-green-100' : 
                          order.status === 'failed' ? 'bg-red-100' : 'bg-yellow-100'
                        }`}>
                          <CreditCard className={`h-5 w-5 ${
                            order.status === 'completed' || order.status === 'delivered' ? 'text-green-600' : 
                            order.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                          }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{order.examType?.toUpperCase()} PIN</p>
                          {order.deliveredPin && (
                            <p className="text-xs font-mono text-muted-foreground truncate">PIN: {order.deliveredPin}</p>
                          )}
                          {order.deliveredSerial && (
                            <p className="text-xs text-muted-foreground">Serial: {order.deliveredSerial}</p>
                          )}
                          <p className="text-xs text-muted-foreground sm:hidden">{formatDate(order.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        <p className="font-bold">₦{parseFloat(String(order.amount || 0)).toLocaleString()}</p>
                        {getStatusBadge(order.status)}
                        <p className="text-xs text-muted-foreground hidden sm:block">{formatDate(order.createdAt)}</p>
                        {(order.status === 'completed' || order.status === 'delivered') && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-1"
                            onClick={() => fetchOrderDetails(order.id)}
                            disabled={loadingOrder}
                          >
                            {loadingOrder ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3 mr-1" />}
                            View
                          </Button>
                        )}
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
        <DialogContent className="max-w-sm p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              PIN Receipt
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div ref={receiptRef}>
              <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-900">
                <div className="text-center border-b border-dashed border-gray-300 dark:border-gray-600 pb-2 mb-2">
                  <div className="text-lg font-bold text-primary">Arapoint</div>
                  <div className="text-xs text-muted-foreground">Education PIN Receipt</div>
                </div>
                
                <div className="space-y-1 mb-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-dotted border-gray-200 dark:border-gray-700">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-medium">{selectedOrder.id?.substring(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-dotted border-gray-200 dark:border-gray-700">
                    <span className="text-muted-foreground">Exam Type</span>
                    <span className="font-medium">{selectedOrder.examType?.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-dotted border-gray-200 dark:border-gray-700">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">₦{parseFloat(String(selectedOrder.amount || 0)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{formatDate(selectedOrder.createdAt)}</span>
                  </div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 rounded p-3 my-2 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Your PIN Code</div>
                  <div className="font-mono text-lg font-bold text-primary tracking-wider">{selectedOrder.deliveredPin}</div>
                  {selectedOrder.deliveredSerial && (
                    <div className="font-mono text-xs mt-1 text-muted-foreground">Serial: {selectedOrder.deliveredSerial}</div>
                  )}
                </div>
                
                <div className="flex justify-center py-2">
                  <QRCode 
                    value={`ARAPOINT-PIN:${selectedOrder.examType?.toUpperCase()}|${selectedOrder.deliveredPin}|${selectedOrder.id}`}
                    size={80}
                    level="M"
                  />
                </div>
                
                <div className="text-center text-[10px] text-muted-foreground pt-2 border-t border-dashed border-gray-300 dark:border-gray-600">
                  <p>Keep this receipt safe - No refunds after delivery</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Button onClick={handleDownload} size="sm" variant="outline" className="text-xs" disabled={isDownloading}>
              {isDownloading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
              {isDownloading ? "Saving..." : "Save"}
            </Button>
            <Button onClick={handlePrint} size="sm" variant="outline" className="text-xs">
              <Printer className="h-3 w-3 mr-1" />
              Print
            </Button>
            <Button size="sm" onClick={() => setShowReceipt(false)} className="text-xs">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-3">
                  You are about to purchase {getTotalItems()} PIN(s) for a total of <strong>₦{getTotalAmount().toLocaleString()}</strong>.
                </p>
                <div className="bg-muted/50 rounded-lg p-3 mb-3">
                  <p className="font-medium text-sm mb-2">Items:</p>
                  <div className="space-y-1">
                    {pins.filter(p => p.quantity > 0).map(p => (
                      <div key={p.id} className="text-sm flex justify-between">
                        <span>{p.name} x {p.quantity}</span>
                        <span>₦{(p.price * p.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  This amount will be deducted from your wallet. Do you want to proceed?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePurchase}>
              Confirm Purchase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PinCard({ pin, onUpdateQuantity }: { pin: PINItem; onUpdateQuantity: (id: string, delta: number) => void }) {
  return (
    <Card className={`h-full flex flex-col hover:shadow-md transition-shadow ${!pin.available ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-sm">{pin.name}</CardTitle>
            </div>
            <CardDescription className="text-xs">{pin.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">
            ₦{pin.price.toLocaleString()}
          </div>
          {!pin.available && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Out of Stock
            </Badge>
          )}
          {pin.available && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
              In Stock
            </Badge>
          )}
        </div>

        {pin.available ? (
          <>
            <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onUpdateQuantity(pin.id, -1)}
                disabled={pin.quantity === 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="font-bold text-sm w-8 text-center">{pin.quantity}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onUpdateQuantity(pin.id, 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {pin.quantity > 0 && (
              <div className="bg-primary/10 rounded p-2 text-center">
                <p className="text-xs text-muted-foreground">Subtotal</p>
                <p className="font-bold text-primary">₦{(pin.price * pin.quantity).toLocaleString()}</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-2">
            Currently unavailable
          </div>
        )}
      </CardContent>
    </Card>
  );
}
