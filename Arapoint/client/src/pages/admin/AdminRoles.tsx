import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Shield, ShieldCheck, ShieldAlert, Eye, Users, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isActive: boolean;
  userCount: number;
}

const ALL_PERMISSIONS = [
  { key: "users", label: "User Management", description: "View and manage user accounts" },
  { key: "identity", label: "Identity Services", description: "Manage identity verification requests" },
  { key: "bvn", label: "BVN Services", description: "Manage BVN retrieval and modification" },
  { key: "education", label: "Education Services", description: "Manage exam result checks" },
  { key: "vtu", label: "VTU Services", description: "Manage airtime, data, and bills" },
  { key: "cac", label: "CAC Services", description: "Manage CAC registration requests" },
  { key: "pricing", label: "Pricing Management", description: "Edit service prices" },
  { key: "analytics", label: "Analytics", description: "View platform statistics" },
  { key: "settings", label: "Settings", description: "Configure platform settings" },
  { key: "roles", label: "Role Management", description: "Manage admin roles and permissions" },
];

const getAuthToken = () => localStorage.getItem('accessToken');

export default function AdminRoles() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch('/api/admin/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }
      
      const result = await response.json();
      if (result.status === 'success' && result.data?.roles) {
        setRoles(result.data.roles.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description || '',
          permissions: Array.isArray(r.permissions) ? r.permissions : [],
          isActive: r.isActive ?? true,
          userCount: r.userCount || 0,
        })));
      }
    } catch (error: any) {
      console.error('Error fetching roles:', error);
      toast({ title: "Error", description: "Failed to load roles", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (name: string) => {
    switch (name) {
      case "super_admin":
        return <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />;
      case "admin":
        return <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />;
      case "operator":
        return <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />;
      default:
        return <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (name: string) => {
    switch (name) {
      case "super_admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "operator":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const handlePermissionToggle = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const handleSelectAllPermissions = () => {
    if (formData.permissions.length === ALL_PERMISSIONS.length) {
      setFormData(prev => ({ ...prev, permissions: [] }));
    } else {
      setFormData(prev => ({ ...prev, permissions: ALL_PERMISSIONS.map(p => p.key) }));
    }
  };

  const handleCreateRole = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Role name is required", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const token = getAuthToken();
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        toast({ title: "Success", description: "Role created successfully" });
        setIsCreateOpen(false);
        setFormData({ name: "", description: "", permissions: [] });
        fetchRoles();
      } else {
        toast({ title: "Error", description: result.message || "Failed to create role", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create role", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;

    try {
      setSaving(true);
      const token = getAuthToken();
      const response = await fetch(`/api/admin/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        toast({ title: "Success", description: "Role updated successfully" });
        setEditingRole(null);
        setFormData({ name: "", description: "", permissions: [] });
        fetchRoles();
      } else {
        toast({ title: "Error", description: result.message || "Failed to update role", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role: AdminRole) => {
    if (!window.confirm(`Are you sure you want to delete the "${role.name}" role?`)) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        toast({ title: "Success", description: "Role deleted successfully" });
        fetchRoles();
      } else {
        toast({ title: "Error", description: result.message || "Failed to delete role", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete role", variant: "destructive" });
    }
  };

  const openEditDialog = (role: AdminRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading roles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold tracking-tight">Admin Roles</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage roles and permissions for admin users</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchRoles} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
            Refresh
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin")} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>Define a new admin role with specific permissions</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm">Role Name</Label>
                <Input 
                  className="mt-1" 
                  placeholder="e.g., operator, viewer" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-sm">Description</Label>
                <Textarea 
                  className="mt-1" 
                  placeholder="Describe this role's purpose"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">Permissions</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={handleSelectAllPermissions}
                  >
                    {formData.permissions.length === ALL_PERMISSIONS.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {ALL_PERMISSIONS.map((permission) => (
                    <div key={permission.key} className="flex items-start gap-2">
                      <Checkbox 
                        id={permission.key}
                        checked={formData.permissions.includes(permission.key)}
                        onCheckedChange={() => handlePermissionToggle(permission.key)}
                      />
                      <div>
                        <label htmlFor={permission.key} className="text-sm font-medium cursor-pointer">{permission.label}</label>
                        <p className="text-xs text-muted-foreground">{permission.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateRole} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No roles found. Create your first role to get started.</p>
            </CardContent>
          </Card>
        ) : (
          roles.map((role) => (
            <Card key={role.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(role.name)}
                    <div>
                      <CardTitle className="text-base capitalize">{role.name.replace(/_/g, ' ')}</CardTitle>
                      <Badge className={`mt-1 text-xs ${getRoleBadgeColor(role.name)}`}>
                        {role.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(role)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500 hover:text-red-700" 
                      onClick={() => handleDeleteRole(role)}
                      disabled={role.name === 'super_admin'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs mt-2">{role.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <Users className="h-3.5 w-3.5" />
                  <span>{role.userCount} user{role.userCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 4).map((p) => (
                    <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                  ))}
                  {role.permissions.length > 4 && (
                    <Badge variant="secondary" className="text-xs">+{role.permissions.length - 4} more</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Modify the role's permissions and settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm">Role Name</Label>
              <Input 
                className="mt-1" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                disabled={editingRole?.name === 'super_admin'}
              />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea 
                className="mt-1" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Permissions</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={handleSelectAllPermissions}
                >
                  {formData.permissions.length === ALL_PERMISSIONS.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {ALL_PERMISSIONS.map((permission) => (
                  <div key={permission.key} className="flex items-start gap-2">
                    <Checkbox 
                      id={`edit-${permission.key}`}
                      checked={formData.permissions.includes(permission.key)}
                      onCheckedChange={() => handlePermissionToggle(permission.key)}
                    />
                    <div>
                      <label htmlFor={`edit-${permission.key}`} className="text-sm font-medium cursor-pointer">{permission.label}</label>
                      <p className="text-xs text-muted-foreground">{permission.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)}>Cancel</Button>
            <Button onClick={handleUpdateRole} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
