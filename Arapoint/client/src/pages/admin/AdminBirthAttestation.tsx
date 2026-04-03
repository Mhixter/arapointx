import { tokenStorage } from '@/lib/tokenStorage';
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Baby, RefreshCw, Loader2, CheckCircle, Clock, XCircle, Eye, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const getAdminToken = () => tokenStorage.getItem('adminToken');

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: 'Pending',     color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',       icon: Clock },
  pickup:    { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: RefreshCw },
  completed: { label: 'Completed',   color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',   icon: CheckCircle },
  rejected:  { label: 'Rejected',    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',           icon: XCircle },
};

interface BirthRequest {
  id: string;
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

export default function AdminBirthAttestation() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [requests, setRequests] = useState<BirthRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<BirthRequest | null>(null);
  const [processForm, setProcessForm] = useState({ status: '', adminNotes: '' });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      const res = await fetch('/api/admin/identity-requests?limit=200&serviceType=birth_attestation', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.status === 'success') {
        setRequests(data.data.requests || []);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load requests', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!selected || !processForm.status) {
      toast({ title: 'Error', description: 'Please select a status', variant: 'destructive' });
      return;
    }
    setProcessing(true);
    try {
      const token = getAdminToken();
      const res = await fetch(`/api/admin/identity-requests/${selected.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: processForm.status, adminNotes: processForm.adminNotes }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast({ title: 'Updated', variant: 'success', description: 'Request status updated successfully' });
        setSelected(null);
        setProcessForm({ status: '', adminNotes: '' });
        fetchRequests();
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update request', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: Clock };
    return <Badge className={cfg.color}>{cfg.label}</Badge>;
  };

  const filtered = requests.filter(r => {
    const f = r.updateFields || {};
    const matchSearch =
      searchTerm === '' ||
      r.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const inProgressCount = requests.filter(r => r.status === 'pickup').length;
  const completedCount = requests.filter(r => r.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Baby className="h-6 w-6 text-rose-600" />
            Birth Attestation Requests
          </h2>
          <p className="text-muted-foreground">NPC Birth Certificate attestation — processed by admin only</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: pendingCount, color: 'text-gray-700' },
          { label: 'In Progress', value: inProgressCount, color: 'text-yellow-600' },
          { label: 'Completed', value: completedCount, color: 'text-green-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>All Requests</CardTitle>
              <CardDescription>{filtered.length} of {requests.length} requests shown</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search name, email, tracking ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-56"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="pickup">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Baby className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No requests found</p>
              <p className="text-sm">Birth attestation requests will appear here when submitted by users</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                    <TableHead>Submitted</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(req => {
                    const f = req.updateFields || {};
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-mono text-xs">{req.trackingId}</TableCell>
                        <TableCell className="font-medium">{f.fullName || '—'}</TableCell>
                        <TableCell className="text-sm">{f.dateOfBirth || '—'}</TableCell>
                        <TableCell className="text-sm">{f.placeOfBirth || '—'}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{req.userName || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{req.userEmail}</p>
                            {req.userPhone && <p className="text-xs text-muted-foreground">{req.userPhone}</p>}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell className="text-sm font-medium">₦{Number(req.fee || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelected(req);
                              setProcessForm({ status: req.status, adminNotes: req.agentNotes || '' });
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
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Dialog open={true} onOpenChange={() => { setSelected(null); setProcessForm({ status: '', adminNotes: '' }); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Baby className="h-5 w-5 text-rose-600" />
                Birth Attestation — Request Details
              </DialogTitle>
              <DialogDescription>Tracking ID: <span className="font-mono">{selected.trackingId}</span></DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Customer Name</p>
                  <p className="font-semibold">{selected.userName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                  <p className="font-medium text-sm">{selected.userEmail || '—'}</p>
                </div>
                {selected.userPhone && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Phone</p>
                    <p className="font-medium text-sm">{selected.userPhone}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Fee Paid</p>
                  <p className="font-semibold text-green-600">₦{Number(selected.fee || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Submitted</p>
                  <p className="font-medium text-sm">{new Date(selected.createdAt).toLocaleString('en-NG')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Status</p>
                  {getStatusBadge(selected.status)}
                </div>
                {selected.completedAt && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Completed At</p>
                    <p className="font-medium text-sm">{new Date(selected.completedAt).toLocaleString('en-NG')}</p>
                  </div>
                )}
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Request Details</h4>
                {(() => {
                  const f = selected.updateFields || {};
                  return (
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                      {[
                        { label: 'Full Name', value: f.fullName },
                        { label: 'Date of Birth', value: f.dateOfBirth },
                        { label: 'Place of Birth', value: f.placeOfBirth },
                        { label: 'Gender', value: f.gender },
                        { label: 'LGA', value: f.lga },
                        { label: 'Parent / Guardian Name', value: f.parentName },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                          <p className="font-medium text-sm">{value || '—'}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {selected.customerNotes && (
                <div className="p-4 border rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Customer Notes</p>
                  <p className="text-sm">{selected.customerNotes}</p>
                </div>
              )}

              {selected.agentNotes && !processForm.adminNotes && (
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Previous Admin Notes</p>
                  <p className="text-sm">{selected.agentNotes}</p>
                </div>
              )}

              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Process Request</h4>
                <div className="space-y-2">
                  <Label>Update Status</Label>
                  <Select value={processForm.status} onValueChange={v => setProcessForm(p => ({ ...p, status: v }))}>
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
                    onChange={e => setProcessForm(p => ({ ...p, adminNotes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setSelected(null); setProcessForm({ status: '', adminNotes: '' }); }}>
                Cancel
              </Button>
              <Button onClick={handleProcess} disabled={processing || !processForm.status}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Update Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
