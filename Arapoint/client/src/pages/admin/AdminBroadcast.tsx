import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { tokenStorage } from "@/lib/tokenStorage";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Mail,
  Users,
  Code2,
  ShieldCheck,
  Upload,
  ImageIcon,
  Send,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

type BannerPosition = "top" | "middle" | "bottom";
type RecipientKey = "users" | "agents" | "developers";

interface RecipientCounts {
  users: number;
  agents: number;
  developers: number;
}

function getAdminToken(): string {
  return tokenStorage.getItem("adminToken") || "";
}

function adminFetch(path: string, options?: RequestInit) {
  return fetch(`/api/admin${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getAdminToken()}`,
      ...(options?.headers ?? {}),
    },
  });
}

export default function AdminBroadcast() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recipients, setRecipients] = useState<RecipientKey[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerPosition, setBannerPosition] = useState<BannerPosition>("top");
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  const { data: countsData } = useQuery({
    queryKey: ["broadcast-counts"],
    queryFn: async () => {
      const res = await adminFetch("/broadcast/counts");
      const json = await res.json();
      return json.data as RecipientCounts;
    },
  });

  const counts = countsData ?? { users: 0, agents: 0, developers: 0 };

  const totalSelected = recipients.reduce((sum, key) => sum + (counts[key] ?? 0), 0);

  const toggleRecipient = (key: RecipientKey) => {
    setRecipients(prev =>
      prev.includes(key) ? prev.filter(r => r !== key) : [...prev, key]
    );
  };

  const handleBannerUpload = async (file: File) => {
    setUploadingBanner(true);
    try {
      const form = new FormData();
      form.append("banner", file);
      const res = await adminFetch("/broadcast/upload-banner", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Upload failed");
      setBannerUrl(json.data.url);
      toast({ title: "Banner uploaded", description: "Banner image uploaded to Cloudinary." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingBanner(false);
    }
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await adminFetch("/broadcast/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients, subject, body, bannerUrl: bannerUrl || undefined, bannerPosition }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Send failed");
      return json.data as { sent: number; failed: number };
    },
    onSuccess: (data) => {
      setSendResult(data);
      toast({ title: "Broadcast complete", description: `${data.sent} sent, ${data.failed} failed` });
    },
    onError: (err: any) => {
      toast({ title: "Broadcast failed", description: err.message, variant: "destructive" });
    },
  });

  const recipientGroups: { key: RecipientKey; label: string; description: string; icon: React.ElementType; color: string }[] = [
    { key: "users", label: "Platform Users", description: "Regular verified users", icon: Users, color: "text-green-600" },
    { key: "agents", label: "Admin & Agents", description: "All admin users and agents", icon: ShieldCheck, color: "text-blue-600" },
    { key: "developers", label: "Developers", description: "Developer portal members", icon: Code2, color: "text-purple-600" },
  ];

  const canSend = recipients.length > 0 && subject.trim() && body.trim();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 rounded-lg bg-green-50 border border-green-200">
          <Mail className="h-6 w-6 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Broadcast</h1>
          <p className="text-sm text-muted-foreground">Compose and send email announcements to your platform audience</p>
        </div>
      </div>

      {sendResult && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Broadcast sent successfully</p>
              <p className="text-sm text-green-700">
                {sendResult.sent} email{sendResult.sent !== 1 ? "s" : ""} delivered
                {sendResult.failed > 0 && `, ${sendResult.failed} failed`}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSendResult(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Recipients */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recipients</CardTitle>
              <CardDescription>Select who will receive this email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recipientGroups.map(({ key, label, description, icon: Icon, color }) => (
                <div
                  key={key}
                  className={`flex items-center gap-4 p-3.5 rounded-lg border cursor-pointer transition-colors ${recipients.includes(key) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
                  onClick={() => toggleRecipient(key)}
                >
                  <Checkbox
                    id={key}
                    checked={recipients.includes(key)}
                    onCheckedChange={() => toggleRecipient(key)}
                    onClick={e => e.stopPropagation()}
                  />
                  <div className={`p-2 rounded-md bg-muted`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {counts[key].toLocaleString()}
                  </Badge>
                </div>
              ))}

              {recipients.length > 0 && (
                <div className="mt-2 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  <span>
                    <strong className="text-foreground">{totalSelected.toLocaleString()}</strong> recipient{totalSelected !== 1 ? "s" : ""} selected
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subject & Body */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Email Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  placeholder="Enter email subject..."
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="body">Message Body</Label>
                <Textarea
                  id="body"
                  placeholder="Write your message here...&#10;&#10;Use blank lines to create paragraphs."
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={12}
                  className="resize-y font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Use blank lines to separate paragraphs. Plain text is fine — it will be formatted automatically.</p>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Banner Image */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Custom Banner
                <Badge variant="outline" className="text-xs ml-auto">Optional</Badge>
              </CardTitle>
              <CardDescription>Upload an image to display in the email body</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleBannerUpload(file);
                  e.target.value = "";
                }}
              />

              {bannerUrl ? (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden border">
                    <img src={bannerUrl} alt="Banner preview" className="w-full h-auto max-h-32 object-cover" />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 h-7 w-7 p-0"
                      onClick={() => setBannerUrl("")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingBanner}
                  >
                    {uploadingBanner ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                    Replace banner
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingBanner}
                  className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingBanner ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <Upload className="h-8 w-8" />
                  )}
                  <p className="text-sm font-medium">{uploadingBanner ? "Uploading..." : "Click to upload banner"}</p>
                  <p className="text-xs">PNG, JPG, GIF up to 5MB</p>
                </button>
              )}

              {bannerUrl && (
                <div className="space-y-2">
                  <Label className="text-xs">Banner position in email</Label>
                  <RadioGroup value={bannerPosition} onValueChange={v => setBannerPosition(v as BannerPosition)} className="space-y-1.5">
                    {(["top", "middle", "bottom"] as BannerPosition[]).map(pos => (
                      <div key={pos} className="flex items-center gap-2">
                        <RadioGroupItem value={pos} id={`pos-${pos}`} />
                        <Label htmlFor={`pos-${pos}`} className="capitalize text-sm cursor-pointer">
                          {pos === "top" ? "Top — before body text" : pos === "middle" ? "Middle — between paragraphs" : "Bottom — after body text"}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Template note */}
          <Card className="border-muted">
            <CardContent className="pt-5 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0 mt-0.5" />
                <span><strong>Users & Agents</strong> receive green-branded emails</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0 mt-0.5" />
                <span><strong>Developers</strong> receive blue-branded emails</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-500" />
                <span>Emails are sent one at a time to avoid spam filters</span>
              </div>
            </CardContent>
          </Card>

          {/* Preview button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowPreview(!showPreview)}
            disabled={!body.trim()}
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? "Hide preview" : "Preview email"}
          </Button>

          {/* Send button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full"
                disabled={!canSend || sendMutation.isPending}
              >
                {sendMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />Send to {totalSelected.toLocaleString()} recipient{totalSelected !== 1 ? "s" : ""}</>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm broadcast</AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to send <strong>"{subject}"</strong> to{" "}
                  <strong>{totalSelected.toLocaleString()} recipient{totalSelected !== 1 ? "s" : ""}</strong> across the following groups:{" "}
                  {recipients.join(", ")}. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => sendMutation.mutate()}>
                  Yes, send broadcast
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </div>
      </div>

      {/* Preview panel */}
      {showPreview && body.trim() && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview — {recipients.includes("developers") && !recipients.includes("users") && !recipients.includes("agents") ? "Developer (blue)" : "User/Agent (green)"} template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden bg-[#EEF2F7] p-4">
              <div className="max-w-xl mx-auto bg-white rounded-lg overflow-hidden shadow">
                {/* Header */}
                <div className={`px-7 py-5 ${recipients.includes("developers") && !recipients.includes("users") && !recipients.includes("agents") ? "bg-[#1e3a8a]" : "bg-[#166534]"}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                      <span className={`font-black text-xl font-serif ${recipients.includes("developers") && !recipients.includes("users") && !recipients.includes("agents") ? "text-[#1e3a8a]" : "text-[#166534]"}`}>A</span>
                    </div>
                    <div>
                      <p className="text-white font-black tracking-widest text-lg leading-tight">ARAPOINT</p>
                      <p className={`text-xs font-bold tracking-wider ${recipients.includes("developers") && !recipients.includes("users") && !recipients.includes("agents") ? "text-blue-300" : "text-green-300"}`}>
                        {recipients.includes("developers") && !recipients.includes("users") && !recipients.includes("agents")
                          ? "DEVELOPER PLATFORM · SECURE IDENTITY INFRASTRUCTURE"
                          : "DIGITAL IDENTITY & VERIFICATION · NIGERIA"}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Accent */}
                <div className={`h-1 ${recipients.includes("developers") && !recipients.includes("users") && !recipients.includes("agents") ? "bg-blue-500" : "bg-green-400"}`} />
                {/* Banner top */}
                {bannerUrl && bannerPosition === "top" && (
                  <img src={bannerUrl} alt="Banner" className="w-full h-auto" />
                )}
                {/* Body */}
                <div className="px-8 py-8 text-sm text-gray-800 space-y-3 leading-relaxed">
                  {body.split(/\n\n+/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
                {/* Banner bottom */}
                {bannerUrl && bannerPosition === "bottom" && (
                  <img src={bannerUrl} alt="Banner" className="w-full h-auto" />
                )}
                {/* Footer */}
                <div className={`px-8 py-6 text-center text-xs ${recipients.includes("developers") && !recipients.includes("users") && !recipients.includes("agents") ? "bg-gray-900 text-gray-400 border-t border-[#1e3a8a]" : "bg-green-50 text-gray-500 border-t-2 border-green-200"}`}>
                  <p className="font-bold tracking-wider mb-1">ARAPOINT SOLUTIONS</p>
                  <p>arapoint.com.ng · &copy; {new Date().getFullYear()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
