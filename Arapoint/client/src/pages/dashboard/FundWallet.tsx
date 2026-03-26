import { tokenStorage } from '@/lib/tokenStorage';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Building2, Copy, Check, Loader2, RefreshCw, Wallet } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { walletApi } from "@/lib/api/wallet";
import { useToast } from "@/hooks/use-toast";

export default function FundWallet() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const accessToken = tokenStorage.getItem('accessToken');

  const { data: balance } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: walletApi.getBalance,
    enabled: !!accessToken,
  });

  const { data: virtualAccount, isLoading, isError, refetch } = useQuery({
    queryKey: ['virtualAccount'],
    queryFn: walletApi.getVirtualAccount,
    enabled: !!accessToken,
  });

  const generateMutation = useMutation({
    mutationFn: walletApi.generateVirtualAccount,
    onSuccess: (data) => {
      queryClient.setQueryData(['virtualAccount'], { configured: true, account: data.account });
      toast({ title: "Account Created", description: "Your funding account has been generated." });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.response?.data?.message || "Failed to generate account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!", description: "Account number copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const renderAccount = () => {
    if (isLoading || generateMutation.isPending) {
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {generateMutation.isPending ? "Generating your account..." : "Loading account details..."}
          </p>
        </div>
      );
    }

    if (isError || !virtualAccount?.configured) {
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Building2 className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Payment system is being configured. Please check back later or contact support.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      );
    }

    if (virtualAccount?.account) {
      const acct = virtualAccount.account;
      return (
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Bank</span>
            <span className="text-sm font-semibold">{acct.bankName}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <span className="text-sm text-muted-foreground">Account No.</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary tracking-widest">{acct.accountNumber}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(acct.accountNumber)}>
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm font-semibold">{acct.accountName}</span>
          </div>
          <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>Note:</strong> Transfer any amount to the account above. Your wallet is credited automatically once the payment is confirmed.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Building2 className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          Generate your dedicated bank account to start funding your wallet.
        </p>
        <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
          {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate Account
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-heading font-bold">Fund Your Wallet</h2>
          <p className="text-muted-foreground text-sm">Add money to your Arapoint wallet</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-primary" />
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">
            ₦{balance?.balance ? parseFloat(String(balance.balance)).toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '0.00'}
          </p>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-green-600" />
            <CardTitle className="text-base">Bank Transfer</CardTitle>
          </div>
          <CardDescription>Transfer to fund your wallet instantly</CardDescription>
        </CardHeader>
        <CardContent>
          {renderAccount()}
        </CardContent>
      </Card>
    </div>
  );
}
