import { useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Loader2, User, GraduationCap, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { screeningApi, PRICING } from "@/lib/screening/api";
import ScreeningDashboardLayout from "@/components/layout/ScreeningDashboardLayout";

const EDU_PROVIDERS = ["waec", "neco", "nabteb", "nbais"];

export default function NewScreening() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [candidateRef, setCandidateRef] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [includeEdu, setIncludeEdu] = useState(true);

  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", position: "", nin: "", bvn: "",
    educationProvider: "", examNumber: "", examYear: "", cardSerial: "", cardPin: "", token: "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const charge = includeEdu && form.educationProvider ? PRICING.total : (PRICING.nin + PRICING.bvn + PRICING.fraud);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.nin || !form.bvn) {
      toast({ title: "Missing fields", description: "Full name, NIN and BVN are required.", variant: "destructive" });
      return;
    }
    if (form.nin.length !== 11 || !/^\d+$/.test(form.nin)) {
      toast({ title: "Invalid NIN", description: "NIN must be exactly 11 digits.", variant: "destructive" });
      return;
    }
    if (form.bvn.length !== 11 || !/^\d+$/.test(form.bvn)) {
      toast({ title: "Invalid BVN", description: "BVN must be exactly 11 digits.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const body: any = {
        fullName: form.fullName, email: form.email || undefined, phone: form.phone || undefined,
        position: form.position || undefined, nin: form.nin, bvn: form.bvn,
      };
      if (includeEdu && form.educationProvider) {
        body.educationProvider = form.educationProvider;
        body.educationData = {
          registrationNumber: form.examNumber, examYear: form.examYear,
          cardSerialNumber: form.cardSerial, cardPin: form.cardPin, token: form.token,
        };
      }
      const data = await screeningApi.candidates.create(body);
      setCandidateRef(data.candidate?.reference);
      setCandidateId(data.candidate?.id);
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Screening failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <ScreeningDashboardLayout>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Screening Started!</h2>
            <p className="text-gray-500 text-sm mb-4">Your candidate verification is now in progress.</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-500 mb-1">Reference ID</p>
              <p className="font-bold text-gray-900 text-lg">{candidateRef}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left text-sm text-blue-700 space-y-2">
              <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /><span>NIN & BVN verification running...</span></div>
              {includeEdu && form.educationProvider && <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /><span>{form.educationProvider.toUpperCase()} verification in queue</span></div>}
              <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /><span>Fraud analysis running...</span></div>
              <p className="text-xs text-blue-500 mt-1">Estimated time: 3–5 minutes</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setLocation(`/employment-screening/dashboard/candidates/${candidateId}`)}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white rounded-xl">View Result</Button>
              <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ fullName: "", email: "", phone: "", position: "", nin: "", bvn: "", educationProvider: "", examNumber: "", examYear: "", cardSerial: "", cardPin: "", token: "" }); }}
                className="flex-1 rounded-xl">Screen Another</Button>
            </div>
          </div>
        </div>
      </ScreeningDashboardLayout>
    );
  }

  return (
    <ScreeningDashboardLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">New Candidate Screening</h1>
          <p className="text-sm text-gray-500">Verify candidate identity, education, and hiring risk</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Candidate Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-blue-700" />
              <h2 className="font-semibold text-gray-900 text-sm">Candidate Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Full Name *</Label>
                <Input value={form.fullName} onChange={set("fullName")} placeholder="As on government ID" required className="h-11 rounded-xl border-gray-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Email Address</Label>
                <Input type="email" value={form.email} onChange={set("email")} placeholder="candidate@email.com" className="h-11 rounded-xl border-gray-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Phone Number</Label>
                <Input value={form.phone} onChange={set("phone")} placeholder="+234 800 000 0000" className="h-11 rounded-xl border-gray-200" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Position Applied For</Label>
                <Input value={form.position} onChange={set("position")} placeholder="e.g. Finance Officer" className="h-11 rounded-xl border-gray-200" />
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <h2 className="font-semibold text-gray-900 text-sm">Identity Verification</h2>
              <span className="ml-auto text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">NIN ₦130 + BVN ₦80</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">NIN (11 digits) *</Label>
                <Input value={form.nin} onChange={set("nin")} placeholder="12345678901" maxLength={11} required className="h-11 rounded-xl border-gray-200 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">BVN (11 digits) *</Label>
                <Input value={form.bvn} onChange={set("bvn")} placeholder="22012345678" maxLength={11} required className="h-11 rounded-xl border-gray-200 font-mono" />
              </div>
            </div>
          </div>

          {/* Education */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-4 h-4 text-blue-700" />
              <h2 className="font-semibold text-gray-900 text-sm">Education Verification</h2>
              <span className="ml-auto text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">+₦120</span>
              <label className="flex items-center gap-1.5 ml-2 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={includeEdu} onChange={e => setIncludeEdu(e.target.checked)} className="rounded" />
                Include
              </label>
            </div>
            {includeEdu && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Exam Body</Label>
                  <Select value={form.educationProvider} onValueChange={v => setForm(f => ({ ...f, educationProvider: v }))}>
                    <SelectTrigger className="h-11 rounded-xl border-gray-200">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDU_PROVIDERS.map(p => <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Exam Number</Label>
                  <Input value={form.examNumber} onChange={set("examNumber")} placeholder="Registration Number" className="h-11 rounded-xl border-gray-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Exam Year</Label>
                  <Input value={form.examYear} onChange={set("examYear")} placeholder="e.g. 2020" className="h-11 rounded-xl border-gray-200" />
                </div>
                {form.educationProvider === "neco" ? (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Token</Label>
                    <Input value={form.token} onChange={set("token")} placeholder="NECO Token" className="h-11 rounded-xl border-gray-200" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Card Serial</Label>
                      <Input value={form.cardSerial} onChange={set("cardSerial")} placeholder="Scratch card serial" className="h-11 rounded-xl border-gray-200" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Card PIN</Label>
                      <Input value={form.cardPin} onChange={set("cardPin")} placeholder="Scratch card PIN" className="h-11 rounded-xl border-gray-200" />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Summary + Submit */}
          <div className="bg-blue-700 rounded-2xl p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Total Charge</p>
              <p className="text-3xl font-bold">₦{charge.toLocaleString()}</p>
              <p className="text-blue-200 text-xs mt-0.5">Will be debited from wallet balance</p>
            </div>
            <Button type="submit" disabled={loading} className="bg-white text-blue-700 hover:bg-blue-50 font-semibold rounded-xl px-8 h-12 text-sm">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <>Start Verification <ChevronRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </div>
        </form>
      </div>
    </ScreeningDashboardLayout>
  );
}
