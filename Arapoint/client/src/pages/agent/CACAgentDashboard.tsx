import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Building2, Loader2, Clock, CheckCircle2, XCircle, User, LogOut, FileText, RefreshCw, Eye, MessageCircle, Send, Upload, DollarSign, Settings, Save, Plus, Trash2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileUploader } from "@/components/FileUploader";

const STATUS_OPTIONS = [
  { value: 'in_review', label: 'In Review', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'awaiting_customer', label: 'Awaiting Customer', color: 'bg-orange-100 text-orange-700' },
  { value: 'submitted_to_cac', label: 'Submitted to CAC', color: 'bg-purple-100 text-purple-700' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
];

const getAgentToken = () => localStorage.getItem('cacAgentToken');

export default function CACAgentDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [agent, setAgent] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [updateData, setUpdateData] = useState({ status: '', comment: '', cacRegistrationNumber: '', rejectionReason: '', certificateUrl: '', statusReportUrl: '', certificateFileName: '', statusReportFileName: '' });
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [loadingServiceTypes, setLoadingServiceTypes] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [savingService, setSavingService] = useState(false);
  const [showCreateService, setShowCreateService] = useState(false);
  const [newService, setNewService] = useState({ code: '', name: '', description: '', price: '', processingDays: 7 });
  const [creatingService, setCreatingService] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);

  useEffect(() => {
    const token = getAgentToken();
    if (!token) {
      setLocation('/agent/login');
      return;
    }
    fetchProfile();
    fetchStats();
    fetchRequests();
    fetchServiceTypes();
  }, []);

  const fetchServiceTypes = async () => {
    setLoadingServiceTypes(true);
    try {
      const token = getAgentToken();
      const response = await fetch('/api/cac-agent/service-types', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setServiceTypes(data.data.services || []);
      }
    } catch (error) {
      console.error('Failed to fetch service types:', error);
    } finally {
      setLoadingServiceTypes(false);
    }
  };

  const handleUpdateService = async (service: any) => {
    setSavingService(true);
    try {
      const token = getAgentToken();
      const response = await fetch(`/api/cac-agent/service-types/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          price: service.price,
          processingDays: service.processingDays,
          isActive: service.isActive,
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Updated!", description: "Service pricing updated successfully." });
        fetchServiceTypes();
        setEditingService(null);
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update service", variant: "destructive" });
    } finally {
      setSavingService(false);
    }
  };

  const handleCreateService = async () => {
    if (!newService.code || !newService.name || !newService.price) {
      toast({ title: "Missing fields", description: "Code, name, and price are required", variant: "destructive" });
      return;
    }
    setCreatingService(true);
    try {
      const token = getAgentToken();
      const response = await fetch('/api/cac-agent/service-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newService)
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Created!", description: "New service type created successfully." });
        fetchServiceTypes();
        setShowCreateService(false);
        setNewService({ code: '', name: '', description: '', price: '', processingDays: 7 });
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create service", variant: "destructive" });
    } finally {
      setCreatingService(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) return;
    setDeletingServiceId(serviceId);
    try {
      const token = getAgentToken();
      const response = await fetch(`/api/cac-agent/service-types/${serviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Deleted!", description: "Service type deleted successfully." });
        fetchServiceTypes();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete service", variant: "destructive" });
    } finally {
      setDeletingServiceId(null);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = getAgentToken();
      const response = await fetch('/api/cac-agent/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setAgent(data.data.agent);
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getAgentToken();
      const response = await fetch('/api/cac-agent/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = getAgentToken();
      let url = '/api/cac-agent/requests?limit=50';
      if (filter === 'mine') url += '&assigned=me';
      else if (filter === 'unassigned') url += '&assigned=unassigned';
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setRequests(data.data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (requestId: string) => {
    try {
      const token = getAgentToken();
      const response = await fetch(`/api/cac-agent/requests/${requestId}/assign`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Assigned!", description: "Request has been assigned to you." });
        fetchRequests();
        fetchStats();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to assign request", variant: "destructive" });
    }
  };

  const handleViewDetails = async (requestId: string) => {
    try {
      const token = getAgentToken();
      const response = await fetch(`/api/cac-agent/requests/${requestId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setSelectedRequest(data.data);
        setShowDetails(true);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load request details", variant: "destructive" });
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedRequest || !updateData.status) return;

    try {
      const token = getAgentToken();
      
      const response = await fetch(`/api/cac-agent/requests/${selectedRequest.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          status: updateData.status,
          comment: updateData.comment,
          cacRegistrationNumber: updateData.cacRegistrationNumber,
          rejectionReason: updateData.rejectionReason,
          certificateUrl: updateData.certificateUrl,
        })
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        if (updateData.status === 'completed' && updateData.certificateUrl) {
          await fetch(`/api/cac-agent/requests/${selectedRequest.id}/upload-document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              documentType: 'cac_certificate',
              fileName: 'CAC Certificate',
              fileUrl: updateData.certificateUrl,
            })
          });
        }
        if (updateData.status === 'completed' && updateData.statusReportUrl) {
          await fetch(`/api/cac-agent/requests/${selectedRequest.id}/upload-document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              documentType: 'status_report',
              fileName: 'Status Report',
              fileUrl: updateData.statusReportUrl,
            })
          });
        }
        
        toast({ title: "Updated!", description: "Request status has been updated." });
        setShowStatusUpdate(false);
        setShowDetails(false);
        setUpdateData({ status: '', comment: '', cacRegistrationNumber: '', rejectionReason: '', certificateUrl: '', statusReportUrl: '', certificateFileName: '', statusReportFileName: '' });
        fetchRequests();
        fetchStats();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cacAgentToken');
    localStorage.removeItem('cacAgentInfo');
    setLocation('/agent/login');
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_OPTIONS.find(s => s.value === status) || { label: status, color: 'bg-gray-100 text-gray-700' };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const openChat = async (request: any) => {
    setSelectedRequest(request);
    setShowChat(true);
    setLoadingMessages(true);
    try {
      const token = getAgentToken();
      const response = await fetch(`/api/cac-agent/requests/${request.id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setMessages(data.data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRequest) return;
    setSendingMessage(true);
    try {
      const token = getAgentToken();
      const response = await fetch(`/api/cac-agent/requests/${selectedRequest.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: newMessage.trim() })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setMessages([...messages, data.data.message]);
        setNewMessage('');
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    if (!showChat || !selectedRequest) return;
    const interval = setInterval(async () => {
      try {
        const token = getAgentToken();
        const response = await fetch(`/api/cac-agent/requests/${selectedRequest.id}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.status === 'success') {
          setMessages(data.data.messages || []);
        }
      } catch (error) {}
    }, 5000);
    return () => clearInterval(interval);
  }, [showChat, selectedRequest]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-green-600" />
            <div>
              <h1 className="font-bold text-lg">CAC Agent Portal</h1>
              {agent && <p className="text-xs text-muted-foreground">{agent.name} ({agent.employeeId})</p>}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.unassigned || 0}</p>
              <p className="text-xs text-muted-foreground">Unassigned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.myAssigned || 0}</p>
              <p className="text-xs text-muted-foreground">My Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.inReview || 0}</p>
              <p className="text-xs text-muted-foreground">In Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.totalCompleted || 0}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="requests">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Requests
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Price Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Registration Requests</CardTitle>
                    <CardDescription>Manage CAC registration requests</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={filter} onValueChange={(val) => { setFilter(val); setTimeout(fetchRequests, 100); }}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Requests</SelectItem>
                        <SelectItem value="mine">My Requests</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={fetchRequests}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No requests found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{req.businessName}</p>
                            <p className="text-sm text-muted-foreground">{req.proprietorName} - {req.proprietorPhone}</p>
                            <p className="text-xs text-muted-foreground capitalize">{req.serviceType?.replace(/_/g, ' ')} | {new Date(req.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(req.status)}
                          <Button variant="outline" size="sm" onClick={() => openChat(req)} title="Chat with customer">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleViewDetails(req.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!req.assignedAgentId && (
                            <Button size="sm" onClick={() => handleAssign(req.id)}>
                              Assign to Me
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Service Pricing
                    </CardTitle>
                    <CardDescription>Create, edit, and delete CAC services</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setShowCreateService(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Service
                    </Button>
                    <Button variant="outline" size="icon" onClick={fetchServiceTypes}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showCreateService && (
                  <div className="mb-6 p-4 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create New Service
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label>Service Code *</Label>
                        <Input
                          placeholder="e.g., business_name"
                          value={newService.code}
                          onChange={(e) => setNewService({ ...newService, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Service Name *</Label>
                        <Input
                          placeholder="e.g., Business Name Registration"
                          value={newService.name}
                          onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Price (₦) *</Label>
                        <Input
                          type="number"
                          placeholder="e.g., 15000"
                          value={newService.price}
                          onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Processing Days</Label>
                        <Input
                          type="number"
                          placeholder="e.g., 7"
                          value={newService.processingDays}
                          onChange={(e) => setNewService({ ...newService, processingDays: parseInt(e.target.value) || 7 })}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Description</Label>
                        <Input
                          placeholder="Brief description of the service"
                          value={newService.description}
                          onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateService} disabled={creatingService}>
                        {creatingService ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                        Create Service
                      </Button>
                      <Button variant="outline" onClick={() => { setShowCreateService(false); setNewService({ code: '', name: '', description: '', price: '', processingDays: 7 }); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {loadingServiceTypes ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : serviceTypes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No service types configured</p>
                    <p className="text-sm">Click "New Service" to create your first service</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {serviceTypes.map((service) => (
                      <div key={service.id} className="p-4 rounded-lg border">
                        {editingService?.id === service.id ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold">{service.name}</p>
                                <p className="text-xs text-muted-foreground">{service.code}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Label className="text-sm">Active</Label>
                                <Switch
                                  checked={editingService.isActive}
                                  onCheckedChange={(checked) => setEditingService({ ...editingService, isActive: checked })}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Price (₦)</Label>
                                <Input
                                  type="number"
                                  value={editingService.price}
                                  onChange={(e) => setEditingService({ ...editingService, price: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Processing Days</Label>
                                <Input
                                  type="number"
                                  value={editingService.processingDays}
                                  onChange={(e) => setEditingService({ ...editingService, processingDays: parseInt(e.target.value) })}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={() => handleUpdateService(editingService)} disabled={savingService}>
                                {savingService ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Save Changes
                              </Button>
                              <Button variant="outline" onClick={() => setEditingService(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{service.name}</p>
                                {!service.isActive && <Badge variant="secondary">Inactive</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">{service.description || service.code}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xl font-bold text-primary">₦{parseInt(service.price).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">{service.processingDays} days processing</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditingService({ ...service })}>
                                  Edit
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteService(service.id)}
                                  disabled={deletingServiceId === service.id}
                                >
                                  {deletingServiceId === service.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Business Name</p>
                  <p className="font-semibold">{selectedRequest.businessName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Service Type</p>
                  <p className="font-semibold capitalize">{selectedRequest.serviceType?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div>
                  <p className="text-muted-foreground">Fee</p>
                  <p className="font-semibold">₦{parseFloat(selectedRequest.fee).toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Customer Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p>{selectedRequest.customer?.name || selectedRequest.proprietorName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p>{selectedRequest.customer?.email || selectedRequest.proprietorEmail}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p>{selectedRequest.customer?.phone || selectedRequest.proprietorPhone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">NIN</p>
                    <p>{selectedRequest.proprietorNin || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Business Details</h4>
                <div className="text-sm space-y-2">
                  <p><span className="text-muted-foreground">Nature:</span> {selectedRequest.businessNature || 'Not specified'}</p>
                  <p><span className="text-muted-foreground">Address:</span> {selectedRequest.businessAddress || 'Not specified'}</p>
                  <p><span className="text-muted-foreground">State/LGA:</span> {selectedRequest.businessState}, {selectedRequest.businessLga}</p>
                  {selectedRequest.objectives && <p><span className="text-muted-foreground">Objectives:</span> {selectedRequest.objectives}</p>}
                  {selectedRequest.customerNotes && <p><span className="text-muted-foreground">Customer Notes:</span> {selectedRequest.customerNotes}</p>}
                </div>
              </div>

              {selectedRequest.documents?.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Documents</h4>
                  <div className="space-y-2">
                    {selectedRequest.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{doc.documentType}: {doc.fileName}</span>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm">View</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>Close</Button>
            {selectedRequest?.assignedAgentId && (
              <Button onClick={() => { setShowDetails(false); setShowStatusUpdate(true); }}>
                Update Status
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showStatusUpdate} onOpenChange={setShowStatusUpdate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Request Status</DialogTitle>
            <DialogDescription>Update the status for: {selectedRequest?.businessName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={updateData.status} onValueChange={(val) => setUpdateData(prev => ({ ...prev, status: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {updateData.status === 'completed' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>CAC Registration Number *</Label>
                  <Input 
                    placeholder="e.g., RC123456" 
                    value={updateData.cacRegistrationNumber}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, cacRegistrationNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CAC Certificate (PDF) *</Label>
                  <FileUploader
                    accept=".pdf"
                    label="Upload CAC Certificate"
                    getUploadUrl={async () => {
                      const token = getAgentToken();
                      const res = await fetch('/api/upload/get-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ prefix: 'cac-certificates' })
                      });
                      return res.json();
                    }}
                    onFileUploaded={(path, name) => setUpdateData(prev => ({ ...prev, certificateUrl: path, certificateFileName: name }))}
                    currentFile={updateData.certificateUrl ? { name: updateData.certificateFileName || 'certificate.pdf', path: updateData.certificateUrl } : null}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status Report (PDF)</Label>
                  <FileUploader
                    accept=".pdf"
                    label="Upload Status Report"
                    getUploadUrl={async () => {
                      const token = getAgentToken();
                      const res = await fetch('/api/upload/get-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ prefix: 'cac-status-reports' })
                      });
                      return res.json();
                    }}
                    onFileUploaded={(path, name) => setUpdateData(prev => ({ ...prev, statusReportUrl: path, statusReportFileName: name }))}
                    currentFile={updateData.statusReportUrl ? { name: updateData.statusReportFileName || 'status-report.pdf', path: updateData.statusReportUrl } : null}
                  />
                </div>
              </div>
            )}

            {updateData.status === 'rejected' && (
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Textarea 
                  placeholder="Explain why the request was rejected..." 
                  value={updateData.rejectionReason}
                  onChange={(e) => setUpdateData(prev => ({ ...prev, rejectionReason: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Comment (Optional)</Label>
              <Textarea 
                placeholder="Add a note about this update..." 
                value={updateData.comment}
                onChange={(e) => setUpdateData(prev => ({ ...prev, comment: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusUpdate(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={!updateData.status}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Chat with Customer
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.businessName} - {selectedRequest?.proprietorName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-[300px] max-h-[400px] border rounded-lg p-3">
            {loadingMessages ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Start a conversation with the customer</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.senderType === 'agent' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 ${msg.senderType === 'agent' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.senderType === 'agent' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          <div className="flex gap-2 pt-2">
            <Input 
              placeholder="Type your message..." 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={sendingMessage}
            />
            <Button onClick={sendMessage} disabled={sendingMessage || !newMessage.trim()}>
              {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
