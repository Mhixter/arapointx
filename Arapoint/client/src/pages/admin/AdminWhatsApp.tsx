import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Settings, Users, Bell, Loader2, Plus, Trash2, RefreshCw, Send, Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const getAdminToken = () => localStorage.getItem('accessToken');

interface WhatsAppTemplate {
  id: string;
  templateName: string;
  displayName: string;
  description: string | null;
  templateContent: string;
  variables: string[];
  category: string;
  metaTemplateId: string | null;
  isActive: boolean;
  createdAt: string;
}

interface AgentChannel {
  id: string;
  agentType: string;
  agentId: string;
  channelType: string;
  channelValue: string;
  isActive: boolean;
  createdAt: string;
}

interface Notification {
  id: string;
  agentType: string;
  agentId: string;
  templateName: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  errorMessage: string | null;
}

export default function AdminWhatsApp() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [credentials, setCredentials] = useState({
    whatsapp_phone_number_id: '',
    whatsapp_access_token: '',
    whatsapp_business_account_id: '',
  });
  
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [channels, setChannels] = useState<AgentChannel[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [agents, setAgents] = useState<{type: string; id: string; name: string}[]>([]);
  
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  
  const [templateForm, setTemplateForm] = useState({
    templateName: '',
    displayName: '',
    description: '',
    templateContent: '',
    variables: '',
    category: 'transactional',
    metaTemplateId: '',
    isActive: true,
  });
  
  const [channelForm, setChannelForm] = useState({
    agentType: '',
    agentId: '',
    channelValue: '',
    isActive: true,
  });

  useEffect(() => {
    fetchCredentials();
    fetchTemplates();
    fetchChannels();
    fetchNotifications();
    fetchAllAgents();
  }, []);

  const fetchCredentials = async () => {
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success' && data.data) {
        setCredentials({
          whatsapp_phone_number_id: data.data.whatsapp_phone_number_id || '',
          whatsapp_access_token: data.data.whatsapp_access_token || '',
          whatsapp_business_account_id: data.data.whatsapp_business_account_id || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/whatsapp/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setTemplates(data.data?.templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchChannels = async () => {
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/whatsapp/channels', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setChannels(data.data?.channels || []);
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/whatsapp/notifications?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setNotifications(data.data?.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const fetchAllAgents = async () => {
    try {
      const token = getAdminToken();
      const allAgents: {type: string; id: string; name: string}[] = [];
      
      const endpoints = [
        { url: '/api/admin/identity-agents', type: 'identity' },
        { url: '/api/admin/a2c-agents', type: 'a2c' },
        { url: '/api/admin/education-agents', type: 'education' },
        { url: '/api/admin/cac/agents', type: 'cac' },
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint.url, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          if (data.status === 'success' && data.data?.agents) {
            data.data.agents.forEach((agent: any) => {
              allAgents.push({
                type: endpoint.type,
                id: agent.id,
                name: agent.name || agent.email || 'Unknown',
              });
            });
          }
        } catch (e) {
          console.error(`Failed to fetch ${endpoint.type} agents:`, e);
        }
      }
      
      setAgents(allAgents);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const saveCredentials = async () => {
    try {
      setSaving(true);
      const token = getAdminToken();
      
      for (const [key, value] of Object.entries(credentials)) {
        await fetch('/api/admin/settings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ key, value })
        });
      }
      
      toast({ title: "Success", description: "WhatsApp credentials saved" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save credentials", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const initializeTemplates = async () => {
    try {
      setLoading(true);
      const token = getAdminToken();
      const response = await fetch('/api/admin/whatsapp/templates/init', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Success", description: "Default templates initialized" });
        fetchTemplates();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to initialize templates", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      setLoading(true);
      const token = getAdminToken();
      const response = await fetch('/api/admin/whatsapp/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: editingTemplate?.id,
          templateName: templateForm.templateName,
          displayName: templateForm.displayName,
          description: templateForm.description,
          templateContent: templateForm.templateContent,
          variables: templateForm.variables.split(',').map(v => v.trim()).filter(Boolean),
          category: templateForm.category,
          metaTemplateId: templateForm.metaTemplateId || null,
          isActive: templateForm.isActive,
        })
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Success", description: editingTemplate ? "Template updated" : "Template created" });
        setShowTemplateModal(false);
        setEditingTemplate(null);
        resetTemplateForm();
        fetchTemplates();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save template", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/admin/whatsapp/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast({ title: "Success", description: "Template deleted" });
        fetchTemplates();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
    }
  };

  const handleSaveChannel = async () => {
    try {
      setLoading(true);
      const token = getAdminToken();
      const response = await fetch('/api/admin/whatsapp/channels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentType: channelForm.agentType,
          agentId: channelForm.agentId,
          channelValue: channelForm.channelValue,
          isActive: channelForm.isActive,
        })
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Success", description: "Agent WhatsApp number added" });
        setShowChannelModal(false);
        resetChannelForm();
        fetchChannels();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save channel", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm('Are you sure you want to delete this channel?')) return;
    
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/admin/whatsapp/channels/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast({ title: "Success", description: "Channel deleted" });
        fetchChannels();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete channel", variant: "destructive" });
    }
  };

  const processNotifications = async () => {
    try {
      setLoading(true);
      const token = getAdminToken();
      const response = await fetch('/api/admin/whatsapp/notifications/process', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        toast({ title: "Success", description: `Processed ${data.data?.processed || 0} notifications` });
        fetchNotifications();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to process notifications", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      templateName: '',
      displayName: '',
      description: '',
      templateContent: '',
      variables: '',
      category: 'transactional',
      metaTemplateId: '',
      isActive: true,
    });
  };

  const resetChannelForm = () => {
    setChannelForm({
      agentType: '',
      agentId: '',
      channelValue: '',
      isActive: true,
    });
  };

  const openEditTemplate = (template: WhatsAppTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      templateName: template.templateName,
      displayName: template.displayName,
      description: template.description || '',
      templateContent: template.templateContent,
      variables: Array.isArray(template.variables) ? template.variables.join(', ') : '',
      category: template.category,
      metaTemplateId: template.metaTemplateId || '',
      isActive: template.isActive,
    });
    setShowTemplateModal(true);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      queued: 'bg-yellow-100 text-yellow-700',
      sent: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      delivered: 'bg-blue-100 text-blue-700',
      read: 'bg-purple-100 text-purple-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const agentTypeLabels: Record<string, string> = {
    identity: 'Identity Agent',
    a2c: 'A2C Agent',
    education: 'Education Agent',
    cac: 'CAC Agent',
    bvn: 'BVN Agent',
  };

  const filteredAgents = agents.filter(a => a.type === channelForm.agentType);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-green-600" />
            WhatsApp Notifications
          </h1>
          <p className="text-sm text-gray-500">Configure WhatsApp notifications for agents</p>
        </div>
      </div>

      <Tabs defaultValue="credentials" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="credentials" className="text-xs sm:text-sm">
            <Settings className="h-4 w-4 mr-1 hidden sm:inline" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4 mr-1 hidden sm:inline" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="channels" className="text-xs sm:text-sm">
            <Users className="h-4 w-4 mr-1 hidden sm:inline" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="queue" className="text-xs sm:text-sm">
            <Bell className="h-4 w-4 mr-1 hidden sm:inline" />
            Queue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp API Credentials</CardTitle>
              <CardDescription>
                Enter your Meta WhatsApp Business API credentials. Get these from the Meta Developer Portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Phone Number ID</Label>
                <Input
                  value={credentials.whatsapp_phone_number_id}
                  onChange={(e) => setCredentials(prev => ({ ...prev, whatsapp_phone_number_id: e.target.value }))}
                  placeholder="e.g., 123456789012345"
                />
                <p className="text-xs text-gray-500">Found in WhatsApp Business API settings</p>
              </div>
              
              <div className="space-y-2">
                <Label>Access Token</Label>
                <Input
                  type="password"
                  value={credentials.whatsapp_access_token}
                  onChange={(e) => setCredentials(prev => ({ ...prev, whatsapp_access_token: e.target.value }))}
                  placeholder="Your permanent access token"
                />
                <p className="text-xs text-gray-500">Permanent token from Meta Business Suite</p>
              </div>
              
              <div className="space-y-2">
                <Label>Business Account ID</Label>
                <Input
                  value={credentials.whatsapp_business_account_id}
                  onChange={(e) => setCredentials(prev => ({ ...prev, whatsapp_business_account_id: e.target.value }))}
                  placeholder="e.g., 123456789012345"
                />
                <p className="text-xs text-gray-500">Your WhatsApp Business Account ID</p>
              </div>
              
              <Button onClick={saveCredentials} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Credentials
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Message Templates</CardTitle>
                <CardDescription>Templates used for WhatsApp notifications</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={initializeTemplates} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                  Init Defaults
                </Button>
                <Button size="sm" onClick={() => { resetTemplateForm(); setEditingTemplate(null); setShowTemplateModal(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                        No templates. Click "Init Defaults" to create default templates.
                      </TableCell>
                    </TableRow>
                  ) : templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.displayName}</div>
                          <div className="text-xs text-gray-500">{template.templateName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell capitalize">{template.category}</TableCell>
                      <TableCell>
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditTemplate(template)}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteTemplate(template.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Agent WhatsApp Numbers</CardTitle>
                <CardDescription>WhatsApp numbers for each agent to receive notifications</CardDescription>
              </div>
              <Button size="sm" onClick={() => { resetChannelForm(); setShowChannelModal(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Add Number
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent Type</TableHead>
                    <TableHead>WhatsApp Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                        No agent numbers configured. Click "Add Number" to add one.
                      </TableCell>
                    </TableRow>
                  ) : channels.map((channel) => (
                    <TableRow key={channel.id}>
                      <TableCell>
                        <Badge variant="outline">{agentTypeLabels[channel.agentType] || channel.agentType}</Badge>
                      </TableCell>
                      <TableCell>{channel.channelValue}</TableCell>
                      <TableCell>
                        <Badge variant={channel.isActive ? "default" : "secondary"}>
                          {channel.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteChannel(channel.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Notification Queue</CardTitle>
                <CardDescription>Recent notifications and their status</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchNotifications}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
                <Button size="sm" onClick={processNotifications} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-1" />}
                  Process Queue
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent Type</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Created</TableHead>
                    <TableHead className="hidden sm:table-cell">Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No notifications in queue
                      </TableCell>
                    </TableRow>
                  ) : notifications.map((notif) => (
                    <TableRow key={notif.id}>
                      <TableCell>
                        <Badge variant="outline">{agentTypeLabels[notif.agentType] || notif.agentType}</Badge>
                      </TableCell>
                      <TableCell>{notif.templateName}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(notif.status)}>{notif.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">
                        {new Date(notif.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-red-600">
                        {notif.errorMessage || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Add Template'}</DialogTitle>
            <DialogDescription>
              Configure a WhatsApp message template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name (Internal)</Label>
                <Input
                  value={templateForm.templateName}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, templateName: e.target.value }))}
                  placeholder="e.g., new_bvn_request"
                />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={templateForm.displayName}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="e.g., New BVN Request"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={templateForm.description}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
              />
            </div>
            <div className="space-y-2">
              <Label>Message Content</Label>
              <Textarea
                value={templateForm.templateContent}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, templateContent: e.target.value }))}
                placeholder="Use {{variable_name}} for dynamic content"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Variables (comma-separated)</Label>
                <Input
                  value={templateForm.variables}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, variables: e.target.value }))}
                  placeholder="request_id, customer_name"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={templateForm.category} onValueChange={(v) => setTemplateForm(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="utility">Utility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Meta Template ID (optional)</Label>
              <Input
                value={templateForm.metaTemplateId}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, metaTemplateId: e.target.value }))}
                placeholder="Template ID from Meta Business"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={templateForm.isActive}
                onCheckedChange={(checked) => setTemplateForm(prev => ({ ...prev, isActive: checked }))}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showChannelModal} onOpenChange={setShowChannelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Agent WhatsApp Number</DialogTitle>
            <DialogDescription>
              Add a WhatsApp number for an agent to receive notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Agent Type</Label>
              <Select value={channelForm.agentType} onValueChange={(v) => setChannelForm(prev => ({ ...prev, agentType: v, agentId: '' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="identity">Identity Agent</SelectItem>
                  <SelectItem value="a2c">A2C Agent</SelectItem>
                  <SelectItem value="education">Education Agent</SelectItem>
                  <SelectItem value="cac">CAC Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agent</Label>
              <Select value={channelForm.agentId} onValueChange={(v) => setChannelForm(prev => ({ ...prev, agentId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAgents.length === 0 ? (
                    <SelectItem value="" disabled>No agents of this type</SelectItem>
                  ) : filteredAgents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <Input
                value={channelForm.channelValue}
                onChange={(e) => setChannelForm(prev => ({ ...prev, channelValue: e.target.value }))}
                placeholder="e.g., 2348012345678"
              />
              <p className="text-xs text-gray-500">Include country code without + (e.g., 234 for Nigeria)</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={channelForm.isActive}
                onCheckedChange={(checked) => setChannelForm(prev => ({ ...prev, isActive: checked }))}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChannelModal(false)}>Cancel</Button>
            <Button onClick={handleSaveChannel} disabled={loading || !channelForm.agentType || !channelForm.agentId || !channelForm.channelValue}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
