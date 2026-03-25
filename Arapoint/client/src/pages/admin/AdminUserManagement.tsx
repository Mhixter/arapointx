import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Edit2, Eye, Users, Wallet, Calendar, Loader2, Plus, DollarSign, MinusCircle, BarChart2, Ban, ShieldCheck, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, AdminUser } from "@/lib/api";
import AdminTransactions from "./AdminTransactions";

const getStatusColor = (status: string) => {
  switch(status) {
    case 'verified': 
    case 'active': return 'bg-green-100 text-green-700';
    case 'pending': return 'bg-yellow-100 text-yellow-700';
    case 'inactive':
    case 'suspended': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export default function AdminUserManagement() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editStatus, setEditStatus] = useState<string>("pending");
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [transactionUser, setTransactionUser] = useState<AdminUser | null>(null);
  
  const [createForm, setCreateForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [fundAmount, setFundAmount] = useState('');
  const [debitAmount, setDebitAmount] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendModal, setShowSuspendModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.getUsers(1, 100),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) => 
      adminApi.updateUserStatus(userId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowViewModal(false);
      toast({ title: "User Status Updated", description: `User status changed successfully.` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to update status", variant: "destructive" });
    }
  });

  const createUserMutation = useMutation({
    mutationFn: (data: { name: string; email: string; phone?: string; password: string }) => 
      adminApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', phone: '', password: '' });
      toast({ title: "User Created", description: "New user account created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to create user", variant: "destructive" });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { name?: string; email?: string; phone?: string } }) => 
      adminApi.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowEditModal(false);
      toast({ title: "User Updated", description: "User details updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to update user", variant: "destructive" });
    }
  });

  const fundWalletMutation = useMutation({
    mutationFn: ({ userId, amount }: { userId: string; amount: number }) => 
      adminApi.fundUserWallet(userId, amount),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowFundModal(false);
      setFundAmount('');
      toast({ title: "Wallet Funded", description: `Successfully added ₦${data.amount.toLocaleString()} to wallet. New balance: ₦${data.newBalance.toLocaleString()}` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to fund wallet", variant: "destructive" });
    }
  });

  const debitWalletMutation = useMutation({
    mutationFn: ({ userId, amount }: { userId: string; amount: number }) => 
      adminApi.debitUserWallet(userId, amount),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowDebitModal(false);
      setDebitAmount('');
      toast({ title: "Wallet Debited", description: `Successfully removed ₦${data.amount.toLocaleString()} from wallet. New balance: ₦${data.newBalance.toLocaleString()}` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to debit wallet", variant: "destructive" });
    }
  });

  const suspendUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      adminApi.suspendUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowSuspendModal(false);
      setShowViewModal(false);
      setSuspendReason('');
      toast({ title: "User Suspended", description: "User account has been suspended." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to suspend user", variant: "destructive" });
    }
  });

  const unsuspendUserMutation = useMutation({
    mutationFn: (userId: string) => adminApi.unsuspendUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowViewModal(false);
      toast({ title: "User Unsuspended", description: "User account has been reactivated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to unsuspend user", variant: "destructive" });
    }
  });

  const handleCreateUser = () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast({ title: "Missing Fields", description: "Name, email, and password are required", variant: "destructive" });
      return;
    }
    createUserMutation.mutate(createForm);
  };

  const handleEditUser = () => {
    if (!selectedUser) return;
    updateUserMutation.mutate({ userId: selectedUser.id, data: editForm });
  };

  const handleFundWallet = () => {
    if (!selectedUser || !fundAmount) return;
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    fundWalletMutation.mutate({ userId: selectedUser.id, amount });
  };

  const handleDebitWallet = () => {
    if (!selectedUser || !debitAmount) return;
    const amount = parseFloat(debitAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    debitWalletMutation.mutate({ userId: selectedUser.id, amount });
  };

  const openEditModal = (user: AdminUser) => {
    setSelectedUser(user);
    setEditForm({ name: user.name, email: user.email, phone: user.phone || '' });
    setShowEditModal(true);
  };

  const openFundModal = (user: AdminUser) => {
    setSelectedUser(user);
    setFundAmount('');
    setShowFundModal(true);
  };

  const openDebitModal = (user: AdminUser) => {
    setSelectedUser(user);
    setDebitAmount('');
    setShowDebitModal(true);
  };

  const openViewModal = (user: AdminUser) => {
    setSelectedUser(user);
    setEditStatus(user.kycStatus);
    setShowViewModal(true);
  };

  const users = data?.users || [];
  const filteredUsers = users.filter((u: AdminUser) => 
    (statusFilter === "all" || u.kycStatus === statusFilter) &&
    (searchTerm === "" || u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Failed to load users. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold tracking-tight">User Management</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage user accounts, status, and wallets</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateModal(true)} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
            Add User
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin")} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
            Back
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            <div>
              <CardTitle className="text-base sm:text-lg">Search & Filter</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Find users by name or email</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Input 
                placeholder="Search by name or email..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-8 sm:h-9 text-sm"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32 h-8 sm:h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">All Users ({filteredUsers.length})</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Total registered users on the platform</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="hidden lg:block rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Email</th>
                  <th className="p-3 text-left font-medium">Phone</th>
                  <th className="p-3 text-left font-medium">Wallet</th>
                  <th className="p-3 text-left font-medium">KYC Status</th>
                  <th className="p-3 text-left font-medium">Joined</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user: AdminUser) => (
                    <tr key={user.id} className="border-b">
                      <td className="p-3 font-medium">{user.name}</td>
                      <td className="p-3 text-muted-foreground">{user.email}</td>
                      <td className="p-3 text-muted-foreground">{user.phone || '-'}</td>
                      <td className="p-3 font-semibold text-green-600">₦{parseFloat(user.walletBalance || '0').toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.kycStatus)}`}>
                          {user.kycStatus}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openViewModal(user)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEditModal(user)} title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600" onClick={() => openFundModal(user)} title="Fund Wallet">
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => openDebitModal(user)} title="Debit Wallet">
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-3 px-4 pb-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No users found</div>
            ) : (
              filteredUsers.map((user: AdminUser) => (
                <Card key={user.id} className="overflow-hidden">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm truncate">{user.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${getStatusColor(user.kycStatus)}`}>
                        {user.kycStatus}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Wallet className="h-3 w-3" />
                        <span className="font-semibold text-green-600">₦{parseFloat(user.walletBalance || '0').toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openViewModal(user)}>
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEditModal(user)}>
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-green-600" onClick={() => openFundModal(user)}>
                        <DollarSign className="h-3 w-3 mr-1" />
                        Fund
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={() => openDebitModal(user)}>
                        <MinusCircle className="h-3 w-3 mr-1" />
                        Debit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user account to the platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input 
                placeholder="Enter full name" 
                value={createForm.name} 
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))} 
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input 
                type="email"
                placeholder="Enter email address" 
                value={createForm.email} 
                onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))} 
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                placeholder="Enter phone number" 
                value={createForm.phone} 
                onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))} 
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input 
                type="password"
                placeholder="Enter password" 
                value={createForm.password} 
                onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
              {createUserMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAgentModal} onOpenChange={setShowAgentModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Support Agents</DialogTitle>
            <DialogDescription>Assign support agent roles to existing administrators or users</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm">Functionality to promote users to Support Agents will be available here.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowAgentModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user account details</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  placeholder="Enter full name" 
                  value={editForm.name} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  placeholder="Enter email address" 
                  value={editForm.email} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  placeholder="Enter phone number" 
                  value={editForm.phone} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} 
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleEditUser} disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFundModal} onOpenChange={setShowFundModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fund User Wallet</DialogTitle>
            <DialogDescription>Add funds to {selectedUser?.name}'s wallet</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold text-green-600">₦{parseFloat(selectedUser.walletBalance || '0').toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label>Amount to Add (₦)</Label>
                <Input 
                  type="number"
                  placeholder="Enter amount" 
                  value={fundAmount} 
                  onChange={(e) => setFundAmount(e.target.value)} 
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1000, 5000, 10000].map(amt => (
                  <Button 
                    key={amt} 
                    variant="outline" 
                    size="sm"
                    onClick={() => setFundAmount(amt.toString())}
                  >
                    ₦{amt.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFundModal(false)}>Cancel</Button>
            <Button onClick={handleFundWallet} disabled={fundWalletMutation.isPending} className="bg-green-600 hover:bg-green-700">
              {fundWalletMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Fund Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDebitModal} onOpenChange={setShowDebitModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Debit User Wallet</DialogTitle>
            <DialogDescription>Remove funds from {selectedUser?.name}'s wallet</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold text-green-600">₦{parseFloat(selectedUser.walletBalance || '0').toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label>Amount to Remove (₦)</Label>
                <Input 
                  type="number"
                  placeholder="Enter amount" 
                  value={debitAmount} 
                  onChange={(e) => setDebitAmount(e.target.value)} 
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[500, 1000, 5000].map(amt => (
                  <Button 
                    key={amt} 
                    variant="outline" 
                    size="sm"
                    onClick={() => setDebitAmount(amt.toString())}
                  >
                    ₦{amt.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDebitModal(false)}>Cancel</Button>
            <Button onClick={handleDebitWallet} disabled={debitWalletMutation.isPending} className="bg-red-600 hover:bg-red-700">
              {debitWalletMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Debit Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>View and manage user account</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              {selectedUser.isSuspended && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-red-700">Account Suspended</p>
                    {selectedUser.suspendReason && (
                      <p className="text-xs text-red-600 truncate">{selectedUser.suspendReason}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">User ID</p>
                  <p className="font-mono font-bold text-xs truncate">{selectedUser.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-bold text-sm">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-bold text-sm truncate">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-bold text-sm">{selectedUser.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Wallet Balance</p>
                  <p className="font-bold text-green-600 text-sm">₦{parseFloat(selectedUser.walletBalance || '0').toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">KYC Status</p>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="mt-1 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="grid grid-cols-2 gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => {
                setShowViewModal(false);
                if (selectedUser) {
                  setTransactionUser(selectedUser);
                  setShowTransactionsModal(true);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <BarChart2 className="h-4 w-4 mr-1" />
              Transactions
            </Button>
            <Button 
              size="sm"
              onClick={() => {
                setShowViewModal(false);
                if (selectedUser) openFundModal(selectedUser);
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <DollarSign className="h-4 w-4 mr-1" />
              Fund Wallet
            </Button>
            {selectedUser?.isSuspended ? (
              <Button
                size="sm"
                disabled={unsuspendUserMutation.isPending}
                onClick={() => selectedUser && unsuspendUserMutation.mutate(selectedUser.id)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {unsuspendUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                Unsuspend
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setShowSuspendModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Ban className="h-4 w-4 mr-1" />
                Suspend
              </Button>
            )}
            <Button 
              size="sm"
              disabled={updateStatusMutation.isPending}
              onClick={() => {
                if (selectedUser) {
                  updateStatusMutation.mutate({ userId: selectedUser.id, status: editStatus });
                }
              }}
              className="bg-primary hover:bg-primary/90 text-white col-span-2"
            >
              {updateStatusMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Update KYC Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuspendModal} onOpenChange={setShowSuspendModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Ban className="h-5 w-5" />
              Suspend User
            </DialogTitle>
            <DialogDescription>
              This will block <strong>{selectedUser?.name}</strong> from accessing the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-sm">Reason (optional)</Label>
            <Input
              placeholder="e.g. Fraudulent activity, TOS violation..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSuspendModal(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={suspendUserMutation.isPending}
              onClick={() => selectedUser && suspendUserMutation.mutate({ userId: selectedUser.id, reason: suspendReason || undefined })}
              className="bg-red-600 hover:bg-red-700"
            >
              {suspendUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
              Suspend Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTransactionsModal} onOpenChange={setShowTransactionsModal}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction History — {transactionUser?.name}</DialogTitle>
            <DialogDescription>{transactionUser?.email}</DialogDescription>
          </DialogHeader>
          {transactionUser && (
            <AdminTransactions
              filterUserId={transactionUser.id}
              filterUserName={transactionUser.name}
              embedded={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
