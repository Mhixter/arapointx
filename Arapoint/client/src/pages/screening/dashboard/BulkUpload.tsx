import { useState, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { Upload, FileSpreadsheet, Download, Eye, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { screeningApi, PRICING } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

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
      toast({ title: "Batch uploaded!", description: `${parsed.length} candidates queued for screening.` });
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bulk Screening</h1>
            <p className="text-sm text-gray-500">Upload a CSV file to screen multiple candidates at once</p>
          </div>
          <Button variant="outline" onClick={downloadTemplate} className="rounded-xl text-sm gap-2">
            <Download className="w-4 h-4" /> Download Template
          </Button>
        </div>

        {/* Upload area */}
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center mb-6 transition-all cursor-pointer ${dragging ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => document.getElementById("csv-input")?.click()}
        >
          <input id="csv-input" type="file" accept=".csv,.xlsx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <Upload className="w-10 h-10 text-blue-700 mx-auto mb-3" />
          <p className="font-semibold text-blue-700 text-lg">Drag & drop your file here</p>
          <p className="text-blue-600">or <span className="underline cursor-pointer">browse</span></p>
          <p className="text-gray-400 text-sm mt-2">Supports: CSV, XLSX</p>
          <button onClick={e => { e.stopPropagation(); downloadTemplate(); }}
            className="mt-2 text-sm text-blue-600 hover:underline font-medium">Download sample template</button>
        </div>

        {/* Preview */}
        {parsed.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                <p className="font-semibold text-gray-900 text-sm">{fileName}</p>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{parsed.length} candidates</span>
              </div>
              <button onClick={() => { setParsed([]); setFileName(""); }} className="text-xs text-gray-400 hover:text-red-500">Clear</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-100">{["Name", "NIN", "BVN", "Provider", "Position"].map(h => <th key={h} className="text-left py-2 text-gray-400 font-medium pr-4">{h}</th>)}</tr></thead>
                <tbody>
                  {parsed.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 pr-4 font-medium text-gray-800">{r.fullname || r.full_name || "—"}</td>
                      <td className="py-2 pr-4 font-mono text-gray-600">{r.nin?.slice(0, 4)}***</td>
                      <td className="py-2 pr-4 font-mono text-gray-600">{r.bvn?.slice(0, 4)}***</td>
                      <td className="py-2 pr-4 text-gray-600">{(r.educationprovider || r.education_provider || "—").toUpperCase()}</td>
                      <td className="py-2 text-gray-600">{r.position || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.length > 5 && <p className="text-xs text-gray-400 mt-2">... and {parsed.length - 5} more candidates</p>}
            </div>
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-100">
              <div className="bg-blue-50 rounded-xl p-3 text-sm">
                <span className="text-blue-700 font-semibold">{parsed.length} candidates × ₦{PRICING.total} = </span>
                <span className="text-blue-900 font-bold text-lg">₦{charge.toLocaleString()}</span>
                <span className="text-blue-500 text-xs ml-2">will be deducted from wallet</span>
              </div>
              <Button onClick={handleUpload} disabled={uploading} className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl px-6">
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><Upload className="w-4 h-4 mr-2" />Start Bulk Screening</>}
              </Button>
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Upload History</h2>
          </div>
          {batches.length === 0 ? (
            <div className="py-12 text-center"><p className="text-gray-400 text-sm">No bulk uploads yet.</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {batches.map(b => {
                const passRate = b.totalCandidates > 0 ? Math.round((b.passCount / b.totalCandidates) * 100) : 0;
                return (
                  <Link key={b.id} href={`/employment-screening/dashboard/bulk/${b.id}`}>
                    <a className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{b.fileName || b.batchReference}</p>
                        <p className="text-xs text-gray-400">{b.totalCandidates} candidates · {new Date(b.createdAt).toLocaleDateString("en-NG")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-700">{passRate}% Pass</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                          {b.status === "completed" ? "Completed" : "Processing"}
                        </span>
                      </div>
                    </a>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ScreeningDashboardLayout>
  );
}
