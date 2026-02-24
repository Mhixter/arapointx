import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Loader2, Clock, CheckCircle2, User, LogOut, FileText, RefreshCw, Eye, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  { value: 'pickup', label: 'Picked Up', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
];

const getAgentToken = () => localStorage.getItem('jambAgentToken');

export default function JAMBAgentDashboard() {
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
  const [activeTab, setActiveTab] = useState('requests');
  const [detailLoading, setDetailLoading] = useState(false);
  const [requestDocuments, setRequestDocuments] = useState<any[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const token = getAgentToken();
    if (!token) {
      setLocation('/jamb/agent/login');
      return;
    }
    fetchProfile();
    fetchStats();
    fetchRequests();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = getAgentToken();
      const response = await fetch('/api/jamb-agent/me', {
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
      const response = await fetch('/api/jamb-agent/stats', {
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

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = getAgentToken();
      const response = await fetch(`/api/jamb-agent/requests?status=${filter}`, {
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

  const fetchRequestDetails = async (id: number) => {
    setDetailLoading(true);
    try {
      const token = getAgentToken();
      const response = await fetch(`/api/jamb-agent/requests/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setSelectedRequest(data.data.request);
        setRequestDocuments(data.data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch request details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (getAgentToken()) fetchRequests();
  }, [filter]);

  const handleLogout = () => {
    localStorage.removeItem('jambAgentToken');
    localStorage.removeItem('jambAgentInfo');
    toast({ title: "Logged out", description: "You have been logged out" });
    setLocation('/jamb/agent/login');
  };

  const handleUpdateStatus = async () => {
    if (!updateData.status || !selectedRequest) return;

    setLoading(true);
    try {
      const token = getAgentToken();
      const response = await fetch(`/api/jamb-agent/requests/${selectedRequest.id}/status`, {
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

  const handleUploadDocument = async () => {
    if (!uploadFile || !selectedRequest) return;

    setUploading(true);
    try {
      const token = getAgentToken();
      const uploadResponse = await fetch(`/api/jamb-agent/requests/${selectedRequest.id}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fileName: uploadFile.name, fileType: uploadFile.type })
      });
      const uploadData = await uploadResponse.json();

      if (uploadData.status === 'success' || uploadData.uploadURL) {
        const uploadURL = uploadData.uploadURL || uploadData.data?.uploadURL;
        if (uploadURL) {
          await fetch(uploadURL, {
            method: 'PUT',
            body: uploadFile,
            headers: { 'Content-Type': uploadFile.type }
          });
        }
        toast({ title: "Uploaded!", description: "Document uploaded successfully." });
        setUploadFile(null);
        fetchRequestDetails(selectedRequest.id);
      } else {
        toast({ title: "Failed", description: uploadData.message || "Upload failed", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload document", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return <Badge className={option?.color || 'bg-gray-100'}>{option?.label || status}</Badge>;
  };

  const getServiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'olevel-upload': "O'Level Upload",
      'admission-letter': "Admission Letter",
      'original-result': "Original Result",
      'pin-vending': "PIN Vending",
      'reprinting-caps': "Reprinting & Caps",
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">JAMB Agent Dashboard</h1>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending || 0}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pickup || 0}</p>
                  <p className="text-sm text-muted-foreground">Picked Up</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completed || 0}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total || 0}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>JAMB Service Requests</CardTitle>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tracking ID</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.trackingId}</TableCell>
                          <TableCell>{getServiceTypeLabel(request.serviceType)}</TableCell>
                          <TableCell>{request.userName || 'N/A'}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="sm" onClick={() => {
                                fetchRequestDetails(request.id);
                                setShowDetails(true);
                              }}>
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              {selectedRequest?.trackingId}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedRequest ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Service Type</Label>
                  <p className="font-medium">{getServiceTypeLabel(selectedRequest.serviceType)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Customer Name</Label>
                  <p className="font-medium">{selectedRequest.userName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date Submitted</Label>
                  <p className="font-medium">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
                </div>
                {selectedRequest.candidateName && (
                  <div>
                    <Label className="text-muted-foreground">Candidate Name</Label>
                    <p className="font-medium">{selectedRequest.candidateName}</p>
                  </div>
                )}
                {selectedRequest.registrationNumber && (
                  <div>
                    <Label className="text-muted-foreground">Registration Number</Label>
                    <p className="font-medium">{selectedRequest.registrationNumber}</p>
                  </div>
                )}
                {selectedRequest.examYear && (
                  <div>
                    <Label className="text-muted-foreground">Exam Year</Label>
                    <p className="font-medium">{selectedRequest.examYear}</p>
                  </div>
                )}
              </div>

              {selectedRequest.agentNotes && (
                <div>
                  <Label className="text-muted-foreground">Agent Notes</Label>
                  <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">{selectedRequest.agentNotes}</p>
                </div>
              )}

              {selectedRequest.resultUrl && (
                <div>
                  <Label className="text-muted-foreground">Result URL</Label>
                  <a href={selectedRequest.resultUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block">{selectedRequest.resultUrl}</a>
                </div>
              )}

              {requestDocuments.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Documents</Label>
                  <div className="space-y-2 mt-2">
                    {requestDocuments.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">{doc.fileName || doc.name || 'Document'}</span>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/api/jamb-agent/documents/${doc.id}/download`} target="_blank" rel="noopener noreferrer">
                            Download
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Upload Result Document</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    onClick={handleUploadDocument}
                    disabled={!uploadFile || uploading}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Upload
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showStatusUpdate} onOpenChange={setShowStatusUpdate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Request Status</DialogTitle>
            <DialogDescription>
              Update status for {selectedRequest?.trackingId}
            </DialogDescription>
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
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Result URL</Label>
              <Input
                value={updateData.resultUrl}
                onChange={(e) => setUpdateData(prev => ({ ...prev, resultUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusUpdate(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}