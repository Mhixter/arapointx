import { tokenStorage } from '@/lib/tokenStorage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IdCard, Loader2, UserPlus, Trash2, Users, FileText, RefreshCw, CheckCircle, Clock, XCircle, Baby, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const getAdminToken = () => tokenStorage.getItem('adminToken');

const SERVICE_LABELS: Record<string, string> = {
  'nin_validation': 'NIN Validation',
  'ipe_clearance': 'IPE Clearance',
  'nin_personalization': 'NIN Personalization',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  pickup: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
};

interface BirthAttestationRequest {
  id: number;
  trackingId: string;
  status: string;
  fee: string;
  isPaid: boolean;
  updateFields: Record<string, any> | null;
  customerNotes: string | null;
  agentNotes: string | null;
  createdAt: string;
  completedAt: string | null;
  userName: string;
  userEmail: string;
  userPhone: string | null;
}

export default function AdminIdentityAgents() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [birthRequests, setBirthRequests] = useState<BirthAttestationRequest[]>([]);
  const [birthLoading, setBirthLoading] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [agentForm, setAgentForm] = useState({ name: '', email: '', password: '', employeeId: '' });
  const [selectedBirthRequest, setSelectedBirthRequest] = useState<BirthAttestationRequest | null>(null);
  const [processForm, setProcessForm] = useState({ status: '', adminNotes: '' });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchAgents();
    fetchRequests();
    fetchBirthAttestations();
  }, []);

  const fetchAgents = async () => {
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/identity-agents', {
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
      const response = await fetch('/api/admin/identity-requests?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setRequests((data.data.requests || []).filter((r: any) => r.serviceType !== 'birth_attestation'));
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  };

  const fetchBirthAttestations = async () => {
    setBirthLoading(true);
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/identity-requests?limit=100&serviceType=birth_attestation', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setBirthRequests(data.data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch birth attestation requests:', error);
    } finally {
      setBirthLoading(false);
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
      const response = await fetch('/api/admin/identity-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(agentForm)
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Success", description: "Identity agent created successfully" });
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
      const response = await fetch(`/api/admin/identity-agents/${agentId}`, {
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
      const response = await fetch(`/api/admin/identity-agents/${agentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Success", description: "Agent deleted" });
        fetchAgents();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete agent", variant: "destructive" });
    }
  };

  const handleProcessBirthRequest = async () => {
    if (!selectedBirthRequest || !processForm.status) {
      toast({ title: "Error", description: "Please select a status", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/admin/identity-requests/${selectedBirthRequest.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: processForm.status, adminNotes: processForm.adminNotes })
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Success", description: "Request updated successfully" });
        setSelectedBirthRequest(null);
        setProcessForm({ status: '', adminNotes: '' });
        fetchBirthAttestations();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update request", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const info = STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return <Badge className={info.color}>{info.label}</Badge>;
  };

  const pendingBirthCount = birthRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Identity Agent Management</h2>
          <p className="text-muted-foreground">Manage agents for manual identity services and Birth Attestation requests</p>
        </div>
      </div>

      <Tabs defaultValue="birth-attestation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="birth-attestation" className="flex items-center gap-2">
            <Baby className="h-4 w-4" />
            Birth Attestation
            {pendingBirthCount > 0 && (
              <Badge className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0">{pendingBirthCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Agents ({agents.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Other Requests ({requests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="birth-attestation">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Baby className="h-5 w-5 text-rose-600" />
                    Birth Attestation Requests
                  </CardTitle>
                  <CardDescription>NPC Birth Certificate attestation requests submitted by users — admin processed only</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchBirthAttestations} disabled={birthLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${birthLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {birthLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : birthRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Baby className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No Birth Attestation requests yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking ID</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Date of Birth</TableHead>
                      <TableHead>Place of Birth</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {birthRequests.map((request) => {
                      const fields = request.updateFields || {};
                      return (
                        <TableRow key={request.id}>
                          <TableCell className="font-mono text-sm">{request.trackingId}</TableCell>
                          <TableCell className="font-medium">{fields.fullName || '—'}</TableCell>
                          <TableCell>{fields.dateOfBirth || '—'}</TableCell>
                          <TableCell>{fields.placeOfBirth || '—'}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{request.userName || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">{request.userEmail}</p>
                              {request.userPhone && <p className="text-xs text-muted-foreground">{request.userPhone}</p>}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>₦{Number(request.fee || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedBirthRequest(request);
                                setProcessForm({ status: request.status, adminNotes: request.agentNotes || '' });
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Identity Agents</CardTitle>
                  <CardDescription>Admin users authorized to process manual identity service requests</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchAgents}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button onClick={() => { setAgentForm({ name: '', email: '', password: '', employeeId: '' }); setShowAgentModal(true); }}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Agent
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <IdCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No identity agents yet</p>
                  <p className="text-sm">Create an agent to start processing manual identity requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stats</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">{agent.adminName || 'N/A'}</TableCell>
                        <TableCell>{agent.adminEmail || 'N/A'}</TableCell>
                        <TableCell>{agent.employeeId || '-'}</TableCell>
                        <TableCell>
                          <Badge className={agent.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {agent.isAvailable ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {agent.currentActiveRequests || 0} active / {agent.totalCompletedRequests || 0} completed
                          </span>
                        </TableCell>
                        <TableCell>{new Date(agent.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleToggleAgent(agent.id, agent.isAvailable)}>
                              {agent.isAvailable ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteAgent(agent.id)}>
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
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Other Identity Service Requests</CardTitle>
                  <CardDescription>NIN Validation, IPE Clearance, and Personalization requests processed by identity agents</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchRequests}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No requests yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking ID</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.trackingId}</TableCell>
                        <TableCell>{SERVICE_LABELS[request.serviceType] || request.serviceType}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.userName || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">{request.userEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{request.fee}</TableCell>
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

      {selectedBirthRequest && (
        <Dialog open={true} onOpenChange={() => { setSelectedBirthRequest(null); setProcessForm({ status: '', adminNotes: '' }); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Baby className="h-5 w-5 text-rose-600" />
                Birth Attestation Request Details
              </DialogTitle>
              <DialogDescription>Tracking ID: {selectedBirthRequest.trackingId}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Customer Name</p>
                  <p className="font-medium">{selectedBirthRequest.userName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                  <p className="font-medium">{selectedBirthRequest.userEmail || '—'}</p>
                </div>
                {selectedBirthRequest.userPhone && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Phone</p>
                    <p className="font-medium">{selectedBirthRequest.userPhone}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Fee Paid</p>
                  <p className="font-medium text-green-600">₦{Number(selectedBirthRequest.fee || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Submitted</p>
                  <p className="font-medium">{new Date(selectedBirthRequest.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Status</p>
                  {getStatusBadge(selectedBirthRequest.status)}
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Request Details</h4>
                {(() => {
                  const f = selectedBirthRequest.updateFields || {};
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Full Name</p>
                        <p className="font-medium">{f.fullName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Date of Birth</p>
                        <p className="font-medium">{f.dateOfBirth || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Place of Birth</p>
                        <p className="font-medium">{f.placeOfBirth || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Gender</p>
                        <p className="font-medium">{f.gender || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">LGA</p>
                        <p className="font-medium">{f.lga || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Parent Name</p>
                        <p className="font-medium">{f.parentName || '—'}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {selectedBirthRequest.customerNotes && (
                <div className="p-4 border rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Customer Notes</p>
                  <p className="text-sm">{selectedBirthRequest.customerNotes}</p>
                </div>
              )}

              <div className="space-y-3 p-4 border rounded-lg">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Process Request</h4>
                <div className="space-y-2">
                  <Label>Update Status</Label>
                  <Select value={processForm.status} onValueChange={(v) => setProcessForm(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="pickup">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Admin Notes</Label>
                  <Textarea
                    placeholder="Add processing notes, reference numbers, or rejection reason..."
                    value={processForm.adminNotes}
                    onChange={(e) => setProcessForm(prev => ({ ...prev, adminNotes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setSelectedBirthRequest(null); setProcessForm({ status: '', adminNotes: '' }); }}>
                Cancel
              </Button>
              <Button onClick={handleProcessBirthRequest} disabled={processing || !processForm.status}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Update Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showAgentModal} onOpenChange={setShowAgentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Identity Agent</DialogTitle>
            <DialogDescription>Create a new identity agent account with login credentials</DialogDescription>
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
              <Label>Password *</Label>
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
                value={agentForm.employeeId}
                onChange={(e) => setAgentForm(prev => ({ ...prev, employeeId: e.target.value }))}
                placeholder="e.g., EMP001"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgentModal(false)}>Cancel</Button>
            <Button onClick={handleCreateAgent} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
