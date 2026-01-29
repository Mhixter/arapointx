import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  ArrowLeft, 
  Download, 
  History,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Eye,
  CreditCard
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IdentityVerificationRecord {
  id: string;
  userId: string;
  verificationType: string;
  nin: string | null;
  phone: string | null;
  status: string;
  verificationData: any;
  slipHtml: string | null;
  slipType: string | null;
  reference: string | null;
  createdAt: string;
}

export default function IdentityHistory() {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [viewingSlip, setViewingSlip] = useState<IdentityVerificationRecord | null>(null);
  const [selectedSlipType, setSelectedSlipType] = useState<string>('standard');

  const { data, isLoading, refetch, isRefetching, error, dataUpdatedAt } = useQuery({
    queryKey: ['identity-history'],
    queryFn: async () => {
      const response = await fetch('/api/identity/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch history');
      const result = await response.json();
      return result.data?.history || [];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: 1000,
  });

  const history: IdentityVerificationRecord[] = data || [];
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500 hover:bg-blue-600"><Clock className="h-3 w-3 mr-1" /> Processing</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const getServiceName = (type: string) => {
    const names: Record<string, string> = {
      'nin': 'NIN Verification',
      'bvn': 'BVN Verification',
      'vnin': 'Virtual NIN',
      'nin_phone': 'NIN-Phone Verification',
    };
    return names[type?.toLowerCase()] || type?.toUpperCase() || 'Identity Verification';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const maskNIN = (nin: string | null) => {
    if (!nin) return 'N/A';
    if (nin.length < 4) return nin;
    return nin.substring(0, 4) + '****' + nin.substring(nin.length - 3);
  };

  const handleDownload = async (record: IdentityVerificationRecord, slipType: string = 'standard') => {
    setDownloading(record.id);
    try {
      const response = await fetch(`/api/identity/slip/${record.id}/download?slipType=${slipType}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NIN_Slip_${record.nin || record.id}_${slipType}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Successful",
        description: "Your NIN slip has been downloaded.",
      });
    } catch (err: any) {
      toast({
        title: "Download Error",
        description: err.message || "Failed to download slip.",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleViewSlip = async (record: IdentityVerificationRecord) => {
    setViewingSlip(record);
    setSelectedSlipType(record.slipType || 'standard');
  };

  const getSlipHtml = async (recordId: string, slipType: string): Promise<string> => {
    const response = await fetch(`/api/identity/slip/${recordId}?slipType=${slipType}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch slip');
    const result = await response.json();
    return result.data?.slip?.html || '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">Identity Verification History</h2>
          <p className="text-muted-foreground">View and download your past identity verification slips</p>
          {lastUpdated && !isLoading && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/dashboard/identity">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Services
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Failed to load history</p>
                <p className="text-sm">Check your internet connection and try refreshing.</p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : history.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No verification history</h3>
              <p className="text-muted-foreground mb-4">
                You haven't made any identity verification requests yet.
              </p>
              <Link href="/dashboard/identity">
                <Button>Get Started</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((record) => {
            const hasSlip = record.status === 'completed' && record.verificationData;
            const personName = record.verificationData?.firstName 
              ? `${record.verificationData.firstName} ${record.verificationData.lastName || ''}`
              : null;

            return (
              <Card key={record.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CreditCard className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold">{getServiceName(record.verificationType)}</h3>
                        {getStatusBadge(record.status)}
                        {hasSlip && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Download className="h-3 w-3 mr-1" />
                            Slip Available
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {personName && <p className="font-medium text-foreground">{personName}</p>}
                        <p>NIN: <span className="font-mono">{maskNIN(record.nin)}</span></p>
                        {record.reference && <p>Reference: <span className="font-mono text-xs">{record.reference}</span></p>}
                        <p>Date: {formatDate(record.createdAt)}</p>
                      </div>
                    </div>
                    {hasSlip && (
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewSlip(record)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Slip
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleDownload(record, record.slipType || 'standard')}
                          disabled={downloading === record.id}
                        >
                          {downloading === record.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!viewingSlip} onOpenChange={() => setViewingSlip(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>NIN Verification Slip</span>
              <div className="flex items-center gap-2">
                <Select value={selectedSlipType} onValueChange={setSelectedSlipType}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="information">Information</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => viewingSlip && handleDownload(viewingSlip, selectedSlipType)}
                  disabled={downloading === viewingSlip?.id}
                >
                  {downloading === viewingSlip?.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {viewingSlip && (
            <SlipPreview recordId={viewingSlip.id} slipType={selectedSlipType} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SlipPreview({ recordId, slipType }: { recordId: string; slipType: string }) {
  const { data: slipHtml, isLoading } = useQuery({
    queryKey: ['slip-preview', recordId, slipType],
    queryFn: async () => {
      const response = await fetch(`/api/identity/slip/${recordId}?slipType=${slipType}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch slip');
      const result = await response.json();
      return result.data?.slip?.html || '';
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-gray-100">
      <iframe
        srcDoc={slipHtml}
        className="w-full h-[500px] border-0"
        title="NIN Slip Preview"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
