import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Send,
  Bot,
  User,
  Headset,
  Loader2,
  ArrowLeft,
  Search,
  AlertCircle,
  Clock,
  MessageCircle,
  Mail,
  Phone,
  ChevronRight,
  CreditCard,
  ShieldCheck,
  Smartphone,
  GraduationCap,
  HelpCircle,
  Wallet,
  X,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Zap,
  Paperclip,
  FileIcon,
  Download,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { format, formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  senderType: "user" | "ai" | "agent" | "system";
  senderName?: string;
  content: string;
  createdAt: string;
  fileUrl?: string | null;
  fileName?: string | null;
}

interface Presence {
  participantId: string;
  participantType: string;
  participantName: string;
  isOnline: boolean;
  isTyping: boolean;
}

interface Ticket {
  id: string;
  referenceId: string;
  subject: string;
  status: string;
  category?: string;
  conversationId: string | null;
  agentName: string | null;
  isActive?: boolean;
  lastActivityAt?: string;
  createdAt?: string;
}

type View = "lobby" | "chat" | "new";

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "open": return "default";
    case "escalated": return "destructive";
    case "in_progress": return "secondary";
    default: return "outline";
  }
}

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    open: "Open",
    escalated: "Escalated",
    in_progress: "In Progress",
    assigned: "Assigned",
    resolved: "Resolved",
    closed: "Closed",
  };
  return map[s] || s;
};

