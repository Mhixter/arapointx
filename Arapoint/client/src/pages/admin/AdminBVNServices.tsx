import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { downloadCSV } from "@/lib/downloadUtils";
import { ResponsiveServiceTable, ResponsiveTabs } from "@/components/admin/ResponsiveServiceTable";

interface BVNService {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  serviceType: "retrieval" | "card" | "modification" | "verification";
  bvn: string;
  phone?: string;
  status: "pending" | "completed" | "rejected";
  responseData?: any;
  createdAt: string;
}

const getAuthToken = () => localStorage.getItem('accessToken');

export default function AdminBVNServices() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [services, setServices] = useState<BVNService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<BVNService | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<BVNService>>({});
  const [activeTab, setActiveTab] = useState("verification");

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch('/api/admin/bvn-services', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch BVN services');
      }
      
      const result = await response.json();
      if (result.status === 'success' && result.data?.services) {
        const mappedServices = result.data.services.map((s: any) => ({
          id: s.id,
          userId: s.userId,
          userName: s.userName || 'Unknown',
          userEmail: s.userEmail,
          serviceType: s.serviceType || 'verification',
          bvn: s.bvn || '',
          phone: s.phone,
          status: s.status === 'completed' ? 'completed' : s.status === 'rejected' ? 'rejected' : 'pending',
          responseData: s.responseData,
          createdAt: s.createdAt,
        }));
        setServices(mappedServices);
      }
    } catch (error: any) {
      console.error('Error fetching BVN services:', error);
      toast({ title: "Error", description: "Failed to load BVN services", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: "completed" | "rejected") => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/bvn-services/${id}/status`, {
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
        const response = await fetch(`/api/admin/bvn-services/${item.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          setServices(services.filter(s => s.id !== item.id));
          toast({ title: "Deleted", description: "BVN service record deleted." });
        } else {
          toast({ title: "Error", description: "Failed to delete record", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to delete record", variant: "destructive" });
      }
    }
  };

  const handleEditService = () => {
    setServices(services.map(s => s.id === selectedRequest?.id ? { ...s, ...formData } : s));
    setOpenEditDialog(false);
    setSelectedRequest(null);
    setFormData({});
    toast({ title: "Updated", description: "BVN service record updated." });
  };

  const filteredServices = services.filter(s => 
    (statusFilter === "all" || s.status === statusFilter) &&
    (searchTerm === "" || 
      (s.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (s.bvn || '').includes(searchTerm))
  );

  const verificationRequests = filteredServices.filter(s => s.serviceType === "verification");
  const retrievalRequests = filteredServices.filter(s => s.serviceType === "retrieval");
  const cardRequests = filteredServices.filter(s => s.serviceType === "card");
  const modificationRequests = filteredServices.filter(s => s.serviceType === "modification");

  const tabs = [
    { id: "verification", label: "BVN Verification", count: verificationRequests.length },
    { id: "retrieval", label: "BVN Retrieval", count: retrievalRequests.length },
    { id: "card", label: "BVN Card", count: cardRequests.length },
    { id: "modification", label: "BVN Modification", count: modificationRequests.length },
  ];

  const getCurrentData = () => {
    switch(activeTab) {
      case "verification": return verificationRequests;
      case "retrieval": return retrievalRequests;
      case "card": return cardRequests;
      case "modification": return modificationRequests;
      default: return verificationRequests;
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
    { key: "bvn", label: "BVN", render: (v: string) => <span className="font-mono text-xs">{v ? `${v.slice(0, 4)}****${v.slice(-3)}` : '-'}</span> },
    { key: "status", label: "Status", render: (v: string) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        v === 'completed' ? 'bg-green-100 text-green-700' : 
        v === 'rejected' ? 'bg-red-100 text-red-700' : 
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
        <span className="ml-2">Loading BVN services...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold tracking-tight">BVN Services</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage BVN Verification, Retrieval, Card, and Modification</p>
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
                <CardDescription className="text-xs sm:text-sm">Find requests by user, BVN, or status</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => downloadCSV(filteredServices, "bvn-services")}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  CSV
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Input 
                placeholder="Search by name or BVN..." 
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
            onEdit={(item) => { setSelectedRequest(item); setFormData(item); setOpenEditDialog(true); }}
            onDelete={handleDelete}
            emptyMessage="No requests found"
          />
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest && !openEditDialog} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">BVN Service Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-3 py-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">User:</span>
                <span className="font-medium">{selectedRequest.userName}</span>
                <span className="text-muted-foreground">Service:</span>
                <span className="capitalize">{selectedRequest.serviceType}</span>
                <span className="text-muted-foreground">BVN:</span>
                <span className="font-mono text-xs">{selectedRequest.bvn ? `${selectedRequest.bvn.slice(0, 4)}****${selectedRequest.bvn.slice(-3)}` : '-'}</span>
                {selectedRequest.phone && (
                  <>
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{selectedRequest.phone}</span>
                  </>
                )}
                <span className="text-muted-foreground">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                  selectedRequest.status === 'completed' ? 'bg-green-100 text-green-700' : 
                  selectedRequest.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                  'bg-yellow-100 text-yellow-700'
                }`}>{selectedRequest.status}</span>
                <span className="text-muted-foreground">Date:</span>
                <span>{formatDate(selectedRequest.createdAt)}</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedRequest(null)}>Close</Button>
            {selectedRequest?.status === 'pending' && (
              <>
                <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(selectedRequest.id, "rejected")}>
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Reject
                </Button>
                <Button size="sm" onClick={() => handleUpdateStatus(selectedRequest.id, "completed")}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Complete
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Edit BVN Service</DialogTitle>
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
                  <SelectItem value="rejected">Rejected</SelectItem>
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
