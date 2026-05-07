import { tokenStorage } from '@/lib/tokenStorage';
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Save, X, DollarSign, TrendingUp, Layers, AlertCircle, Loader2, Plus, Trash2, RefreshCw, Download, Wifi, WifiOff, Percent, ShieldCheck, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface DataPlan {
  id: string;
  network: string;
  planId: string;
  planName: string;
  costPrice: number;
  sellingPrice: number;
  markupPercent: number;
  isActive: boolean;
  lastScrapedAt?: string;
}

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
  bvn_modification_name: { category: 'Identity Agent', name: 'BVN Name Modification', description: 'Modify name on BVN record' },
  bvn_modification_dob: { category: 'Identity Agent', name: 'BVN Date of Birth Modification', description: 'Modify date of birth on BVN record' },
  birth_attestation: { category: 'Identity', name: 'Birth Attestation', description: 'Birth certificate attestation service' },
  // Manual Identity Services (handled by Identity Agents)
  nin_validation: { category: 'Identity Agent', name: 'NIN Validation', description: 'Update NIN record (name/address/phone - manual processing)' },
  ipe_clearance: { category: 'Identity Agent', name: 'IPE Clearance', description: 'Get old NIN using new tracking ID with fingerprint recapture' },
  nin_personalization: { category: 'Identity Agent', name: 'NIN Personalization', description: 'Get NIN slip using tracking ID' },
  // Wallet Services
  wallet_virtual_account: { category: 'Wallet', name: 'Virtual Account Creation', description: 'PayVessel virtual account generation' },
  wallet_transfer: { category: 'Wallet', name: 'Wallet Transfer', description: 'Transfer between wallets' },
  wallet_withdrawal: { category: 'Wallet', name: 'Bank Withdrawal', description: 'Withdraw to bank account' },
  // Education Services - RPA Lookups
  jamb: { category: 'Education', name: 'JAMB Score Lookup', description: 'Check JAMB examination results via portal' },
  waec: { category: 'Education', name: 'WAEC Result Lookup', description: 'Check WAEC examination results via portal' },
  neco: { category: 'Education', name: 'NECO Result Lookup', description: 'Check NECO examination results via portal' },
  nabteb: { category: 'Education', name: 'NABTEB Result Lookup', description: 'Check NABTEB examination results via portal' },
  nbais: { category: 'Education', name: 'NBAIS Result Lookup', description: 'Check NBAIS examination results via portal' },
  // Education Services - JAMB Agent Services
  'olevel-upload': { category: 'JAMB Services', name: "JAMB O'Level Upload", description: "Upload O'Level results to JAMB portal" },
  'admission-letter': { category: 'JAMB Services', name: 'JAMB Admission Letter', description: 'Retrieve JAMB admission letter' },
  'original-result': { category: 'JAMB Services', name: 'JAMB Original Result', description: 'Retrieve original JAMB result slip' },
  'reprinting-caps': { category: 'JAMB Services', name: 'JAMB Reprinting & Caps', description: 'JAMB CAPS reprinting services' },
  // Education Services - Exam PINs
  waec_pin: { category: 'Education PINs', name: 'WAEC Scratch Card', description: 'WAEC result checker PIN purchase' },
  neco_pin: { category: 'Education PINs', name: 'NECO Scratch Card', description: 'NECO result checker PIN purchase' },
  nabteb_pin: { category: 'Education PINs', name: 'NABTEB Scratch Card', description: 'NABTEB result checker PIN purchase' },
  nbais_pin: { category: 'Education PINs', name: 'NBAIS Scratch Card', description: 'NBAIS result checker PIN purchase' },
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

const CATEGORY_LIST = ['Identity', 'Identity Agent', 'Wallet', 'Education', 'JAMB Services', 'Education PINs', 'CAC', 'VTU Airtime', 'VTU Data', 'VTU Electricity', 'VTU Cable'];

const getAuthToken = () => tokenStorage.getItem('adminToken');

