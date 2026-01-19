import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit, Save, X, DollarSign, TrendingUp, Layers, AlertCircle, Loader2, Plus, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ServicePrice {
  id: string;
  serviceType: string;
  serviceName: string;
  costPrice: number;
  price: number;
  markup: number;
  description: string | null;
  isActive: boolean;
}

const SERVICE_DEFINITIONS: Record<string, { category: string; name: string; description: string }> = {
  // Identity Services
  nin_verification: { category: 'Identity', name: 'NIN Verification', description: 'Verify National Identification Number' },
  nin_phone: { category: 'Identity', name: 'NIN Phone Lookup', description: 'Retrieve NIN using phone number' },
  nin_recovery: { category: 'Identity', name: 'NIN Recovery', description: 'Recover lost NIN details' },
  nin_slip_information: { category: 'Identity', name: 'NIN Slip Information', description: 'Get NIN slip information only' },
  nin_slip_regular: { category: 'Identity', name: 'NIN Slip Regular', description: 'Regular NIN slip printing' },
  nin_slip_standard: { category: 'Identity', name: 'NIN Slip Standard', description: 'Standard NIN slip with enhanced features' },
  nin_slip_premium: { category: 'Identity', name: 'NIN Slip Premium', description: 'Premium NIN slip with all features' },
  bvn_verification: { category: 'Identity', name: 'BVN Verification', description: 'Verify Bank Verification Number' },
  bvn_phone_lookup: { category: 'Identity', name: 'BVN Phone Lookup', description: 'Retrieve BVN using phone number' },
  birth_attestation: { category: 'Identity', name: 'Birth Attestation', description: 'Birth certificate attestation service' },
  // Manual Identity Services (handled by Identity Agents)
  nin_validation: { category: 'Identity Agent', name: 'NIN Validation', description: 'Update NIN record (name/address/phone - manual processing)' },
  ipe_clearance: { category: 'Identity Agent', name: 'IPE Clearance', description: 'Get old NIN using new tracking ID with fingerprint recapture' },
  nin_personalization: { category: 'Identity Agent', name: 'NIN Personalization', description: 'Get NIN slip using tracking ID' },
  // Wallet Services
  wallet_virtual_account: { category: 'Wallet', name: 'Virtual Account Creation', description: 'PayVessel virtual account generation' },
  wallet_transfer: { category: 'Wallet', name: 'Wallet Transfer', description: 'Transfer between wallets' },
  wallet_withdrawal: { category: 'Wallet', name: 'Bank Withdrawal', description: 'Withdraw to bank account' },
  // Education Services
  jamb_result: { category: 'Education', name: 'JAMB Result', description: 'Check JAMB examination results' },
  jamb_admission: { category: 'Education', name: 'JAMB Admission Status', description: 'Check JAMB admission status' },
  jamb_caps: { category: 'Education', name: 'JAMB CAPS', description: 'JAMB CAPS acceptance/rejection' },
  waec_result: { category: 'Education', name: 'WAEC Result', description: 'Check WAEC examination results' },
  waec_scratch_card: { category: 'Education', name: 'WAEC Scratch Card', description: 'WAEC result checker scratch card' },
  neco_result: { category: 'Education', name: 'NECO Result', description: 'Check NECO examination results' },
  neco_scratch_card: { category: 'Education', name: 'NECO Scratch Card', description: 'NECO result checker scratch card' },
  nabteb_result: { category: 'Education', name: 'NABTEB Result', description: 'Check NABTEB examination results' },
  nbais_result: { category: 'Education', name: 'NBAIS Result', description: 'Check NBAIS examination results' },
  // CAC Services
  cac_business_name: { category: 'CAC', name: 'CAC Business Name', description: 'Register business name with CAC' },
  cac_limited_company: { category: 'CAC', name: 'CAC Limited Company', description: 'Register limited liability company' },
  cac_incorporated_trustees: { category: 'CAC', name: 'CAC Incorporated Trustees', description: 'Register incorporated trustees/NGO' },
  cac_name_search: { category: 'CAC', name: 'CAC Name Search', description: 'Search for business name availability' },
  cac_status_report: { category: 'CAC', name: 'CAC Status Report', description: 'Get CAC company status report' },
  // VTU Services - Airtime
  airtime_mtn: { category: 'VTU Airtime', name: 'MTN Airtime', description: 'MTN airtime top-up' },
  airtime_glo: { category: 'VTU Airtime', name: 'Glo Airtime', description: 'Glo airtime top-up' },
  airtime_airtel: { category: 'VTU Airtime', name: 'Airtel Airtime', description: 'Airtel airtime top-up' },
  airtime_9mobile: { category: 'VTU Airtime', name: '9mobile Airtime', description: '9mobile airtime top-up' },
  // VTU Services - Data
  data_mtn: { category: 'VTU Data', name: 'MTN Data', description: 'MTN data bundle purchase' },
  data_glo: { category: 'VTU Data', name: 'Glo Data', description: 'Glo data bundle purchase' },
  data_airtel: { category: 'VTU Data', name: 'Airtel Data', description: 'Airtel data bundle purchase' },
  data_9mobile: { category: 'VTU Data', name: '9mobile Data', description: '9mobile data bundle purchase' },
  // VTU Services - Electricity
  electricity_ikeja: { category: 'VTU Electricity', name: 'Ikeja Electric', description: 'Ikeja Electric prepaid/postpaid' },
  electricity_eko: { category: 'VTU Electricity', name: 'Eko Electric', description: 'Eko Electric prepaid/postpaid' },
  electricity_abuja: { category: 'VTU Electricity', name: 'Abuja Electric', description: 'Abuja Electric prepaid/postpaid' },
  electricity_ibadan: { category: 'VTU Electricity', name: 'Ibadan Electric', description: 'Ibadan Electric prepaid/postpaid' },
  electricity_port_harcourt: { category: 'VTU Electricity', name: 'Port Harcourt Electric', description: 'PHED prepaid/postpaid' },
  electricity_kaduna: { category: 'VTU Electricity', name: 'Kaduna Electric', description: 'Kaduna Electric prepaid/postpaid' },
  electricity_kano: { category: 'VTU Electricity', name: 'Kano Electric', description: 'Kano Electric prepaid/postpaid' },
  electricity_jos: { category: 'VTU Electricity', name: 'Jos Electric', description: 'Jos Electric prepaid/postpaid' },
  electricity_enugu: { category: 'VTU Electricity', name: 'Enugu Electric', description: 'Enugu Electric prepaid/postpaid' },
  electricity_benin: { category: 'VTU Electricity', name: 'Benin Electric', description: 'Benin Electric prepaid/postpaid' },
  // VTU Services - Cable TV
  cable_dstv: { category: 'VTU Cable', name: 'DSTV', description: 'DSTV subscription payment' },
  cable_gotv: { category: 'VTU Cable', name: 'GOtv', description: 'GOtv subscription payment' },
  cable_startimes: { category: 'VTU Cable', name: 'Startimes', description: 'Startimes subscription payment' },
  cable_showmax: { category: 'VTU Cable', name: 'Showmax', description: 'Showmax subscription payment' },
};

