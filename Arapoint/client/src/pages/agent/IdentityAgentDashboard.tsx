import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { IdCard, Loader2, Clock, CheckCircle2, User, LogOut, FileText, RefreshCw, Eye, Upload } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  { value: 'pickup', label: 'Picked Up', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
];

const getAgentToken = () => localStorage.getItem('identityAgentToken');

export default function IdentityAgentDashboard() {
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
  const [updateData, setUpdateData] = useState({ status: '', agentNotes: '', slipUrl: '' });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = getAgentToken();
    if (!token) {
      setLocation('/agent/identity');
      return;
    }
    fetchProfile();
    fetchStats();
    fetchRequests();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = getAgentToken();
      const response = await fetch('/api/identity-agent/me', {
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
      const response = await fetch('/api/identity-agent/stats', {
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
      const response = await fetch(`/api/identity-agent/requests?status=${filter}`, {
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
    localStorage.removeItem('identityAgentToken');
    localStorage.removeItem('identityAgentInfo');
    toast({ title: "Logged out", description: "You have been logged out" });
    setLocation('/agent/identity');
  };

  const uploadSlipFile = async (file: File): Promise<string | null> => {
    try {
      const token = getAgentToken();
      const uploadUrlRes = await fetch('/api/identity-agent/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      const uploadUrlData = await uploadUrlRes.json();
      if (!uploadUrlData.uploadURL) throw new Error('Failed to get upload URL');

      await fetch(uploadUrlData.uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });

      return uploadUrlData.objectPath;
    } catch (error) {
      console.error('File upload error:', error);
      return null;
    }
  };

  const handleUpdateStatus = async () => {
    if (!updateData.status || !selectedRequest) return;
    
    setLoading(true);
    try {
      let slipUrl = updateData.slipUrl;

      if (updateData.status === 'completed' && selectedFile) {
        setUploadingFile(true);
        const uploadedUrl = await uploadSlipFile(selectedFile);
        setUploadingFile(false);
        if (!uploadedUrl) {
          toast({ title: "Upload failed", description: "Could not upload the slip file. Please try again.", variant: "destructive" });
          setLoading(false);
          return;
        }
        slipUrl = uploadedUrl;
      }

      const token = getAgentToken();
      const response = await fetch(`/api/identity-agent/requests/${selectedRequest.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: updateData.status, agentNotes: updateData.agentNotes, slipUrl })
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Updated!", description: "Request status updated successfully." });
        fetchRequests();
        fetchStats();
        setShowStatusUpdate(false);
        setSelectedRequest(null);
        setUpdateData({ status: '', agentNotes: '', slipUrl: '' });
        setSelectedFile(null);
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return <Badge className={option?.color || 'bg-gray-100'}>{option?.label || status}</Badge>;
  };

  const getServiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'nin_validation': 'NIN Validation',
      'ipe_clearance': 'IPE Clearance',
      'nin_personalization': 'NIN Personalization'
    };
    return labels[type] || type;
  };

  const getValidationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'no_record': 'No Record Found',
      'photograph_error': 'Photograph Error',
      'update_record': 'Update Record',
      'date_of_birth_correction': 'Date of Birth Correction',
      'name_correction': 'Name Correction',
      'gender_correction': 'Gender Correction',
      'duplicate_nin': 'Duplicate NIN',
      'other': 'Other Issue',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <IdCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Identity Agent Dashboard</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Number(stats.pending) || 0}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Number(stats.pickup) || 0}</p>
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
                  <p className="text-2xl font-bold">{Number(stats.completed) || 0}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Number(stats.total) || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Identity Service Requests</CardTitle>
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
                          {request.updateFields?.validationType && (
                            <span className="ml-2 text-xs font-medium text-orange-600">
                              ({getValidationTypeLabel(request.updateFields.validationType)})
                            </span>
                          )}
                        </p>
                        <p className="text-sm">
                          <strong>Customer:</strong> {request.userName || 'N/A'}
                        </p>
                        {request.nin && <p className="text-sm"><strong>NIN:</strong> {request.nin}</p>}
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
                            setUpdateData({ status: request.status, agentNotes: request.agentNotes || '', slipUrl: request.slipUrl || '' });
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
      </main>

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
                {selectedRequest.nin && <div><strong>NIN:</strong> {selectedRequest.nin}</div>}
                {selectedRequest.newTrackingId && <div><strong>Tracking ID:</strong> {selectedRequest.newTrackingId}</div>}
                {selectedRequest.updateFields?.validationType && (
                  <div className="col-span-2">
                    <strong>Validation Type:</strong>{' '}
                    <Badge className="bg-orange-100 text-orange-700">{getValidationTypeLabel(selectedRequest.updateFields.validationType)}</Badge>
                  </div>
                )}
              </div>
              {selectedRequest.updateFields?.fields && (
                <div>
                  <strong>Fields to Update:</strong>
                  <p className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">{selectedRequest.updateFields.fields}</p>
                </div>
              )}
              {selectedRequest.customerNotes && (
                <div><strong>Customer Notes:</strong> {selectedRequest.customerNotes}</div>
              )}
              {selectedRequest.agentNotes && (
                <div><strong>Agent Notes:</strong> {selectedRequest.agentNotes}</div>
              )}
              {selectedRequest.slipUrl && (
                <div><strong>Slip:</strong> <a href={selectedRequest.slipUrl} target="_blank" className="text-blue-600 underline">View Slip</a></div>
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
                <Label>Upload Slip/Result Document</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
                        return;
                      }
                      setSelectedFile(file);
                    }
                  }}
                />
                <div 
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="h-8 w-8 mx-auto text-gray-400" />
                      <p className="text-sm text-muted-foreground">Click to upload slip or result document</p>
                      <p className="text-xs text-muted-foreground">PDF, PNG, JPG, DOC (max 10MB)</p>
                    </div>
                  )}
                </div>
                {uploadingFile && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading file...
                  </div>
                )}
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
