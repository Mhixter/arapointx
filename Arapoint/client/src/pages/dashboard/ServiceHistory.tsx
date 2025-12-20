import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Loader2, 
  History,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Download,
  Phone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  IdCard,
  Building2,
  Wallet,
  FileText,
  CreditCard
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const getAuthToken = () => localStorage.getItem('accessToken');

interface ServiceRecord {
  id: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  status: string;
  reference?: string;
  date: string;
  details?: any;
}

export default function ServiceHistory() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [allHistory, setAllHistory] = useState<ServiceRecord[]>([]);
  const [walletHistory, setWalletHistory] = useState<ServiceRecord[]>([]);
  const [airtimeHistory, setAirtimeHistory] = useState<ServiceRecord[]>([]);
  const [dataHistory, setDataHistory] = useState<ServiceRecord[]>([]);
  const [electricityHistory, setElectricityHistory] = useState<ServiceRecord[]>([]);
  const [cableHistory, setCableHistory] = useState<ServiceRecord[]>([]);
  const [educationHistory, setEducationHistory] = useState<ServiceRecord[]>([]);
  const [identityHistory, setIdentityHistory] = useState<ServiceRecord[]>([]);
  const [pinHistory, setPinHistory] = useState<ServiceRecord[]>([]);
  const [cacHistory, setCacHistory] = useState<ServiceRecord[]>([]);

  const fetchAllHistory = async () => {
    setIsLoading(true);
    const token = getAuthToken();
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [
        walletRes, airtimeRes, dataRes, electricityRes, cableRes,
        educationRes, identityRes, pinRes, cacRes
      ] = await Promise.all([
        fetch('/api/wallet/history?limit=100', { headers }).then(r => r.json()).catch(() => ({ data: { history: [] } })),
        fetch('/api/airtime/history?limit=100', { headers }).then(r => r.json()).catch(() => ({ data: { history: [] } })),
        fetch('/api/data/history?limit=100', { headers }).then(r => r.json()).catch(() => ({ data: { history: [] } })),
        fetch('/api/electricity/history?limit=100', { headers }).then(r => r.json()).catch(() => ({ data: { history: [] } })),
        fetch('/api/cable/history?limit=100', { headers }).then(r => r.json()).catch(() => ({ data: { history: [] } })),
        fetch('/api/education/history?limit=100', { headers }).then(r => r.json()).catch(() => ({ data: { history: [] } })),
        fetch('/api/identity/history?limit=100', { headers }).then(r => r.json()).catch(() => ({ data: { history: [] } })),
        fetch('/api/education/pins/orders?limit=100', { headers }).then(r => r.json()).catch(() => ({ data: { orders: [] } })),
        fetch('/api/cac/requests?limit=100', { headers }).then(r => r.json()).catch(() => ({ data: { requests: [] } })),
      ]);

      const walletRecords: ServiceRecord[] = (walletRes.data?.history || walletRes.data?.transactions || []).map((item: any) => ({
        id: item.id,
        type: item.transactionType || item.type || 'wallet',
        category: 'wallet',
        description: item.description || item.transactionType?.replace(/_/g, ' ') || 'Wallet Transaction',
        amount: parseFloat(item.amount || 0),
        status: item.status || 'completed',
        reference: item.referenceId || item.reference,
        date: item.createdAt,
      }));

      const airtimeRecords: ServiceRecord[] = (airtimeRes.data?.history || []).map((item: any) => ({
        id: item.id,
        type: 'airtime',
        category: 'vtu',
        description: `${item.provider?.toUpperCase() || 'MTN'} Airtime - ${item.phone}`,
        amount: parseFloat(item.amount || 0),
        status: item.status || 'completed',
        reference: item.reference,
        date: item.createdAt,
        details: item,
      }));

      const dataRecords: ServiceRecord[] = (dataRes.data?.history || []).map((item: any) => ({
        id: item.id,
        type: 'data',
        category: 'vtu',
        description: `${item.provider?.toUpperCase() || 'MTN'} Data - ${item.phone}`,
        amount: parseFloat(item.amount || 0),
        status: item.status || 'completed',
        reference: item.reference,
        date: item.createdAt,
        details: item,
      }));

      const electricityRecords: ServiceRecord[] = (electricityRes.data?.history || []).map((item: any) => ({
        id: item.id,
        type: 'electricity',
        category: 'bills',
        description: `${item.provider?.toUpperCase() || 'Electricity'} - Meter: ${item.meterNumber}`,
        amount: parseFloat(item.amount || 0),
        status: item.status || 'completed',
        reference: item.reference,
        date: item.createdAt,
        details: item,
      }));

      const cableRecords: ServiceRecord[] = (cableRes.data?.history || []).map((item: any) => ({
        id: item.id,
        type: 'cable',
        category: 'bills',
        description: `${item.provider?.toUpperCase() || 'Cable'} - ${item.smartCardNumber}`,
        amount: parseFloat(item.amount || 0),
        status: item.status || 'completed',
        reference: item.reference,
        date: item.createdAt,
        details: item,
      }));

      const educationRecords: ServiceRecord[] = (educationRes.data?.history || []).map((item: any) => ({
        id: item.id,
        type: item.serviceType || 'education',
        category: 'education',
        description: `${item.serviceType?.toUpperCase() || 'Education'} Result Check - ${item.registrationNumber}`,
        amount: 0,
        status: item.status || 'pending',
        reference: item.jobId,
        date: item.createdAt,
        details: item,
      }));

      const pinRecords: ServiceRecord[] = (pinRes.data?.orders || []).map((item: any) => ({
        id: item.id,
        type: 'pin_purchase',
        category: 'pins',
        description: `${item.examType?.toUpperCase() || 'Exam'} PIN Purchase`,
        amount: parseFloat(item.amount || 0),
        status: item.status || 'pending',
        reference: item.id,
        date: item.createdAt,
        details: item,
      }));

      const cacRecords: ServiceRecord[] = (cacRes.data?.requests || []).map((item: any) => ({
        id: item.id,
        type: item.serviceType || 'cac',
        category: 'cac',
        description: `CAC ${item.serviceType?.replace(/_/g, ' ')?.toUpperCase() || 'Registration'} - ${item.businessName1 || item.businessName}`,
        amount: parseFloat(item.amount || 0),
        status: item.status || 'pending',
        reference: item.id,
        date: item.createdAt,
        details: item,
      }));

      const identityRecords: ServiceRecord[] = (identityRes.data?.history || identityRes.data?.verifications || []).map((item: any) => ({
        id: item.id,
        type: item.verificationType || item.serviceType || 'identity',
        category: 'identity',
        description: `${item.verificationType?.replace(/_/g, ' ')?.toUpperCase() || 'Identity'} - ${item.nin || item.reference || 'Verification'}`,
        amount: parseFloat(item.amount || 0),
        status: item.status || 'pending',
        reference: item.jobId || item.id,
        date: item.createdAt,
        details: item,
      }));

      setWalletHistory(walletRecords);
      setAirtimeHistory(airtimeRecords);
      setDataHistory(dataRecords);
      setElectricityHistory(electricityRecords);
      setCableHistory(cableRecords);
      setEducationHistory(educationRecords);
      setPinHistory(pinRecords);
      setCacHistory(cacRecords);
      setIdentityHistory(identityRecords);

      const combined = [
        ...walletRecords,
        ...airtimeRecords,
        ...dataRecords,
        ...electricityRecords,
        ...cableRecords,
        ...educationRecords,
        ...pinRecords,
        ...cacRecords,
        ...identityRecords,
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setAllHistory(combined);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load service history", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllHistory();
  }, []);

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'completed' || s === 'success' || s === 'successful') {
      return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
    }
    if (s === 'failed' || s === 'error') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
    }
    if (s === 'processing' || s === 'in_progress') {
      return <Badge className="bg-blue-500 hover:bg-blue-600"><Clock className="h-3 w-3 mr-1" /> Processing</Badge>;
    }
    if (s === 'pending') {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
    return <Badge variant="outline">{status || 'Unknown'}</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'wallet': return <Wallet className="h-4 w-4" />;
      case 'vtu': return <Phone className="h-4 w-4" />;
      case 'bills': return <Zap className="h-4 w-4" />;
      case 'education': return <GraduationCap className="h-4 w-4" />;
      case 'pins': return <CreditCard className="h-4 w-4" />;
      case 'cac': return <Building2 className="h-4 w-4" />;
      case 'identity': return <IdCard className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const normalizeStatus = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'success' || s === 'successful' || s === 'completed') return 'completed';
    if (s === 'failed' || s === 'error') return 'failed';
    if (s === 'processing' || s === 'in_progress') return 'processing';
    if (s === 'pending') return 'pending';
    return s;
  };

  const filterRecords = (records: ServiceRecord[]) => {
    return records.filter(record => {
      const matchesSearch = !searchQuery || 
        record.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.reference?.toLowerCase().includes(searchQuery.toLowerCase());
      const normalizedStatus = normalizeStatus(record.status);
      const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const getCurrentRecords = () => {
    switch (activeTab) {
      case 'wallet': return filterRecords(walletHistory);
      case 'airtime': return filterRecords(airtimeHistory);
      case 'data': return filterRecords(dataHistory);
      case 'electricity': return filterRecords(electricityHistory);
      case 'cable': return filterRecords(cableHistory);
      case 'education': return filterRecords(educationHistory);
      case 'pins': return filterRecords(pinHistory);
      case 'cac': return filterRecords(cacHistory);
      case 'identity': return filterRecords(identityHistory);
      default: return filterRecords(allHistory);
    }
  };

  const records = getCurrentRecords();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6" />
            Service History
          </h2>
          <p className="text-sm text-muted-foreground mt-1">View all your transactions and service requests</p>
        </div>
        <Button variant="outline" onClick={fetchAllHistory} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs sm:text-sm">All ({allHistory.length})</TabsTrigger>
          <TabsTrigger value="wallet" className="text-xs sm:text-sm">Wallet ({walletHistory.length})</TabsTrigger>
          <TabsTrigger value="airtime" className="text-xs sm:text-sm">Airtime ({airtimeHistory.length})</TabsTrigger>
          <TabsTrigger value="data" className="text-xs sm:text-sm">Data ({dataHistory.length})</TabsTrigger>
          <TabsTrigger value="electricity" className="text-xs sm:text-sm">Electricity ({electricityHistory.length})</TabsTrigger>
          <TabsTrigger value="cable" className="text-xs sm:text-sm">Cable ({cableHistory.length})</TabsTrigger>
          <TabsTrigger value="education" className="text-xs sm:text-sm">Education ({educationHistory.length})</TabsTrigger>
          <TabsTrigger value="pins" className="text-xs sm:text-sm">PINs ({pinHistory.length})</TabsTrigger>
          <TabsTrigger value="cac" className="text-xs sm:text-sm">CAC ({cacHistory.length})</TabsTrigger>
          <TabsTrigger value="identity" className="text-xs sm:text-sm">Identity ({identityHistory.length})</TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by description or reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={`${record.category}-${record.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(record.category)}
                            <span className="text-xs capitalize">{record.category}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{record.description}</p>
                            {record.reference && (
                              <p className="text-xs text-muted-foreground">Ref: {record.reference}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {record.amount > 0 ? `₦${record.amount.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(record.date)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
