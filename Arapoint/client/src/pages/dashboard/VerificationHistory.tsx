import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileText,
  Image
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { servicesApi } from "@/lib/api/services";
import { Link } from "wouter";

interface EducationServiceRecord {
  id: string;
  jobId: string;
  serviceType: string;
  registrationNumber: string;
  examYear: number;
  status: string;
  resultData: any;
  createdAt: string;
  updatedAt: string;
}

export default function VerificationHistory() {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['education-history'],
    queryFn: () => servicesApi.education.getHistory(),
    staleTime: 30000,
  });

  const history: EducationServiceRecord[] = data || [];

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
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

  const getServiceName = (serviceType: string) => {
    const names: Record<string, string> = {
      'jamb': 'JAMB Result',
      'waec': 'WAEC Result',
      'neco': 'NECO Result',
      'nabteb': 'NABTEB Result',
      'nbais': 'NBAIS Result',
    };
    return names[serviceType?.toLowerCase()] || serviceType?.toUpperCase() || 'Unknown';
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

  const getErrorMessage = (record: EducationServiceRecord) => {
    if (record.status === 'failed' && record.resultData) {
      return record.resultData.errorMessage || 'Verification failed';
    }
    return null;
  };

  const handleDownload = async (jobId: string, format: 'pdf' | 'screenshot' = 'pdf') => {
    setDownloading(`${jobId}_${format}`);
    try {
      const response = await fetch(`/api/education/job/${jobId}/download?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Download failed');
      }

      const contentType = response.headers.get('Content-Type');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = contentType?.includes('pdf') 
        ? `result_${jobId}.pdf` 
        : `result_${jobId}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Successful",
        description: "Your result has been downloaded.",
      });
    } catch (err: any) {
      toast({
        title: "Download Error",
        description: err.message || "Failed to download result.",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleDirectDownload = (record: EducationServiceRecord, type: 'pdf' | 'screenshot') => {
    const data = type === 'pdf' ? record.resultData?.pdfBase64 : record.resultData?.screenshotBase64;
    if (!data) return;
    
    const link = document.createElement('a');
    link.href = type === 'pdf' 
      ? `data:application/pdf;base64,${data}`
      : `data:image/png;base64,${data}`;
    link.download = type === 'pdf' 
      ? `${record.serviceType}_result_${record.registrationNumber}.pdf`
      : `${record.serviceType}_result_${record.registrationNumber}.png`;
    link.click();
    
    toast({
      title: "Download Started",
      description: `Your ${type.toUpperCase()} is being downloaded.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">Verification History</h2>
          <p className="text-muted-foreground">View all your past education verification requests</p>
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
          <Link href="/dashboard/education">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Services
            </Button>
          </Link>
        </div>
      </div>

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
                You haven't made any education verification requests yet.
              </p>
              <Link href="/dashboard/education">
                <Button>Get Started</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((record) => {
            const errorMessage = getErrorMessage(record);
            const hasPdf = record.resultData?.pdfBase64;
            const hasScreenshot = record.resultData?.screenshotBase64;
            const hasAnyDownload = hasPdf || hasScreenshot;

            return (
              <Card key={record.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{getServiceName(record.serviceType)}</h3>
                        {getStatusBadge(record.status)}
                        {hasAnyDownload && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Download className="h-3 w-3 mr-1" />
                            Result Available
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Registration: <span className="font-mono">{record.registrationNumber || 'N/A'}</span></p>
                        {record.examYear && <p>Exam Year: {record.examYear}</p>}
                        <p>Submitted: {formatDate(record.createdAt)}</p>
                      </div>
                      {errorMessage && (
                        <div className="space-y-2 mt-2">
                          <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800">
                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
                          </div>
                          <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800">
                            <p className="text-sm text-green-700 dark:text-green-400">Wallet refunded automatically</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {hasPdf && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleDirectDownload(record, 'pdf')}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      )}
                      {hasScreenshot && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDirectDownload(record, 'screenshot')}
                        >
                          <Image className="h-4 w-4 mr-2" />
                          Screenshot
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
