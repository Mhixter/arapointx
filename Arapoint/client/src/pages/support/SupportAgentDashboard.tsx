import { tokenStorage } from '@/lib/tokenStorage';
import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApiClient } from "@/lib/api/client";
import { formatDistanceToNow } from "date-fns";
import {
  Headset,
  Loader2,
  Send,
  LogOut,
  Circle,
  Wifi,
  WifiOff,
  CheckCircle2,
  PlayCircle,
  XCircle,
  RotateCcw,
  UserCheck,
  MessageSquare,
  StickyNote,
  Sparkles,
  AlertTriangle,
  Bot,
  User,
  Search,
  ShieldAlert,
  Link2,
  Tag,
  ArrowRight,
  Inbox,
  Building2,
  X,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const statusColor = (s: string) => {
  switch (s) {
    case "open": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "escalated": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "assigned": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "resolved": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "closed": return "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400";
    default: return "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400";
  }
};

const severityColor = (s: string) => {
  switch (s) {
    case "critical": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800";
    case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800";
    case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800";
    default: return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800";
  }
};

const resultTypeColor = (type: string) => {
  switch (type) {
    case "a2c": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "identity": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "education": return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
    case "cac": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "transaction": return "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400";
    case "ticket": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "user": return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
    default: return "bg-gray-100 text-gray-700";
  }
};

const priorityVariant = (p: string) => {
  if (p === "urgent" || p === "high") return "destructive" as const;
  if (p === "medium") return "default" as const;
  return "secondary" as const;
};

const senderIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case "user": return <User className="h-3.5 w-3.5" />;
    case "ai": return <Bot className="h-3.5 w-3.5" />;
    case "agent": return <Headset className="h-3.5 w-3.5" />;
    default: return <AlertTriangle className="h-3.5 w-3.5" />;
  }
};

const senderStyle = (type: string) => {
  switch (type?.toLowerCase()) {
    case "user": return "bg-muted";
    case "agent": return "bg-primary text-primary-foreground";
    case "ai": return "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200 dark:border-violet-800";
    case "system": return "bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800 italic";
    default: return "bg-muted";
  }
};

const DEPARTMENTS = [
  { value: "a2c", label: "Airtime to Cash" },
  { value: "identity", label: "Identity Verification" },
  { value: "education", label: "Education Services" },
  { value: "jamb", label: "JAMB" },
  { value: "cac", label: "CAC Registration" },
  { value: "vtu", label: "VTU / Bills" },
  { value: "wallet", label: "Wallet / Payments" },
  { value: "general", label: "General" },
];

