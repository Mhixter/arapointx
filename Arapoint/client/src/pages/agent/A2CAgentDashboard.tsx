import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Banknote, Loader2, RefreshCw, LogOut, Clock, Plus, Trash2, Phone,
  CheckCircle, ArrowDownCircle, Wallet, AlertCircle, Package, Edit, XCircle
} from 'lucide-react';

const getToken = () => localStorage.getItem('a2cAgentToken');

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700', icon: Clock },
  airtime_sent: { label: 'Airtime Sent', color: 'bg-yellow-100 text-yellow-700', icon: ArrowDownCircle },
  airtime_received: { label: 'Received', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-700', icon: Loader2 },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: Wallet },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

const NETWORKS = ['mtn', 'airtel', 'glo', '9mobile'];

interface InventoryItem {
  id: string;
  phoneNumber: string;
  network: string;
  dailyLimit: string;
  usedToday: string;
  isActive: boolean;
  label: string | null;
  priority: number;
  createdAt: string;
}

export default function A2CAgentDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: '', agentNotes: '', rejectionReason: '' });
  const [inventoryForm, setInventoryForm] = useState({ phoneNumber: '', network: 'mtn', dailyLimit: '500000', label: '' });
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLocation('/agent/a2c/login');
      return;
    }
    fetchProfile();
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchMyRequests();
    } else if (activeTab === 'inventory') {
      fetchInventory();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchMyRequests();
    }
  }, [statusFilter]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/a2c-agent/profile', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setProfile(data.data.agent);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/a2c-agent/stats', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/a2c-agent/requests?${params}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setMyRequests(data.data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/a2c-agent/inventory', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setInventory(data.data.inventory || []);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInventory = async () => {
    if (!inventoryForm.phoneNumber || !inventoryForm.network) {
      toast({ title: 'Error', description: 'Phone number and network are required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/a2c-agent/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(inventoryForm)
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: 'Success', description: 'Phone number added to inventory' });
        setShowAddInventoryModal(false);
        setInventoryForm({ phoneNumber: '', network: 'mtn', dailyLimit: '500000', label: '' });
        fetchInventory();
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add phone number', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleInventory = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/a2c-agent/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ isActive })
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: 'Success', description: `Phone number ${isActive ? 'activated' : 'deactivated'}` });
        fetchInventory();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleDeleteInventory = async (id: string) => {
    if (!confirm('Are you sure you want to remove this phone number?')) return;
    try {
      const response = await fetch(`/api/a2c-agent/inventory/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: 'Success', description: 'Phone number removed' });
        fetchInventory();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove', variant: 'destructive' });
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusForm.status) {
      toast({ title: 'Error', description: 'Select a status', variant: 'destructive' });
      return;
    }
    if (statusForm.status === 'rejected' && !statusForm.rejectionReason) {
      toast({ title: 'Error', description: 'Please provide a reason for rejection', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/a2c-agent/requests/${selectedRequest.id}/update-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(statusForm)
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: 'Success', description: 'Request status updated!' });
        setShowStatusModal(false);
        setStatusForm({ status: '', agentNotes: '', rejectionReason: '' });
        fetchMyRequests();
        fetchStats();
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update request', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('a2cAgentToken');
    localStorage.removeItem('a2cAgentRefreshToken');
    localStorage.removeItem('a2cAgentInfo');
    setLocation('/agent/a2c/login');
  };

  const getNextStatuses = (currentStatus: string) => {
    const transitions: Record<string, string[]> = {
      airtime_sent: ['airtime_received', 'rejected'],
      airtime_received: ['processing', 'rejected'],
      processing: ['completed', 'rejected'],
    };
    return transitions[currentStatus] || [];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 sm:px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Banknote className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h1 className="font-semibold text-sm sm:text-base">A2C Agent Portal</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">{profile?.name || 'Loading...'}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <ArrowDownCircle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Awaiting</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.awaiting || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Confirmed</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.confirmed || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Completed</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalCompletedRequests || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Banknote className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Processed</p>
                  <p className="text-lg sm:text-2xl font-bold">₦{parseFloat(stats.totalProcessedAmount || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="requests" className="text-xs sm:text-sm">Requests</TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs sm:text-sm">Inventory</TabsTrigger>
            <TabsTrigger value="profile" className="text-xs sm:text-sm">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">Incoming Requests</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Requests from customers sending airtime to your numbers</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36 sm:w-40 text-xs sm:text-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="airtime_sent">Airtime Sent</SelectItem>
                      <SelectItem value="airtime_received">Received</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={fetchMyRequests}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : myRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No requests found</p>
                  </div>
                ) : (
                  <ScrollArea className="w-full">
                    <div className="min-w-[700px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Bank Details</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {myRequests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>
                                <div>
                                  <p className="font-mono text-xs">{request.trackingId}</p>
                                  <Badge variant="outline" className="text-xs mt-1">{request.network?.toUpperCase()}</Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{request.userName || 'N/A'}</div>
                                  <div className="text-xs text-muted-foreground">{request.phoneNumber}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>₦{parseFloat(request.airtimeAmount || 0).toLocaleString()}</div>
                                  <div className="text-xs text-green-600">→ ₦{parseFloat(request.cashAmount || 0).toLocaleString()}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-xs">
                                  <div className="font-medium">{request.bankName || 'N/A'}</div>
                                  <div className="font-mono">{request.accountNumber || 'N/A'}</div>
                                  <div className="text-muted-foreground">{request.accountName || ''}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={STATUS_LABELS[request.status]?.color || ''}>
                                  {STATUS_LABELS[request.status]?.label || request.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {getNextStatuses(request.status).length > 0 && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setStatusForm({ status: '', agentNotes: '', rejectionReason: '' });
                                      setShowStatusModal(true);
                                    }}
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Update
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">Phone Inventory</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage your receiving phone numbers (max 5 active)</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowAddInventoryModal(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Number
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : inventory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Phone className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No phone numbers added yet</p>
                    <Button variant="outline" className="mt-4" onClick={() => setShowAddInventoryModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Number
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inventory.map((item) => (
                      <Card key={item.id} className={`p-4 ${item.isActive ? 'border-green-200' : 'border-gray-200 opacity-60'}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                              <Phone className={`h-5 w-5 ${item.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-mono font-medium">{item.phoneNumber}</p>
                                <Badge variant="outline" className="text-xs">{item.network?.toUpperCase()}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                                {item.label && <span className="bg-gray-100 px-2 py-0.5 rounded">{item.label}</span>}
                                <span>Daily: ₦{parseFloat(item.usedToday || '0').toLocaleString()} / ₦{parseFloat(item.dailyLimit || '0').toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground hidden sm:inline">{item.isActive ? 'Active' : 'Inactive'}</span>
                              <Switch
                                checked={item.isActive}
                                onCheckedChange={(checked) => handleToggleInventory(item.id, checked)}
                              />
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteInventory(item.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Agent Profile</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Name</Label>
                      <p className="font-medium">{profile.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Email</Label>
                      <p className="font-medium">{profile.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Employee ID</Label>
                      <p className="font-medium">{profile.employeeId || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Status</Label>
                      <Badge variant={profile.isAvailable ? 'default' : 'secondary'}>
                        {profile.isAvailable ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Total Completed</Label>
                      <p className="font-medium">{profile.totalCompletedRequests || 0} requests</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Total Processed</Label>
                      <p className="font-medium">₦{parseFloat(profile.totalProcessedAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showAddInventoryModal} onOpenChange={setShowAddInventoryModal}>
        <DialogContent className="max-w-[340px] sm:max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Add Phone Number</DialogTitle>
            <DialogDescription>Add a phone number to receive airtime transfers</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                placeholder="08012345678"
                value={inventoryForm.phoneNumber}
                onChange={(e) => setInventoryForm({ ...inventoryForm, phoneNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="network">Network</Label>
              <Select value={inventoryForm.network} onValueChange={(v) => setInventoryForm({ ...inventoryForm, network: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {NETWORKS.map((net) => (
                    <SelectItem key={net} value={net}>{net.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">Daily Limit (₦)</Label>
              <Input
                id="dailyLimit"
                type="number"
                placeholder="500000"
                value={inventoryForm.dailyLimit}
                onChange={(e) => setInventoryForm({ ...inventoryForm, dailyLimit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Label (Optional)</Label>
              <Input
                id="label"
                placeholder="e.g., Primary, Backup"
                value={inventoryForm.label}
                onChange={(e) => setInventoryForm({ ...inventoryForm, label: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setShowAddInventoryModal(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleAddInventory} disabled={loading} className="w-full sm:w-auto">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="max-w-[340px] sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Request Status</DialogTitle>
            <DialogDescription>Update the status and process payment</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tracking ID</span>
                  <span className="font-mono">{selectedRequest.trackingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span>₦{parseFloat(selectedRequest.airtimeAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pay Out</span>
                  <span className="font-bold text-green-600">₦{parseFloat(selectedRequest.cashAmount || 0).toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <p className="text-muted-foreground">Pay to:</p>
                  <p className="font-medium">{selectedRequest.bankName}</p>
                  <p className="font-mono">{selectedRequest.accountNumber}</p>
                  <p className="text-muted-foreground">{selectedRequest.accountName}</p>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground">Current Status</span>
                  <Badge className={STATUS_LABELS[selectedRequest.status]?.color}>
                    {STATUS_LABELS[selectedRequest.status]?.label}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={statusForm.status} onValueChange={(v) => setStatusForm({ ...statusForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {getNextStatuses(selectedRequest.status).map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]?.label || status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {statusForm.status === 'rejected' && (
                <div className="space-y-2">
                  <Label>Rejection Reason</Label>
                  <Textarea
                    placeholder="Why is this request being rejected?"
                    value={statusForm.rejectionReason}
                    onChange={(e) => setStatusForm({ ...statusForm, rejectionReason: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any notes about this update"
                  value={statusForm.agentNotes}
                  onChange={(e) => setStatusForm({ ...statusForm, agentNotes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setShowStatusModal(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleStatusUpdate} disabled={loading} className="w-full sm:w-auto">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
