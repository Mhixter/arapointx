import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Loader2, UserPlus, Edit, Trash2, Users, FileText, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const getAdminToken = () => localStorage.getItem('adminToken');

export default function AdminCACServices() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [agentForm, setAgentForm] = useState({ name: '', email: '', password: '', employeeId: '', maxActiveRequests: 10 });
  const [serviceForm, setServiceForm] = useState({ code: '', name: '', description: '', price: '', processingDays: 7, requiredDocuments: [] });

  useEffect(() => {
    fetchAgents();
    fetchServiceTypes();
    fetchRequests();
  }, []);

  const fetchAgents = async () => {
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/cac/agents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setAgents(data.data.agents || []);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const fetchServiceTypes = async () => {
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/cac/service-types', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setServiceTypes(data.data.services || []);
      }
    } catch (error) {
      console.error('Failed to fetch service types:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/cac/requests?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setRequests(data.data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  };

  const handleCreateAgent = async () => {
    if (!agentForm.name || !agentForm.email || !agentForm.password) {
      toast({ title: "Error", description: "Name, email, and password are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/cac/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(agentForm)
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Success", description: "CAC agent created successfully" });
        setShowAgentModal(false);
        setAgentForm({ name: '', email: '', password: '', employeeId: '', maxActiveRequests: 10 });
        fetchAgents();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to create agent", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAgent = async () => {
    if (!editingAgent) return;
    setLoading(true);
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/admin/cac/agents/${editingAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(agentForm)
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Success", description: "CAC agent updated successfully" });
        setShowAgentModal(false);
        setEditingAgent(null);
        setAgentForm({ name: '', email: '', password: '', employeeId: '', maxActiveRequests: 10 });
        fetchAgents();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to update agent", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/admin/cac/agents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Success", description: "CAC agent deleted" });
        fetchAgents();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to delete agent", variant: "destructive" });
    }
  };

  const handleCreateService = async () => {
    if (!serviceForm.code || !serviceForm.name || !serviceForm.price) {
      toast({ title: "Error", description: "Code, name, and price are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/cac/service-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(serviceForm)
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Success", description: "Service type created" });
        setShowServiceModal(false);
        setServiceForm({ code: '', name: '', description: '', price: '', processingDays: 7, requiredDocuments: [] });
        fetchServiceTypes();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to create service type", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEditAgent = (agent: any) => {
    setEditingAgent(agent);
    setAgentForm({
      name: agent.name || '',
      email: agent.email || '',
      password: '',
      employeeId: agent.employeeId || '',
      maxActiveRequests: agent.maxActiveRequests || 10
    });
    setShowAgentModal(true);
  };

  const handleNewAgent = () => {
    setEditingAgent(null);
    setAgentForm({ name: '', email: '', password: '', employeeId: '', maxActiveRequests: 10 });
    setShowAgentModal(true);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      submitted: 'bg-blue-100 text-blue-700',
      in_review: 'bg-yellow-100 text-yellow-700',
      awaiting_customer: 'bg-orange-100 text-orange-700',
      submitted_to_cac: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };
    return <Badge className={colors[status] || 'bg-gray-100 text-gray-700'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-green-600" />
            CAC Services Management
          </h2>
          <p className="text-muted-foreground">Manage CAC agents, service types, and registration requests</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{agents.length}</p>
            <p className="text-sm text-muted-foreground">Total Agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{serviceTypes.length}</p>
            <p className="text-sm text-muted-foreground">Service Types</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{requests.length}</p>
            <p className="text-sm text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents"><Users className="h-4 w-4 mr-2" />Agents</TabsTrigger>
          <TabsTrigger value="services"><Settings className="h-4 w-4 mr-2" />Service Types</TabsTrigger>
          <TabsTrigger value="requests"><FileText className="h-4 w-4 mr-2" />Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>CAC Agents</CardTitle>
                <CardDescription>Manage agent accounts for processing CAC registrations</CardDescription>
              </div>
              <Button onClick={handleNewAgent}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Agent
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Active/Max</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell>{agent.email}</TableCell>
                      <TableCell>{agent.employeeId}</TableCell>
                      <TableCell>{agent.currentActiveRequests || 0}/{agent.maxActiveRequests}</TableCell>
                      <TableCell>{agent.totalCompletedRequests || 0}</TableCell>
                      <TableCell>
                        <Badge className={agent.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                          {agent.isAvailable ? 'Available' : 'Unavailable'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditAgent(agent)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteAgent(agent.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {agents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No CAC agents found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Service Types</CardTitle>
                <CardDescription>Configure available CAC registration services</CardDescription>
              </div>
              <Button onClick={() => setShowServiceModal(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Add Service Type
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Processing Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceTypes.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-mono">{service.code}</TableCell>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>₦{parseInt(service.price).toLocaleString()}</TableCell>
                      <TableCell>{service.processingDays} days</TableCell>
                      <TableCell>
                        <Badge className={service.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {serviceTypes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No service types configured. Add one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Registration Requests</CardTitle>
              <CardDescription>View all CAC registration requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business Name</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.businessName}</TableCell>
                      <TableCell>{req.userName || req.userEmail}</TableCell>
                      <TableCell className="capitalize">{req.serviceType?.replace(/_/g, ' ')}</TableCell>
                      <TableCell>₦{parseFloat(req.fee).toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {requests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No CAC registration requests yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAgentModal} onOpenChange={setShowAgentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAgent ? 'Edit CAC Agent' : 'Create CAC Agent'}</DialogTitle>
            <DialogDescription>
              {editingAgent ? 'Update agent details' : 'Create a new CAC agent account'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input 
                placeholder="Agent name" 
                value={agentForm.name}
                onChange={(e) => setAgentForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input 
                type="email"
                placeholder="agent@example.com" 
                value={agentForm.email}
                onChange={(e) => setAgentForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{editingAgent ? 'New Password (leave blank to keep current)' : 'Password *'}</Label>
              <Input 
                type="password"
                placeholder="Enter password" 
                value={agentForm.password}
                onChange={(e) => setAgentForm(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Employee ID (Optional)</Label>
              <Input 
                placeholder="CAC001" 
                value={agentForm.employeeId}
                onChange={(e) => setAgentForm(prev => ({ ...prev, employeeId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Active Requests</Label>
              <Input 
                type="number"
                placeholder="10" 
                value={agentForm.maxActiveRequests}
                onChange={(e) => setAgentForm(prev => ({ ...prev, maxActiveRequests: parseInt(e.target.value) || 10 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgentModal(false)}>Cancel</Button>
            <Button onClick={editingAgent ? handleUpdateAgent : handleCreateAgent} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingAgent ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Service Type</DialogTitle>
            <DialogDescription>Create a new CAC service type</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Service Code *</Label>
              <Input 
                placeholder="e.g., business_name" 
                value={serviceForm.code}
                onChange={(e) => setServiceForm(prev => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input 
                placeholder="e.g., Business Name Registration" 
                value={serviceForm.name}
                onChange={(e) => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="Brief description" 
                value={serviceForm.description}
                onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (₦) *</Label>
                <Input 
                  type="number"
                  placeholder="15000" 
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Processing Days</Label>
                <Input 
                  type="number"
                  placeholder="7" 
                  value={serviceForm.processingDays}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, processingDays: parseInt(e.target.value) || 7 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServiceModal(false)}>Cancel</Button>
            <Button onClick={handleCreateService} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
