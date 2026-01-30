import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Upload, Trash2, Loader2, Package, CheckCircle, XCircle, AlertTriangle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PinStock {
  examType: string;
  available: number;
  used: number;
  total: number;
}

interface EducationPin {
  id: string;
  examType: string;
  pinCode: string;
  serialNumber: string | null;
  status: "unused" | "used";
  usedAt: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
}

interface PinOrder {
  id: string;
  examType: string;
  amount: string;
  status: "pending" | "paid" | "completed" | "failed" | "refunded";
  deliveredPin: string | null;
  deliveredSerial: string | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
  userName: string;
  userEmail: string;
}

const getAuthToken = () => localStorage.getItem('adminToken');

export default function AdminEducationPins() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState<PinStock[]>([]);
  const [pins, setPins] = useState<EducationPin[]>([]);
  const [orders, setOrders] = useState<PinOrder[]>([]);
  const [activeTab, setActiveTab] = useState("stock");
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [addExamType, setAddExamType] = useState("waec");
  const [addPinCode, setAddPinCode] = useState("");
  const [addSerialNumber, setAddSerialNumber] = useState("");
  const [bulkExamType, setBulkExamType] = useState("waec");
  const [bulkPinsText, setBulkPinsText] = useState("");
  const [saving, setSaving] = useState(false);
  
  const [filterExamType, setFilterExamType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchStock();
    fetchPins();
    fetchOrders();
  }, []);

  const fetchStock = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('/api/admin/education-pins/stock', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.status === 'success') {
        setStock(result.data?.stock || []);
      }
    } catch (error: any) {
      console.error('Error fetching PIN stock:', error);
    }
  };

  const fetchPins = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch('/api/admin/education-pins?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.status === 'success') {
        setPins(result.data?.pins || []);
      }
    } catch (error: any) {
      console.error('Error fetching PINs:', error);
      toast({ title: "Error", description: "Failed to load PINs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('/api/admin/education-pin-orders?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.status === 'success') {
        setOrders(result.data?.orders || []);
      }
    } catch (error: any) {
      console.error('Error fetching PIN orders:', error);
    }
  };

  const handleAddPin = async () => {
    if (!addPinCode.trim()) {
      toast({ title: "Error", description: "PIN code is required", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const token = getAuthToken();
      const response = await fetch('/api/admin/education-pins', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examType: addExamType,
          pinCode: addPinCode.trim(),
          serialNumber: addSerialNumber.trim() || null,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        toast({ title: "Success", description: "PIN added successfully" });
        setShowAddModal(false);
        setAddPinCode("");
        setAddSerialNumber("");
        fetchStock();
        fetchPins();
      } else {
        toast({ title: "Error", description: result.message || "Failed to add PIN", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to add PIN", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpload = async () => {
    const lines = bulkPinsText.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      toast({ title: "Error", description: "No PINs to upload", variant: "destructive" });
      return;
    }

    const pins = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        pinCode: parts[0],
        serialNumber: parts[1] || null,
      };
    }).filter(p => p.pinCode);

    try {
      setSaving(true);
      const token = getAuthToken();
      const response = await fetch('/api/admin/education-pins/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examType: bulkExamType,
          pins,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        toast({ 
          title: "Bulk Upload Complete", 
          description: `${result.data?.successCount || 0} PINs added, ${result.data?.duplicateCount || 0} duplicates skipped` 
        });
        setShowBulkModal(false);
        setBulkPinsText("");
        fetchStock();
        fetchPins();
      } else {
        toast({ title: "Error", description: result.message || "Failed to upload PINs", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to upload PINs", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePin = async (id: string) => {
    if (!confirm('Are you sure you want to delete this PIN?')) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/education-pins/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        toast({ title: "Success", description: "PIN deleted successfully" });
        fetchStock();
        fetchPins();
      } else {
        const result = await response.json();
        toast({ title: "Error", description: result.message || "Failed to delete PIN", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to delete PIN", variant: "destructive" });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredPins = pins.filter(pin => {
    if (filterExamType !== 'all' && pin.examType !== filterExamType) return false;
    if (filterStatus !== 'all' && pin.status !== filterStatus) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      unused: 'bg-green-100 text-green-700',
      used: 'bg-gray-100 text-gray-700',
      pending: 'bg-yellow-100 text-yellow-700',
      paid: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      refunded: 'bg-purple-100 text-purple-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold tracking-tight">Education PIN Inventory</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage WAEC, NECO, NABTEB, NBAIS PINs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/admin")} size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={() => setShowAddModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add PIN
          </Button>
          <Button onClick={() => setShowBulkModal(true)} size="sm" variant="secondary">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stock">Stock Summary</TabsTrigger>
          <TabsTrigger value="pins">PIN Inventory</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stock.map((item) => (
              <Card key={item.examType}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{item.examType}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Available:</span>
                      <Badge variant={item.available > 0 ? "default" : "destructive"}>
                        {item.available}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Used:</span>
                      <span className="font-medium">{item.used}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-medium">{item.total}</span>
                    </div>
                    {item.available === 0 && (
                      <div className="flex items-center gap-1 text-red-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Out of Stock</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PIN Inventory</CardTitle>
              <CardDescription>View and manage all education PINs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-4">
                <Select value={filterExamType} onValueChange={setFilterExamType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Exam Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="waec">WAEC</SelectItem>
                    <SelectItem value="neco">NECO</SelectItem>
                    <SelectItem value="nabteb">NABTEB</SelectItem>
                    <SelectItem value="nbais">NBAIS</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="unused">Unused</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredPins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No PINs found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-3">Exam Type</th>
                        <th className="text-left p-3">PIN Code</th>
                        <th className="text-left p-3">Serial</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Used By</th>
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPins.map((pin) => (
                        <tr key={pin.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 uppercase font-medium">{pin.examType}</td>
                          <td className="p-3 font-mono">{pin.pinCode}</td>
                          <td className="p-3">{pin.serialNumber || '-'}</td>
                          <td className="p-3">
                            <Badge className={getStatusBadge(pin.status)}>
                              {pin.status === 'unused' ? 'Available' : 'Used'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {pin.userName ? (
                              <div>
                                <p className="font-medium">{pin.userName}</p>
                                <p className="text-xs text-muted-foreground">{pin.userEmail}</p>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="p-3 text-xs">{formatDate(pin.createdAt)}</td>
                          <td className="p-3">
                            {pin.status === 'unused' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePin(pin.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PIN Orders</CardTitle>
              <CardDescription>View all PIN purchase orders</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No orders yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-3">Customer</th>
                        <th className="text-left p-3">Exam</th>
                        <th className="text-left p-3">Amount</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">PIN</th>
                        <th className="text-left p-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{order.userName}</p>
                              <p className="text-xs text-muted-foreground">{order.userEmail}</p>
                            </div>
                          </td>
                          <td className="p-3 uppercase font-medium">{order.examType}</td>
                          <td className="p-3">₦{parseFloat(order.amount).toLocaleString()}</td>
                          <td className="p-3">
                            <Badge className={getStatusBadge(order.status)}>
                              {order.status}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-xs">
                            {order.deliveredPin || '-'}
                          </td>
                          <td className="p-3 text-xs">{formatDate(order.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Single PIN</DialogTitle>
            <DialogDescription>Add a new education PIN to inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Exam Type</Label>
              <Select value={addExamType} onValueChange={setAddExamType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waec">WAEC</SelectItem>
                  <SelectItem value="neco">NECO</SelectItem>
                  <SelectItem value="nabteb">NABTEB</SelectItem>
                  <SelectItem value="nbais">NBAIS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>PIN Code *</Label>
              <Input
                value={addPinCode}
                onChange={(e) => setAddPinCode(e.target.value)}
                placeholder="Enter PIN code"
              />
            </div>
            <div>
              <Label>Serial Number (Optional)</Label>
              <Input
                value={addSerialNumber}
                onChange={(e) => setAddSerialNumber(e.target.value)}
                placeholder="Enter serial number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddPin} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Upload PINs</DialogTitle>
            <DialogDescription>
              Upload multiple PINs at once. Enter one PIN per line.
              Format: PIN_CODE or PIN_CODE,SERIAL_NUMBER
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Exam Type</Label>
              <Select value={bulkExamType} onValueChange={setBulkExamType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waec">WAEC</SelectItem>
                  <SelectItem value="neco">NECO</SelectItem>
                  <SelectItem value="nabteb">NABTEB</SelectItem>
                  <SelectItem value="nbais">NBAIS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>PINs (one per line)</Label>
              <Textarea
                value={bulkPinsText}
                onChange={(e) => setBulkPinsText(e.target.value)}
                placeholder="ABC123456789&#10;DEF987654321,SN12345&#10;GHI456789012"
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {bulkPinsText.trim().split('\n').filter(l => l.trim()).length} PINs ready to upload
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkModal(false)}>Cancel</Button>
            <Button onClick={handleBulkUpload} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload PINs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
