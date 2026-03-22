import { tokenStorage } from '@/lib/tokenStorage';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, Wallet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { walletApi } from "@/lib/api/wallet";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/api/auth";

const AMOUNT_PRESETS = [1000, 2000, 5000, 10000, 20000, 50000];

export default function FundWallet() {
  const [amount, setAmount] = useState<string>("");
  const [selectedGateway, setSelectedGateway] = useState<string>("paystack");
  const { toast } = useToast();
  const accessToken = tokenStorage.getItem('accessToken');

  const { data: profile, isLoading: profileLoading, isError: profileError } = useQuery({
    queryKey: ['profile'],
    queryFn: authApi.getProfile,
    enabled: !!accessToken,
  });

  const { data: gateways, isLoading: gatewaysLoading } = useQuery({
    queryKey: ['paymentGateways'],
    queryFn: walletApi.getPaymentGateways,
    enabled: !!accessToken,
  });

  const { data: balance } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: walletApi.getBalance,
    enabled: !!accessToken,
  });

  const paystackMutation = useMutation({
    mutationFn: (data: { amount: number; email?: string }) => walletApi.initializePaystack(data),
    onSuccess: (data) => {
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error?.response?.data?.message || "Failed to initialize payment",
        variant: "destructive",
      });
    },
  });

  const palmpayMutation = useMutation({
    mutationFn: (data: { amount: number; email?: string }) => walletApi.initializePalmpay(data),
    onSuccess: (data) => {
      if (data.success && data.data?.paymentUrl) {
        window.location.href = data.data.paymentUrl;
      } else {
        toast({
          title: "PalmPay Not Available",
          description: data.error || "PalmPay integration is not configured. Please use Paystack instead.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error?.response?.data?.message || "Failed to initialize PalmPay payment",
        variant: "destructive",
      });
    },
  });

  const handleAmountPreset = (presetAmount: number) => {
    setAmount(presetAmount.toString());
  };

  const handleSubmit = () => {
    const numericAmount = parseFloat(amount);
    
    if (isNaN(numericAmount) || numericAmount < 100) {
      toast({
        title: "Invalid Amount",
        description: "Minimum amount is ₦100",
        variant: "destructive",
      });
      return;
    }

    if (numericAmount > 1000000) {
      toast({
        title: "Invalid Amount",
        description: "Maximum amount is ₦1,000,000",
        variant: "destructive",
      });
      return;
    }

    if (profileLoading) {
      toast({
        title: "Loading Profile",
        description: "Please wait while your profile loads...",
        variant: "default",
      });
      return;
    }

    if (profileError || !profile?.email) {
      toast({
        title: "Profile Error",
        description: "Unable to load your profile. Please refresh the page or contact support.",
        variant: "destructive",
      });
      return;
    }

    const paymentData = {
      amount: numericAmount,
      email: profile.email,
    };

    if (selectedGateway === "paystack") {
      paystackMutation.mutate(paymentData);
    } else if (selectedGateway === "palmpay") {
      palmpayMutation.mutate(paymentData);
    }
  };

  const isLoading = paystackMutation.isPending || palmpayMutation.isPending;
  const isProfileReady = !profileLoading && !profileError && !!profile?.email;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-heading font-bold">Fund Your Wallet</h2>
          <p className="text-muted-foreground">Add money to your Arapoint wallet</p>
        </div>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Current Balance
            {profileLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">
            ₦{balance?.balance ? parseFloat(balance.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '0.00'}
          </p>
          {profileError && (
            <p className="text-sm text-destructive mt-2">Unable to load profile. Please refresh the page.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Amount</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {AMOUNT_PRESETS.map((preset) => (
              <Button
                key={preset}
                variant={amount === preset.toString() ? "default" : "outline"}
                onClick={() => handleAmountPreset(preset)}
                className="h-12"
              >
                ₦{preset.toLocaleString()}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customAmount">Or enter custom amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₦</span>
              <Input
                id="customAmount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-lg h-12"
                min={100}
                max={1000000}
              />
            </div>
            <p className="text-xs text-muted-foreground">Minimum: ₦100 | Maximum: ₦1,000,000</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {gatewaysLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <Card
                className={`cursor-pointer transition-all border-2 ${
                  selectedGateway === "paystack" 
                    ? "border-primary bg-primary/5" 
                    : "hover:border-primary/50"
                } ${!gateways?.paystackConfigured ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => gateways?.paystackConfigured && setSelectedGateway("paystack")}
              >
                <CardContent className="p-6 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-[#00C3F7]/10 rounded-full flex items-center justify-center">
                    <CreditCard className="h-8 w-8 text-[#00C3F7]" />
                  </div>
                  <h3 className="font-bold text-lg">Paystack</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Card, Bank Transfer, USSD, PalmPay, OPay
                  </p>
                  {gateways?.paystackConfigured ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3" /> Available
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-yellow-600">
                      <AlertCircle className="h-3 w-3" /> Not configured
                    </span>
                  )}
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all border-2 ${
                  selectedGateway === "palmpay" 
                    ? "border-primary bg-primary/5" 
                    : "hover:border-primary/50"
                } ${!gateways?.palmpayConfigured ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => gateways?.palmpayConfigured && setSelectedGateway("palmpay")}
              >
                <CardContent className="p-6 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-[#8B5CF6]/10 rounded-full flex items-center justify-center">
                    <Wallet className="h-8 w-8 text-[#8B5CF6]" />
                  </div>
                  <h3 className="font-bold text-lg">PalmPay Direct</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Direct PalmPay wallet payment
                  </p>
                  {gateways?.palmpayConfigured ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3" /> Available
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-yellow-600">
                      <AlertCircle className="h-3 w-3" /> Coming Soon
                    </span>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="pt-4">
            <Button 
              className="w-full h-14 text-lg" 
              onClick={handleSubmit}
              disabled={!amount || isLoading || !isProfileReady || (selectedGateway === "paystack" && !gateways?.paystackConfigured) || (selectedGateway === "palmpay" && !gateways?.palmpayConfigured)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Pay ₦{amount ? parseFloat(amount).toLocaleString() : "0"}
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Payments are processed securely. Your wallet will be credited instantly upon successful payment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