const quickTopics = [
  { subject: "Failed Transaction", category: "wallet", message: "I have a failed transaction that was debited but not completed.", icon: CreditCard, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-100 dark:border-red-900/40" },
  { subject: "NIN Verification Issue", category: "identity", message: "I'm having trouble with my NIN verification or slip download.", icon: ShieldCheck, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-100 dark:border-blue-900/40" },
  { subject: "Wallet Funding Issue", category: "wallet", message: "I'm unable to fund my wallet or my wallet balance is incorrect.", icon: Wallet, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-100 dark:border-emerald-900/40" },
  { subject: "Airtime/Data Not Received", category: "vtu", message: "I purchased airtime or data but did not receive it.", icon: Smartphone, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-100 dark:border-orange-900/40" },
  { subject: "WAEC/JAMB Result Check", category: "education", message: "I need help checking my WAEC or JAMB result.", icon: GraduationCap, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-100 dark:border-purple-900/40" },
  { subject: "BVN Retrieval Problem", category: "identity", message: "I need help retrieving my BVN details.", icon: HelpCircle, color: "text-primary", bg: "bg-primary/5 dark:bg-primary/10", border: "border-primary/10 dark:border-primary/20" },
];

const faqs = [
  { q: "How long does NIN verification take?", a: "NIN verification is usually instant. If it takes more than 5 minutes, please contact support." },
  { q: "Why was my transaction debited but not completed?", a: "This happens when there is a network issue. The amount is usually reversed within 24-48 hours. Contact us if it takes longer." },
  { q: "How do I fund my Arapoint wallet?", a: "Go to Dashboard → Wallet → Fund Wallet. You can fund via bank transfer to your virtual account." },
  { q: "Can I get a refund on a failed VTU top-up?", a: "Yes. Failed VTU transactions are automatically reversed to your wallet within minutes. Check your wallet balance." },
];

interface SupportSettings {
  siteEmail: string;
  sitePhone: string;
  supportWhatsappChannel: string;
  supportWhatsappGroup: string;
}

export default function SupportChat() {
  const [view, setView] = useState<View>("lobby");
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [agentsOnline, setAgentsOnline] = useState<boolean | null>(null);
  const [supportSettings, setSupportSettings] = useState<SupportSettings>({
    siteEmail: "support@arapoint.com.ng",
    sitePhone: "",
    supportWhatsappChannel: "",
    supportWhatsappGroup: "",
  });

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [initialMessage, setInitialMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [trackRef, setTrackRef] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackResult, setTrackResult] = useState<Ticket | null>(null);
  const [trackError, setTrackError] = useState("");
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);

  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string } | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [queueInfo, setQueueInfo] = useState<{
    inQueue: boolean;
    position: number;
    estimatedWaitMinutes: number;
    totalWaiting: number;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const lastMessageTimestampRef = useRef<string | null>(null);

  const fetchActiveTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const res = await apiClient.get("/support/tickets/active");
      setActiveTickets(res.data.data.tickets || []);
    } catch {
      setActiveTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => { fetchActiveTickets(); }, [fetchActiveTickets]);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await fetch('/api/support/availability');
        const data = await res.json();
        setAgentsOnline(data.data?.agentsOnline ?? false);
      } catch {
        setAgentsOnline(false);
      }
    };
    const fetchSupportSettings = async () => {
      try {
        const res = await fetch('/api/settings/public');
        const data = await res.json();
        const s = data.data || {};
        setSupportSettings({
          siteEmail: s.siteEmail || "support@arapoint.com.ng",
          sitePhone: s.sitePhone || "",
          supportWhatsappChannel: s.supportWhatsappChannel || "",
          supportWhatsappGroup: s.supportWhatsappGroup || "",
        });
      } catch {}
    };
    fetchAvailability();
    fetchSupportSettings();
    const interval = setInterval(fetchAvailability, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const loadMessages = useCallback(async (convId: string, sinceTimestamp?: string) => {
    try {
      let url = `/support/conversations/${convId}/messages`;
      if (sinceTimestamp) url += `?since=${encodeURIComponent(sinceTimestamp)}`;
      const res = await apiClient.get(url);
      const data = res.data.data;
      if (sinceTimestamp) {
        const newMsgs: Message[] = data.messages || [];
        if (newMsgs.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const filtered = newMsgs.filter((m) => !existingIds.has(m.id));
            return filtered.length > 0 ? [...prev, ...filtered] : prev;
          });
          lastMessageTimestampRef.current = newMsgs[newMsgs.length - 1].createdAt;
        }
      } else {
        const allMsgs: Message[] = data.messages || [];
        setMessages(allMsgs);
        if (allMsgs.length > 0) lastMessageTimestampRef.current = allMsgs[allMsgs.length - 1].createdAt;
      }
      setPresence(data.presence || []);
      setIsActive(data.isActive);
      setClosedReason(data.closedReason || null);
      setTicketStatus(data.ticketStatus || null);
      setReferenceId(data.referenceId || null);
      setAgentName(data.agentName || null);
      if (data.agentName) setQueueInfo(null);
      return data.isActive;
    } catch { return true; }
  }, []);

  const fetchQueuePosition = useCallback(async (ticketId: string) => {
    try {
      const res = await apiClient.get(`/support/queue/position/${ticketId}`);
      const data = res.data.data;
      setQueueInfo(data);
      if (!data.inQueue) setQueueInfo(null);
    } catch {
      setQueueInfo(null);
    }
  }, []);

  const startPolling = useCallback((convId: string, ticketId?: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    let queuePollCounter = 0;
    pollingRef.current = setInterval(async () => {
      const still = await loadMessages(convId, lastMessageTimestampRef.current || undefined);
      if (still === false) { if (pollingRef.current) clearInterval(pollingRef.current); pollingRef.current = null; }
      queuePollCounter++;
      if (ticketId && queuePollCounter % 3 === 0) {
        fetchQueuePosition(ticketId);
      }
    }, 4000);
  }, [loadMessages, fetchQueuePosition]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }, []);

  const startHeartbeat = useCallback((tId: string) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    const sendBeat = () => { apiClient.post("/support/presence/heartbeat", { ticketId: tId, isTyping: isTypingRef.current }).catch(() => {}); };
    sendBeat();
    heartbeatRef.current = setInterval(sendBeat, 10000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
  }, []);

  const openChat = useCallback(async (ticket: Ticket) => {
    if (!ticket.conversationId) return;
    setCurrentTicket(ticket);
    setConversationId(ticket.conversationId);
    setView("chat");
    setLoadingMessages(true);
    setQueueInfo(null);
    lastMessageTimestampRef.current = null;
    await loadMessages(ticket.conversationId);
    setLoadingMessages(false);
    startPolling(ticket.conversationId, ticket.id);
    startHeartbeat(ticket.id);
    if (ticket.status === "escalated" && !ticket.agentName) {
      fetchQueuePosition(ticket.id);
    }
  }, [loadMessages, startPolling, startHeartbeat, fetchQueuePosition]);

  const goBack = useCallback(() => {
    setView("lobby");
    setCurrentTicket(null);
    setConversationId(null);
    setMessages([]);
    setPresence([]);
    setIsActive(true);
    setClosedReason(null);
    setTicketStatus(null);
    setReferenceId(null);
    setAgentName(null);
    lastMessageTimestampRef.current = null;
    stopPolling();
    stopHeartbeat();
    fetchActiveTickets();
  }, [stopPolling, stopHeartbeat, fetchActiveTickets]);

  useEffect(() => {
    return () => {
      stopPolling();
      stopHeartbeat();
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    };
  }, [stopPolling, stopHeartbeat]);

  const handleCreateTicketWith = async (sub: string, cat: string, msg: string) => {
    if (!msg.trim()) return;
    setCreating(true);
    setCreateError(null);
    const autoSubject = sub.trim() || msg.trim().split(/\s+/).slice(0, 6).join(" ") + (msg.trim().split(/\s+/).length > 6 ? "…" : "");
    try {
      const res = await apiClient.post("/support/tickets", { subject: autoSubject, category: cat || "general", message: msg.trim() });
      const { ticket, conversationId: convId } = res.data.data;
      const newTicket: Ticket = { id: ticket.id, referenceId: ticket.referenceId, subject: ticket.subject, status: ticket.status, conversationId: convId, agentName: null };
      setSubject(""); setCategory("general"); setInitialMessage(""); setShowNewForm(false);
      openChat(newTicket);
    } catch (error: any) {
      setCreateError(error.response?.data?.message || "Failed to start chat. Please try again.");
    } finally { setCreating(false); }
  };

  const handleCreateTicket = async () => { await handleCreateTicketWith(subject, category, initialMessage); };

  const handleTrack = async () => {
    if (!trackRef.trim()) return;
    setTracking(true); setTrackError(""); setTrackResult(null);
    try {
      const res = await apiClient.get(`/support/tickets/track/${encodeURIComponent(trackRef.trim().toUpperCase())}`);
      setTrackResult(res.data.data.ticket); setTrackDialogOpen(true);
    } catch { setTrackError("Ticket not found. Check the reference and try again."); }
    finally { setTracking(false); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post("/support/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setAttachedFile({ url: res.data.data.fileUrl, name: res.data.data.fileName || file.name });
    } catch {
      setChatError("Failed to upload file. Please try again.");
      setTimeout(() => setChatError(null), 5000);
    } finally {
      setFileUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachedFile) || !conversationId || !isActive) return;
    const userMsg = input.trim();
    const fileToSend = attachedFile;
    setInput(""); setAttachedFile(null); setSending(true); isTypingRef.current = false;
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, senderType: "user", content: userMsg || (fileToSend ? `Sent a file: ${fileToSend.name}` : ""), fileUrl: fileToSend?.url, fileName: fileToSend?.name, createdAt: new Date().toISOString() }]);
    setIsAiTyping(true);
    try {
      const res = await apiClient.post(`/support/conversations/${conversationId}/messages`, {
        content: userMsg,
        fileUrl: fileToSend?.url,
        fileName: fileToSend?.name,
      });
      const data = res.data.data;
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: data.message.id, createdAt: data.message.createdAt } : m)));
      lastMessageTimestampRef.current = data.message.createdAt;
      if (data.escalated) {
        setTicketStatus("escalated");
      }
      await loadMessages(conversationId, data.message.createdAt);
    } catch (error: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setChatError(error.response?.data?.message || "Failed to send. Please try again.");
      setTimeout(() => setChatError(null), 5000);
    } finally { setSending(false); setIsAiTyping(false); }
  };

  const handleEscalate = async () => {
    if (!conversationId) return;
    setEscalating(true);
    try { await apiClient.post(`/support/conversations/${conversationId}/escalate`); setTicketStatus("escalated"); await loadMessages(conversationId); }
    catch {} finally { setEscalating(false); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value); isTypingRef.current = true;
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => { isTypingRef.current = false; }, 3000);
  };

  const agentPresence = presence.find((p) => p.participantType === "agent");

  if (view === "chat") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="h-[640px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Headset className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{currentTicket?.subject || "Support Chat"}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {referenceId && <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">{referenceId}</Badge>}
                  {ticketStatus && <Badge variant={statusBadgeVariant(ticketStatus)} className="text-[10px] px-1.5 py-0">{statusLabel(ticketStatus)}</Badge>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {agentName && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="relative">
                    <Headset className="h-3.5 w-3.5" />
                    {agentPresence?.isOnline && <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-background" />}
                  </div>
                  <span className="hidden sm:inline">{agentName}</span>
                </div>
              )}
              {ticketStatus !== "escalated" && isActive && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleEscalate} disabled={escalating}>
                  {escalating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Headset className="h-3 w-3 mr-1" />}
                  Talk to Agent
                </Button>
              )}
            </div>
          </div>

          {queueInfo?.inQueue && (
            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center">
                    <span className="text-lg font-bold text-amber-700 dark:text-amber-300">#{queueInfo.position}</span>
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-400 animate-ping" />
                  <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    You are #{queueInfo.position} in the queue
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    <Clock className="h-3 w-3 inline mr-1 -mt-0.5" />
                    Estimated wait: ~{queueInfo.estimatedWaitMinutes} min
                    {queueInfo.totalWaiting > 1 && ` · ${queueInfo.totalWaiting} people waiting`}
                  </p>
                </div>
                <Loader2 className="h-4 w-4 animate-spin text-amber-500 shrink-0" />
              </div>
            </div>
          )}

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p>Start the conversation below</p>
                    </div>
                  )}
                  {messages.map((msg) => {
                    if (msg.senderType === "system") {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <div className="bg-muted/60 text-muted-foreground text-xs px-3 py-1.5 rounded-full max-w-[85%] text-center">
                            <AlertCircle className="h-3 w-3 inline mr-1 -mt-0.5" />{msg.content}
                          </div>
                        </div>
                      );
                    }
                    const isUser = msg.senderType === "user";
                    const isAI = msg.senderType === "ai";
                    return (
                      <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                        <div className={`flex gap-2 max-w-[80%] ${isUser ? "flex-row-reverse" : ""}`}>
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-primary text-primary-foreground" : isAI ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"}`}>
                            {isUser ? <User className="h-3.5 w-3.5" /> : isAI ? <Bot className="h-3.5 w-3.5" /> : <Headset className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            {!isUser && (
                              <p className="text-[10px] text-muted-foreground mb-0.5 px-1">
                                {msg.senderName || (isAI ? "Ara AI" : "Agent")}
                              </p>
                            )}
                            <div className={`rounded-2xl px-3.5 py-2.5 ${isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                              {msg.content && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                              {msg.fileUrl && (
                                <a
                                  href={msg.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 mt-1.5 text-xs rounded-lg px-2.5 py-1.5 border ${isUser ? "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground" : "border-border bg-background text-foreground"} hover:opacity-80 transition-opacity`}
                                >
                                  <FileIcon className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate max-w-[160px]">{(msg as any).attachments?.[0]?.name || msg.fileName || "File"}</span>
                                  <Download className="h-3 w-3 shrink-0 ml-auto" />
                                </a>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 px-1">
                              {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {isAiTyping && (
                    <div className="flex justify-start">
                      <div className="flex gap-2 items-center">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                          <Bot className="h-3.5 w-3.5" />
                        </div>
                        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {agentPresence?.isTyping && (
                    <div className="flex justify-start">
                      <div className="flex gap-2 items-center">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400">
                          <Headset className="h-3.5 w-3.5" />
                        </div>
                        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
            )}

            {!isActive && (
              <div className="px-4 py-3 border-t bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Conversation closed{closedReason ? ` — ${closedReason}` : ""}. Start a new ticket for further help.</span>
              </div>
            )}
            {chatError && (
              <div className="px-4 py-2 border-t bg-destructive/5 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                <p className="text-xs text-destructive">{chatError}</p>
              </div>
            )}
            {isActive && (
              <div className="border-t">
                {attachedFile && (
                  <div className="px-3 pt-2 flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-muted rounded-lg px-2.5 py-1.5 text-xs flex-1 min-w-0">
                      <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate text-muted-foreground">{attachedFile.name}</span>
                    </div>
                    <button type="button" onClick={() => setAttachedFile(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <form onSubmit={handleSend} className="p-3 flex gap-2">
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.mp4,.mp3" onChange={handleFileSelect} />
                  <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()} disabled={fileUploading || sending} title="Attach file">
                    {fileUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>
                  <Input placeholder="Type your message..." value={input} onChange={handleInputChange} disabled={sending} className="flex-1" />
                  <Button type="submit" size="icon" disabled={sending || fileUploading || (!input.trim() && !attachedFile)}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">How can we help you?</h3>
            <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">Our AI is ready 24/7. Human agents available Mon–Fri, 8am–6pm WAT.</p>
            {agentsOnline === false && (
              <div className="mt-3 inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-medium px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800/50">
                <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                Human agents are currently offline — AI support is still available
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setShowNewForm(true)}
              size="lg"
              className="gap-2 font-semibold"
              variant={agentsOnline === false ? "outline" : "default"}
            >
              <MessageCircle className="h-4 w-4" /> {agentsOnline === false ? "Chat with AI" : "Start Live Chat"}
            </Button>
          </div>
        </div>

        {/* Ticket Tracker */}
        <div className="mt-6 pt-5 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-2">Track an existing ticket</p>
          <div className="flex gap-2 max-w-sm">
            <Input
              placeholder="Enter ticket ID (e.g. ARP-XXXXXX)"
              value={trackRef}
              onChange={(e) => { setTrackRef(e.target.value); setTrackError(""); }}
              className="h-9 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") handleTrack(); }}
            />
            <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5" onClick={handleTrack} disabled={tracking || !trackRef.trim()}>
              {tracking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Track
            </Button>
          </div>
          {trackError && <p className="text-xs text-destructive mt-1.5">{trackError}</p>}
        </div>
      </div>

      {/* Quick Topics */}
      <div>
        <h4 className="text-base font-semibold mb-4">What do you need help with?</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickTopics.map((topic, i) => (
            <button
              key={i}
              disabled={creating}
              onClick={() => handleCreateTicketWith(topic.subject, topic.category, topic.message)}
              className={`group flex flex-col items-start gap-2.5 p-4 rounded-xl border text-left transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 ${topic.bg} ${topic.border}`}
            >
              <div className={`h-9 w-9 rounded-lg bg-background/70 flex items-center justify-center shadow-sm`}>
                <topic.icon className={`h-4.5 w-4.5 ${topic.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{topic.subject}</p>
              </div>
              {creating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </button>
          ))}
        </div>
      </div>

      {/* New Chat Form (collapsible) */}
      {showNewForm && (
        <Card>
          <CardContent className="pt-5 pb-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Describe your issue</h4>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowNewForm(false); setCreateError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {createError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{createError}</p>
              </div>
            )}
            <Textarea
              placeholder="Describe your issue in detail. Our AI will respond immediately..."
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <Button className="w-full gap-2" onClick={handleCreateTicket} disabled={creating || !initialMessage.trim()}>
              {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting Chat...</> : <><Zap className="h-4 w-4" /> Start Chat</>}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Tickets */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-base font-semibold">Your Conversations</h4>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={fetchActiveTickets} disabled={loadingTickets}>
              <RefreshCw className={`h-3 w-3 ${loadingTickets ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
          <div className="space-y-2">
            {loadingTickets ? (
              <div className="flex items-center justify-center py-10 border rounded-xl">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : activeTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border rounded-xl text-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No active conversations</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Start a new chat to get support</p>
              </div>
            ) : (
              activeTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  className="w-full text-left p-4 rounded-xl border hover:bg-muted/40 hover:border-primary/20 transition-all group"
                  onClick={() => openChat(ticket)}
                  disabled={!ticket.conversationId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <MessageCircle className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ticket.subject}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">{ticket.referenceId}</Badge>
                          <Badge variant={statusBadgeVariant(ticket.status)} className="text-[10px] px-1.5 py-0">{statusLabel(ticket.status)}</Badge>
                          {ticket.agentName && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Headset className="h-2.5 w-2.5" />{ticket.agentName}
                            </span>
                          )}
                        </div>
                        {ticket.createdAt && (
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* FAQ + Contact */}
        <div className="space-y-6">
          {/* FAQ */}
          <div>
            <h4 className="text-base font-semibold mb-3">Frequently Asked Questions</h4>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <div key={i} className="border rounded-xl overflow-hidden">
                  <button
                    className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <p className="text-sm font-medium leading-snug">{faq.q}</p>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform ${openFaq === i ? "rotate-90" : ""}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed border-t bg-muted/10 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Channels */}
          <div>
            <h4 className="text-base font-semibold mb-3">Contact Us Directly</h4>
            <div className="grid grid-cols-1 gap-2.5">
              {supportSettings.siteEmail && (
                <a href={`mailto:${supportSettings.siteEmail}`} className="flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/40 hover:border-primary/20 transition-all group">
                  <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                    <Mail className="h-4.5 w-4.5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Email Support</p>
                    <p className="text-xs text-muted-foreground">{supportSettings.siteEmail}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">Response within 2–4 business hours</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </a>
              )}
              {supportSettings.sitePhone && (
                <a href={`tel:${supportSettings.sitePhone}`} className="flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/40 hover:border-primary/20 transition-all group">
                  <div className="h-10 w-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                    <Phone className="h-4.5 w-4.5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Phone Support</p>
                    <p className="text-xs text-muted-foreground">{supportSettings.sitePhone}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">Mon–Fri, 8:00am – 6:00pm WAT</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </a>
              )}
              {supportSettings.supportWhatsappChannel && (
                <a href={supportSettings.supportWhatsappChannel} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/40 hover:border-primary/20 transition-all group">
                  <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-4.5 w-4.5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">WhatsApp Channel</p>
                    <p className="text-xs text-muted-foreground">Follow for updates and announcements</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </a>
              )}
              {supportSettings.supportWhatsappGroup && (
                <a href={supportSettings.supportWhatsappGroup} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/40 hover:border-primary/20 transition-all group">
                  <div className="h-10 w-10 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-4.5 w-4.5 text-teal-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">WhatsApp Group</p>
                    <p className="text-xs text-muted-foreground">Join our community for support</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Track Dialog */}
      <Dialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {trackResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono">{trackResult.referenceId}</Badge>
                <Badge variant={statusBadgeVariant(trackResult.status)}>{statusLabel(trackResult.status)}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">Subject</span><span className="font-medium">{trackResult.subject}</span></div>
                {trackResult.agentName && <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">Agent</span><span className="font-medium">{trackResult.agentName}</span></div>}
                {trackResult.createdAt && <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">Created</span><span className="font-medium">{format(new Date(trackResult.createdAt), "PPp")}</span></div>}
              </div>
              {trackResult.conversationId && trackResult.status !== "closed" && trackResult.status !== "resolved" && (
                <Button className="w-full" onClick={() => { setTrackDialogOpen(false); openChat(trackResult); }}>
                  Open Conversation
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
