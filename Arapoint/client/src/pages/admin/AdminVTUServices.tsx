import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, Plus, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { downloadCSV } from "@/lib/downloadUtils";
import { ResponsiveServiceTable, ResponsiveTabs } from "@/components/admin/ResponsiveServiceTable";

interface VTUService {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  serviceType: "airtime" | "data" | "electricity" | "cable";
  provider: string;
  amount: number | string;
  phone?: string;
  meterNumber?: string;
  smartcard?: string;
  status: "pending" | "completed" | "failed";
  reference?: string;
  createdAt: string;
}

const getAuthToken = () => localStorage.getItem('adminToken');

export default function AdminVTUServices() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [services, setServices] = useState<VTUService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<VTUService | null>(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<VTUService>>({});
  const [activeTab, setActiveTab] = useState("airtime");

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch('/api/admin/vtu-services', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch VTU services');
      }
      
      const result = await response.json();
      if (result.status === 'success' && result.data?.services) {
        const mappedServices = result.data.services.map((s: any) => ({
          id: s.id,
          userId: s.userId,
          userName: s.userName || 'Unknown',
          userEmail: s.userEmail,
          serviceType: s.serviceType,
          provider: s.provider,
          amount: parseFloat(s.amount) || 0,
          phone: s.phone,
          meterNumber: s.meterNumber,
          smartcard: s.smartcard,
          status: s.status === 'completed' ? 'completed' : s.status === 'failed' ? 'failed' : 'pending',
          reference: s.reference,
          createdAt: s.createdAt,
        }));
        setServices(mappedServices);
      }
    } catch (error: any) {
      console.error('Error fetching VTU services:', error);
      toast({ title: "Error", description: "Failed to load VTU services", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: "completed" | "failed") => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/vtu-services/${id}/status`, {
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

  const handleDelete = async (item: any) => {
    if (window.confirm("Delete this record?")) {
      try {
        const token = getAuthToken();
        const response = await fetch(`/api/admin/vtu-services/${item.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          setServices(services.filter(s => s.id !== item.id));
          toast({ title: "Deleted", description: "VTU service record deleted." });
        } else {
          toast({ title: "Error", description: "Failed to delete record", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to delete record", variant: "destructive" });
      }
    }
  };

  const handleCreateService = () => {
    toast({ title: "Info", description: "VTU services are created automatically when users make purchases.", variant: "default" });
    setOpenCreateDialog(false);
    setFormData({});
  };

  const handleEditService = () => {
    setServices(services.map(s => s.id === selectedRequest?.id ? { ...s, ...formData } : s));
    setOpenEditDialog(false);
    setSelectedRequest(null);
    setFormData({});
    toast({ title: "Updated", description: "VTU service record updated." });
  };

  const filteredServices = services.filter(s => 
    (statusFilter === "all" || s.status === statusFilter) &&
    (searchTerm === "" || 
      (s.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (s.provider?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (s.reference?.toLowerCase() || '').includes(searchTerm.toLowerCase()))
  );

  const airtimeRequests = filteredServices.filter(s => s.serviceType === "airtime");
  const dataRequests = filteredServices.filter(s => s.serviceType === "data");
  const electricityRequests = filteredServices.filter(s => s.serviceType === "electricity");
  const cableRequests = filteredServices.filter(s => s.serviceType === "cable");

  const tabs = [
    { id: "airtime", label: "Airtime", count: airtimeRequests.length },
    { id: "data", label: "Data", count: dataRequests.length },
    { id: "electricity", label: "Electricity", count: electricityRequests.length },
    { id: "cable", label: "Cable TV", count: cableRequests.length },
  ];

  const getCurrentData = () => {
    switch(activeTab) {
      case "airtime": return airtimeRequests;
      case "data": return dataRequests;
      case "electricity": return electricityRequests;
      case "cable": return cableRequests;
      default: return airtimeRequests;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const columns = [
    { key: "id", label: "Request ID", render: (v: string) => <span className="font-mono text-xs">{v?.slice(0, 8)}...</span> },
    { key: "userName", label: "User", render: (v: string) => <span className="font-medium">{v || 'Unknown'}</span> },
    { key: "provider", label: "Provider", render: (v: string) => <span className="uppercase">{v}</span> },
    { key: "amount", label: "Amount", render: (v: number | string) => `₦${parseFloat(String(v)).toLocaleString()}` },
    { key: "status", label: "Status", render: (v: string) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        v === 'completed' ? 'bg-green-100 text-green-700' : 
        v === 'failed' ? 'bg-red-100 text-red-700' : 
        'bg-yellow-100 text-yellow-700'
      }`}>
        {v}
      </span>
    )},
    { key: "createdAt", label: "Date", render: (v: string) => formatDate(v) },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading VTU services...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold tracking-tight">VTU Services</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage Airtime, Data, Electricity, Cable TV</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchServices} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
            Refresh
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin")} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            Back
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg">Filter & Search</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Find requests by user, provider, or status</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => downloadCSV(filteredServices, "vtu-services")}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  CSV
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Input 
                placeholder="Search by name, provider, or reference..." 
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
                  <SelectItem value="failed">Failed</SelectItem>
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
            onEdit={(item) => { setSelectedRequest(item); setFormData(item); setOpenEditDialog(true); }}
            onDelete={handleDelete}
            emptyMessage="No requests found"
          />
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest && !openEditDialog} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">VTU Service Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-3 py-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">User:</span>
                <span className="font-medium">{selectedRequest.userName}</span>
                <span className="text-muted-foreground">Service:</span>
                <span className="capitalize">{selectedRequest.serviceType}</span>
                <span className="text-muted-foreground">Provider:</span>
                <span className="uppercase">{selectedRequest.provider}</span>
                <span className="text-muted-foreground">Amount:</span>
                <span>₦{parseFloat(String(selectedRequest.amount)).toLocaleString()}</span>
                <span className="text-muted-foreground">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                  selectedRequest.status === 'completed' ? 'bg-green-100 text-green-700' : 
                  selectedRequest.status === 'failed' ? 'bg-red-100 text-red-700' : 
                  'bg-yellow-100 text-yellow-700'
                }`}>{selectedRequest.status}</span>
                {selectedRequest.phone && (
                  <>
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{selectedRequest.phone}</span>
                  </>
                )}
                {selectedRequest.reference && (
                  <>
                    <span className="text-muted-foreground">Reference:</span>
                    <span className="font-mono text-xs">{selectedRequest.reference}</span>
                  </>
                )}
                <span className="text-muted-foreground">Date:</span>
                <span>{formatDate(selectedRequest.createdAt)}</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedRequest(null)}>Close</Button>
            {selectedRequest?.status === 'pending' && (
              <>
                <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(selectedRequest.id, "failed")}>
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Mark Failed
                </Button>
                <Button size="sm" onClick={() => handleUpdateStatus(selectedRequest.id, "completed")}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Mark Complete
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Edit VTU Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label className="text-xs sm:text-sm">Status</Label>
              <Select value={formData.status || ""} onValueChange={(val) => setFormData({...formData, status: val as any})}>
                <SelectTrigger className="h-8 sm:h-9 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenEditDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleEditService}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
