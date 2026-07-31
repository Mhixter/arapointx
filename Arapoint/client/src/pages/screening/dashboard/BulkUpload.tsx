import { useState, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, Download, CheckCircle, Loader2, AlertCircle, ArrowRight, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { screeningApi, PRICING } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

const ease = [0.22, 1, 0.36, 1] as any;

function parseCsv(text: string): any[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.split(",");
    const obj: any = {};
    headers.forEach((h, i) => { obj[h] = vals[i]?.trim() || ""; });
    return obj;
  });
}

const TEMPLATE_CSV = "fullName,email,phone,position,nin,bvn,educationProvider,examNumber,examYear,cardSerial,cardPin\nJohn Doe,john@example.com,08012345678,Finance Officer,12345678901,22012345678,waec,REG123456,2020,SC123456,1234\n";

export default function BulkUpload() {
  const { toast } = useToast();
  const [batches, setBatches] = useState<any[]>([]);
  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    screeningApi.bulk.batches().then(setBatches).catch(() => {});
  }, []);

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(csv|xlsx)$/i)) {
      toast({ title: "Invalid file type", description: "Only CSV or XLSX files are accepted.", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toast({ title: "Empty file", description: "No valid candidate rows found.", variant: "destructive" });
        return;
      }
      setParsed(rows);
    };
    reader.readAsText(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleUpload = async () => {
    if (parsed.length === 0) return;
    setUploading(true);
    try {
      await screeningApi.bulk.upload({ candidates: parsed, fileName });
      toast({ title: "Batch uploaded!", description: parsed.length + " candidates queued for screening." });
      setParsed([]); setFileName("");
      const updated = await screeningApi.bulk.batches();
      setBatches(updated);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "arapoint_screening_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const charge = parsed.length * PRICING.total;

  return (
    <ScreeningDashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}
          className="flex items-center justify-between mb-7">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-3"
              style={{ background: "rgba(37,99,235,0.08)", color: "#2563EB", border: "1px solid rgba(37,99,235,0.2)" }}>
              <Upload className="w-3 h-3" /> Bulk Screening
            </div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "#0F172A" }}>Bulk Candidate Screening</h1>
            <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>Upload a CSV to screen multiple candidates at once</p>
          </div>
          <Button variant="outline" onClick={downloadTemplate} className="rounded-xl gap-2 h-9"
            style={{ borderColor: "#E5E7EB", color: "#64748B" }}>
            <Download className="w-3.5 h-3.5" /> Download Template
          </Button>
        </motion.div>

        {/* Upload drop zone */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05, ease }}
          className="rounded-2xl p-12 text-center mb-6 transition-all cursor-pointer border-2 border-dashed"
          style={dragging
            ? { borderColor: "#08B63E", background: "rgba(8,182,62,0.05)" }
            : { borderColor: "#E5E7EB", background: "white" }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => document.getElementById("csv-input")?.click()}>
          <input id="csv-input" type="file" accept=".csv,.xlsx" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(8,182,62,0.08)", border: "1px solid rgba(8,182,62,0.2)" }}>
            <Upload className="w-7 h-7" style={{ color: "#08B63E" }} />
          </div>
          <p className="font-bold text-lg mb-1" style={{ color: "#0F172A" }}>Drop your file here</p>
          <p className="text-sm mb-3" style={{ color: "#64748B" }}>
            or <span className="font-semibold" style={{ color: "#08B63E" }}>browse files</span>
          </p>
          <p className="text-xs mb-3" style={{ color: "#64748B" }}>Supports: CSV, XLSX</p>
          <button onClick={e => { e.stopPropagation(); downloadTemplate(); }}
            className="text-xs font-semibold hover:opacity-70 transition-opacity"
            style={{ color: "#08B63E" }}>
            Download sample template
          </button>
        </motion.div>

        {/* Preview */}
        {parsed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }}
            className="bg-white rounded-2xl border p-6 mb-6"
            style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(8,182,62,0.08)" }}>
                  <FileSpreadsheet className="w-4 h-4" style={{ color: "#08B63E" }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "#0F172A" }}>{fileName}</p>
                  <span className="text-xs font-medium" style={{ color: "#08B63E" }}>{parsed.length} candidates detected</span>
                </div>
              </div>
              <button onClick={() => { setParsed([]); setFileName(""); }}
                className="text-xs font-medium hover:opacity-70" style={{ color: "#EF4444" }}>
                Clear
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: "#F4F6F8" }}>
                    {["Name", "NIN", "BVN", "Provider", "Position"].map(h => (
                      <th key={h} className="text-left py-2 pr-4 font-semibold uppercase tracking-wide" style={{ color: "#64748B" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-b last:border-0" style={{ borderColor: "#F4F6F8" }}>
                      <td className="py-2.5 pr-4 font-medium" style={{ color: "#0F172A" }}>{r.fullname || r.full_name || "—"}</td>
                      <td className="py-2.5 pr-4 font-mono" style={{ color: "#64748B" }}>{r.nin?.slice(0, 4)}***</td>
                      <td className="py-2.5 pr-4 font-mono" style={{ color: "#64748B" }}>{r.bvn?.slice(0, 4)}***</td>
                      <td className="py-2.5 pr-4" style={{ color: "#64748B" }}>{(r.educationprovider || r.education_provider || "—").toUpperCase()}</td>
                      <td className="py-2.5" style={{ color: "#64748B" }}>{r.position || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.length > 5 && (
                <p className="text-xs mt-2" style={{ color: "#64748B" }}>... and {parsed.length - 5} more candidates</p>
              )}
            </div>

            <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t"
              style={{ borderColor: "#F4F6F8" }}>
              <div className="rounded-xl p-3"
                style={{ background: "rgba(8,182,62,0.06)", border: "1px solid rgba(8,182,62,0.15)" }}>
                <span className="text-sm" style={{ color: "#64748B" }}>{parsed.length} candidates × ₦{PRICING.total} = </span>
                <span className="font-bold text-lg" style={{ color: "#08B63E" }}>₦{charge.toLocaleString()}</span>
                <span className="text-xs ml-2" style={{ color: "#64748B" }}>deducted from wallet</span>
              </div>
              <Button onClick={handleUpload} disabled={uploading}
                className="text-white rounded-xl px-6 font-semibold shadow-md"
                style={{ background: "linear-gradient(135deg, #08B63E, #079C36)" }}>
                {uploading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                  : <><Upload className="w-4 h-4 mr-2" />Start Bulk Screening</>}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Batch History */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15, ease }}
          className="bg-white rounded-2xl border overflow-hidden"
          style={{ borderColor: "#E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-2 px-6 py-4 border-b" style={{ borderColor: "#F4F6F8" }}>
            <Users className="w-4 h-4" style={{ color: "#08B63E" }} />
            <h2 className="font-semibold text-sm" style={{ color: "#0F172A" }}>Upload History</h2>
          </div>
          {batches.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "#F4F6F8" }}>
                <FileSpreadsheet className="w-5 h-5" style={{ color: "#64748B" }} />
              </div>
              <p className="text-sm" style={{ color: "#64748B" }}>No bulk uploads yet.</p>
            </div>
          ) : (
            <div>
              {batches.map((b, i) => {
                const passRate = b.totalCandidates > 0 ? Math.round((b.passCount / b.totalCandidates) * 100) : 0;
                return (
                  <motion.div key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                    <Link href={"/employment-screening/dashboard/bulk/" + b.id}>
                      <a className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/80 transition-colors group border-b last:border-0"
                        style={{ borderColor: "#F4F6F8" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: "rgba(8,182,62,0.08)" }}>
                          <FileSpreadsheet className="w-5 h-5" style={{ color: "#08B63E" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: "#0F172A" }}>{b.fileName || b.batchReference}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                            {b.totalCandidates} candidates · {new Date(b.createdAt).toLocaleDateString("en-NG")}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm font-semibold" style={{ color: "#0F172A" }}>{passRate}% Pass</span>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={b.status === "completed"
                              ? { background: "rgba(8,182,62,0.1)", color: "#08B63E" }
                              : { background: "rgba(37,99,235,0.1)", color: "#2563EB" }}>
                            {b.status === "completed" ? "Completed" : "Processing"}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: "#64748B" }} />
                        </div>
                      </a>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </ScreeningDashboardLayout>
  );
}
