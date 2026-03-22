import { tokenStorage } from '@/lib/tokenStorage';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";

export default function Profile() {
  const accessToken = tokenStorage.getItem('accessToken');
  
  const { data: user, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: authApi.getProfile,
    staleTime: 30000,
    enabled: !!accessToken,
  });

  const userName = user?.name || 'User';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const createdAt = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">My Profile</h2>
          <p className="text-muted-foreground">Manage your account information</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your personal account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-16 w-16 border-2 border-border">
              <AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{userName}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {user?.kycStatus === 'verified' ? 'Verified User' : 'User'}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input type="text" value={user?.name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={user?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" value={user?.phone || 'Not set'} disabled />
            </div>
            <div className="space-y-2">
              <Label>KYC Status</Label>
              <Input type="text" value={user?.kycStatus || 'pending'} disabled className="capitalize" />
            </div>
            <div className="space-y-2">
              <Label>Email Status</Label>
              <Input 
                type="text" 
                value={user?.emailVerified ? 'Verified' : 'Not Verified'} 
                disabled 
                className={user?.emailVerified ? 'text-green-600' : 'text-amber-600'} 
              />
            </div>
            <div className="space-y-2">
              <Label>Member Since</Label>
              <Input type="text" value={createdAt} disabled />
            </div>
            <div className="space-y-2">
              <Label>Wallet Balance</Label>
              <Input type="text" value={`₦${parseFloat(user?.walletBalance || '0').toLocaleString()}`} disabled />
            </div>
            <div className="space-y-2">
              <Label>NIN</Label>
              <Input type="text" value={user?.nin || 'Not linked'} disabled />
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              To update your profile information, please contact support.
            </p>
            <Button disabled>Edit Profile</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