export default function SupportAgentDashboard() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMessageCountRef = useRef(0);
  const userScrolledUpRef = useRef(false);

  const [agent, setAgent] = useState<any>(null);
  const [mainTab, setMainTab] = useState<"tickets" | "lookup" | "fraud" | "teach">("tickets");

  // Tickets state
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetail, setTicketDetail] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [presence, setPresence] = useState<any>(null);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [statusFilter, setStatusFilter] = useState("active");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [ticketInnerTab, setTicketInnerTab] = useState<"messages" | "notes" | "internal">("messages");
  const [notes, setNotes] = useState<any[]>([]);
  const [internalMessages, setInternalMessages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  // Department tagging state
  const [taggingTicket, setTaggingTicket] = useState(false);
  const [deptTag, setDeptTag] = useState("");
  const [linkedOrderId, setLinkedOrderId] = useState("");
  const [linkedOrderType, setLinkedOrderType] = useState("");

  // Internal message state
  const [internalMsg, setInternalMsg] = useState("");
  const [internalMsgDept, setInternalMsgDept] = useState("");
  const [internalMsgOrderId, setInternalMsgOrderId] = useState("");
  const [sendingInternal, setSendingInternal] = useState(false);

  // Lookup state
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<any[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);

  // Fraud alerts state
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);
  const [fraudLoading, setFraudLoading] = useState(false);
  const [fraudStatus, setFraudStatus] = useState("open");
  const [resolveModal, setResolveModal] = useState<{ id: string; mode: "resolve" | "dismiss" } | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [resolvingAlert, setResolvingAlert] = useState(false);

  // AI Teach state
  const [unresolvedQueries, setUnresolvedQueries] = useState<any[]>([]);
  const [kbEntries, setKbEntries] = useState<any[]>([]);
  const [aiStats, setAiStats] = useState<any>(null);
  const [teachLoading, setTeachLoading] = useState(false);
  const [resolveQueryId, setResolveQueryId] = useState<string | null>(null);
  const [resolveQueryAnswer, setResolveQueryAnswer] = useState("");
  const [resolveQueryCategory, setResolveQueryCategory] = useState("general");
  const [resolveAddToKb, setResolveAddToKb] = useState(true);
  const [submittingResolve, setSubmittingResolve] = useState(false);
  const [newKbEntry, setNewKbEntry] = useState({ question: "", answer: "", category: "general", variations: "", tags: "" });
  const [addingKbEntry, setAddingKbEntry] = useState(false);
  const [showAddKb, setShowAddKb] = useState(false);
  const [kbActiveSection, setKbActiveSection] = useState<"unresolved" | "knowledge">("unresolved");

  useEffect(() => {
    try {
      const stored = JSON.parse(tokenStorage.getItem("adminUser") || "{}");
      if (!stored.id || stored.role !== "support_agent") {
        setLocation("/support/agent/login");
        return;
      }
      setAgent(stored);
    } catch {
      setLocation("/support/agent/login");
    }
  }, [setLocation]);

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter === "active") {
        params.set("status", "assigned");
      } else if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (agent?.id && statusFilter === "active") {
        params.set("assignedTo", agent.id);
      }
      const res = await adminApiClient.get(`/admin/support/tickets?${params.toString()}`);
      let ticketList = res.data.data.tickets || [];
      if (statusFilter === "active" && agent?.id) {
        const escalatedRes = await adminApiClient.get(`/admin/support/tickets?status=escalated`);
        const unassigned = (escalatedRes.data.data.tickets || []).filter((t: any) => !t.assignedAgentId);
        const inProgressRes = await adminApiClient.get(`/admin/support/tickets?status=in_progress&assignedTo=${agent.id}`);
        ticketList = [...ticketList, ...unassigned, ...(inProgressRes.data.data.tickets || [])];
        const seen = new Set();
        ticketList = ticketList.filter((t: any) => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
      }
      setTickets(ticketList);
    } catch {
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, [statusFilter, agent?.id]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await adminApiClient.get("/admin/support/tickets/stats");
      setStats(res.data.data.stats || {});
    } catch {}
  }, []);

  useEffect(() => {
    if (!agent) return;
    fetchTickets();
    fetchStats();
    const interval = setInterval(() => { fetchTickets(); fetchStats(); }, 15000);
    return () => clearInterval(interval);
  }, [agent, fetchTickets, fetchStats]);

  const fetchMessages = useCallback(async (ticketId: string) => {
    try {
      const res = await adminApiClient.get(`/admin/support/tickets/${ticketId}/messages`);
      const data = res.data.data;
      setMessages(data.messages || []);
      setPresence(data.presence || null);
    } catch {}
  }, []);

  const fetchTicketDetail = useCallback(async (ticketId: string) => {
    try {
      const res = await adminApiClient.get(`/admin/support/tickets/${ticketId}`);
      const t = res.data.data.ticket || null;
      setTicketDetail(t);
      if (t) {
        setDeptTag(t.departmentTag || "");
        setLinkedOrderId(t.linkedOrderId || "");
        setLinkedOrderType(t.linkedOrderType || "");
      }
    } catch {}
  }, []);

  const fetchNotes = useCallback(async (ticketId: string) => {
    try {
      const res = await adminApiClient.get(`/admin/support/tickets/${ticketId}/notes`);
      setNotes(res.data.data.notes || []);
    } catch {}
  }, []);

  const fetchInternalMessages = useCallback(async (ticketId: string) => {
    try {
      const res = await adminApiClient.get(`/admin/support/tickets/${ticketId}/internal-messages`);
      setInternalMessages(res.data.data.messages || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (!selectedTicketId) return;
    fetchMessages(selectedTicketId);
    fetchTicketDetail(selectedTicketId);
    fetchNotes(selectedTicketId);
    fetchInternalMessages(selectedTicketId);
    const interval = setInterval(() => {
      fetchMessages(selectedTicketId);
      fetchInternalMessages(selectedTicketId);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedTicketId, fetchMessages, fetchTicketDetail, fetchNotes, fetchInternalMessages]);

  const fetchFraudAlerts = useCallback(async () => {
    setFraudLoading(true);
    try {
      const res = await adminApiClient.get(`/admin/support/fraud-alerts?status=${fraudStatus}&limit=50`);
      setFraudAlerts(res.data.data.alerts || []);
    } catch {} finally {
      setFraudLoading(false);
    }
  }, [fraudStatus]);

  useEffect(() => {
    if (mainTab === "fraud") fetchFraudAlerts();
    if (mainTab === "teach") fetchAiData();
  }, [mainTab, fetchFraudAlerts]);

  const fetchAiData = async () => {
    setTeachLoading(true);
    try {
      const [unresolvedRes, kbRes] = await Promise.all([
        adminApiClient.get("/admin/ai/unresolved?limit=100"),
        adminApiClient.get("/admin/ai/knowledge"),
      ]);
      setUnresolvedQueries(unresolvedRes.data.data.queries || []);
      setKbEntries(kbRes.data.data.entries || []);
      setAiStats(kbRes.data.data.stats || null);
    } catch {} finally { setTeachLoading(false); }
  };

  const submitQueryResolve = async () => {
    if (!resolveQueryId || !resolveQueryAnswer.trim()) return;
    setSubmittingResolve(true);
    try {
      await adminApiClient.post(`/admin/ai/unresolved/${resolveQueryId}/resolve`, {
        answer: resolveQueryAnswer,
        addToKb: resolveAddToKb,
        category: resolveQueryCategory,
      });
      setResolveQueryId(null);
      setResolveQueryAnswer("");
      fetchAiData();
    } catch {} finally { setSubmittingResolve(false); }
  };

  const submitNewKbEntry = async () => {
    if (!newKbEntry.question.trim() || !newKbEntry.answer.trim()) return;
    setAddingKbEntry(true);
    try {
      await adminApiClient.post("/admin/ai/knowledge", {
        question: newKbEntry.question,
        answer: newKbEntry.answer,
        category: newKbEntry.category,
        variations: newKbEntry.variations ? newKbEntry.variations.split('\n').map(s => s.trim()).filter(Boolean) : [],
        tags: newKbEntry.tags ? newKbEntry.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
      });
      setNewKbEntry({ question: "", answer: "", category: "general", variations: "", tags: "" });
      setShowAddKb(false);
      fetchAiData();
    } catch {} finally { setAddingKbEntry(false); }
  };

  const deleteKbEntry = async (id: string) => {
    try {
      await adminApiClient.delete(`/admin/ai/knowledge/${id}`);
      fetchAiData();
    } catch {}
  };

  const handleScrollChange = useCallback(() => {
    const el = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distanceFromBottom > 100;
  }, []);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && !userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (!selectedTicketId) return;
    const interval = setInterval(() => {
      adminApiClient.post("/admin/support/presence/heartbeat", {
        ticketId: selectedTicketId,
        isTyping,
      }).catch(() => {});
    }, 10000);
    adminApiClient.post("/admin/support/presence/heartbeat", {
      ticketId: selectedTicketId,
      isTyping,
    }).catch(() => {});
    return () => clearInterval(interval);
  }, [selectedTicketId, isTyping]);

  const handleTypingChange = (val: string) => {
    setReplyContent(val);
    if (!isTyping) setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || !selectedTicketId) return;
    setSending(true);
    try {
      await adminApiClient.post(`/admin/support/tickets/${selectedTicketId}/reply`, {
        content: replyContent.trim(),
      });
      setReplyContent("");
      setIsTyping(false);
      setSuggestions([]);
      fetchMessages(selectedTicketId);
      fetchTickets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to send reply",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedTicketId) return;
    try {
      await adminApiClient.post(`/admin/support/tickets/${selectedTicketId}/assign`);
      toast({ title: "Assigned", description: "Ticket assigned to you." });
      fetchTickets();
      fetchTicketDetail(selectedTicketId);
      fetchMessages(selectedTicketId);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed", variant: "destructive" });
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedTicketId) return;
    try {
      await adminApiClient.post(`/admin/support/tickets/${selectedTicketId}/status`, { status });
      toast({ title: "Updated", description: "Status updated." });
      fetchTickets();
      fetchTicketDetail(selectedTicketId);
      fetchMessages(selectedTicketId);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed", variant: "destructive" });
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim() || !selectedTicketId) return;
    try {
      await adminApiClient.post(`/admin/support/tickets/${selectedTicketId}/notes`, {
        note: noteContent.trim(),
      });
      setNoteContent("");
      fetchNotes(selectedTicketId);
      toast({ title: "Note Added" });
    } catch {}
  };

  const fetchSuggestions = async () => {
    if (!selectedTicketId) return;
    setLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const res = await adminApiClient.post(`/admin/support/tickets/${selectedTicketId}/suggestions`);
      setSuggestions(res.data.data.suggestions || []);
    } catch {
      toast({ title: "Error", description: "Failed to get suggestions", variant: "destructive" });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSaveDeptTag = async () => {
    if (!selectedTicketId) return;
    setTaggingTicket(true);
    try {
      await adminApiClient.put(`/admin/support/tickets/${selectedTicketId}/department`, {
        departmentTag: deptTag || null,
        linkedOrderId: linkedOrderId || null,
        linkedOrderType: linkedOrderType || null,
      });
      toast({ title: "Department Tagged", description: "Ticket linked to department." });
      fetchTicketDetail(selectedTicketId);
    } catch {
      toast({ title: "Error", description: "Failed to save tag", variant: "destructive" });
    } finally {
      setTaggingTicket(false);
    }
  };

  const handleSendInternalMessage = async () => {
    if (!internalMsg.trim() || !internalMsgDept || !selectedTicketId) return;
    setSendingInternal(true);
    try {
      await adminApiClient.post(`/admin/support/tickets/${selectedTicketId}/internal-messages`, {
        message: internalMsg.trim(),
        toDepartment: internalMsgDept,
        linkedOrderId: internalMsgOrderId || null,
      });
      setInternalMsg("");
      setInternalMsgOrderId("");
      toast({ title: "Message Sent", description: `Internal note sent to ${internalMsgDept} department.` });
      fetchInternalMessages(selectedTicketId);
    } catch {
      toast({ title: "Error", description: "Failed to send internal message", variant: "destructive" });
    } finally {
      setSendingInternal(false);
    }
  };

  const handleLookup = async () => {
    if (!lookupQuery.trim() || lookupQuery.trim().length < 3) return;
    setLookupLoading(true);
    setLookupResults([]);
    setLookupDone(false);
    try {
      const res = await adminApiClient.get(`/admin/support/lookup?q=${encodeURIComponent(lookupQuery.trim())}`);
      setLookupResults(res.data.data.results || []);
    } catch {
      toast({ title: "Lookup failed", variant: "destructive" });
    } finally {
      setLookupLoading(false);
      setLookupDone(true);
    }
  };

  const handleResolveAlert = async () => {
    if (!resolveModal) return;
    setResolvingAlert(true);
    try {
      if (resolveModal.mode === "resolve") {
        await adminApiClient.post(`/admin/support/fraud-alerts/${resolveModal.id}/resolve`, { note: resolveNote });
        toast({ title: "Alert Resolved" });
      } else {
        await adminApiClient.post(`/admin/support/fraud-alerts/${resolveModal.id}/dismiss`);
        toast({ title: "Alert Dismissed" });
      }
      setResolveModal(null);
      setResolveNote("");
      fetchFraudAlerts();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setResolvingAlert(false);
    }
  };

  const handleLogout = () => {
    tokenStorage.removeItem("adminToken");
    tokenStorage.removeItem("adminRefreshToken");
    tokenStorage.removeItem("adminUser");
    setLocation("/support/agent/login");
  };

  const getActions = (status: string) => {
    const actions: { label: string; action: () => void; icon: React.ReactNode }[] = [];
    if (status === "open" || status === "escalated") {
      actions.push({ label: "Assign to Me", action: handleAssign, icon: <UserCheck className="h-3.5 w-3.5" /> });
    }
    if (status === "assigned") {
      actions.push({ label: "Start Progress", action: () => handleStatusChange("in_progress"), icon: <PlayCircle className="h-3.5 w-3.5" /> });
      actions.push({ label: "Resolve", action: () => handleStatusChange("resolved"), icon: <CheckCircle2 className="h-3.5 w-3.5" /> });
    }
    if (status === "in_progress") {
      actions.push({ label: "Resolve", action: () => handleStatusChange("resolved"), icon: <CheckCircle2 className="h-3.5 w-3.5" /> });
    }
    if (status === "resolved") {
      actions.push({ label: "Close", action: () => handleStatusChange("closed"), icon: <XCircle className="h-3.5 w-3.5" /> });
      actions.push({ label: "Reopen", action: () => handleStatusChange("open"), icon: <RotateCcw className="h-3.5 w-3.5" /> });
    }
    if (status === "closed") {
      actions.push({ label: "Reopen", action: () => handleStatusChange("open"), icon: <RotateCcw className="h-3.5 w-3.5" /> });
    }
    return actions;
  };

  if (!agent) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Headset className="h-6 w-6 text-emerald-600" />
          <div>
            <h1 className="text-lg font-bold">Support Dashboard</h1>
            <p className="text-xs text-muted-foreground">Welcome, {agent.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded-full font-medium">
              Escalated: {stats.escalated || 0}
            </span>
            <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full font-medium">
              Assigned: {stats.assigned || 0}
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full font-medium">
              In Progress: {stats.inProgress || 0}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Nav Tabs */}
      <div className="border-b bg-card">
        <div className="flex px-6">
          {[
            { id: "tickets", label: "My Tickets", icon: <Inbox className="h-4 w-4" /> },
            { id: "lookup", label: "Transaction Lookup", icon: <Search className="h-4 w-4" /> },
            { id: "fraud", label: "Fraud Alerts", icon: <ShieldAlert className="h-4 w-4" /> },
            { id: "teach", label: "Teach AI", icon: <Bot className="h-4 w-4" />, badge: unresolvedQueries.length > 0 ? unresolvedQueries.length : null },
          ].map((tab: any) => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                mainTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge && <span className="ml-1 bg-orange-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">{tab.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ====== MY TICKETS TAB ====== */}
      {mainTab === "tickets" && (
        <div className="grid grid-cols-12 gap-4 p-4 flex-1 overflow-hidden" style={{ height: "calc(100vh - 120px)" }}>
          {/* Ticket List */}
          <div className="col-span-4 flex flex-col gap-3">
            <Card className="p-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">My Active Tickets</SelectItem>
                  <SelectItem value="all">All Tickets</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </Card>

            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Tickets ({tickets.length})</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                  {loadingTickets ? (
                    <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto h-6 w-6" /></div>
                  ) : tickets.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No tickets found</div>
                  ) : (
                    <div className="divide-y">
                      {tickets.map((t: any) => (
                        <div
                          key={t.id}
                          className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedTicketId === t.id ? "bg-muted" : ""}`}
                          onClick={() => {
                            setSelectedTicketId(t.id);
                            setTicketInnerTab("messages");
                            setSuggestions([]);
                            userScrolledUpRef.current = false;
                            prevMessageCountRef.current = 0;
                          }}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-mono text-muted-foreground">{t.referenceId}</span>
                            <Badge variant={priorityVariant(t.priority)} className="text-[10px] h-5">
                              {t.priority}
                            </Badge>
                          </div>
                          <div className="text-sm font-medium truncate">{t.subject}</div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor(t.status)}`}>
                              {t.status?.replace("_", " ")}
                            </span>
                            {t.departmentTag && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium">
                                {t.departmentTag}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground truncate">{t.userName || "Unknown"}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {t.createdAt ? formatDistanceToNow(new Date(t.createdAt), { addSuffix: true }) : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Ticket Detail */}
          <div className="col-span-8 flex flex-col overflow-hidden">
            {selectedTicketId && ticketDetail ? (
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="py-3 px-4 border-b space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{ticketDetail.subject}</CardTitle>
                        <span className="text-xs font-mono text-muted-foreground">{ticketDetail.referenceId}</span>
                      </div>
                      <CardDescription className="mt-0.5">
                        {ticketDetail.userName} &middot; {ticketDetail.userEmail} &middot; {ticketDetail.category || "General"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(ticketDetail.status)}`}>
                        {ticketDetail.status?.replace("_", " ")}
                      </span>
                      <Badge variant={priorityVariant(ticketDetail.priority)} className="text-xs">
                        {ticketDetail.priority}
                      </Badge>
                    </div>
                  </div>

                  {/* Department Tag Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {ticketDetail.departmentTag ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Tag className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="font-medium text-indigo-700 dark:text-indigo-400">{ticketDetail.departmentTag}</span>
                        {ticketDetail.linkedOrderId && (
                          <>
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-mono text-muted-foreground">{ticketDetail.linkedOrderId}</span>
                          </>
                        )}
                        <button className="text-muted-foreground hover:text-foreground ml-1" onClick={() => { setDeptTag(""); setLinkedOrderId(""); setLinkedOrderType(""); handleSaveDeptTag(); }}>
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Select value={deptTag} onValueChange={setDeptTag}>
                          <SelectTrigger className="h-7 text-xs w-[160px]">
                            <SelectValue placeholder="Tag Department" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEPARTMENTS.map(d => (
                              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Linked Order ID"
                          value={linkedOrderId}
                          onChange={e => setLinkedOrderId(e.target.value)}
                          className="h-7 text-xs w-[150px]"
                        />
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSaveDeptTag} disabled={taggingTicket || !deptTag}>
                          {taggingTicket ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}
                          Tag
                        </Button>
                      </div>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      {getActions(ticketDetail.status).map((a, i) => (
                        <Button key={i} size="sm" className="h-7 text-xs gap-1" onClick={a.action}>
                          {a.icon}
                          {a.label}
                        </Button>
                      ))}
                      {presence && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {presence.userOnline ? (
                            <>
                              <Wifi className="h-3 w-3 text-green-500" />
                              {presence.userTyping ? <span className="text-green-600">User typing...</span> : <span>User online</span>}
                            </>
                          ) : (
                            <>
                              <WifiOff className="h-3 w-3" />
                              <span>User offline</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Inner Tabs */}
                  <div className="flex border-b shrink-0">
                    <button
                      className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${ticketInnerTab === "messages" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                      onClick={() => setTicketInnerTab("messages")}
                    >
                      <MessageSquare className="h-3 w-3 inline mr-1" />
                      Messages
                    </button>
                    <button
                      className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${ticketInnerTab === "notes" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                      onClick={() => setTicketInnerTab("notes")}
                    >
                      <StickyNote className="h-3 w-3 inline mr-1" />
                      Notes ({notes.length})
                    </button>
                    <button
                      className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${ticketInnerTab === "internal" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                      onClick={() => setTicketInnerTab("internal")}
                    >
                      <Building2 className="h-3 w-3 inline mr-1" />
                      Internal ({internalMessages.length})
                    </button>
                  </div>

                  {/* MESSAGES TAB */}
                  {ticketInnerTab === "messages" && (
                    <>
                      <ScrollArea className="flex-1" ref={scrollAreaRef} onScrollCapture={handleScrollChange}>
                        <div className="p-4 space-y-3">
                          {messages.map((msg: any) => {
                            if (msg.senderType === "system") {
                              return (
                                <div key={msg.id} className="flex justify-center">
                                  <div className="bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 text-xs px-3 py-1.5 rounded-full max-w-[85%] text-center border border-amber-200 dark:border-amber-800">
                                    {msg.content}
                                  </div>
                                </div>
                              );
                            }
                            const isAgent = msg.senderType === "agent";
                            return (
                              <div key={msg.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                                <div className={`flex gap-2 max-w-[80%] ${isAgent ? "flex-row-reverse" : ""}`}>
                                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                                    isAgent ? "bg-primary text-primary-foreground" : msg.senderType === "ai" ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" : "bg-muted"
                                  }`}>
                                    {senderIcon(msg.senderType)}
                                  </div>
                                  <div>
                                    <div className={`p-3 rounded-2xl text-sm ${senderStyle(msg.senderType)} ${isAgent ? "rounded-tr-sm" : "rounded-tl-sm"}`}>
                                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5 px-1">
                                      <span className="text-[10px] text-muted-foreground font-medium">{msg.senderName}</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : ""}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>

                      {suggestions.length > 0 && (
                        <div className="px-3 py-2 border-t bg-violet-50/50 dark:bg-violet-900/10">
                          <div className="flex items-center gap-1 mb-1.5">
                            <Sparkles className="h-3 w-3 text-violet-500" />
                            <span className="text-[10px] font-medium text-violet-700 dark:text-violet-400">AI Suggestions</span>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {suggestions.map((s, i) => (
                              <button
                                key={i}
                                className="text-left text-xs px-3 py-2 bg-card border border-violet-200 dark:border-violet-800 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-foreground leading-relaxed"
                                onClick={() => setReplyContent(s)}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {ticketDetail.status !== "closed" && ticketDetail.status !== "resolved" && (
                        <div className="p-3 border-t flex gap-2">
                          <Textarea
                            placeholder="Type your reply..."
                            value={replyContent}
                            onChange={(e) => handleTypingChange(e.target.value)}
                            rows={2}
                            className="flex-1 resize-none text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendReply();
                              }
                            }}
                          />
                          <div className="flex flex-col gap-2">
                            <Button size="icon" onClick={handleSendReply} disabled={sending || !replyContent.trim()}>
                              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                            <Button variant="outline" size="icon" onClick={fetchSuggestions} disabled={loadingSuggestions} title="AI suggestions">
                              {loadingSuggestions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-violet-500" />}
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* NOTES TAB */}
                  {ticketInnerTab === "notes" && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <ScrollArea className="flex-1">
                        <div className="p-4 space-y-3">
                          {notes.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No internal notes yet</p>
                          ) : (
                            notes.map((n: any) => (
                              <div key={n.id} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                <p className="text-sm text-foreground">{n.note}</p>
                                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                                  <span>{n.agentName}</span>
                                  <span>{n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ""}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                      <div className="p-3 border-t flex gap-2">
                        <Input
                          placeholder="Add internal note..."
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          className="flex-1"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNote(); } }}
                        />
                        <Button size="icon" onClick={handleAddNote} disabled={!noteContent.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* INTERNAL MESSAGES TAB */}
                  {ticketInnerTab === "internal" && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <ScrollArea className="flex-1">
                        <div className="p-4 space-y-3">
                          {internalMessages.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No cross-department messages yet</p>
                          ) : (
                            internalMessages.map((m: any) => (
                              <div key={m.id} className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                                  <span className="text-xs font-medium text-indigo-700 dark:text-indigo-400">{m.fromName}</span>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs font-medium text-indigo-700 dark:text-indigo-400">{m.toDepartment}</span>
                                  {m.linkedOrderId && (
                                    <span className="ml-auto text-[10px] font-mono text-muted-foreground">{m.linkedOrderId}</span>
                                  )}
                                </div>
                                <p className="text-sm text-foreground">{m.message}</p>
                                <div className="mt-1.5 text-[10px] text-muted-foreground">
                                  {m.createdAt ? formatDistanceToNow(new Date(m.createdAt), { addSuffix: true }) : ""}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                      <div className="p-3 border-t space-y-2">
                        <div className="flex gap-2">
                          <Select value={internalMsgDept} onValueChange={setInternalMsgDept}>
                            <SelectTrigger className="h-8 text-xs w-[160px]">
                              <SelectValue placeholder="Target Department" />
                            </SelectTrigger>
                            <SelectContent>
                              {DEPARTMENTS.map(d => (
                                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Linked Order ID (optional)"
                            value={internalMsgOrderId}
                            onChange={e => setInternalMsgOrderId(e.target.value)}
                            className="h-8 text-xs flex-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Type message to department..."
                            value={internalMsg}
                            onChange={e => setInternalMsg(e.target.value)}
                            className="flex-1 text-sm"
                            onKeyDown={e => { if (e.key === "Enter") handleSendInternalMessage(); }}
                          />
                          <Button size="icon" onClick={handleSendInternalMessage} disabled={sendingInternal || !internalMsg.trim() || !internalMsgDept}>
                            {sendingInternal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a ticket to view the conversation</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ====== CROSS-DEPT LOOKUP TAB ====== */}
      {mainTab === "lookup" && (
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Transaction Lookup</h2>
              <p className="text-sm text-muted-foreground">Search for a transaction by its reference ID to view full details and the customer behind it.</p>
            </div>
            <div className="flex gap-3">
              <Input
                placeholder="Enter transaction reference ID..."
                value={lookupQuery}
                onChange={e => setLookupQuery(e.target.value)}
                className="flex-1 text-sm font-mono"
                onKeyDown={e => { if (e.key === "Enter") handleLookup(); }}
              />
              <Button onClick={handleLookup} disabled={lookupLoading || lookupQuery.trim().length < 3} className="gap-2">
                {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>

            {lookupLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Looking up transaction...</p>
              </div>
            )}

            {lookupDone && !lookupLoading && lookupResults.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No transaction found for "{lookupQuery}"</p>
              </div>
            )}

            {lookupResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{lookupResults.length} transaction{lookupResults.length !== 1 ? "s" : ""} found</p>
                {lookupResults.map((r: any, i) => (
                  <Card key={i} className="p-4 border border-blue-100">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div><span className="text-muted-foreground text-xs">Reference:</span> <span className="font-mono font-semibold text-blue-700">{r.reference}</span></div>
                      <div><span className="text-muted-foreground text-xs">Type:</span> <span className="font-medium capitalize">{r.type?.replace(/_/g, " ")}</span></div>
                      <div><span className="text-muted-foreground text-xs">Amount:</span> <span className="font-semibold">₦{Number(r.amount || 0).toLocaleString()}</span></div>
                      <div><span className="text-muted-foreground text-xs">Status:</span> <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(r.status)}`}>{r.status}</span></div>
                      {r.description && <div className="col-span-2"><span className="text-muted-foreground text-xs">Description:</span> <span>{r.description}</span></div>}
                      <div className="col-span-2 pt-1 border-t mt-1">
                        <span className="text-muted-foreground text-xs">Customer:</span>{" "}
                        <span className="font-medium">{r.userName}</span>{" "}
                        <span className="text-muted-foreground">({r.userEmail})</span>{" "}
                        {r.userPhone && <span className="text-muted-foreground">&middot; {r.userPhone}</span>}
                      </div>
                      <div className="col-span-2 text-xs text-muted-foreground">
                        {r.createdAt ? formatDistanceToNow(new Date(r.createdAt), { addSuffix: true }) : ""}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== FRAUD ALERTS TAB ====== */}
      {mainTab === "fraud" && (
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Fraud Alerts</h2>
                <p className="text-sm text-muted-foreground">Suspicious activity flagged by the system</p>
              </div>
              <div className="flex items-center gap-3">
                <Select value={fraudStatus} onValueChange={(v) => setFraudStatus(v)}>
                  <SelectTrigger className="h-8 text-xs w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={fetchFraudAlerts} disabled={fraudLoading}>
                  {fraudLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
                </Button>
              </div>
            </div>

            {fraudLoading ? (
              <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
            ) : fraudAlerts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ShieldAlert className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No {fraudStatus !== "all" ? fraudStatus : ""} fraud alerts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fraudAlerts.map((alert: any) => (
                  <Card key={alert.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <ShieldAlert className={`h-5 w-5 mt-0.5 shrink-0 ${
                        alert.severity === "critical" ? "text-red-500" :
                        alert.severity === "high" ? "text-orange-500" :
                        alert.severity === "medium" ? "text-yellow-500" : "text-blue-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${severityColor(alert.severity)}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="text-xs font-medium text-foreground">{alert.alertType.replace(/_/g, " ")}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {alert.createdAt ? formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true }) : ""}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mb-2">{alert.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span><User className="h-3 w-3 inline mr-1" />{alert.userName || "Unknown"}</span>
                          <span>{alert.userEmail}</span>
                          <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                            alert.status === "open" ? "bg-red-100 text-red-700" :
                            alert.status === "resolved" ? "bg-green-100 text-green-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>{alert.status}</span>
                          {alert.resolvedNote && <span className="italic">Note: {alert.resolvedNote}</span>}
                        </div>
                      </div>
                      {alert.status === "open" && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setResolveModal({ id: alert.id, mode: "resolve" })}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setResolveModal({ id: alert.id, mode: "dismiss" })}
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== TEACH AI TAB ====== */}
      {mainTab === "teach" && (
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2"><Bot className="h-6 w-6 text-violet-600" />Teach Ara AI</h2>
                <p className="text-sm text-muted-foreground mt-1">Review queries the AI couldn't answer and teach it new knowledge. The AI learns immediately.</p>
              </div>
              <div className="flex items-center gap-3">
                {aiStats && (
                  <div className="text-xs text-muted-foreground text-right">
                    <div><span className="font-medium">{aiStats.totalEntries}</span> total entries in index</div>
                    <div><span className="font-medium">{aiStats.staticEntries}</span> built-in • <span className="font-medium">{aiStats.dbEntries}</span> learned</div>
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={fetchAiData} disabled={teachLoading}>{teachLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}</Button>
              </div>
            </div>

            {/* Section switcher */}
            <div className="flex gap-2 border-b">
              <button onClick={() => setKbActiveSection("unresolved")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${kbActiveSection === "unresolved" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                Unanswered Queries {unresolvedQueries.length > 0 && <span className="ml-1 bg-orange-500 text-white text-[10px] rounded-full px-1.5">{unresolvedQueries.length}</span>}
              </button>
              <button onClick={() => setKbActiveSection("knowledge")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${kbActiveSection === "knowledge" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                Knowledge Base ({kbEntries.length})
              </button>
            </div>

            {/* Unanswered Queries Section */}
            {kbActiveSection === "unresolved" && (
              <div className="space-y-4">
                {teachLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>
                ) : unresolvedQueries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-3 text-green-400" />
                    <p className="font-medium text-green-600">Great! No unanswered queries at the moment.</p>
                    <p className="text-sm">The AI is handling all questions well. New unresolved queries will appear here.</p>
                  </div>
                ) : (
                  unresolvedQueries.map(q => (
                    <Card key={q.id} className="border border-orange-200 bg-orange-50/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-sm">User asked:</p>
                            <p className="text-gray-800 mt-1 italic">"{q.query}"</p>
                            <p className="text-xs text-muted-foreground mt-1">{new Date(q.createdAt).toLocaleString()}</p>
                          </div>
                          {resolveQueryId !== q.id && (
                            <Button size="sm" onClick={() => { setResolveQueryId(q.id); setResolveQueryAnswer(""); setResolveAddToKb(true); setResolveQueryCategory("general"); }} className="bg-violet-600 hover:bg-violet-700 text-white shrink-0">Teach AI</Button>
                          )}
                        </div>
                      </CardHeader>
                      {resolveQueryId === q.id && (
                        <CardContent className="border-t pt-4 space-y-3">
                          <div>
                            <label className="text-sm font-medium">Answer to teach the AI:</label>
                            <Textarea className="mt-1" rows={4} placeholder="Type the correct answer for this query..." value={resolveQueryAnswer} onChange={e => setResolveQueryAnswer(e.target.value)} />
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <label className="text-sm font-medium">Category:</label>
                              <select value={resolveQueryCategory} onChange={e => setResolveQueryCategory(e.target.value)} className="mt-1 w-full border rounded px-2 py-1.5 text-sm bg-white">
                                {["general","account","nin","bvn","jamb","waec","neco","nabteb","nbais","vtu","a2c","wallet","cac","payment","transaction","security","support","pricing","technical","identity","education"].map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div className="flex items-center gap-2 mt-5">
                              <input type="checkbox" id={`addkb-${q.id}`} checked={resolveAddToKb} onChange={e => setResolveAddToKb(e.target.checked)} className="rounded" />
                              <label htmlFor={`addkb-${q.id}`} className="text-sm">Add to Knowledge Base</label>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" disabled={submittingResolve || !resolveQueryAnswer.trim()} onClick={submitQueryResolve} className="bg-green-600 hover:bg-green-700 text-white">
                              {submittingResolve ? <Loader2 className="h-4 w-4 animate-spin" /> : "Teach & Save"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setResolveQueryId(null)}>Cancel</Button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Knowledge Base Section */}
            {kbActiveSection === "knowledge" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">These are custom Q&A entries added by support agents. The AI uses these along with {aiStats?.staticEntries || 0} built-in entries.</p>
                  <Button size="sm" onClick={() => setShowAddKb(!showAddKb)} className="bg-violet-600 hover:bg-violet-700 text-white">+ Add New Entry</Button>
                </div>

                {showAddKb && (
                  <Card className="border-violet-300 bg-violet-50/50">
                    <CardHeader><CardTitle className="text-base">Add New Knowledge Entry</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Question *</label>
                        <Input placeholder="Main question (e.g. 'How do I verify my NIN?')" value={newKbEntry.question} onChange={e => setNewKbEntry(p => ({ ...p, question: e.target.value }))} className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Answer *</label>
                        <Textarea rows={4} placeholder="Detailed answer..." value={newKbEntry.answer} onChange={e => setNewKbEntry(p => ({ ...p, answer: e.target.value }))} className="mt-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Category</label>
                          <select value={newKbEntry.category} onChange={e => setNewKbEntry(p => ({ ...p, category: e.target.value }))} className="mt-1 w-full border rounded px-2 py-1.5 text-sm bg-white">
                            {["general","account","nin","bvn","jamb","waec","neco","nabteb","nbais","vtu","a2c","wallet","cac","payment","transaction","security","support","pricing","technical","identity","education"].map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Tags (comma-separated)</label>
                          <Input placeholder="nin, lookup, identity" value={newKbEntry.tags} onChange={e => setNewKbEntry(p => ({ ...p, tags: e.target.value }))} className="mt-1" />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Alternative Phrasings (one per line)</label>
                        <Textarea rows={2} placeholder={"how do I check NIN\nverify my NIN number"} value={newKbEntry.variations} onChange={e => setNewKbEntry(p => ({ ...p, variations: e.target.value }))} className="mt-1" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={addingKbEntry || !newKbEntry.question.trim() || !newKbEntry.answer.trim()} onClick={submitNewKbEntry} className="bg-green-600 hover:bg-green-700 text-white">
                          {addingKbEntry ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save to Knowledge Base"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddKb(false)}>Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {teachLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>
                ) : kbEntries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No custom knowledge entries yet. Add entries above to teach the AI.</p>
                    <p className="text-sm mt-1">The AI already has {aiStats?.staticEntries || 0} built-in entries covering all Arapoint services.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {kbEntries.map(entry => (
                      <Card key={entry.id} className="border">
                        <CardContent className="pt-4 pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded">{entry.category}</span>
                                {entry.useCount > 0 && <span className="text-xs text-muted-foreground">Used {entry.useCount}x</span>}
                              </div>
                              <p className="font-medium text-sm">{entry.question}</p>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{entry.answer}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => deleteKbEntry(entry.id)} className="text-red-600 hover:bg-red-50 shrink-0">Remove</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resolve/Dismiss Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md mx-4">
            <h3 className="font-semibold mb-2">
              {resolveModal.mode === "resolve" ? "Resolve Alert" : "Dismiss Alert"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {resolveModal.mode === "resolve"
                ? "Mark this alert as resolved. Add a note describing the action taken."
                : "Dismiss this alert as a false positive."}
            </p>
            {resolveModal.mode === "resolve" && (
              <Textarea
                placeholder="Resolution note (e.g., verified with user, no fraud detected)..."
                value={resolveNote}
                onChange={e => setResolveNote(e.target.value)}
                rows={3}
                className="mb-4 text-sm"
              />
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setResolveModal(null); setResolveNote(""); }}>
                Cancel
              </Button>
              <Button onClick={handleResolveAlert} disabled={resolvingAlert}>
                {resolvingAlert ? <Loader2 className="h-4 w-4 animate-spin" /> : (resolveModal.mode === "resolve" ? "Resolve" : "Dismiss")}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
