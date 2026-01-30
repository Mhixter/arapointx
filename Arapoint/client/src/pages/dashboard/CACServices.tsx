import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Loader2, AlertCircle, ArrowLeft, Check, History, FileText, Clock, CheckCircle2, XCircle, MessageCircle, Send, X, Download, Shield, Upload, Image, CheckCheck, Paperclip, FileIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NIGERIAN_STATES_LGA } from "@/lib/locationData";
import { ObjectUploader } from "@/components/ObjectUploader";

const CAC_BUSINESS_NATURES = [
  "Abattoir and Meat Selling Services",
  "Accommodation Services",
  "Accounting/Auditing Consultancy",
  "Accounting/Auditing, Taxation and Financial Management Consultancy",
  "Advertising and Marketing Services",
  "Agricultural Engineering",
  "Agricultural Products Trading",
  "Air Transport Services",
  "Aluminum Manufacturing, Works, Sales and Fittings",
  "Ambulance Services",
  "Animal Husbandry Services",
  "Apprenticeship and Training Services",
  "Aquarium Services",
  "Arbitration/Mediation Services",
  "Architectural Practice and Consultancy",
  "Art Galleries, Museums and Monuments Services",
  "Auto Parts Sales and Services",
  "Automobile Repairs and Services",
  "Banking and Financial Services",
  "Barbing/Hair Dressing Services",
  "Beauty and Cosmetics Services",
  "Beverages Production and Sales",
  "Block Making and Building Materials",
  "Broadcasting Services",
  "Building Construction",
  "Business Consulting",
  "Catering Services",
  "Chemical and Allied Products",
  "Civil Engineering",
  "Cleaning Services",
  "Clothing and Fashion",
  "Communications and Telecommunications",
  "Computer Hardware and Software Sales",
  "Construction and Engineering",
  "Crop and Animal Production",
  "Curriculum Planning/Development",
  "Cybercafe and Business Center",
  "Deal in General Goods and Manufacturers' Representatives",
  "Dental Practices and Services",
  "Domestic Support Services",
  "Driving School Services",
  "Dry Cleaning and Laundry Services",
  "E-Commerce and Online Trading",
  "Education",
  "Educational Services and Consultancy",
  "Electrical Engineering Services",
  "Electronics Sales and Repairs",
  "Entertainment and Events Management",
  "Environmental Consultancy",
  "Estate Agency and Property Management",
  "Events Management and Planning",
  "Extraction of Crude Petroleum and Natural Gas",
  "Farming",
  "Fashion Designing/Tailoring Services",
  "Feasibility Studies",
  "Film Production Services",
  "Financial Consultancy",
  "Financial Services Activities",
  "Fire and Safety Services",
  "Fish Farming/Aquaculture",
  "Fishing and Aquaculture",
  "Food and Beverages Services",
  "Food Production and Processing",
  "Freight Forwarding",
  "Fuel/Petroleum Products Sales",
  "Furniture Making and Sales",
  "General Contractors",
  "General Merchandise Trading",
  "General Trading",
  "Health and Medical Services",
  "Haulage and Logistics",
  "Hospitality Services",
  "Hotel and Accommodation Services",
  "Human Resource Management",
  "ICT Consulting and Services",
  "Import and Export",
  "Information Technology Services",
  "Insurance Services",
  "Interior Decoration",
  "Internet Services",
  "Investment and Securities",
  "Jewelry Making and Sales",
  "Laboratory Services",
  "Land Surveying",
  "Legal Services and Consultancy",
  "Livestock Farming",
  "Logistics and Supply Chain",
  "Manufacturing",
  "Marine and Shipping Services",
  "Marketing and Sales",
  "Mechanical Engineering",
  "Media and Publishing",
  "Medical Laboratory Services",
  "Mining and Quarrying",
  "Oil and Gas Services",
  "Packaging Services",
  "Pharmaceutical Services",
  "Photography and Video Services",
  "Plumbing Services",
  "Poultry Farming",
  "Printing and Publishing",
  "Project Management",
  "Property Development",
  "Public Relations",
  "Real Estate",
  "Recreation and Sports",
  "Recycling Services",
  "Renewable Energy",
  "Restaurant and Food Services",
  "Retail Trading",
  "Road Transportation",
  "Security Services",
  "Software Development",
  "Solar Energy Installation",
  "Stationery and Office Supplies",
  "Supermarket and Retail",
  "Telecommunications",
  "Textile Manufacturing",
  "Tourism and Travel Agency",
  "Training and Capacity Building",
  "Transportation and Logistics",
  "Waste Management",
  "Water Supply and Treatment",
  "Welding and Fabrication",
  "Wholesale and Retail Trade",
  "Wood Processing and Furniture",
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
  const [businessNatureOpen, setBusinessNatureOpen] = useState(false);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [ninSlipPreview, setNinSlipPreview] = useState<string | null>(null);
  const [uploadingPassport, setUploadingPassport] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingNinSlip, setUploadingNinSlip] = useState(false);
  const [agentOnlineStatus, setAgentOnlineStatus] = useState<{ isOnline: boolean; lastSeen: string | null }>({ isOnline: false, lastSeen: null });

  const handleFileUpload = async (file: File, type: 'passport' | 'signature' | 'ninSlip') => {
    const setUploading = type === 'passport' ? setUploadingPassport : type === 'signature' ? setUploadingSignature : setUploadingNinSlip;
    const setPreview = type === 'passport' ? setPassportPreview : type === 'signature' ? setSignaturePreview : setNinSlipPreview;
    const fieldName = type === 'passport' ? 'passportPhotoUrl' : type === 'signature' ? 'signatureUrl' : 'ninSlipUrl';
    
    setUploading(true);
    try {
      // 1. Request presigned URL from backend
      const response = await fetch('/api/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || 'application/octet-stream',
        }),
      });
      
      if (!response.ok) throw new Error('Failed to get upload URL');
      
      const { uploadURL, objectPath } = await response.json();
      
      // 2. Upload file directly to presigned URL
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload to storage');

      // 3. Update state with object path (served via /objects/... route)
      const publicUrl = objectPath;
      setPreview(URL.createObjectURL(file));
      setFormData((prev: any) => ({ ...prev, [fieldName]: publicUrl }));
      
      toast({ title: "Uploaded", description: `${type === 'passport' ? 'Passport photo' : type === 'signature' ? 'Signature' : 'NIN slip'} uploaded successfully` });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Upload failed", description: "Failed to upload file to secure storage", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

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

  const formatLastSeen = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

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
        if (data.data.agentStatus) {
          setAgentOnlineStatus(data.data.agentStatus);
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async (file?: File) => {
    if (!newMessage.trim() && !file && !chatRequest) return;
    setSendingMessage(true);
    try {
      const token = getAuthToken();
      let fileData = null;

      if (file) {
        // 1. Request presigned URL from backend
        const presignedResponse = await fetch('/api/uploads/request-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type || 'application/octet-stream',
          }),
        });
        
        if (!presignedResponse.ok) throw new Error('Failed to get upload URL');
        
        const { uploadURL, objectPath } = await presignedResponse.json();
        
        // 2. Upload file directly to presigned URL
        const uploadResponse = await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        });

        if (!uploadResponse.ok) throw new Error('Failed to upload file');
        
        fileData = {
          url: objectPath,
          name: file.name,
          type: file.type
        };
      }

      const response = await fetch(`/api/cac/requests/${chatRequest.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          message: newMessage.trim(),
          fileUrl: fileData?.url,
          fileName: fileData?.name,
          fileType: fileData?.type
        })
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
          if (data.data.agentStatus) {
            setAgentOnlineStatus(data.data.agentStatus);
          }
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
                    <Label>Nature of Business *</Label>
                    <Popover open={businessNatureOpen} onOpenChange={setBusinessNatureOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={businessNatureOpen} className="w-full justify-between h-10 font-normal">
                          {formData.businessNature || "Select nature of business..."}
                          <Check className={`ml-2 h-4 w-4 shrink-0 ${formData.businessNature ? "opacity-100" : "opacity-0"}`} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search business category..." />
                          <CommandList>
                            <CommandEmpty>No category found.</CommandEmpty>
                            <CommandGroup className="max-h-[300px] overflow-y-auto">
                              {CAC_BUSINESS_NATURES.map((nature) => (
                                <CommandItem
                                  key={nature}
                                  value={nature}
                                  onSelect={() => {
                                    handleInputChange('businessNature', nature);
                                    setBusinessNatureOpen(false);
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${formData.businessNature === nature ? "opacity-100" : "opacity-0"}`} />
                                  {nature}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">Select from CAC approved categories</p>
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
                    <Select value={formData.businessState || ''} onValueChange={(val) => {
                      handleInputChange('businessState', val);
                      handleInputChange('businessLga', ''); // Reset LGA when state changes
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <ScrollArea className="h-80">
                          {NIGERIAN_STATES_LGA.map((item) => (
                            <SelectItem key={item.state} value={item.state}>{item.state}</SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>LGA</Label>
                    <Select 
                      disabled={!formData.businessState}
                      value={formData.businessLga || ''} 
                      onValueChange={(val) => handleInputChange('businessLga', val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={formData.businessState ? "Select LGA" : "Select State first"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <ScrollArea className="h-80">
                          {formData.businessState && NIGERIAN_STATES_LGA.find(s => s.state === formData.businessState)?.lgas.map((lga) => (
                            <SelectItem key={lga} value={lga}>{lga}</SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
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

                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold">Required Documents</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Passport Photo *</Label>
                      <div className="relative group cursor-pointer border-2 border-dashed border-muted rounded-lg aspect-square flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-colors"
                        onClick={() => document.getElementById('passport-upload')?.click()}>
                        {passportPreview ? (
                          <img src={passportPreview} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center">
                            <Image className="h-8 w-8 text-muted-foreground" />
                            <span className="text-[10px] mt-2">Upload Passport</span>
                          </div>
                        )}
                        <input id="passport-upload" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'passport')} />
                        {uploadingPassport && <div className="absolute inset-0 bg-background/50 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Proprietor Signature *</Label>
                      <div className="relative group cursor-pointer border-2 border-dashed border-muted rounded-lg aspect-square flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-colors"
                        onClick={() => document.getElementById('signature-upload')?.click()}>
                        {signaturePreview ? (
                          <img src={signaturePreview} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center">
                            <Shield className="h-8 w-8 text-muted-foreground" />
                            <span className="text-[10px] mt-2">Upload Signature</span>
                          </div>
                        )}
                        <input id="signature-upload" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'signature')} />
                        {uploadingSignature && <div className="absolute inset-0 bg-background/50 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">NIN Slip Photo *</Label>
                      <div className="relative group cursor-pointer border-2 border-dashed border-muted rounded-lg aspect-square flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-colors"
                        onClick={() => document.getElementById('ninslip-upload')?.click()}>
                        {ninSlipPreview ? (
                          <img src={ninSlipPreview} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <span className="text-[10px] mt-2">Upload NIN Slip</span>
                          </div>
                        )}
                        <input id="ninslip-upload" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'ninSlip')} />
                        {uploadingNinSlip && <div className="absolute inset-0 bg-background/50 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                      </div>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-2" />}
                  Review & Submit
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Registration History</CardTitle>
              <CardDescription>View status and communicate with agents about your registrations.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No registration requests found.</div>
              ) : (
                <div className="space-y-4">
                  {requests.map((req) => {
                    const status = STATUS_COLORS[req.status] || STATUS_COLORS.submitted;
                    const StatusIcon = status.icon;
                    return (
                      <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card gap-4 hover:border-primary/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{req.businessName}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${status.bg} ${status.text} flex items-center gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {req.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{req.serviceName || req.serviceType.replace('_', ' ')}</p>
                          <p className="text-[10px] text-muted-foreground italic">Ref: {req.id.substring(0, 8)} • {new Date(req.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8" onClick={() => openChat(req)}>
                            <MessageCircle className="h-4 w-4 mr-1.5" />
                            Chat {req.unreadCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-600 text-white rounded-full text-[10px]">{req.unreadCount}</span>}
                          </Button>
                          {req.status === 'completed' && req.certificateUrl && (
                            <Button variant="default" size="sm" className="h-8 bg-green-600 hover:bg-green-700" asChild>
                              <a href={req.certificateUrl} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4 mr-1.5" />Certificate</a>
                            </Button>
                          )}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Registration Request</DialogTitle>
            <DialogDescription>Please review your details before submitting.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium text-right">{serviceTypes.find(s => s.code === formData.serviceType)?.name}</span>
              <span className="text-muted-foreground">Business:</span>
              <span className="font-medium text-right">{formData.businessName}</span>
              <span className="text-muted-foreground">Proprietor:</span>
              <span className="font-medium text-right">{formData.proprietorName}</span>
              <span className="text-muted-foreground">Registration Fee:</span>
              <span className="font-bold text-primary text-right">₦{parseInt(formData.fee || 0).toLocaleString()}</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-md border border-amber-100 flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Registration fees are non-refundable once the agent begins processing. Manual processing starts within 24 hours.</p>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowConfirmation(false)} className="sm:flex-1">Edit Info</Button>
            <Button onClick={handleConfirm} disabled={loading} className="sm:flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCheck className="h-4 w-4 mr-2" />}
              Confirm & Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="max-w-xl h-[600px] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-base">{chatRequest?.businessName}</DialogTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`h-2 w-2 rounded-full ${agentOnlineStatus.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                    <span className="text-[10px] text-muted-foreground">Agent: {agentOnlineStatus.isOnline ? 'Online' : `Last seen ${formatLastSeen(agentOnlineStatus.lastSeen)}`}</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}><X className="h-4 w-4" /></Button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {loadingMessages ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-10">
                  <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Start a conversation with the agent regarding your registration.</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isUser = msg.senderType === 'user';
                  return (
                    <div key={msg.id || i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isUser ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted rounded-tl-none'}`}>
                        {msg.fileUrl ? (
                          <div className="flex flex-col gap-2">
                            {msg.fileType?.startsWith('image/') ? (
                              <img src={msg.fileUrl} alt={msg.fileName} className="max-w-full rounded-lg cursor-pointer" onClick={() => window.open(msg.fileUrl, '_blank')} />
                            ) : (
                              <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded bg-background/10 hover:bg-background/20">
                                <FileIcon className="h-4 w-4" />
                                <span className="underline truncate max-w-[150px]">{msg.fileName || 'Download File'}</span>
                              </a>
                            )}
                            {msg.message && msg.message !== 'Sent a file' && <p>{msg.message}</p>}
                          </div>
                        ) : (
                          <p>{msg.message}</p>
                        )}
                        <span className={`text-[9px] mt-1 block opacity-70 ${isUser ? 'text-right' : 'text-left'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isUser && <span className="ml-1">{msg.isRead ? '✓✓' : '✓'}</span>}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-11 w-11 rounded-full flex-shrink-0"
                disabled={sendingMessage}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.onchange = (e: any) => {
                    const file = e.target.files[0];
                    if (file) sendMessage(file);
                  };
                  input.click();
                }}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input 
                placeholder="Type your message..." 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()} 
                disabled={sendingMessage} 
                className="h-11" 
              />
              <Button 
                size="icon" 
                className="h-11 w-11 rounded-full flex-shrink-0" 
                onClick={() => sendMessage()} 
                disabled={sendingMessage || (!newMessage.trim() && !sendingMessage)}
              >
                {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
