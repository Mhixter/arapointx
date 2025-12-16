import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Loader2, AlertCircle, ArrowLeft, Check, History, FileText, Clock, CheckCircle2, XCircle, MessageCircle, Send, X, Download, Shield } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

const SERVICE_TYPES = [
  { code: 'business_name', name: 'Business Name Registration', price: 15000, days: 3 },
  { code: 'company_limited', name: 'Company Limited by Shares', price: 75000, days: 7 },
  { code: 'company_guarantee', name: 'Company Limited by Guarantee', price: 100000, days: 10 },
  { code: 'incorporated_trustees', name: 'Incorporated Trustees (NGO)', price: 50000, days: 14 },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  submitted: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
  in_review: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  awaiting_customer: { bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertCircle },
  submitted_to_cac: { bg: 'bg-purple-100', text: 'text-purple-700', icon: FileText },
  completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
};

const getAuthToken = () => localStorage.getItem('accessToken');

export default function CACServices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<any[]>(SERVICE_TYPES);
  const [showChat, setShowChat] = useState(false);
  const [chatRequest, setChatRequest] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  const fetchServiceTypes = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('/api/cac/service-types', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success' && data.data.services.length > 0) {
        setServiceTypes(data.data.services);
      }
    } catch (error) {
      console.error('Failed to fetch service types:', error);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/cac/requests?limit=50', {
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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    
    if (field === 'serviceType') {
      const service = serviceTypes.find(s => s.code === value);
      if (service) {
        setFormData((prev: any) => ({ ...prev, fee: parseFloat(service.price) }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceType || !formData.businessName || !formData.proprietorName) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/cac/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Request Submitted!", description: "Your CAC registration request has been submitted. An agent will process it shortly." });
        setShowConfirmation(false);
        setFormData({});
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        fetchRequests();
      } else {
        toast({ title: "Failed", description: data.message || "Failed to submit request", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Request failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectedService = serviceTypes.find(s => s.code === formData.serviceType);

  const openChat = async (request: any) => {
    setChatRequest(request);
    setShowChat(true);
    setLoadingMessages(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/cac/requests/${request.id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setMessages(data.data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatRequest) return;
    setSendingMessage(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/cac/requests/${chatRequest.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: newMessage.trim() })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setMessages([...messages, data.data.message]);
        setNewMessage('');
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    if (!showChat || !chatRequest) return;
    const interval = setInterval(async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(`/api/cac/requests/${chatRequest.id}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.status === 'success') {
          setMessages(data.data.messages || []);
        }
      } catch (error) {}
    }, 5000);
    return () => clearInterval(interval);
  }, [showChat, chatRequest]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Link href="/dashboard/services">
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            CAC Registration
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Register your business with the Corporate Affairs Commission</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-200">Legal Disclaimer</p>
            <p className="text-amber-700 dark:text-amber-300 mt-1">
              Arapoint is an independent service provider and is <strong>NOT</strong> an official partner or affiliate of the Corporate Affairs Commission (CAC). 
              We act as authorized agents to assist you with business registration processes. Your data is protected and handled in compliance with Nigerian data protection regulations. 
              By using this service, you agree to our terms and conditions.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="register" onValueChange={(val) => val === 'history' && fetchRequests()}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="register">New Registration</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-2" />My Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Business Registration</CardTitle>
              <CardDescription>Fill in your business details. An agent will process your registration manually.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Registration Type *</Label>
                  <Select value={formData.serviceType || ''} onValueChange={(val) => handleInputChange('serviceType', val)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Registration Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((service) => (
                        <SelectItem key={service.code} value={service.code}>
                          {service.name} - ₦{parseInt(service.price).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedService && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                    <p className="text-sm text-muted-foreground">Estimated Processing Time</p>
                    <p className="font-semibold">{selectedService.days || selectedService.processingDays} working days</p>
                    <p className="text-sm text-muted-foreground mt-2">Registration Fee</p>
                    <p className="text-xl font-bold text-primary">₦{parseInt(selectedService.price).toLocaleString()}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Proposed Business Name *</Label>
                    <Input 
                      placeholder="Enter proposed business name" 
                      value={formData.businessName || ''} 
                      onChange={(e) => handleInputChange('businessName', e.target.value)} 
                    />
                    <p className="text-xs text-muted-foreground">Provide 2-3 name options in case your first choice is taken</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Nature of Business</Label>
                    <Input 
                      placeholder="e.g., Trading, Consulting, Technology" 
                      value={formData.businessNature || ''} 
                      onChange={(e) => handleInputChange('businessNature', e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Business Address</Label>
                  <Textarea 
                    placeholder="Enter full business address" 
                    value={formData.businessAddress || ''} 
                    onChange={(e) => handleInputChange('businessAddress', e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Select value={formData.businessState || ''} onValueChange={(val) => handleInputChange('businessState', val)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        {NIGERIAN_STATES.map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>LGA</Label>
                    <Input 
                      placeholder="Local Government Area" 
                      value={formData.businessLga || ''} 
                      onChange={(e) => handleInputChange('businessLga', e.target.value)} 
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Proprietor Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input 
                        placeholder="Proprietor's full name" 
                        value={formData.proprietorName || ''} 
                        onChange={(e) => handleInputChange('proprietorName', e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input 
                        placeholder="e.g., 08012345678" 
                        value={formData.proprietorPhone || ''} 
                        onChange={(e) => handleInputChange('proprietorPhone', e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input 
                        type="email"
                        placeholder="Proprietor's email" 
                        value={formData.proprietorEmail || ''} 
                        onChange={(e) => handleInputChange('proprietorEmail', e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>NIN (National Identification Number)</Label>
                      <Input 
                        placeholder="11-digit NIN" 
                        maxLength={11}
                        value={formData.proprietorNin || ''} 
                        onChange={(e) => handleInputChange('proprietorNin', e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                {(formData.serviceType === 'company_limited' || formData.serviceType === 'company_guarantee') && (
                  <div className="space-y-2">
                    <Label>Share Capital (₦)</Label>
                    <Input 
                      type="number"
                      placeholder="e.g., 1000000" 
                      value={formData.shareCapital || ''} 
                      onChange={(e) => handleInputChange('shareCapital', e.target.value)} 
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Business Objectives</Label>
                  <Textarea 
                    placeholder="Describe what your business will do..." 
                    rows={3}
                    value={formData.objectives || ''} 
                    onChange={(e) => handleInputChange('objectives', e.target.value)} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Additional Notes (Optional)</Label>
                  <Textarea 
                    placeholder="Any additional information for the processing agent..." 
                    rows={2}
                    value={formData.customerNotes || ''} 
                    onChange={(e) => handleInputChange('customerNotes', e.target.value)} 
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold" 
                  disabled={loading || !formData.serviceType || !formData.businessName || !formData.proprietorName}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Registration Request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />My Registration Requests</CardTitle>
              <CardDescription>Track the status of your CAC registration requests</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No registration requests yet</p>
                  <p className="text-sm">Submit your first CAC registration request above</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => {
                    const statusConfig = STATUS_COLORS[req.status] || STATUS_COLORS.submitted;
                    const StatusIcon = statusConfig.icon;
                    return (
                      <div key={req.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{req.businessName}</p>
                            <p className="text-sm text-muted-foreground capitalize">{req.serviceType?.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button variant="outline" size="sm" onClick={() => openChat(req)} className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            Chat
                          </Button>
                          {req.status === 'completed' && req.certificateUrl && (
                            <Button variant="outline" size="sm" asChild className="flex items-center gap-1">
                              <a href={req.certificateUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                                Certificate
                              </a>
                            </Button>
                          )}
                          <div className="text-right">
                            <p className="font-bold">₦{parseFloat(req.fee).toLocaleString()}</p>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                              <StatusIcon className="h-3 w-3" />
                              {req.status?.replace(/_/g, ' ')}
                            </span>
                            {req.cacRegistrationNumber && (
                              <p className="text-xs text-green-600 mt-1">RC: {req.cacRegistrationNumber}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirm Registration Request
            </DialogTitle>
            <DialogDescription>Please review the details before confirming. The registration fee will be deducted from your wallet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-l-4 border-primary pl-4">
              <p className="text-sm text-muted-foreground">Registration Type</p>
              <p className="font-semibold">{selectedService?.name}</p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <p className="text-sm text-muted-foreground">Business Name</p>
              <p className="font-semibold">{formData.businessName}</p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <p className="text-sm text-muted-foreground">Proprietor</p>
              <p className="font-semibold">{formData.proprietorName}</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm text-muted-foreground">Registration Fee</p>
              <p className="font-bold text-lg text-green-600">₦{selectedService?.price ? parseInt(selectedService.price).toLocaleString() : '0'}</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmation(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Pay & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Chat with Agent
            </DialogTitle>
            <DialogDescription>
              {chatRequest?.businessName} - {chatRequest?.serviceType?.replace(/_/g, ' ')}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-[300px] max-h-[400px] border rounded-lg p-3">
            {loadingMessages ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Start a conversation with your agent</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 ${msg.senderType === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.senderType === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          <div className="flex gap-2 pt-2">
            <Input 
              placeholder="Type your message..." 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={sendingMessage}
            />
            <Button onClick={sendMessage} disabled={sendingMessage || !newMessage.trim()}>
              {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
