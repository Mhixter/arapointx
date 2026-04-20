import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, Download, Trash2, FileText, ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { tokenStorage } from '@/lib/tokenStorage';

interface Banner {
  id: string;
  category: string;
  audience: string;
  headline: string;
  highlightWord?: string;
  bodyText?: string;
  bannerUrl: string;
  photoUrl?: string;
  aspectRatio: string;
  createdAt: string;
}

interface LayoutOption {
  id: string;
  name: string;
  description: string;
  audience?: 'main' | 'developer' | 'both';
}

interface PresetData {
  presets: { key: string; desc: string }[];
  categories: string[];
  audiences: string[];
  aspectRatios: string[];
  layouts: LayoutOption[];
}

export default function BannerStudio() {
  const { toast } = useToast();
  const [presets, setPresets] = useState<PresetData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [library, setLibrary] = useState<Banner[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [filterAudience, setFilterAudience] = useState<string>('all');

  const [form, setForm] = useState({
    category: 'Benefit',
    audience: 'main',
    headline: 'Why businesses choose Arapoint',
    highlightWord: 'Arapoint',
    bodyText: 'Whether you are onboarding borrowers, hiring staff, or meeting regulatory requirements, Arapoint gives you the data confidence to make informed decisions.',
    subjectPreset: 'businessman',
    customPhotoPrompt: '',
    feature1Title: 'REDUCE RISK',
    feature1Desc: 'Prevent fraud and bad hires.',
    feature2Title: 'MAKE BETTER DECISIONS',
    feature2Desc: 'Use reliable data you can trust.',
    feature3Title: 'SAVE TIME',
    feature3Desc: 'Verify fast and onboard confidently.',
    aspectRatio: '16:9',
    layoutId: 'auto',
  });

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenStorage.getItem('adminToken')}`,
  });

  const loadPresets = async () => {
    const r = await fetch('/api/admin/banner-studio/presets', { headers: authHeaders() });
    const j = await r.json();
    if (j?.data) setPresets(j.data);
  };

  const loadLibrary = async () => {
    setLoadingLibrary(true);
    try {
      const q = filterAudience !== 'all' ? `?audience=${filterAudience}` : '';
      const r = await fetch(`/api/admin/banner-studio/library${q}`, { headers: authHeaders() });
      const j = await r.json();
      if (j?.data?.banners) setLibrary(j.data.banners);
    } finally { setLoadingLibrary(false); }
  };

  useEffect(() => { loadPresets(); }, []);
  useEffect(() => { loadLibrary(); }, [filterAudience]);

  const handleGenerate = async () => {
    if (!form.headline.trim()) {
      toast({ title: 'Headline required', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const r = await fetch('/api/admin/banner-studio/generate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || 'Generation failed');
      toast({ title: 'Banner generated', description: 'Saved to library.' });
      loadLibrary();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally { setGenerating(false); }
  };

  const handleDownload = async (id: string) => {
    const r = await fetch(`/api/admin/banner-studio/${id}/download`, { headers: authHeaders() });
    if (!r.ok) { toast({ title: 'Download failed', variant: 'destructive' }); return; }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `arapoint-banner-${id}.png`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    const r = await fetch(`/api/admin/banner-studio/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (r.ok) { toast({ title: 'Deleted' }); loadLibrary(); }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleExportPdf = async () => {
    if (selectedIds.size === 0) { toast({ title: 'Select at least one banner', variant: 'destructive' }); return; }
    setExporting(true);
    try {
      const r = await fetch('/api/admin/banner-studio/export-pdf', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j?.message || 'PDF export failed'); }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `arapoint-banners-${Date.now()}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'PDF downloaded', description: `${selectedIds.size} banners exported.` });
    } catch (e: any) {
      toast({ title: 'Export failed', description: e.message, variant: 'destructive' });
    } finally { setExporting(false); }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0A2540]">Banner Studio</h1>
          <p className="text-slate-500 mt-1">Generate on-brand marketing banners with AI photos and locked Arapoint design.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-emerald-600" />Generate New Banner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Audience</Label>
                <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main Site</SelectItem>
                    <SelectItem value="developer">Developer Site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(presets?.categories || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Headline</Label>
              <Input value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} placeholder="Why businesses choose Arapoint" />
            </div>
            <div>
              <Label>Highlight Word (rendered in green)</Label>
              <Input value={form.highlightWord} onChange={e => setForm({ ...form, highlightWord: e.target.value })} placeholder="Arapoint" />
            </div>
            <div>
              <Label>Body Text</Label>
              <Textarea rows={3} value={form.bodyText} onChange={e => setForm({ ...form, bodyText: e.target.value })} />
            </div>

            <div>
              <Label>Layout Style</Label>
              <Select value={form.layoutId} onValueChange={(v) => setForm({ ...form, layoutId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(presets?.layouts || []).filter(l => !l.audience || l.audience === 'both' || l.audience === form.audience).map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.layoutId && presets?.layouts && (
                <p className="text-xs text-slate-500 mt-1">{presets.layouts.find(l => l.id === form.layoutId)?.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Subject (AI Photo)</Label>
                <Select value={form.subjectPreset} onValueChange={(v) => setForm({ ...form, subjectPreset: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(presets?.presets || []).map(p => <SelectItem key={p.key} value={p.key}>{p.key.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Aspect Ratio</Label>
                <Select value={form.aspectRatio} onValueChange={(v) => setForm({ ...form, aspectRatio: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(presets?.aspectRatios || ['16:9', '4:3', '1:1', '9:16']).map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Custom Photo Prompt (optional, overrides preset)</Label>
              <Textarea rows={2} value={form.customPhotoPrompt} onChange={e => setForm({ ...form, customPhotoPrompt: e.target.value })} placeholder="e.g., smiling Nigerian female pharmacist in white coat at counter" />
            </div>

            <div className="border-t pt-3">
              <p className="text-sm font-semibold text-slate-700 mb-2">Bottom Strip (3 Feature Highlights)</p>
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <Input value={(form as any)[`feature${i}Title`]} onChange={e => setForm({ ...form, [`feature${i}Title`]: e.target.value } as any)} placeholder={`Feature ${i} title`} />
                    <Input value={(form as any)[`feature${i}Desc`]} onChange={e => setForm({ ...form, [`feature${i}Desc`]: e.target.value } as any)} placeholder={`Feature ${i} description`} />
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={generating} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating (15–30s)…</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Banner</>}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><ImageIcon className="w-5 h-5 text-emerald-600" />Banner Library</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={filterAudience} onValueChange={setFilterAudience}>
                  <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="main">Main</SelectItem>
                    <SelectItem value="developer">Developer</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleExportPdf} disabled={exporting || selectedIds.size === 0} className="bg-[#0A2540] hover:bg-[#0a2540]/90">
                  {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
                  PDF ({selectedIds.size})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingLibrary ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
            ) : library.length === 0 ? (
              <p className="text-center py-12 text-slate-400">No banners yet. Generate your first one →</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-[700px] overflow-y-auto pr-2">
                {library.map(b => (
                  <div key={b.id} className="border rounded-lg overflow-hidden hover:shadow-md transition">
                    <div className="relative">
                      <Checkbox checked={selectedIds.has(b.id)} onCheckedChange={() => toggleSelect(b.id)} className="absolute top-2 left-2 z-10 bg-white" />
                      <img src={b.bannerUrl} alt={b.headline} className="w-full h-auto block" />
                    </div>
                    <div className="p-3 flex items-start justify-between gap-2 bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0A2540] truncate">{b.headline}</p>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="secondary" className="text-xs">{b.audience}</Badge>
                          <Badge variant="outline" className="text-xs">{b.category}</Badge>
                          <Badge variant="outline" className="text-xs">{b.aspectRatio}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => handleDownload(b.id)} title="Download PNG"><Download className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(b.id)} title="Delete"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