const SERVICE_CATEGORIES: Record<string, string> = Object.fromEntries(
  Object.entries(SERVICE_DEFINITIONS).map(([key, val]) => [key, val.category])
);

const CATEGORY_LIST = ['Identity', 'Identity Agent', 'Wallet', 'Education', 'CAC', 'VTU Airtime', 'VTU Data', 'VTU Electricity', 'VTU Cable'];

const getAuthToken = () => localStorage.getItem('accessToken');

export default function AdminPricing() {
  const { toast } = useToast();
  const [pricing, setPricing] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newService, setNewService] = useState({ serviceType: '', serviceName: '', price: 0, description: '' });
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<ServicePrice | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/pricing', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setPricing(data.data.pricing.map((p: any) => ({
          ...p,
          price: parseFloat(p.price),
          costPrice: parseFloat(p.costPrice || "0"),
          markup: parseFloat(p.markup || "0")
        })));
      }
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
    } finally {
      setLoading(false);
    }
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ServicePrice | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const getCategory = (serviceType: string) => SERVICE_CATEGORIES[serviceType] || 'Other';
  const pricingWithCategory = pricing.map(p => ({ ...p, category: getCategory(p.serviceType) }));
  const filteredPricing = filter === "all" ? pricingWithCategory : pricingWithCategory.filter(p => p.category === filter);
  const categories = ["all", ...Array.from(new Set(pricingWithCategory.map(p => p.category)))];

  const totalServices = pricing.length;
  const activeServices = pricing.filter(p => p.isActive).length;
  const averagePrice = pricing.length > 0 ? Math.round(pricing.reduce((sum, p) => sum + p.price, 0) / pricing.length) : 0;

  const handleEdit = (item: ServicePrice) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSave = async () => {
    if (!editForm) return;
    setSaving(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/pricing/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          price: editForm.price, 
          costPrice: editForm.costPrice,
          markup: editForm.markup,
          isActive: editForm.isActive, 
          description: editForm.description 
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast({ title: "Price Updated", description: `${editForm.serviceName} price has been updated` });
        fetchPricing();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update price", variant: "destructive" });
    } finally {
      setSaving(false);
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const toggleActive = async (id: string) => {
    const item = pricing.find(p => p.id === id);
    if (!item) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/pricing/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast({ title: item.isActive ? "Service Disabled" : "Service Enabled", description: `${item.serviceName} has been ${item.isActive ? "disabled" : "enabled"}` });
        fetchPricing();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handleAddService = async () => {
    if (!newService.serviceType || !newService.serviceName || newService.price <= 0) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newService)
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast({ title: "Service Added", description: `${newService.serviceName} has been added` });
        setShowAddDialog(false);
        setNewService({ serviceType: '', serviceName: '', price: 0, description: '' });
        fetchPricing();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add service", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (item: ServicePrice) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setSaving(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/pricing/${deletingItem.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast({ title: "Service Deleted", description: `${deletingItem.serviceName} has been removed` });
        fetchPricing();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete service", variant: "destructive" });
    } finally {
      setSaving(false);
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const handleSeedPricing = async () => {
    setSeeding(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/pricing/seed', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast({ 
          title: "Default Prices Seeded", 
          description: `Created ${data.data.created} services, ${data.data.skipped} already existed` 
        });
        fetchPricing();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to seed pricing", variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const getServicesForCategory = (category: string) => {
    return Object.entries(SERVICE_DEFINITIONS)
      .filter(([_, def]) => def.category === category)
      .filter(([key]) => !pricing.some(p => p.serviceType === key))
      .map(([key, def]) => ({ key, ...def }));
  };

  const handleServiceTypeSelect = (serviceType: string) => {
    const def = SERVICE_DEFINITIONS[serviceType];
    if (def) {
      setNewService({
        serviceType,
        serviceName: def.name,
        price: 0,
        description: def.description
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-tight">Pricing Management</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Configure service prices and manage pricing tiers</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium truncate pr-2">Total Services</CardTitle>
            <Layers className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold">{totalServices}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Configured services</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium truncate pr-2">Active</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{activeServices}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Currently enabled</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium truncate pr-2">Avg Price</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">₦{averagePrice.toLocaleString()}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Across all services</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium truncate pr-2">Inactive</CardTitle>
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">{totalServices - activeServices}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Disabled services</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg">Service Pricing</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Manage prices for all platform services</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSeedPricing} variant="outline" className="gap-2" disabled={seeding}>
                  {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="hidden sm:inline">Seed Defaults</span>
                </Button>
                <Button onClick={() => { setSelectedCategory(''); setNewService({ serviceType: '', serviceName: '', price: 0, description: '' }); setShowAddDialog(true); }} className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Service</span>
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/vtu/scrape-data', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
                      });
                      if (res.ok) {
                        toast({ title: "Scrape Started", description: "Data pricing scrape job has been queued." });
                      }
                    } catch (e) {
                      toast({ title: "Error", description: "Failed to start scrape", variant: "destructive" });
                    }
                  }} 
                  variant="secondary" 
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Scrap VTPass</span>
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={filter === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(cat)}
                  className="capitalize text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">Service</th>
                  <th className="p-3 text-left font-medium">Category</th>
                  <th className="p-3 text-left font-medium">Cost Price</th>
                  <th className="p-3 text-left font-medium">Markup/Profit</th>
                  <th className="p-3 text-left font-medium">Selling Price</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPricing.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-3 font-medium">
                      {editingId === item.id ? (
                        <Input
                          value={editForm?.serviceName || ""}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, serviceName: e.target.value } : null)}
                          className="w-full h-8"
                        />
                      ) : (
                        item.serviceName
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="capitalize text-xs">{item.category}</Badge>
                    </td>
                    <td className="p-3">
                      {editingId === item.id ? (
                        <Input
                          type="number"
                          value={editForm?.costPrice || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEditForm(prev => prev ? { ...prev, costPrice: val, price: val + (prev.markup || 0) } : null);
                          }}
                          className="w-24 h-8"
                        />
                      ) : (
                        <span className="text-muted-foreground">₦{item.costPrice.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {editingId === item.id ? (
                        <Input
                          type="number"
                          value={editForm?.markup || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEditForm(prev => prev ? { ...prev, markup: val, price: (prev.costPrice || 0) + val } : null);
                          }}
                          className="w-24 h-8"
                        />
                      ) : (
                        <span className="text-blue-600 font-medium">+₦{item.markup.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {editingId === item.id ? (
                        <Input
                          type="number"
                          value={editForm?.price || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEditForm(prev => prev ? { ...prev, price: val, markup: val - (prev.costPrice || 0) } : null);
                          }}
                          className="w-24 h-8"
                        />
                      ) : (
                        <span className="font-semibold text-green-600">₦{item.price.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="p-3 max-w-[200px] truncate text-muted-foreground text-xs">
                      {editingId === item.id ? (
                        <Input
                          value={editForm?.description || ""}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, description: e.target.value } : null)}
                          className="w-full h-8"
                        />
                      ) : (
                        item.description
                      )}
                    </td>
                    <td className="p-3">
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => toggleActive(item.id)}
                      />
                    </td>
                    <td className="p-3 text-right">
                      {editingId === item.id ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={handleCancel} className="h-8 w-8 p-0">
                            <X className="h-4 w-4" />
                          </Button>
                          <Button size="sm" onClick={handleSave} className="h-8 w-8 p-0">
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(item)} className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteClick(item)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3 px-4 pb-4">
            {filteredPricing.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      {editingId === item.id ? (
                        <Input
                          value={editForm?.serviceName || ""}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, serviceName: e.target.value } : null)}
                          className="w-full h-8 text-sm mb-2"
                        />
                      ) : (
                        <h3 className="font-semibold text-sm truncate">{item.serviceName}</h3>
                      )}
                      <Badge variant="outline" className="capitalize text-[10px] mt-1">{item.category}</Badge>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {editingId === item.id ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 w-7 p-0">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" onClick={handleSave} className="h-7 w-7 p-0">
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(item)} className="h-7 w-7 p-0">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteClick(item)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {editingId === item.id ? (
                      <Input
                        value={editForm?.description || ""}
                        onChange={(e) => setEditForm(prev => prev ? { ...prev, description: e.target.value } : null)}
                        className="w-full h-8 text-xs"
                        placeholder="Description"
                      />
                    ) : (
                      item.description
                    )}
                  </p>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      {editingId === item.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">₦</span>
                          <Input
                            type="number"
                            value={editForm?.price || 0}
                            onChange={(e) => setEditForm(prev => prev ? { ...prev, price: Number(e.target.value) } : null)}
                            className="w-20 h-7 text-sm"
                          />
                        </div>
                      ) : (
                        <span className="font-bold text-green-600 text-base">₦{item.price.toLocaleString()}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{item.isActive ? "Active" : "Inactive"}</span>
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => toggleActive(item.id)}
                        className="scale-90"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
            <DialogDescription>
              Add a new service to the platform with pricing
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={(val) => { setSelectedCategory(val); setNewService({ serviceType: '', serviceName: '', price: 0, description: '' }); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_LIST.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCategory && (
              <div className="grid gap-2">
                <Label>Service Type</Label>
                <Select value={newService.serviceType} onValueChange={handleServiceTypeSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {getServicesForCategory(selectedCategory).map(svc => (
                      <SelectItem key={svc.key} value={svc.key}>{svc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {newService.serviceType && (
              <>
                <div className="grid gap-2">
                  <Label>Service Name</Label>
                  <Input
                    value={newService.serviceName}
                    onChange={(e) => setNewService(prev => ({ ...prev, serviceName: e.target.value }))}
                    placeholder="Service display name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Price (NGN)</Label>
                  <Input
                    type="number"
                    value={newService.price}
                    onChange={(e) => setNewService(prev => ({ ...prev, price: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input
                    value={newService.description}
                    onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Service description"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddService} disabled={saving || !newService.serviceType || newService.price <= 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingItem?.serviceName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
