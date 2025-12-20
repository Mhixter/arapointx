import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { downloadCSV } from "@/lib/downloadUtils";
import { ResponsiveServiceTable, ResponsiveTabs } from "@/components/admin/ResponsiveServiceTable";

interface IdentityService {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  verificationType: string;
  nin: string;
  phone?: string;
  secondEnrollmentId?: string;
  status: "pending" | "completed" | "rejected";
  verificationData?: any;
  createdAt: string;
}

const getAuthToken = () => localStorage.getItem('accessToken');

export default function AdminIdentityServices() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [services, setServices] = useState<IdentityService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<IdentityService | null>(null);
  const [activeTab, setActiveTab] = useState("nin");

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch('/api/admin/identity-services', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch identity services');
      }
      
      const result = await response.json();
      if (result.status === 'success' && result.data?.services) {
        const mappedServices = result.data.services.map((s: any) => ({
          id: s.id,
          userId: s.userId,
          userName: s.userName || 'Unknown',
          userEmail: s.userEmail,
          verificationType: s.verificationType || 'nin_verification',
          nin: s.nin || '',
          phone: s.phone,
          secondEnrollmentId: s.secondEnrollmentId,
          status: s.status === 'completed' ? 'completed' : s.status === 'rejected' ? 'rejected' : 'pending',
          verificationData: s.verificationData,
          createdAt: s.createdAt,
        }));
        setServices(mappedServices);
      }
    } catch (error: any) {
      console.error('Error fetching identity services:', error);
      toast({ title: "Error", description: "Failed to load identity services", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: "completed" | "rejected") => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/identity-services/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (response.ok) {
        setServices(services.map(s => s.id === id ? { ...s, status } : s));
        setSelectedRequest(null);
        toast({ title: "Status Updated", description: `Service marked as ${status}.` });
      } else {
        toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const filteredServices = services.filter(s => 
    (statusFilter === "all" || s.status === statusFilter) &&
    (searchTerm === "" || 
      s.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.nin?.includes(searchTerm) ||
      s.phone?.includes(searchTerm))
  );

  const ninVerification = filteredServices.filter(s => 
    s.verificationType === "nin_verification" || s.verificationType === "nin-verification"
  );
  const ninPhone = filteredServices.filter(s => 
    s.verificationType === "nin_phone" || s.verificationType === "nin-phone"
  );
  const ninRecovery = filteredServices.filter(s => 
    s.verificationType === "nin_recovery" || s.verificationType === "ipe-clearance"
  );

  const tabs = [
    { id: "nin", label: "NIN Verification", count: ninVerification.length },
    { id: "ninphone", label: "NIN with Phone", count: ninPhone.length },
    { id: "recovery", label: "NIN Recovery", count: ninRecovery.length },
  ];

  const getCurrentData = () => {
    switch(activeTab) {
      case "nin": return ninVerification;
      case "ninphone": return ninPhone;
      case "recovery": return ninRecovery;
      default: return ninVerification;
    }
  };

  const columns = [
    { key: "id", label: "Request ID", render: (v: string) => <span className="font-mono text-xs">{v?.slice(0, 8)}...</span> },
    { key: "userName", label: "User", render: (v: string) => <span className="font-medium">{v}</span> },
    { key: "nin", label: "NIN", render: (v: string) => <span className="font-mono text-xs">{v || '-'}</span> },
    { key: "phone", label: "Phone", render: (v: string) => <span className="text-xs">{v || '-'}</span> },
    { key: "status", label: "Status", render: (v: string) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        v === 'completed' ? 'bg-green-100 text-green-700' :
        v === 'rejected' ? 'bg-red-100 text-red-700' :
        'bg-yellow-100 text-yellow-700'
      }`}>{v}</span>
    )},
    { key: "createdAt", label: "Date", render: (v: string) => v ? new Date(v).toLocaleDateString() : '-' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold tracking-tight">Identity Verification</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage NIN verifications and recoveries</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin")} size="sm" className="w-fit h-8 sm:h-9 text-xs sm:text-sm">
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg">Filter & Search</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Find requests by user, NIN, or phone</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs w-fit" onClick={() => downloadCSV(filteredServices, "identity-services")}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export CSV
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Input 
                placeholder="Search by name, NIN, or phone..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-8 sm:h-9 text-sm"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32 h-8 sm:h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <ResponsiveTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">
            {tabs.find(t => t.id === activeTab)?.label} Requests
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {getCurrentData().length} requests found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <ResponsiveServiceTable
            data={getCurrentData()}
            columns={columns}
            onView={(item) => setSelectedRequest(item)}
            emptyMessage="No identity verification requests found"
          />
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-3 py-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">User:</span>
                  <p className="font-medium">{selectedRequest.userName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{selectedRequest.userEmail || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">NIN:</span>
                  <p className="font-mono">{selectedRequest.nin || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>
                  <p>{selectedRequest.phone || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="capitalize">{selectedRequest.verificationType?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="capitalize">{selectedRequest.status}</p>
                </div>
              </div>
              {selectedRequest.verificationData && (
                <div className="mt-4">
                  <span className="text-muted-foreground text-sm">Verification Data:</span>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedRequest.verificationData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedRequest(null)}>Close</Button>
            {selectedRequest?.status === 'pending' && (
              <>
                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}>
                  <XCircle className="h-4 w-4 mr-1 text-red-600" />
                  Reject
                </Button>
                <Button size="sm" onClick={() => handleUpdateStatus(selectedRequest.id, 'completed')}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Complete
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
