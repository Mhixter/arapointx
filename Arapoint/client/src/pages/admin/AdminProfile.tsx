import { tokenStorage } from '@/lib/tokenStorage';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Save, Loader2, KeyRound, User, Mail, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

export default function AdminProfile() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = tokenStorage.getItem('adminToken');
        const res = await fetch('/api/admin/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.data?.admin) {
          setProfile(data.data.admin);
          setName(data.data.admin.name || '');
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!name.trim()) return;
    setSavingProfile(true);
    try {
      const token = tokenStorage.getItem('adminToken');
      const res = await fetch('/api/admin/me', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(prev => prev ? { ...prev, name: name.trim() } : prev);
        toast({ title: 'Profile updated', variant: 'success', description: 'Your name has been saved.' });
      } else {
        toast({ title: 'Update failed', description: data.message || 'Could not save profile.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: 'Fill all fields', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: 'Password too short', description: 'Minimum 8 characters.', variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    try {
      const token = tokenStorage.getItem('adminToken');
      const res = await fetch('/api/admin/me/password', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        toast({ title: 'Password changed', variant: 'success', description: 'Your password has been updated.' });
      } else {
        toast({ title: 'Failed', description: data.message || 'Could not change password.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const roleColors: Record<string, string> = {
    super_admin: 'bg-red-500',
    admin: 'bg-blue-500',
    support_agent: 'bg-green-500',
    manager: 'bg-purple-500',
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-heading font-bold tracking-tight">Profile Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your admin account information</p>
      </div>

      {/* Profile summary */}
      <Card>
        <CardContent className="p-6 flex items-center gap-5">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            <AvatarFallback className="bg-primary text-white text-xl font-bold">
              {(profile?.name || 'A').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold truncate">{profile?.name || '—'}</p>
            <p className="text-sm text-muted-foreground truncate">{profile?.email || '—'}</p>
            <Badge className={`${roleColors[profile?.role || ''] || 'bg-gray-500'} text-white text-xs mt-1`}>
              {(profile?.role || 'admin').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Update name */}
      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Personal Information</CardTitle>
          <CardDescription className="text-xs">Update your display name</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-name" className="text-sm">Full Name</Label>
            <Input
              id="admin-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Email Address</Label>
            <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{profile?.email || '—'}</span>
            </div>
            <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact a super admin.</p>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile || !name.trim()}>
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" /> Change Password</CardTitle>
          <CardDescription className="text-xs">Choose a strong password with at least 8 characters</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-pw" className="text-sm">Current Password</Label>
            <Input id="current-pw" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="h-9" placeholder="••••••••" />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="new-pw" className="text-sm">New Password</Label>
            <Input id="new-pw" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-9" placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw" className="text-sm">Confirm New Password</Label>
            <Input id="confirm-pw" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="h-9" placeholder="••••••••" />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleChangePassword} disabled={savingPassword}>
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
