import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap, Loader2, Clock, CheckCircle2, User, LogOut, FileText, RefreshCw, Eye, Package, Plus, Upload, ShoppingCart, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  { value: 'pickup', label: 'Picked Up', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
];

const getAgentToken = () => localStorage.getItem('educationAgentToken');

const EXAM_TYPES = ['waec', 'neco', 'nabteb', 'nbais'];

export default function EducationAgentDashboard() {
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
  const [updateData, setUpdateData] = useState({ status: '', agentNotes: '', resultUrl: '' });
  
  // PIN Management State
  const [activeTab, setActiveTab] = useState('requests');
  const [pinStock, setPinStock] = useState<any>({});
  const [pins, setPins] = useState<any[]>([]);
  const [pinOrders, setPinOrders] = useState<any[]>([]);
  const [pinFilter, setPinFilter] = useState({ examType: '', status: '' });
  const [showAddPin, setShowAddPin] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [newPin, setNewPin] = useState({ examType: 'waec', pinCode: '', serialNumber: '' });
  const [bulkPins, setBulkPins] = useState({ examType: 'waec', pinsText: '' });
  const [pricingData, setPricingData] = useState({ examType: 'waec', price: '' });

  useEffect(() => {
    const token = getAgentToken();
    if (!token) {
      setLocation('/agent/education');
      return;
    }
    fetchProfile();
    fetchStats();
    fetchRequests();
    fetchPinStock();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = getAgentToken();
      const response = await fetch('/api/education-agent/me', {
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
      const response = await fetch('/api/education-agent/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchPinStock = async () => {
    try {
      const token = getAgentToken();
      const response = await fetch('/api/education-agent/pins/stock', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setPinStock(data.data.stock || {});
      }
    } catch (error) {
      console.error('Failed to fetch PIN stock:', error);
    }
  };

  const fetchPins = async () => {
    try {
      const token = getAgentToken();
      const params = new URLSearchParams();
      if (pinFilter.examType) params.append('examType', pinFilter.examType);
      if (pinFilter.status) params.append('status', pinFilter.status);
      
      const response = await fetch(`/api/education-agent/pins?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setPins(data.data.pins || []);
      }
    } catch (error) {
      console.error('Failed to fetch PINs:', error);
    }
  };

  const fetchPinOrders = async () => {
    try {
      const token = getAgentToken();
      const response = await fetch('/api/education-agent/pins/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setPinOrders(data.data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch PIN orders:', error);
    }
  };

  const handleAddPin = async () => {
    if (!newPin.pinCode) {
      toast({ title: "Error", description: "PIN code is required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const token = getAgentToken();
      const response = await fetch('/api/education-agent/pins', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newPin)
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Success", description: "PIN added successfully" });
        setNewPin({ examType: 'waec', pinCode: '', serialNumber: '' });
        setShowAddPin(false);
        fetchPinStock();
        fetchPins();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add PIN", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkPins.pinsText.trim()) {
      toast({ title: "Error", description: "Please enter PINs", variant: "destructive" });
      return;
    }
    
    const lines = bulkPins.pinsText.trim().split('\n').filter(l => l.trim());
    const pinsArray = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return { pinCode: parts[0], serialNumber: parts[1] || null };
    }).filter(p => p.pinCode);
    
    if (pinsArray.length === 0) {
      toast({ title: "Error", description: "No valid PINs found", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      const token = getAgentToken();
      const response = await fetch('/api/education-agent/pins/bulk', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ examType: bulkPins.examType, pins: pinsArray })
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ 
          title: "Bulk Upload Complete", 
          description: `Added: ${data.data.added}, Duplicates: ${data.data.duplicates}` 
        });
        setBulkPins({ examType: 'waec', pinsText: '' });
        setShowBulkUpload(false);
        fetchPinStock();
        fetchPins();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload PINs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePricing = async () => {
    if (!pricingData.price) {
      toast({ title: "Error", description: "Price is required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const token = getAgentToken();
      const response = await fetch('/api/education-agent/pins/pricing', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ examType: pricingData.examType, price: parseFloat(pricingData.price) })
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Success", description: "Pricing updated" });
        setShowPricing(false);
        fetchPinStock();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update pricing", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pins') {
      fetchPins();
    } else if (activeTab === 'orders') {
      fetchPinOrders();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'pins') {
      fetchPins();
    }
  }, [pinFilter.examType, pinFilter.status]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = getAgentToken();
      const response = await fetch(`/api/education-agent/requests?status=${filter}`, {
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

  useEffect(() => {
    if (getAgentToken()) fetchRequests();
  }, [filter]);

  const handleLogout = () => {
    localStorage.removeItem('educationAgentToken');
    localStorage.removeItem('educationAgentInfo');
    toast({ title: "Logged out", description: "You have been logged out" });
    setLocation('/agent/education');
  };

  const handleUpdateStatus = async () => {
    if (!updateData.status || !selectedRequest) return;
    
    setLoading(true);
    try {
      const token = getAgentToken();
      const response = await fetch(`/api/education-agent/requests/${selectedRequest.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updateData)
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Updated!", description: "Request status updated successfully." });
        fetchRequests();
        fetchStats();
        setShowStatusUpdate(false);
        setSelectedRequest(null);
        setUpdateData({ status: '', agentNotes: '', resultUrl: '' });
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return <Badge className={option?.color || 'bg-gray-100'}>{option?.label || status}</Badge>;
  };

  const getServiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'jamb': 'JAMB Result',
      'waec': 'WAEC Result',
      'neco': 'NECO Result'
    };
    return labels[type] || type.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Education Agent Dashboard</h1>
              <p className="text-sm text-muted-foreground">{agent?.name} ({agent?.email})</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* PIN Stock Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {EXAM_TYPES.map(exam => (
            <Card key={exam}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Package className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pinStock[exam]?.unused || 0}</p>
                    <p className="text-sm text-muted-foreground">{exam.toUpperCase()} PINs</p>
                    <p className="text-xs text-green-600">₦{(pinStock[exam]?.price || 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Requests
            </TabsTrigger>
            <TabsTrigger value="stock" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              PIN Stock
            </TabsTrigger>
            <TabsTrigger value="pins" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manage PINs
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Orders
            </TabsTrigger>
          </TabsList>

          {/* Requests Tab */}
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Education Verification Requests</CardTitle>
                  <div className="flex gap-2">
                    <Select value={filter} onValueChange={setFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Requests</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="pickup">Picked Up</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={fetchRequests}>
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
            {loading && requests.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No requests found
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{request.trackingId}</span>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getServiceTypeLabel(request.serviceType)}
                        </p>
                        <p className="text-sm">
                          <strong>Customer:</strong> {request.userName || 'N/A'} ({request.userEmail || 'N/A'})
                        </p>
                        {request.candidateName && <p className="text-sm"><strong>Candidate:</strong> {request.candidateName}</p>}
                        {request.examYear && <p className="text-sm"><strong>Year:</strong> {request.examYear}</p>}
                        {request.registrationNumber && <p className="text-sm"><strong>Reg No:</strong> {request.registrationNumber}</p>}
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedRequest(request); setShowDetails(true); }}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {request.status !== 'completed' && (
                          <Button size="sm" onClick={() => { 
                            setSelectedRequest(request); 
                            setUpdateData({ status: request.status, agentNotes: request.agentNotes || '', resultUrl: request.resultUrl || '' });
                            setShowStatusUpdate(true); 
                          }}>
                            Update
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stock Tab */}
          <TabsContent value="stock">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>PIN Stock Summary</CardTitle>
                    <CardDescription>Overview of available PINs for each exam type</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowPricing(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Update Pricing
                    </Button>
                    <Button variant="outline" size="icon" onClick={fetchPinStock}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam Type</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Used</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {EXAM_TYPES.map(exam => (
                      <TableRow key={exam}>
                        <TableCell className="font-medium">{exam.toUpperCase()}</TableCell>
                        <TableCell className="text-right text-green-600 font-bold">{pinStock[exam]?.unused || 0}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{pinStock[exam]?.used || 0}</TableCell>
                        <TableCell className="text-right">{pinStock[exam]?.total || 0}</TableCell>
                        <TableCell className="text-right font-medium">₦{(pinStock[exam]?.price || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage PINs Tab */}
          <TabsContent value="pins">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Manage PINs</CardTitle>
                    <CardDescription>Add single or bulk PINs to inventory</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowAddPin(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add PIN
                    </Button>
                    <Button variant="outline" onClick={() => setShowBulkUpload(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Bulk Upload
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <Select value={pinFilter.examType} onValueChange={(v) => setPinFilter(p => ({ ...p, examType: v }))}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Exam Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      {EXAM_TYPES.map(e => <SelectItem key={e} value={e}>{e.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={pinFilter.status} onValueChange={(v) => setPinFilter(p => ({ ...p, status: v }))}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Status</SelectItem>
                      <SelectItem value="unused">Unused</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam Type</TableHead>
                      <TableHead>PIN Code</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pins.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">No PINs found</TableCell>
                      </TableRow>
                    ) : pins.map(pin => (
                      <TableRow key={pin.id}>
                        <TableCell className="font-medium">{pin.examType?.toUpperCase()}</TableCell>
                        <TableCell className="font-mono">{pin.pinCode}</TableCell>
                        <TableCell>{pin.serialNumber || '-'}</TableCell>
                        <TableCell>
                          <Badge className={pin.status === 'unused' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {pin.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(pin.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>PIN Orders</CardTitle>
                    <CardDescription>Customer PIN purchase orders</CardDescription>
                  </div>
                  <Button variant="outline" size="icon" onClick={fetchPinOrders}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Exam Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pinOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">No orders found</TableCell>
                      </TableRow>
                    ) : pinOrders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.id?.substring(0, 8)}...</TableCell>
                        <TableCell>{order.userName || order.userEmail || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{order.examType?.toUpperCase()}</TableCell>
                        <TableCell>₦{parseFloat(order.amount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add PIN Dialog */}
      <Dialog open={showAddPin} onOpenChange={setShowAddPin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Single PIN</DialogTitle>
            <DialogDescription>Add a new PIN to the inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Exam Type</Label>
              <Select value={newPin.examType} onValueChange={(v) => setNewPin(p => ({ ...p, examType: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_TYPES.map(e => <SelectItem key={e} value={e}>{e.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>PIN Code</Label>
              <Input value={newPin.pinCode} onChange={(e) => setNewPin(p => ({ ...p, pinCode: e.target.value }))} placeholder="Enter PIN code" />
            </div>
            <div className="space-y-2">
              <Label>Serial Number (Optional)</Label>
              <Input value={newPin.serialNumber} onChange={(e) => setNewPin(p => ({ ...p, serialNumber: e.target.value }))} placeholder="Enter serial number" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPin(false)}>Cancel</Button>
            <Button onClick={handleAddPin} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Upload PINs</DialogTitle>
            <DialogDescription>Upload multiple PINs at once. Enter one PIN per line. Format: PIN_CODE,SERIAL_NUMBER (serial is optional)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Exam Type</Label>
              <Select value={bulkPins.examType} onValueChange={(v) => setBulkPins(p => ({ ...p, examType: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_TYPES.map(e => <SelectItem key={e} value={e}>{e.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>PINs (one per line)</Label>
              <Textarea 
                value={bulkPins.pinsText} 
                onChange={(e) => setBulkPins(p => ({ ...p, pinsText: e.target.value }))} 
                placeholder="PIN123456,SN001&#10;PIN789012,SN002&#10;PIN345678"
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkUpload(false)}>Cancel</Button>
            <Button onClick={handleBulkUpload} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Upload PINs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Pricing Dialog */}
      <Dialog open={showPricing} onOpenChange={setShowPricing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update PIN Pricing</DialogTitle>
            <DialogDescription>Set the price for each exam type PIN</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Exam Type</Label>
              <Select value={pricingData.examType} onValueChange={(v) => setPricingData(p => ({ ...p, examType: v, price: (pinStock[v]?.price || 0).toString() }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_TYPES.map(e => <SelectItem key={e} value={e}>{e.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Price (₦)</Label>
              <Input type="number" value={pricingData.price} onChange={(e) => setPricingData(p => ({ ...p, price: e.target.value }))} placeholder="Enter price" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPricing(false)}>Cancel</Button>
            <Button onClick={handleUpdatePricing} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Details - {selectedRequest?.trackingId}</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><strong>Service:</strong> {getServiceTypeLabel(selectedRequest.serviceType)}</div>
                <div><strong>Status:</strong> {getStatusBadge(selectedRequest.status)}</div>
                <div><strong>Customer:</strong> {selectedRequest.userName}</div>
                <div><strong>Email:</strong> {selectedRequest.userEmail}</div>
                <div><strong>Phone:</strong> {selectedRequest.userPhone || 'N/A'}</div>
                <div><strong>Fee:</strong> {selectedRequest.fee}</div>
                {selectedRequest.candidateName && <div><strong>Candidate Name:</strong> {selectedRequest.candidateName}</div>}
                {selectedRequest.examYear && <div><strong>Exam Year:</strong> {selectedRequest.examYear}</div>}
                {selectedRequest.registrationNumber && <div><strong>Reg Number:</strong> {selectedRequest.registrationNumber}</div>}
              </div>
              {selectedRequest.customerNotes && (
                <div><strong>Customer Notes:</strong> {selectedRequest.customerNotes}</div>
              )}
              {selectedRequest.agentNotes && (
                <div><strong>Agent Notes:</strong> {selectedRequest.agentNotes}</div>
              )}
              {selectedRequest.resultUrl && (
                <div><strong>Result:</strong> <a href={selectedRequest.resultUrl} target="_blank" className="text-green-600 underline">View Result</a></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showStatusUpdate} onOpenChange={setShowStatusUpdate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Request Status</DialogTitle>
            <DialogDescription>Update the status of request {selectedRequest?.trackingId}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={updateData.status} onValueChange={(v) => setUpdateData(prev => ({ ...prev, status: v }))}>
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

            <div className="space-y-2">
              <Label>Agent Notes</Label>
              <Textarea 
                value={updateData.agentNotes}
                onChange={(e) => setUpdateData(prev => ({ ...prev, agentNotes: e.target.value }))}
                placeholder="Add notes about this request..."
              />
            </div>

            {updateData.status === 'completed' && (
              <div className="space-y-2">
                <Label>Result URL</Label>
                <Input 
                  value={updateData.resultUrl}
                  onChange={(e) => setUpdateData(prev => ({ ...prev, resultUrl: e.target.value }))}
                  placeholder="Enter URL to result document..."
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusUpdate(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={loading || !updateData.status}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
