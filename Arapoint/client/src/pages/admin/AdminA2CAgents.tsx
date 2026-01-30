import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, Loader2, UserPlus, Trash2, Users, FileText, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const getAdminToken = () => localStorage.getItem('adminToken');

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  awaiting_transfer: { label: 'Awaiting Transfer', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
};

export default function AdminA2CAgents() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [agentForm, setAgentForm] = useState({ name: '', email: '', password: '', employeeId: '' });

  useEffect(() => {
    fetchAgents();
    fetchRequests();
  }, []);

  const fetchAgents = async () => {
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/a2c-agents', {
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

  const fetchRequests = async () => {
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/a2c-requests?limit=50', {
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
      const response = await fetch('/api/admin/a2c-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(agentForm)
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Success", description: "A2C agent created successfully" });
        setShowAgentModal(false);
        setAgentForm({ name: '', email: '', password: '', employeeId: '' });
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

  const handleToggleAgent = async (agentId: string, isAvailable: boolean) => {
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/admin/a2c-agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isAvailable: !isAvailable })
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Success", description: `Agent ${!isAvailable ? 'activated' : 'deactivated'}` });
        fetchAgents();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update agent", variant: "destructive" });
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/admin/a2c-agents/${agentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Success", description: "Agent deleted successfully" });
        fetchAgents();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete agent", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="h-6 w-6" />
            Airtime to Cash Agents
          </h1>
          <p className="text-muted-foreground">Manage agents who process airtime to cash conversions</p>
        </div>
        <Button onClick={() => setShowAgentModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Agents ({agents.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Requests ({requests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>A2C Agents</CardTitle>
                <CardDescription>Agents who convert airtime to cash for customers</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAgents}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No agents found. Create one to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">{agent.adminName}</TableCell>
                        <TableCell>{agent.adminEmail}</TableCell>
                        <TableCell>{agent.employeeId || '-'}</TableCell>
                        <TableCell>{agent.currentActiveRequests || 0}</TableCell>
                        <TableCell>{agent.totalCompletedRequests || 0}</TableCell>
                        <TableCell>₦{parseFloat(agent.totalProcessedAmount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={agent.isAvailable ? "default" : "secondary"}>
                            {agent.isAvailable ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleAgent(agent.id, agent.isAvailable)}
                            >
                              {agent.isAvailable ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteAgent(agent.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>A2C Requests</CardTitle>
                <CardDescription>All airtime to cash conversion requests</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchRequests}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No requests found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>Airtime</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Cash</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono text-sm">{request.trackingId}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.userName || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{request.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.network?.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>₦{parseFloat(request.airtimeAmount || 0).toLocaleString()}</TableCell>
                        <TableCell>{(parseFloat(request.conversionRate || 0) * 100).toFixed(0)}%</TableCell>
                        <TableCell>₦{parseFloat(request.cashAmount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_LABELS[request.status]?.color || ''}>
                            {STATUS_LABELS[request.status]?.label || request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAgentModal} onOpenChange={setShowAgentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create A2C Agent</DialogTitle>
            <DialogDescription>Add a new airtime to cash conversion agent</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={agentForm.name}
                onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                placeholder="Enter agent name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={agentForm.email}
                onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={agentForm.password}
                onChange={(e) => setAgentForm({ ...agentForm, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID (Optional)</Label>
              <Input
                id="employeeId"
                value={agentForm.employeeId}
                onChange={(e) => setAgentForm({ ...agentForm, employeeId: e.target.value })}
                placeholder="Enter employee ID"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgentModal(false)}>Cancel</Button>
            <Button onClick={handleCreateAgent} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
