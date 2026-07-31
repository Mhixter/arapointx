import { useEffect, useState } from "react";
import { UserPlus, UserCog, Trash2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { screeningApi } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

const ROLES = ["super_admin", "hr_manager", "recruiter"];
const ROLE_LABELS: Record<string, string> = { super_admin: "Super Admin", hr_manager: "HR Manager", recruiter: "Recruiter" };
const ROLE_COLORS: Record<string, string> = { super_admin: "bg-purple-100 text-purple-700", hr_manager: "bg-green-100 text-green-700", recruiter: "bg-gray-100 text-gray-600" };

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", role: "recruiter" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await screeningApi.team.invite(form);
      toast({ title: "Team member invited!", description: `Temporary password: ${data.tempPassword}` });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Invite failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Invite Team Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Full Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" required className="h-10 rounded-xl border-gray-200" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Email Address</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" required className="h-10 rounded-xl border-gray-200" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Role</Label>
            <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger className="h-10 rounded-xl border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-xs text-green-700">
            A temporary password will be generated. Share it with the team member so they can log in.
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-green-700 hover:bg-green-800 text-white rounded-xl">
              {loading ? "Inviting..." : "Send Invite"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeamManagement() {
  const { toast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const load = () => {
    setLoading(true);
    screeningApi.team.list().then(setMembers).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await screeningApi.team.updateRole(userId, role);
      setMembers(m => m.map(x => x.id === userId ? { ...x, role } : x));
      toast({ title: "Role updated" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    try {
      await screeningApi.team.remove(userId);
      setMembers(m => m.filter(x => x.id !== userId));
      toast({ title: "Team member removed" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <ScreeningDashboardLayout>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSuccess={() => { setShowInvite(false); load(); }} />}
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Team Management</h1>
            <p className="text-sm text-gray-500">Manage who can access and run screenings</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} className="rounded-xl"><RefreshCw className="w-4 h-4" /></Button>
            <Button size="sm" onClick={() => setShowInvite(true)} className="bg-green-700 hover:bg-green-800 text-white rounded-xl">
              <UserPlus className="w-4 h-4 mr-2" /> Invite Member
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Members", value: members.length },
            { label: "Active", value: members.filter(m => m.isActive).length },
            { label: "Admins", value: members.filter(m => m.role === "super_admin").length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="hidden sm:grid grid-cols-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <div>Member</div><div>Role</div><div>Last Login</div><div>Actions</div>
          </div>
          {loading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-full" />
                  <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-32" /><div className="h-2 bg-gray-100 rounded w-24" /></div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center">
              <UserCog className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No team members yet. Invite someone to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {members.map(m => (
                <div key={m.id} className={`flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-3 sm:gap-0 px-6 py-4 ${!m.isActive ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                      {m.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.email}</p>
                    </div>
                  </div>
                  <div>
                    <Select defaultValue={m.role} onValueChange={v => handleRoleChange(m.id, v)}>
                      <SelectTrigger className={`h-8 text-xs rounded-xl border-0 px-3 font-medium w-36 ${ROLE_COLORS[m.role] || "bg-gray-100 text-gray-600"}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-gray-400">
                    {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleDateString("en-NG") : "Never"}
                  </div>
                  <div>
                    <button onClick={() => handleRemove(m.id, m.name)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScreeningDashboardLayout>
  );
}
