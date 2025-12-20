import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CheckCircle2, ShoppingCart, Plus, Minus, AlertTriangle, RefreshCw, History, CreditCard, Clock, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const getAuthToken = () => localStorage.getItem('accessToken');

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
  pinCode?: string;
  serialNumber?: string;
  createdAt: string;
}

const PIN_INFO: Record<string, { name: string; description: string }> = {
  waec: { name: "WAEC Scratch Card", description: "West African Examinations Council Result Checker PIN" },
  neco: { name: "NECO Token", description: "National Examinations Council Result Checker Token" },
  nabteb: { name: "NABTEB PIN", description: "National Board of Technical Education Result PIN" },
  nbais: { name: "NBAIS PIN", description: "National Board for Arabic & Islamic Studies PIN" },
};

export default function BuyPINs() {
  const { toast } = useToast();
  const [pins, setPins] = useState<PINItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [purchasedPins, setPurchasedPins] = useState<{ examType: string; pin: string; serial?: string }[]>([]);
  const [history, setHistory] = useState<PINOrder[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  const updateQuantity = (id: string, delta: number) => {
    setPins(pins.map(pin =>
      pin.id === id ? { ...pin, quantity: Math.max(0, pin.quantity + delta) } : pin
    ));
  };

  const getTotalItems = () => pins.reduce((sum, pin) => sum + pin.quantity, 0);
  const getTotalAmount = () => pins.reduce((sum, pin) => sum + (pin.price * pin.quantity), 0);

  const handlePurchase = async () => {
    if (getTotalItems() === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one PIN to purchase.",
        variant: "destructive",
      });
      return;
    }

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
                pin: data.data.pin.pinCode,
                serial: data.data.pin.serialNumber
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

  const handleReset = () => {
    setPins(pins.map(pin => ({ ...pin, quantity: 0 })));
    setPurchaseComplete(false);
    setPurchasedPins([]);
    fetchStock();
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
            <Button onClick={handleReset} className="w-full">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Purchase More PINs
            </Button>
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

      <Tabs defaultValue="buy" onValueChange={(val) => val === 'history' && fetchHistory()}>
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
                    onClick={handlePurchase}
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exam Type</TableHead>
                        <TableHead>PIN Code</TableHead>
                        <TableHead>Serial</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.examType?.toUpperCase()}</TableCell>
                          <TableCell className="font-mono text-xs">{order.pinCode || '-'}</TableCell>
                          <TableCell className="text-xs">{order.serialNumber || '-'}</TableCell>
                          <TableCell>₦{parseFloat(String(order.amount || 0)).toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
