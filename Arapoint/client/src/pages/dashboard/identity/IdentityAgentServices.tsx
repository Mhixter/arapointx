import { tokenStorage } from '@/lib/tokenStorage';
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, FileCheck, UserCog, CheckCircle, Clock, AlertCircle, Eye, FileText, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AGENT_SERVICES = [
  { type: 'nin_validation', name: 'NIN Validation', icon: FileCheck, color: 'text-emerald-600', bg: 'bg-emerald-100', desc: 'Validate and verify NIN details' },
  { type: 'ipe_clearance', name: 'IPE Clearance', icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-100', desc: 'Clear IPE issues on your NIN' },
  { type: 'nin_personalization', name: 'NIN Personalization', icon: UserCog, color: 'text-pink-600', bg: 'bg-pink-100', desc: 'Update NIN personal details' },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  pickup: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
};

const VALIDATION_TYPES = [
  { value: 'no_record', label: 'No Record Found' },
  { value: 'photograph_error', label: 'Photograph Error' },
  { value: 'update_record', label: 'Update Record' },
  { value: 'date_of_birth_correction', label: 'Date of Birth Correction' },
  { value: 'name_correction', label: 'Name Correction' },
  { value: 'gender_correction', label: 'Gender Correction' },
  { value: 'duplicate_nin', label: 'Duplicate NIN' },
  { value: 'other', label: 'Other Issue' },
];

const getToken = () => tokenStorage.getItem('accessToken');

async function downloadIdentitySlip(requestId: string, trackingId: string, toast: any) {
  try {
    const res = await fetch(`/api/identity/service-slip/${requestId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) {
      const msg = res.status === 401 ? 'Please log in again to download the slip.' : 'Slip is not available yet. Please try again shortly.';
      toast({ title: 'Download Failed', description: msg, variant: 'destructive' });
      return;
    }
    const blob = await res.blob();
    const ext = (blob.type.includes('pdf') ? 'pdf' : blob.type.includes('image/png') ? 'png' : blob.type.includes('image/jpeg') ? 'jpg' : 'pdf');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Arapoint-Slip-${trackingId || requestId}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e: any) {
    toast({ title: 'Download Failed', description: 'Network error while downloading slip.', variant: 'destructive' });
  }
}

export default function IdentityAgentServices() {
  const { toast } = useToast();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nin: '', newTrackingId: '', updateFields: '', customerNotes: '', validationType: '', slipType: 'standard' });
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchMyRequests();
  }, []);

  const fetchServices = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/identity-agent/manual-services', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        const priceMap: Record<string, number> = {};
        data.data.services.forEach((s: any) => {
          priceMap[s.serviceType] = parseFloat(s.price);
        });
        setPrices(priceMap);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  };

  const fetchMyRequests = async () => {
    setLoadingRequests(true);
    try {
      const token = getToken();
      const response = await fetch('/api/identity-agent/my-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setRequests(data.data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    if (!formData.nin) {
      toast({ title: "NIN Required", description: "Please enter a valid 11-digit NIN", variant: "destructive" });
      return;
    }

    if (!/^\d{11}$/.test(formData.nin)) {
      toast({ title: "Invalid NIN", description: "NIN must be exactly 11 digits", variant: "destructive" });
      return;
    }

    if (selectedService === 'nin_validation' && !formData.validationType) {
      toast({ title: "Missing Information", description: "Please select the type of validation issue", variant: "destructive" });
      return;
    }

    if (selectedService === 'nin_personalization' && !formData.updateFields?.trim()) {
      toast({ title: "Missing Information", description: "Please specify which fields to update", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch('/api/identity-agent/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ serviceType: selectedService, ...formData })
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Request Submitted", variant: "success", description: `Tracking ID: ${data.data.request.trackingId}` });
        setFormData({ nin: '', newTrackingId: '', updateFields: '', customerNotes: '', validationType: '', slipType: 'standard' });
        setSelectedService(null);
        fetchMyRequests();
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit request", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const info = STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return <Badge className={info.color}>{info.label}</Badge>;
  };

  const getServiceName = (type: string) => {
    return AGENT_SERVICES.find(s => s.type === type)?.name || type;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/identity">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-heading font-bold">Manual Identity Services</h2>
          <p className="text-muted-foreground">Request manual processing by our identity agents</p>
        </div>
      </div>

      <Tabs defaultValue="new" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new">New Request</TabsTrigger>
          <TabsTrigger value="history">My Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AGENT_SERVICES.map((service) => (
              <Card
                key={service.type}
                className={`cursor-pointer transition-all ${selectedService === service.type ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                onClick={() => setSelectedService(service.type)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${service.bg} ${service.color}`}>
                    <service.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{service.name}</h4>
                    <p className="text-xs text-muted-foreground">{service.desc}</p>
                    {prices[service.type] && (
                      <Badge variant="secondary" className="mt-2 text-xs">₦{prices[service.type].toLocaleString()}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedService && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Request Details</CardTitle>
                <CardDescription>Provide the information needed for your request</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nin">NIN (11 digits)</Label>
                      <Input
                        id="nin"
                        value={formData.nin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setFormData(prev => ({ ...prev, nin: val }));
                        }}
                        placeholder="Enter 11-digit NIN"
                        maxLength={11}
                        inputMode="numeric"
                        pattern="\d{11}"
                      />
                    </div>
                    <div>
                      <Label htmlFor="trackingId">NIN Tracking ID (optional)</Label>
                      <Input
                        id="trackingId"
                        value={formData.newTrackingId}
                        onChange={(e) => setFormData(prev => ({ ...prev, newTrackingId: e.target.value }))}
                        placeholder="Enter tracking ID if available"
                      />
                    </div>
                  </div>

                  {selectedService === 'nin_validation' && (
                    <div>
                      <Label>Validation Issue Type</Label>
                      <Select value={formData.validationType} onValueChange={(v) => setFormData(prev => ({ ...prev, validationType: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select the issue you're experiencing" />
                        </SelectTrigger>
                        <SelectContent>
                          {VALIDATION_TYPES.map(vt => (
                            <SelectItem key={vt.value} value={vt.value}>{vt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedService === 'nin_personalization' && (
                    <div>
                      <Label htmlFor="updateFields">Fields to Update</Label>
                      <Textarea
                        id="updateFields"
                        value={formData.updateFields}
                        onChange={(e) => setFormData(prev => ({ ...prev, updateFields: e.target.value }))}
                        placeholder="List the fields you want to update (e.g., Date of Birth, Address, Phone Number)"
                        rows={3}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="slipType">Preferred Slip Type</Label>
                    <Select value={formData.slipType} onValueChange={(v) => setFormData(prev => ({ ...prev, slipType: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select slip type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="information">Information Slip</SelectItem>
                        <SelectItem value="regular">Regular Slip</SelectItem>
                        <SelectItem value="standard">Standard Slip</SelectItem>
                        <SelectItem value="premium">Premium Slip</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.customerNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerNotes: e.target.value }))}
                      placeholder="Any additional information for the agent..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setSelectedService(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Submit Request
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Requests</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchMyRequests}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingRequests ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No requests yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <div key={req.id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{req.trackingId}</span>
                          {getStatusBadge(req.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">{getServiceName(req.serviceType)}</p>
                        <p className="text-xs text-muted-foreground">₦{parseFloat(req.fee || 0).toLocaleString()}</p>
                        {req.status === 'completed' && req.agentNotes && (
                          <p className="text-xs text-green-600 truncate max-w-[250px]">Agent: {req.agentNotes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {req.status === 'completed' && req.slipUrl && (
                          <Button variant="outline" size="sm" onClick={() => downloadIdentitySlip(req.id, req.trackingId, toast)}>
                            <FileText className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedRequest(req); setShowDetails(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>{selectedRequest?.trackingId}</DialogDescription>
          </DialogHeader>
          {selectedRequest && (() => {
            const r = selectedRequest;
            const nimcTrackingId = r.newTrackingId || r.new_tracking_id || '';
            const validatedName = r.validatedFullName || r.validated_full_name || '';
            const validatedDob = r.validatedDateOfBirth || r.validated_date_of_birth || '';
            const resolvedTid = r.resolvedTrackingId || r.resolved_tracking_id || '';
            const validationType = r.updateFields?.validationType || r.update_fields?.validationType || '';
            const slipType = r.updateFields?.slipType || r.update_fields?.slipType || '';
            const updateFieldsText = r.updateFields?.fields || r.update_fields?.fields || '';
            return (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-muted-foreground text-xs">Service</Label>
                    <p className="font-medium">{getServiceName(r.serviceType)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <p>{getStatusBadge(r.status)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Fee Paid</Label>
                    <p className="font-medium">₦{parseFloat(r.fee || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Submitted</Label>
                    <p className="text-sm">{new Date(r.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50 space-y-2 text-sm">
                  <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Submitted Information</p>
                  {r.nin && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">NIN</span>
                      <span className="font-mono font-medium">{'*'.repeat(7)}{r.nin.slice(-4)}</span>
                    </div>
                  )}
                  {nimcTrackingId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">NIN Tracking ID</span>
                      <span className="font-mono font-medium">{nimcTrackingId}</span>
                    </div>
                  )}
                  {validationType && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Validation Issue</span>
                      <span className="font-medium text-orange-600">
                        {VALIDATION_TYPES.find(v => v.value === validationType)?.label || validationType}
                      </span>
                    </div>
                  )}
                  {slipType && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Slip Type</span>
                      <span className="font-medium capitalize">{slipType}</span>
                    </div>
                  )}
                  {updateFieldsText && (
                    <div>
                      <span className="text-muted-foreground block">Fields to Update</span>
                      <span className="font-medium">{updateFieldsText}</span>
                    </div>
                  )}
                  {r.customerNotes && (
                    <div>
                      <span className="text-muted-foreground block">Your Notes</span>
                      <span>{r.customerNotes}</span>
                    </div>
                  )}
                </div>

                {r.status === 'completed' && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 space-y-3">
                    <p className="font-semibold text-green-700 dark:text-green-400 text-sm">Request Completed</p>
                    {r.agentNotes && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Agent Feedback</Label>
                        <p className="text-sm mt-1">{r.agentNotes}</p>
                      </div>
                    )}
                    {r.serviceType === 'ipe_clearance' && resolvedTid && (
                      <div>
                        <Label className="text-muted-foreground text-xs">New NIN Tracking ID</Label>
                        <p className="text-base font-bold text-green-700 dark:text-green-400 mt-1 font-mono">{resolvedTid}</p>
                        <p className="text-xs text-muted-foreground mt-1">This is your updated NIN tracking ID after IPE clearance.</p>
                      </div>
                    )}
                    {r.serviceType === 'nin_validation' && validatedName && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Full Name on Record</Label>
                        <p className="text-sm font-bold text-green-700 dark:text-green-400 mt-1">{validatedName}</p>
                      </div>
                    )}
                    {r.serviceType === 'nin_validation' && validatedDob && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Date of Birth on Record</Label>
                        <p className="text-sm font-bold text-green-700 dark:text-green-400 mt-1">{validatedDob}</p>
                      </div>
                    )}
                    {r.slipUrl && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Result Document</Label>
                        <div className="mt-1">
                          <button type="button" onClick={() => downloadIdentitySlip(r.id, r.trackingId, toast)} className="inline-flex items-center gap-1 text-blue-600 underline text-sm font-medium">
                            <FileText className="h-4 w-4" />
                            Download Slip
                          </button>
                        </div>
                      </div>
                    )}
                    {!r.agentNotes && !r.slipUrl && !resolvedTid && !validatedName && (
                      <p className="text-sm text-muted-foreground">No additional feedback provided by the agent yet.</p>
                    )}
                  </div>
                )}
                {r.status !== 'completed' && r.agentNotes && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Agent Notes</Label>
                    <p className="text-sm mt-1">{r.agentNotes}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