const NETWORK_LABELS: Record<string, string> = { mtn: 'MTN', airtel: 'Airtel', glo: 'Glo', '9mobile': '9mobile' };
const NETWORK_COLORS: Record<string, string> = { mtn: 'text-yellow-600', airtel: 'text-red-600', glo: 'text-green-600', '9mobile': 'text-green-800' };

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

  const [dataPlans, setDataPlans] = useState<Record<string, DataPlan[]>>({});
  const [dataPlansLoading, setDataPlansLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [activeNetwork, setActiveNetwork] = useState('mtn');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanForm, setEditPlanForm] = useState<{ planName: string; costPrice: string; sellingPrice: string; markupPercent: string } | null>(null);
  const [bulkMarkup, setBulkMarkup] = useState<Record<string, string>>({});
  const [applyingBulk, setApplyingBulk] = useState<string | null>(null);
  const [planAggregator, setPlanAggregator] = useState<'airtimenigeria' | 'vtugate' | 'vtpass'>('airtimenigeria');

  // VTUGate plans tab state
  const [vtugPlans, setVtugPlans] = useState<Record<string, DataPlan[]>>({});
  const [vtugLoading, setVtugLoading] = useState(false);
  const [vtugSyncing, setVtugSyncing] = useState(false);
  const [vtugConfigured, setVtugConfigured] = useState(false);
  const [vtugNetwork, setVtugNetwork] = useState('mtn');
  const [vtugBulkMarkup, setVtugBulkMarkup] = useState<Record<string, string>>({});
  const [vtugApplyingBulk, setVtugApplyingBulk] = useState<string | null>(null);
  const [vtugEditingId, setVtugEditingId] = useState<string | null>(null);
  const [vtugEditForm, setVtugEditForm] = useState<{ planName: string; costPrice: string; sellingPrice: string; markupPercent: string } | null>(null);

  // VTPass plans tab state
  const [vtpPlans, setVtpPlans] = useState<Record<string, DataPlan[]>>({});
  const [vtpLoading, setVtpLoading] = useState(false);
  const [vtpSyncing, setVtpSyncing] = useState(false);
  const [vtpConfigured, setVtpConfigured] = useState(false);
  const [vtpNetwork, setVtpNetwork] = useState('mtn');
  const [vtpBulkMarkup, setVtpBulkMarkup] = useState<Record<string, string>>({});
  const [vtpApplyingBulk, setVtpApplyingBulk] = useState<string | null>(null);
  const [vtpEditingId, setVtpEditingId] = useState<string | null>(null);
  const [vtpEditForm, setVtpEditForm] = useState<{ planName: string; costPrice: string; sellingPrice: string; markupPercent: string } | null>(null);

  // Identity costs tab state
  const [identityCosts, setIdentityCosts] = useState<{ prembly: { service: string; costPrice: number; description: string }[]; youverify: { service: string; costPrice: number; description: string }[]; note: string } | null>(null);
  const [identityCostsLoading, setIdentityCostsLoading] = useState(false);

  // Developer API pricing tab state
  type DevApiPrice = { key: string; label: string; description: string; defaultPrice: number; currentPrice: number; isCustom: boolean };
  const [devApiPrices, setDevApiPrices] = useState<DevApiPrice[]>([]);
  const [devApiPricesLoading, setDevApiPricesLoading] = useState(false);
  const [devApiEdits, setDevApiEdits] = useState<Record<string, string>>({});
  const [devApiSaving, setDevApiSaving] = useState(false);

  const fetchDataPlans = async () => {
    setDataPlansLoading(true);
    try {
      const token = tokenStorage.getItem('adminToken');
      const res = await fetch('/api/admin/data-plans?provider=airtimenigeria', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === 'success') {
        setDataPlans(data.data.plans || {});
        setIsConfigured(data.data.isConfigured);
      }
    } catch (e) {
      console.error('Failed to fetch data plans', e);
    } finally {
      setDataPlansLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const token = tokenStorage.getItem('adminToken');
      const res = await fetch('/api/admin/data-plans/sync', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === 'success') {
        const upserted = data.data?.upserted ?? 0;
        if (upserted > 0) {
          toast({ title: `${upserted} Plans Synced`, variant: 'success', description: data.message });
          fetchDataPlans();
        } else {
          // Show the full diagnosis message so the admin knows what the API returned
          toast({ title: 'Sync completed — 0 plans saved', description: data.message, variant: 'destructive', duration: 12000 });
        }
      } else {
        toast({ title: 'Sync Failed', description: data.message, variant: 'destructive', duration: 10000 });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to sync plans', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleApplyBulkMarkup = async (network: string) => {
    const pct = bulkMarkup[network];
    if (!pct) return;
    setApplyingBulk(network);
    try {
      const token = tokenStorage.getItem('adminToken');
      const res = await fetch('/api/admin/data-plans/markup/bulk', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ network, markupPercent: parseFloat(pct) }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast({ title: 'Markup Applied', variant: 'success', description: data.message });
        fetchDataPlans();
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to apply markup', variant: 'destructive' });
    } finally {
      setApplyingBulk(null);
    }
  };

  const handleSavePlan = async (planId: string) => {
    if (!editPlanForm) return;
    try {
      const token = tokenStorage.getItem('adminToken');
      const res = await fetch(`/api/admin/data-plans/${planId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName: editPlanForm.planName,
          costPrice: parseFloat(editPlanForm.costPrice),
          sellingPrice: parseFloat(editPlanForm.sellingPrice),
          markupPercent: parseFloat(editPlanForm.markupPercent),
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast({ title: 'Plan Updated', variant: 'success' });
        fetchDataPlans();
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update plan', variant: 'destructive' });
    } finally {
      setEditingPlanId(null);
      setEditPlanForm(null);
    }
  };

  const handleTogglePlan = async (planId: string, isActive: boolean) => {
    try {
      const token = tokenStorage.getItem('adminToken');
      await fetch(`/api/admin/data-plans/${planId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      fetchDataPlans();
    } catch {
      toast({ title: 'Error', description: 'Failed to toggle plan', variant: 'destructive' });
    }
  };

  const fetchVtugPlans = async () => {
    setVtugLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/data-plans?provider=vtugate', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === 'success') {
        setVtugPlans(data.data.plans || {});
        setVtugConfigured(data.data.vtuGateConfigured || false);
      }
    } catch (e) { console.error('Failed to fetch VTUGate plans', e); }
    finally { setVtugLoading(false); }
  };

  const handleVtugSync = async () => {
    setVtugSyncing(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/vtugate/sync-plans', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === 'success') {
        const total = data.data?.total ?? 0;
        const errors: string[] = data.data?.errors ?? [];
        if (total > 0) {
          toast({ title: 'VTUGate Plans Synced', variant: 'success', description: data.message });
          fetchVtugPlans();
        } else {
          // Show detailed debug info when 0 plans are returned
          const debugMsg = errors.length > 0
            ? `0 plans synced. API response details: ${errors.join(' | ')}`
            : data.message;
          toast({ title: 'VTUGate Sync: 0 Plans', description: debugMsg, variant: 'destructive', duration: 20000 });
        }
      } else {
        toast({ title: 'Sync Failed', description: data.message, variant: 'destructive', duration: 10000 });
      }
    } catch { toast({ title: 'Error', description: 'Failed to sync VTUGate plans', variant: 'destructive' }); }
    finally { setVtugSyncing(false); }
  };

  const handleVtugApplyBulkMarkup = async (network: string) => {
    const pct = vtugBulkMarkup[network];
    if (!pct) return;
    setVtugApplyingBulk(network);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/data-plans/markup/bulk', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ network, markupPercent: parseFloat(pct), provider: 'vtugate' }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast({ title: 'Markup Applied', variant: 'success', description: data.message });
        fetchVtugPlans();
      } else { toast({ title: 'Error', description: data.message, variant: 'destructive' }); }
    } catch { toast({ title: 'Error', description: 'Failed to apply markup', variant: 'destructive' }); }
    finally { setVtugApplyingBulk(null); }
  };

  const handleVtugSavePlan = async (planId: string) => {
    if (!vtugEditForm) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/data-plans/${planId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName: vtugEditForm.planName,
          costPrice: parseFloat(vtugEditForm.costPrice),
          sellingPrice: parseFloat(vtugEditForm.sellingPrice),
          markupPercent: parseFloat(vtugEditForm.markupPercent),
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast({ title: 'Plan Updated', variant: 'success' });
        fetchVtugPlans();
      } else { toast({ title: 'Error', description: data.message, variant: 'destructive' }); }
    } catch { toast({ title: 'Error', description: 'Failed to update plan', variant: 'destructive' }); }
    finally { setVtugEditingId(null); setVtugEditForm(null); }
  };

  const handleVtugTogglePlan = async (planId: string, isActive: boolean) => {
    try {
      const token = getAuthToken();
      await fetch(`/api/admin/data-plans/${planId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      fetchVtugPlans();
    } catch { toast({ title: 'Error', description: 'Failed to toggle plan', variant: 'destructive' }); }
  };

  // VTPass functions
  const fetchVtpPlans = async () => {
    setVtpLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/data-plans?provider=vtpass', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === 'success') {
        setVtpPlans(data.data.plans || {});
      }
    } catch (e) { console.error('Failed to fetch VTPass plans', e); }
    finally { setVtpLoading(false); }
  };

  const handleVtpSync = async () => {
    setVtpSyncing(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/vtpass/sync-plans', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === 'success') {
        const total = data.data?.total ?? 0;
        const errors: string[] = data.data?.errors ?? [];
        if (total > 0) {
          toast({ title: `${total} VTPass Plans Synced`, variant: 'success', description: data.message });
          fetchVtpPlans();
        } else {
          const debugMsg = errors.length > 0
            ? `0 plans synced. Details: ${errors.join(' | ')}`
            : data.message;
          toast({ title: 'VTPass Sync: 0 Plans', description: debugMsg, variant: 'destructive', duration: 15000 });
        }
      } else {
        toast({ title: 'Sync Failed', description: data.message, variant: 'destructive', duration: 10000 });
      }
    } catch { toast({ title: 'Error', description: 'Failed to sync VTPass plans', variant: 'destructive' }); }
    finally { setVtpSyncing(false); }
  };

  const handleVtpApplyBulkMarkup = async (network: string) => {
    const pct = vtpBulkMarkup[network];
    if (!pct) return;
    setVtpApplyingBulk(network);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/data-plans/markup/bulk', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ network, markupPercent: parseFloat(pct), provider: 'vtpass' }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast({ title: 'Markup Applied', variant: 'success', description: data.message });
        fetchVtpPlans();
      } else { toast({ title: 'Error', description: data.message, variant: 'destructive' }); }
    } catch { toast({ title: 'Error', description: 'Failed to apply markup', variant: 'destructive' }); }
    finally { setVtpApplyingBulk(null); }
  };

  const handleVtpSavePlan = async (planId: string) => {
    if (!vtpEditForm) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/data-plans/${planId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName: vtpEditForm.planName,
          costPrice: parseFloat(vtpEditForm.costPrice),
          sellingPrice: parseFloat(vtpEditForm.sellingPrice),
          markupPercent: parseFloat(vtpEditForm.markupPercent),
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast({ title: 'Plan Updated', variant: 'success' });
        fetchVtpPlans();
      } else { toast({ title: 'Error', description: data.message, variant: 'destructive' }); }
    } catch { toast({ title: 'Error', description: 'Failed to update plan', variant: 'destructive' }); }
    finally { setVtpEditingId(null); setVtpEditForm(null); }
  };

  const handleVtpTogglePlan = async (planId: string, isActive: boolean) => {
    try {
      const token = getAuthToken();
      await fetch(`/api/admin/data-plans/${planId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      fetchVtpPlans();
    } catch { toast({ title: 'Error', description: 'Failed to toggle plan', variant: 'destructive' }); }
  };

  const fetchIdentityCosts = async () => {
    setIdentityCostsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/identity/pricing-info', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === 'success') setIdentityCosts(data.data);
    } catch (e) { console.error('Failed to fetch identity pricing', e); }
    finally { setIdentityCostsLoading(false); }
  };

  const fetchDevApiPrices = async () => {
    setDevApiPricesLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/developer-api-prices', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === 'success') {
        setDevApiPrices(data.data.prices || []);
        const edits: Record<string, string> = {};
        (data.data.prices || []).forEach((p: any) => { edits[p.key] = String(p.currentPrice); });
        setDevApiEdits(edits);
      }
    } catch (e) { console.error('Failed to fetch developer API prices', e); }
    finally { setDevApiPricesLoading(false); }
  };

  const saveDevApiPrices = async () => {
    setDevApiSaving(true);
    try {
      const token = getAuthToken();
      const prices: Record<string, number> = {};
      Object.entries(devApiEdits).forEach(([k, v]) => {
        const num = Number(v);
        if (!isNaN(num) && num >= 0) prices[k] = num;
      });
      const res = await fetch('/api/admin/developer-api-prices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast({ title: 'Developer API Prices Saved', variant: 'success', description: 'Prices updated and cache cleared' });
        fetchDevApiPrices();
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch { toast({ title: 'Error', description: 'Failed to save prices', variant: 'destructive' }); }
    finally { setDevApiSaving(false); }
  };

  const fetchGatewayStatus = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/payment-gateways/status', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === 'success') {
        setIsConfigured(!!(data.data.gateways?.airtimenigeria?.configured));
        setVtugConfigured(!!(data.data.gateways?.vtugate?.configured));
        setVtpConfigured(!!(data.data.gateways?.vtpass?.configured));
      }
    } catch (e) { console.error('Failed to fetch gateway status', e); }
  };

  useEffect(() => {
    fetchPricing();
    fetchGatewayStatus();
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
        toast({ title: "Price Updated", variant: "success", description: `${editForm.serviceName} price has been updated` });
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
        toast({ title: item.isActive ? "Service Disabled" : "Service Enabled", variant: "success", description: `${item.serviceName} has been ${item.isActive ? "disabled" : "enabled"}` });
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
        toast({ title: "Service Added", variant: "success", description: `${newService.serviceName} has been added` });
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
        toast({ title: "Service Deleted", variant: "success", description: `${deletingItem.serviceName} has been removed` });
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

      <Tabs defaultValue="services">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="services">Service Pricing</TabsTrigger>
          <TabsTrigger value="data-plans" onClick={() => { fetchGatewayStatus(); if (Object.keys(dataPlans).length === 0) fetchDataPlans(); }}>
            Data Plans
          </TabsTrigger>
          <TabsTrigger value="identity-costs" onClick={() => { if (!identityCosts) fetchIdentityCosts(); }}>
            Identity Costs
          </TabsTrigger>
          <TabsTrigger value="developer-api" onClick={() => { if (devApiPrices.length === 0) fetchDevApiPrices(); }}>
            Developer API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data-plans">
          <div className="space-y-4">
            {/* Aggregator selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground flex-shrink-0">Provider:</span>
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                {(['airtimenigeria', 'vtugate', 'vtpass'] as const).map(agg => (
                  <button key={agg}
                    onClick={() => {
                      setPlanAggregator(agg);
                      if (agg === 'airtimenigeria' && Object.keys(dataPlans).length === 0) fetchDataPlans();
                      if (agg === 'vtugate' && Object.keys(vtugPlans).length === 0) fetchVtugPlans();
                      if (agg === 'vtpass' && Object.keys(vtpPlans).length === 0) fetchVtpPlans();
                    }}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${planAggregator === agg ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    {agg === 'airtimenigeria' ? 'AirtimeNigeria' : agg === 'vtugate' ? 'VTUGate' : 'VTPass'}
                  </button>
                ))}
              </div>
            </div>

            {/* AirtimeNigeria plans */}
            {planAggregator === 'airtimenigeria' && (<>
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-base sm:text-lg">AirtimeNigeria Data Plans</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">
                      Fetch live plans from AirtimeNigeria, set your profit markup, and the selling prices auto-update for users.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={isConfigured ? "default" : "destructive"} className="gap-1 text-xs">
                      {isConfigured ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {isConfigured ? 'API Connected' : 'API Not Set'}
                    </Badge>
                    <Button onClick={handleSync} disabled={syncing || !isConfigured} className="gap-2">
                      {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Sync Plans
                    </Button>
                  </div>
                </div>
                {!isConfigured && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
                    AirtimeNigeria API token is not configured. Go to <strong>Settings → Gateways → AirtimeNigeria</strong> to add your Bearer token first.
                  </div>
                )}
              </CardHeader>
            </Card>

            {dataPlansLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : Object.keys(dataPlans).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Download className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="font-medium">No data plans synced yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isConfigured ? 'Click "Sync Plans" above to fetch current plans from AirtimeNigeria.' : 'Configure your AirtimeNigeria API token first, then sync plans.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Tabs value={activeNetwork} onValueChange={setActiveNetwork}>
                <TabsList className="mb-4 flex-wrap h-auto gap-1">
                  {Object.keys(dataPlans).map(net => (
                    <TabsTrigger key={net} value={net} className="capitalize">
                      <span className={NETWORK_COLORS[net] || ''}>{NETWORK_LABELS[net] || net.toUpperCase()}</span>
                      <Badge variant="secondary" className="ml-1.5 text-xs">{dataPlans[net]?.length || 0}</Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(dataPlans).map(([net, plans]) => (
                  <TabsContent key={net} value={net}>
                    <Card>
                      <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {NETWORK_LABELS[net] || net.toUpperCase()} — {plans.length} plans
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Apply % markup to all:</span>
                          <Input
                            type="number"
                            placeholder="e.g. 5"
                            className="w-20 h-8 text-sm"
                            value={bulkMarkup[net] || ''}
                            onChange={(e) => setBulkMarkup(prev => ({ ...prev, [net]: e.target.value }))}
                            min="0"
                            max="100"
                            step="0.5"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            disabled={!bulkMarkup[net] || applyingBulk === net}
                            onClick={() => handleApplyBulkMarkup(net)}
                          >
                            {applyingBulk === net ? <Loader2 className="h-3 w-3 animate-spin" /> : <Percent className="h-3 w-3" />}
                            Apply All
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                          <table className="w-full text-sm min-w-[750px]">
                            <thead className="sticky top-0 z-10 bg-background">
                              <tr className="border-b bg-muted/50">
                                <th className="p-3 text-left font-medium min-w-[200px]">Plan Name <span className="text-xs font-normal text-muted-foreground">(shown to users)</span></th>
                                <th className="p-3 text-left font-medium w-[120px]">Code</th>
                                <th className="p-3 text-right font-medium w-[110px]">Cost Price</th>
                                <th className="p-3 text-right font-medium w-[100px]">Markup %</th>
                                <th className="p-3 text-right font-medium w-[120px]">User Price</th>
                                <th className="p-3 text-center font-medium w-[70px]">Active</th>
                                <th className="p-3 text-right font-medium w-[80px]">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {plans.map(plan => (
                                <tr key={plan.id} className={`border-b transition-colors ${plan.isActive ? 'hover:bg-muted/30' : 'opacity-50 bg-muted/10'}`}>
                                  <td className="p-3">
                                    {editingPlanId === plan.id ? (
                                      <Input
                                        value={editPlanForm?.planName || ''}
                                        onChange={(e) => setEditPlanForm(prev => prev ? { ...prev, planName: e.target.value } : null)}
                                        className="h-7 text-xs w-full"
                                        placeholder="Display name for users"
                                      />
                                    ) : (
                                      <span className="font-medium">{plan.planName}</span>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{plan.planId}</code>
                                  </td>
                                  <td className="p-3 text-right text-muted-foreground">
                                    {editingPlanId === plan.id ? (
                                      <Input
                                        type="number"
                                        value={editPlanForm?.costPrice || ''}
                                        onChange={(e) => {
                                          const cost = parseFloat(e.target.value || '0');
                                          const markup = parseFloat(editPlanForm?.markupPercent || '0');
                                          setEditPlanForm(prev => prev ? {
                                            ...prev,
                                            costPrice: e.target.value,
                                            sellingPrice: markup > 0 ? (cost * (1 + markup / 100)).toFixed(2) : prev.sellingPrice,
                                          } : null);
                                        }}
                                        className="w-24 h-7 text-xs text-right"
                                        min="0"
                                        step="1"
                                      />
                                    ) : (
                                      <span>₦{plan.costPrice.toLocaleString()}</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right">
                                    {editingPlanId === plan.id ? (
                                      <Input
                                        type="number"
                                        value={editPlanForm?.markupPercent || ''}
                                        onChange={(e) => {
                                          const pct = parseFloat(e.target.value || '0');
                                          const cost = parseFloat(editPlanForm?.costPrice || '0');
                                          setEditPlanForm(prev => prev ? {
                                            ...prev,
                                            markupPercent: e.target.value,
                                            sellingPrice: (cost * (1 + pct / 100)).toFixed(2),
                                          } : null);
                                        }}
                                        className="w-20 h-7 text-xs text-right"
                                        min="0"
                                        step="0.5"
                                      />
                                    ) : (
                                      <span className={`font-medium ${plan.markupPercent > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>{plan.markupPercent.toFixed(1)}%</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right">
                                    {editingPlanId === plan.id ? (
                                      <Input
                                        type="number"
                                        value={editPlanForm?.sellingPrice || ''}
                                        onChange={(e) => {
                                          const sell = parseFloat(e.target.value || '0');
                                          const cost = parseFloat(editPlanForm?.costPrice || '0');
                                          setEditPlanForm(prev => prev ? {
                                            ...prev,
                                            sellingPrice: e.target.value,
                                            markupPercent: cost > 0 ? (((sell - cost) / cost) * 100).toFixed(2) : '0',
                                          } : null);
                                        }}
                                        className="w-24 h-7 text-xs text-right font-semibold"
                                        min="0"
                                        step="1"
                                      />
                                    ) : (
                                      <span className="font-semibold text-green-600">₦{plan.sellingPrice.toLocaleString()}</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    <Switch
                                      checked={plan.isActive}
                                      onCheckedChange={(checked) => handleTogglePlan(plan.id, checked)}
                                      className="scale-90"
                                    />
                                  </td>
                                  <td className="p-3 text-right">
                                    {editingPlanId === plan.id ? (
                                      <div className="flex justify-end gap-1">
                                        <Button size="sm" variant="ghost" onClick={() => { setEditingPlanId(null); setEditPlanForm(null); }} className="h-7 w-7 p-0">
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button size="sm" onClick={() => handleSavePlan(plan.id)} className="h-7 w-7 p-0">
                                          <Save className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button size="sm" variant="ghost" onClick={() => { setEditingPlanId(plan.id); setEditPlanForm({ planName: plan.planName, costPrice: String(plan.costPrice), sellingPrice: String(plan.sellingPrice), markupPercent: String(plan.markupPercent) }); }} className="h-7 w-7 p-0">
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            )}
            </>)}

            {/* VTUGate plans */}
            {planAggregator === 'vtugate' && (<>
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-base sm:text-lg">VTUGate Data Plans</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">
                      Sync live plans from VTUGate, set your profit markup, and selling prices auto-update for users.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={vtugConfigured ? "default" : "destructive"} className="gap-1 text-xs">
                      {vtugConfigured ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {vtugConfigured ? 'API Connected' : 'API Not Set'}
                    </Badge>
                    <Button onClick={handleVtugSync} disabled={vtugSyncing || !vtugConfigured} className="gap-2">
                      {vtugSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Sync Plans
                    </Button>
                  </div>
                </div>
                {!vtugConfigured && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
                    VTUGate API key is not configured. Go to <strong>Settings → Gateways → VTUGate</strong> to add your API key first.
                  </div>
                )}
              </CardHeader>
            </Card>

            {vtugLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : Object.keys(vtugPlans).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Download className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="font-medium">No VTUGate plans synced yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {vtugConfigured ? 'Click "Sync Plans" above to fetch current plans from VTUGate.' : 'Configure your VTUGate API key first, then sync plans.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Tabs value={vtugNetwork} onValueChange={setVtugNetwork}>
                <TabsList className="mb-4 flex-wrap h-auto gap-1">
                  {Object.keys(vtugPlans).map(net => (
                    <TabsTrigger key={net} value={net} className="capitalize">
                      <span className={NETWORK_COLORS[net] || ''}>{NETWORK_LABELS[net] || net.toUpperCase()}</span>
                      <Badge variant="secondary" className="ml-1.5 text-xs">{vtugPlans[net]?.length || 0}</Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(vtugPlans).map(([net, plans]) => (
                  <TabsContent key={net} value={net}>
                    <Card>
                      <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {NETWORK_LABELS[net] || net.toUpperCase()} — {plans.length} plans
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Apply % markup to all:</span>
                          <Input
                            type="number"
                            placeholder="e.g. 5"
                            className="w-20 h-8 text-sm"
                            value={vtugBulkMarkup[net] || ''}
                            onChange={(e) => setVtugBulkMarkup(prev => ({ ...prev, [net]: e.target.value }))}
                            min="0" max="100" step="0.5"
                          />
                          <Button
                            size="sm" variant="outline" className="h-8 gap-1"
                            disabled={!vtugBulkMarkup[net] || vtugApplyingBulk === net}
                            onClick={() => handleVtugApplyBulkMarkup(net)}
                          >
                            {vtugApplyingBulk === net ? <Loader2 className="h-3 w-3 animate-spin" /> : <Percent className="h-3 w-3" />}
                            Apply All
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                          <table className="w-full text-sm min-w-[750px]">
                            <thead className="sticky top-0 z-10 bg-background">
                              <tr className="border-b bg-muted/50">
                                <th className="p-3 text-left font-medium min-w-[200px]">Plan Name <span className="text-xs font-normal text-muted-foreground">(shown to users)</span></th>
                                <th className="p-3 text-left font-medium w-[120px]">Code</th>
                                <th className="p-3 text-right font-medium w-[110px]">Cost Price</th>
                                <th className="p-3 text-right font-medium w-[100px]">Markup %</th>
                                <th className="p-3 text-right font-medium w-[120px]">User Price</th>
                                <th className="p-3 text-center font-medium w-[70px]">Active</th>
                                <th className="p-3 text-right font-medium w-[80px]">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {plans.map(plan => (
                                <tr key={plan.id} className={`border-b transition-colors ${plan.isActive ? 'hover:bg-muted/30' : 'opacity-50 bg-muted/10'}`}>
                                  <td className="p-3">
                                    {vtugEditingId === plan.id ? (
                                      <Input value={vtugEditForm?.planName || ''} onChange={(e) => setVtugEditForm(prev => prev ? { ...prev, planName: e.target.value } : null)} className="h-7 text-xs w-full" placeholder="Display name for users" />
                                    ) : (
                                      <span className="font-medium">{plan.planName}</span>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{plan.planId}</code>
                                  </td>
                                  <td className="p-3 text-right text-muted-foreground">
                                    {vtugEditingId === plan.id ? (
                                      <Input type="number" value={vtugEditForm?.costPrice || ''}
                                        onChange={(e) => {
                                          const cost = parseFloat(e.target.value || '0');
                                          const markup = parseFloat(vtugEditForm?.markupPercent || '0');
                                          setVtugEditForm(prev => prev ? { ...prev, costPrice: e.target.value, sellingPrice: markup > 0 ? (cost * (1 + markup / 100)).toFixed(2) : prev.sellingPrice } : null);
                                        }}
                                        className="w-24 h-7 text-xs text-right" min="0" step="1" />
                                    ) : <span>₦{plan.costPrice.toLocaleString()}</span>}
                                  </td>
                                  <td className="p-3 text-right">
                                    {vtugEditingId === plan.id ? (
                                      <Input type="number" value={vtugEditForm?.markupPercent || ''}
                                        onChange={(e) => {
                                          const markup = parseFloat(e.target.value || '0');
                                          const cost = parseFloat(vtugEditForm?.costPrice || '0');
                                          setVtugEditForm(prev => prev ? { ...prev, markupPercent: e.target.value, sellingPrice: (cost * (1 + markup / 100)).toFixed(2) } : null);
                                        }}
                                        className="w-20 h-7 text-xs text-right" min="0" max="100" step="0.5" />
                                    ) : (
                                      <Badge variant={plan.markupPercent > 0 ? "secondary" : "outline"} className="text-xs">
                                        {plan.markupPercent > 0 ? `+${plan.markupPercent}%` : 'No markup'}
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="p-3 text-right font-medium text-green-700">
                                    {vtugEditingId === plan.id ? (
                                      <Input type="number" value={vtugEditForm?.sellingPrice || ''}
                                        onChange={(e) => {
                                          const sell = parseFloat(e.target.value || '0');
                                          const cost = parseFloat(vtugEditForm?.costPrice || '0');
                                          setVtugEditForm(prev => prev ? { ...prev, sellingPrice: e.target.value, markupPercent: cost > 0 ? (((sell - cost) / cost) * 100).toFixed(2) : '0' } : null);
                                        }}
                                        className="w-24 h-7 text-xs text-right" min="0" step="1" />
                                    ) : <span>₦{plan.sellingPrice.toLocaleString()}</span>}
                                  </td>
                                  <td className="p-3 text-center">
                                    <Switch checked={plan.isActive} onCheckedChange={(v) => handleVtugTogglePlan(plan.id, v)} />
                                  </td>
                                  <td className="p-3 text-right">
                                    {vtugEditingId === plan.id ? (
                                      <div className="flex gap-1 justify-end">
                                        <Button size="sm" variant="default" onClick={() => handleVtugSavePlan(plan.id)} className="h-7 w-7 p-0"><Save className="h-3.5 w-3.5" /></Button>
                                        <Button size="sm" variant="ghost" onClick={() => { setVtugEditingId(null); setVtugEditForm(null); }} className="h-7 w-7 p-0"><X className="h-3.5 w-3.5" /></Button>
                                      </div>
                                    ) : (
                                      <Button size="sm" variant="ghost" onClick={() => { setVtugEditingId(plan.id); setVtugEditForm({ planName: plan.planName, costPrice: String(plan.costPrice), sellingPrice: String(plan.sellingPrice), markupPercent: String(plan.markupPercent) }); }} className="h-7 w-7 p-0">
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            )}
            </>)}

            {/* VTPass plans */}
            {planAggregator === 'vtpass' && (<>
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-base sm:text-lg">VTPass Data Plans</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">
                      Sync live plans from VTPass, set your profit markup, and selling prices auto-update for users.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={vtpConfigured ? 'default' : 'destructive'} className={`gap-1 text-xs ${vtpConfigured ? 'bg-green-600 text-white' : ''}`}>
                      <Wifi className="h-3 w-3" />
                      {vtpConfigured ? 'API Connected' : 'API Not Set'}
                    </Badge>
                    <Button onClick={handleVtpSync} disabled={vtpSyncing || !vtpConfigured} className="gap-2">
                      {vtpSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      {vtpSyncing ? 'Syncing...' : 'Sync Plans'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {vtpLoading ? (
              <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : Object.keys(vtpPlans).length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <Download className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium text-muted-foreground">No VTPass plans synced yet</p>
                <p className="text-sm text-muted-foreground mt-1">Click "Sync Plans" above to fetch current plans from VTPass.</p>
              </CardContent></Card>
            ) : (
              <Tabs value={vtpNetwork} onValueChange={setVtpNetwork}>
                <TabsList className="flex flex-wrap h-auto gap-1 p-1">
                  {Object.keys(vtpPlans).sort().map(net => (
                    <TabsTrigger key={net} value={net} className="capitalize text-xs px-3 py-1.5">
                      {net.toUpperCase()} ({vtpPlans[net]?.length || 0})
                    </TabsTrigger>
                  ))}
                </TabsList>
                {Object.entries(vtpPlans).map(([net, plans]) => (
                  <TabsContent key={net} value={net}>
                    <Card>
                      <CardHeader className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <CardTitle className="text-sm font-semibold uppercase">{net} Plans</CardTitle>
                          <CardDescription className="text-xs">{plans.length} plans synced</CardDescription>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number" placeholder="Markup %" min="0" max="500" step="0.5"
                            value={vtpBulkMarkup[net] || ''}
                            onChange={e => setVtpBulkMarkup(p => ({ ...p, [net]: e.target.value }))}
                            className="w-24 h-8 text-xs"
                          />
                          <Button size="sm" className="h-8 text-xs" disabled={!vtpBulkMarkup[net] || !!vtpApplyingBulk}
                            onClick={() => handleVtpApplyBulkMarkup(net)}>
                            {vtpApplyingBulk === net ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                            Apply to All
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead><tr className="border-b bg-muted/50">
                              <th className="text-left p-3 font-medium">Plan Name</th>
                              <th className="text-right p-3 font-medium">Cost (₦)</th>
                              <th className="text-right p-3 font-medium">Markup %</th>
                              <th className="text-right p-3 font-medium">Sell (₦)</th>
                              <th className="text-center p-3 font-medium">Active</th>
                              <th className="text-center p-3 font-medium">Action</th>
                            </tr></thead>
                            <tbody>
                              {plans.map(plan => (
                                <tr key={plan.id} className="border-b hover:bg-muted/30">
                                  {vtpEditingId === plan.id && vtpEditForm ? (
                                    <>
                                      <td className="p-2"><Input value={vtpEditForm.planName} onChange={e => setVtpEditForm(f => f ? { ...f, planName: e.target.value } : f)} className="h-7 text-xs" /></td>
                                      <td className="p-2"><Input type="number" value={vtpEditForm.costPrice} onChange={e => setVtpEditForm(f => f ? { ...f, costPrice: e.target.value } : f)} className="h-7 text-xs w-20 text-right" /></td>
                                      <td className="p-2"><Input type="number" value={vtpEditForm.markupPercent} onChange={e => { const m = parseFloat(e.target.value)||0; const cp = parseFloat(vtpEditForm.costPrice)||0; setVtpEditForm(f => f ? { ...f, markupPercent: e.target.value, sellingPrice: (cp*(1+m/100)).toFixed(2) } : f); }} className="h-7 text-xs w-20 text-right" /></td>
                                      <td className="p-2"><Input type="number" value={vtpEditForm.sellingPrice} onChange={e => setVtpEditForm(f => f ? { ...f, sellingPrice: e.target.value } : f)} className="h-7 text-xs w-20 text-right" /></td>
                                      <td className="p-2 text-center">—</td>
                                      <td className="p-2 text-center">
                                        <div className="flex gap-1 justify-center">
                                          <Button size="sm" className="h-6 text-xs px-2" onClick={() => handleVtpSavePlan(plan.id)}>Save</Button>
                                          <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => { setVtpEditingId(null); setVtpEditForm(null); }}>Cancel</Button>
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="p-3">{plan.planName}</td>
                                      <td className="p-3 text-right">₦{parseFloat(plan.costPrice).toLocaleString()}</td>
                                      <td className="p-3 text-right text-muted-foreground">{parseFloat(plan.markupPercent||'0').toFixed(1)}%</td>
                                      <td className="p-3 text-right font-semibold">₦{parseFloat(plan.sellingPrice).toLocaleString()}</td>
                                      <td className="p-3 text-center">
                                        <Switch checked={plan.isActive} onCheckedChange={v => handleVtpTogglePlan(plan.id, v)} />
                                      </td>
                                      <td className="p-3 text-center">
                                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2"
                                          onClick={() => { setVtpEditingId(plan.id); setVtpEditForm({ planName: plan.planName, costPrice: plan.costPrice, sellingPrice: plan.sellingPrice, markupPercent: plan.markupPercent || '0' }); }}>
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            )}
            </>)}
          </div>
        </TabsContent>

        {/* ── Identity Provider Costs Tab ───────────────────────────── */}
        <TabsContent value="identity-costs">
          <div className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    Identity Provider Cost Prices
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    Wholesale cost per verification from each identity provider. Use these to set profitable markups in Service Pricing.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchIdentityCosts} disabled={identityCostsLoading} className="gap-2 flex-shrink-0">
                  {identityCostsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </Button>
              </CardHeader>
            </Card>

            {identityCostsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !identityCosts ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Database className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="font-medium">No pricing info loaded</p>
                  <p className="text-sm text-muted-foreground mt-1">Click the tab to load identity provider cost data.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Prembly */}
                <Card>
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Badge className="bg-blue-600 text-white text-xs">Prembly</Badge>
                      IdentityPass Cost Schedule
                    </CardTitle>
                    <CardDescription className="text-xs">Wholesale prices charged by Prembly per API call (NGN)</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="p-3 text-left font-medium">Service</th>
                          <th className="p-3 text-right font-medium">Cost Price</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {identityCosts.prembly.map((row, i) => {
                          const sellingEntry = pricing.find(p => p.serviceType === 'nin_verification' && row.service.toLowerCase().includes('nin') && !row.service.toLowerCase().includes('bvn'));
                          return (
                            <tr key={i} className="border-b hover:bg-muted/30">
                              <td className="p-3 font-medium">{row.service}</td>
                              <td className="p-3 text-right text-orange-700 font-semibold">₦{row.costPrice.toLocaleString()}</td>
                              <td className="p-3 text-xs text-muted-foreground">{row.description}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                {/* YouVerify */}
                <Card>
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Badge className="bg-green-600 text-white text-xs">YouVerify</Badge>
                      Cost Schedule
                    </CardTitle>
                    <CardDescription className="text-xs">Wholesale prices charged by YouVerify per API call (NGN)</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="p-3 text-left font-medium">Service</th>
                          <th className="p-3 text-right font-medium">Cost Price</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {identityCosts.youverify.map((row, i) => (
                          <tr key={i} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-medium">{row.service}</td>
                            <td className="p-3 text-right text-orange-700 font-semibold">₦{row.costPrice.toLocaleString()}</td>
                            <td className="p-3 text-xs text-muted-foreground">{row.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                {/* Selling prices from service pricing */}
                <Card className="lg:col-span-2">
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="text-sm font-semibold">Your Selling Prices vs Provider Cost (Identity Services)</CardTitle>
                    <CardDescription className="text-xs">Compare what you charge users against provider cost to verify margins. Edit selling prices in the Service Pricing tab.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[600px]">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            <th className="p-3 text-left font-medium">Service</th>
                            <th className="p-3 text-right font-medium">Provider Cost</th>
                            <th className="p-3 text-right font-medium">Your Selling Price</th>
                            <th className="p-3 text-right font-medium">Margin</th>
                            <th className="p-3 text-center font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricing.filter(p => ['nin_verification','bvn_verification','nin_phone'].includes(p.serviceType)).map(p => {
                            const providerCost = p.serviceType === 'bvn_verification' ? 50 : 30;
                            const margin = p.price - providerCost;
                            const marginPct = providerCost > 0 ? ((margin / providerCost) * 100).toFixed(1) : '0';
                            return (
                              <tr key={p.id} className="border-b hover:bg-muted/30">
                                <td className="p-3 font-medium">{p.serviceName}</td>
                                <td className="p-3 text-right text-muted-foreground">₦{providerCost.toLocaleString()}</td>
                                <td className="p-3 text-right font-semibold">₦{p.price.toLocaleString()}</td>
                                <td className={`p-3 text-right font-semibold ${margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                  {margin >= 0 ? '+' : ''}₦{margin.toLocaleString()} ({marginPct}%)
                                </td>
                                <td className="p-3 text-center">
                                  {margin < 0 ? (
                                    <Badge variant="destructive" className="text-xs">Selling at loss</Badge>
                                  ) : margin === 0 ? (
                                    <Badge variant="outline" className="text-xs">Break-even</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Profitable</Badge>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {pricing.filter(p => ['nin_verification','bvn_verification','nin_phone'].includes(p.serviceType)).length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">
                                No identity service prices configured yet. Set them in the Service Pricing tab.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {identityCosts.note && (
                      <div className="p-3 border-t text-xs text-muted-foreground bg-muted/20">
                        {identityCosts.note}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="developer-api">
          <div className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-violet-600" />
                    Developer API Prices
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    Set the price (in Naira) charged to developer portal accounts for each API call. Changes take effect within 60 seconds for live requests.
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={fetchDevApiPrices} disabled={devApiPricesLoading} className="gap-2">
                    {devApiPricesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Refresh
                  </Button>
                  <Button size="sm" onClick={saveDevApiPrices} disabled={devApiSaving || devApiPricesLoading} className="gap-2">
                    {devApiSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save Prices
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {devApiPricesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : devApiPrices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <DollarSign className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Click Refresh to load prices</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left p-3 sm:p-4 font-medium text-muted-foreground">API Endpoint</th>
                          <th className="text-left p-3 sm:p-4 font-medium text-muted-foreground hidden sm:table-cell">Description</th>
                          <th className="text-right p-3 sm:p-4 font-medium text-muted-foreground">Default (₦)</th>
                          <th className="text-right p-3 sm:p-4 font-medium text-muted-foreground">Current Price (₦)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {devApiPrices.map((item, idx) => (
                          <tr key={item.key} className={`border-b last:border-0 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                            <td className="p-3 sm:p-4">
                              <div className="font-medium">{item.label}</div>
                              {item.isCustom && (
                                <span className="text-[10px] text-violet-600 font-medium bg-violet-50 px-1.5 py-0.5 rounded-full">Custom</span>
                              )}
                            </td>
                            <td className="p-3 sm:p-4 text-muted-foreground hidden sm:table-cell text-xs">{item.description}</td>
                            <td className="p-3 sm:p-4 text-right text-muted-foreground">₦{item.defaultPrice}</td>
                            <td className="p-3 sm:p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-muted-foreground text-xs">₦</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={devApiEdits[item.key] ?? String(item.currentPrice)}
                                  onChange={e => setDevApiEdits(prev => ({ ...prev, [item.key]: e.target.value }))}
                                  className="w-24 text-right border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-background"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
              {devApiPrices.length > 0 && (
                <div className="p-3 sm:p-4 border-t bg-muted/20 text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-violet-600 font-bold mt-0.5">ℹ</span>
                  <span>Prices are deducted from the developer's wallet balance per successful API call in live mode. Sandbox calls deduct from the sandbox balance.</span>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services">

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
                <Button 
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/vtu/scrape-data', {
                        method: 'POST',
                        headers: { 
                          'Authorization': `Bearer ${tokenStorage.getItem('adminToken')}`,
                          'Content-Type': 'application/json'
                        }
                      });
                      if (res.ok) {
                        toast({ title: "Scrape Started", variant: "success", description: "Data pricing scrape job has been queued." });
                      } else {
                        const errorData = await res.json();
                        toast({ title: "Error", description: errorData.message || "Failed to start scrape", variant: "destructive" });
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
                <Button onClick={() => { setSelectedCategory(''); setNewService({ serviceType: '', serviceName: '', price: 0, description: '' }); setShowAddDialog(true); }} className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Service</span>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
