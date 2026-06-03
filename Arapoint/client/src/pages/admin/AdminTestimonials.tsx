import { useState, useEffect, useRef } from "react";
import { tokenStorage } from "@/lib/tokenStorage";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Star, Plus, Edit2, Trash2, Eye, EyeOff, RefreshCw,
  Quote, Upload, X, GripVertical, MessageSquare
} from "lucide-react";

function adminFetch(path: string, options?: RequestInit) {
  const token = tokenStorage.getItem("adminToken");
  return fetch(`/api/testimonials${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

type Testimonial = {
  id: string;
  name: string;
  role: string;
  company?: string;
  avatar_url?: string;
  quote: string;
  rating: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
};

const EMPTY_FORM = {
  name: "",
  role: "",
  company: "",
  quote: "",
  rating: 5,
  avatarUrl: "",
  displayOrder: 0,
  isActive: true,
};

export default function AdminTestimonials() {
  const { toast } = useToast();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/all");
      const data = await res.json();
      if (data.status === "success") setItems(data.data);
    } catch {
      toast({ title: "Failed to load testimonials", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, displayOrder: items.length });
    setDialogOpen(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      role: t.role,
      company: t.company || "",
      quote: t.quote,
      rating: t.rating ?? 5,
      avatarUrl: t.avatar_url || "",
      displayOrder: t.display_order ?? 0,
      isActive: t.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.role.trim() || !form.quote.trim()) {
      toast({ title: "Name, role, and quote are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role.trim(),
        company: form.company.trim() || null,
        quote: form.quote.trim(),
        rating: Number(form.rating),
        avatarUrl: form.avatarUrl.trim() || null,
        displayOrder: Number(form.displayOrder),
        isActive: form.isActive,
      };

      const res = editingId
        ? await adminFetch(`/${editingId}`, { method: "PUT", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } })
        : await adminFetch("/", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });

      const data = await res.json();
      if (data.status === "success") {
        toast({ title: editingId ? "Testimonial updated" : "Testimonial created" });
        setDialogOpen(false);
        fetchAll();
      } else {
        toast({ title: data.message || "Save failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await adminFetch(`/${id}/toggle`, { method: "PATCH" });
      const data = await res.json();
      if (data.status === "success") {
        setItems(prev => prev.map(t => t.id === id ? { ...t, is_active: data.data.is_active } : t));
        toast({ title: data.data.is_active ? "Testimonial shown" : "Testimonial hidden" });
      }
    } catch {
      toast({ title: "Toggle failed", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await adminFetch(`/${deleteId}`, { method: "DELETE" });
      setItems(prev => prev.filter(t => t.id !== deleteId));
      setDeleteId(null);
      toast({ title: "Testimonial deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
    setDeleting(false);
  };

  const handleImageUpload = async (id: string, file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await adminFetch(`/${id}/image`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.status === "success") {
        setForm(f => ({ ...f, avatarUrl: data.data.avatarUrl }));
        toast({ title: "Image uploaded" });
      } else {
        toast({ title: data.message || "Upload failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploading(false);
  };

  const StarPicker = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star
            className={`w-6 h-6 transition-colors ${n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Testimonials</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage customer testimonials shown across the site</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Testimonial
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{items.length}</p>
          <p className="text-xs text-slate-500">Total testimonials</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
            <Eye className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{items.filter(t => t.is_active).length}</p>
          <p className="text-xs text-slate-500">Showing on site</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2">
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {items.length ? (items.reduce((s, t) => s + (t.rating ?? 5), 0) / items.length).toFixed(1) : "—"}
          </p>
          <p className="text-xs text-slate-500">Avg. rating</p>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{items.length} testimonial{items.length !== 1 ? "s" : ""}</p>
          <p className="text-xs text-slate-400">Sorted by display order</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : !items.length ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <Quote className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No testimonials yet</p>
            <Button className="mt-3" size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add one</Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {items.map(t => (
              <div key={t.id} className={`flex items-start gap-4 p-5 transition-colors ${!t.is_active ? "opacity-50" : ""}`}>
                <div className="flex-shrink-0 hidden sm:block text-slate-300 dark:text-slate-600 cursor-grab mt-1">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Avatar */}
                {t.avatar_url ? (
                  <img src={t.avatar_url} alt={t.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-0.5">
                    {initials(t.name)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t.name}</p>
                    <span className="text-xs text-slate-400">{t.role}{t.company ? ` · ${t.company}` : ""}</span>
                    <Badge className={`text-xs ${t.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {t.is_active ? "Visible" : "Hidden"}
                    </Badge>
                  </div>
                  <div className="flex gap-0.5 mb-1.5">
                    {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 italic">"{t.quote}"</p>
                  <p className="text-xs text-slate-400 mt-1">Order: {t.display_order}</p>
                </div>

                <div className="flex-shrink-0 flex gap-1.5">
                  <button
                    onClick={() => handleToggle(t.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                    title={t.is_active ? "Hide" : "Show"}
                  >
                    {t.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-500 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(t.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Name *</Label>
                <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Amaka Obi" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Role / Title *</Label>
                <Input className="mt-1" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Head of Talent" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Company</Label>
                <Input className="mt-1" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="TechBridge Lagos" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Display Order</Label>
                <Input className="mt-1" type="number" min={0} value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: Number(e.target.value) }))} />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Quote *</Label>
              <Textarea
                className="mt-1 resize-none"
                rows={4}
                value={form.quote}
                onChange={e => setForm(f => ({ ...f, quote: e.target.value }))}
                placeholder="What they said about Arapoint..."
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-2 block">Star Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setForm(f => ({ ...f, rating: n }))}>
                    <Star className={`w-6 h-6 transition-colors ${n <= form.rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Profile Photo URL</Label>
              <Input
                className="mt-1"
                value={form.avatarUrl}
                onChange={e => setForm(f => ({ ...f, avatarUrl: e.target.value }))}
                placeholder="https://... or leave blank for initials"
              />
              {form.avatarUrl && (
                <div className="flex items-center gap-2 mt-2">
                  <img src={form.avatarUrl} alt="preview" className="w-10 h-10 rounded-full object-cover border" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <span className="text-xs text-slate-500">Preview</span>
                </div>
              )}
            </div>

            {editingId && (
              <div>
                <Label className="text-xs font-semibold">Upload Photo (replaces URL)</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                    Choose file
                  </Button>
                  <span className="text-xs text-slate-400">JPG, PNG, WebP — max 5MB</span>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file && editingId) handleImageUpload(editingId, file);
                  }}
                />
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-4" : "translate-x-1"}`} />
              </button>
              <Label className="text-xs font-medium cursor-pointer" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
                {form.isActive ? "Visible on site" : "Hidden from site"}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={saving || !form.name.trim() || !form.role.trim() || !form.quote.trim()}
              onClick={handleSave}
            >
              {saving && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
              {editingId ? "Save Changes" : "Add Testimonial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Testimonial</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-400 py-2">This will permanently remove this testimonial from the site. Are you sure?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
