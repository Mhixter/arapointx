import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Smartphone, ArrowRight, Clock, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MTN_LOGO = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.svg/512px-New-mtn-logo.svg.png";

const NETWORKS = [
  { id: "mtn", name: "MTN", color: "bg-yellow-500", rate: 80, logo: MTN_LOGO },
];

export default function AirtimeToCash() {
  const [selectedNetwork, setSelectedNetwork] = useState("mtn");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "pending" | "completed" | "error">("idle");
  const { toast } = useToast();

  const selectedNetworkData = NETWORKS.find(n => n.id === selectedNetwork);
  const cashValue = selectedNetworkData ? (parseFloat(amount || "0") * selectedNetworkData.rate / 100) : 0;

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

    if (parseFloat(amount) < 100) {
      toast({
        title: "Minimum Amount",
        description: "Minimum amount is ₦100",
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
          cashValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      setStatus("pending");
      toast({
        title: "Request Submitted",
        description: "Your airtime to cash request has been submitted for processing",
      });

    } catch (err: any) {
      toast({
        title: "Request Failed",
        description: err.message || 'An error occurred',
        variant: "destructive",
      });
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "pending") {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Card className="text-center border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
          <CardContent className="pt-10 pb-10 space-y-4">
            <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto text-yellow-600">
              <Clock className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-yellow-800 dark:text-yellow-400">Request Submitted</h3>
            <p className="text-yellow-700 dark:text-yellow-300 max-w-xs mx-auto">
              Your airtime to cash request for ₦{parseFloat(amount).toLocaleString()} has been submitted.
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-xs mx-auto">
              <p className="text-sm text-muted-foreground">You will receive:</p>
              <p className="text-2xl font-bold text-primary">₦{cashValue.toLocaleString()}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Processing time: 1-30 minutes. Credit will be added to your wallet.
            </p>
            <Button onClick={() => { setStatus("idle"); setAmount(""); setPhone(""); }} variant="outline" className="mt-4">
              Submit Another Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight">Airtime to Cash</h2>
        <p className="text-muted-foreground">Convert your excess airtime to cash in your wallet</p>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>How it works:</strong> Transfer airtime to our designated number and receive cash value in your wallet. Rates vary by network.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Convert Airtime
          </CardTitle>
          <CardDescription>Select network and enter amount to convert</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="text-sm font-medium mb-3 block">1. Network</Label>
              <div className="flex items-center gap-4 p-4 rounded-lg border-2 border-primary bg-yellow-50 dark:bg-yellow-900/20">
                <img 
                  src={MTN_LOGO} 
                  alt="MTN Logo" 
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="flex-1">
                  <p className="font-bold text-lg text-yellow-700">MTN Nigeria</p>
                  <p className="text-sm text-muted-foreground">Conversion Rate: <span className="font-semibold text-primary">80%</span></p>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-primary bg-primary flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Currently only MTN airtime is supported</p>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">2. Enter Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                <Input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter airtime amount" 
                  min="100"
                  className="h-12 pl-8 text-lg"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minimum: ₦100</p>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">3. Your Phone Number</Label>
              <Input 
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08012345678" 
                maxLength={11}
                className="h-12"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Number you'll transfer airtime from</p>
            </div>

            {selectedNetwork && amount && parseFloat(amount) >= 100 && (
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Airtime Amount</p>
                      <p className="text-lg font-semibold">₦{parseFloat(amount).toLocaleString()}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">You'll Receive</p>
                      <p className="text-xl font-bold text-primary">₦{cashValue.toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Rate: {selectedNetworkData?.rate}% for {selectedNetworkData?.name}
                  </p>
                </CardContent>
              </Card>
            )}

            <Button 
              type="submit" 
              size="lg" 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white" 
              disabled={isLoading || !selectedNetwork || !amount || parseFloat(amount) < 100}
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

      <Card className="bg-muted/30 border-none">
        <CardHeader>
          <CardTitle className="text-base">How to Transfer Airtime</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3 text-muted-foreground">
          <div className="flex gap-3">
            <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
            <p>Submit your request with the amount you want to convert</p>
          </div>
          <div className="flex gap-3">
            <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            <p>You'll receive an SMS with our airtime receiving number</p>
          </div>
          <div className="flex gap-3">
            <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
            <p>Transfer the exact airtime amount to the provided number</p>
          </div>
          <div className="flex gap-3">
            <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
            <p>Cash value is credited to your wallet within 1-30 minutes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
