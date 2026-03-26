import { tokenStorage } from '@/lib/tokenStorage';
import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminApiClient } from "@/lib/api/client";
import { formatDistanceToNow, format } from "date-fns";
import {
  Users,
  MessageSquare,
  Loader2,
  Send,
  TicketCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  PlayCircle,
  UserCheck,
  RotateCcw,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Circle,
  Wifi,
  WifiOff,
  Sparkles,
  Paperclip,
  FileIcon,
  Download,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const getAdminUserId = () => {
  try {
    return JSON.parse(tokenStorage.getItem("adminUser") || "{}").id;
  } catch {
    return null;
  }
};

const priorityVariant = (p: string) => {
  if (p === "urgent" || p === "high") return "destructive" as const;
  if (p === "medium") return "default" as const;
  return "secondary" as const;
};

const statusColor = (s: string) => {
  switch (s) {
    case "open":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "escalated":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "assigned":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "in_progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "resolved":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "closed":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400";
  }
};

const senderStyle = (type: string) => {
  switch (type?.toUpperCase()) {
    case "USER":
      return "bg-muted";
    case "AGENT":
      return "bg-primary text-primary-foreground";
    case "AI":
      return "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200 dark:border-violet-800";
    case "SYSTEM":
      return "bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800 italic";
    default:
      return "bg-muted";
  }
};

const statIcons: Record<string, React.ReactNode> = {
  total: <TicketCheck className="h-4 w-4" />,
  open: <Circle className="h-4 w-4 text-blue-500" />,
  escalated: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  assigned: <UserCheck className="h-4 w-4 text-purple-500" />,
  inProgress: <PlayCircle className="h-4 w-4 text-blue-500" />,
  resolved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  closed: <XCircle className="h-4 w-4 text-gray-500" />,
};

const statLabels: Record<string, string> = {
  total: "Total",
  open: "Open",
  escalated: "Escalated",
  assigned: "Assigned",
  inProgress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export default function SupportDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const adminId = getAdminUserId();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [replyContent, setReplyContent] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [agentForm, setAgentForm] = useState({ name: "", email: "", password: "" });
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [agentAttachedFile, setAgentAttachedFile] = useState<{ url: string; name: string } | null>(null);
  const [agentFileUploading, setAgentFileUploading] = useState(false);
  const agentFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageTimestamp = useRef<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMessageCountRef = useRef(0);
  const userScrolledUpRef = useRef(false);

  const { data: statsData } = useQuery({
    queryKey: ["admin", "support", "stats"],
    queryFn: () =>
      adminApiClient.get("/admin/support/tickets/stats").then((res) => res.data.data.stats),
    refetchInterval: 30000,
  });

  const ticketParams = new URLSearchParams();
  if (statusFilter !== "all") ticketParams.set("status", statusFilter);
  if (priorityFilter !== "all") ticketParams.set("priority", priorityFilter);
  if (assignedFilter !== "all") ticketParams.set("assignedTo", assignedFilter);

  const { data: ticketsData, isLoading: loadingTickets } = useQuery({
    queryKey: ["admin", "support", "tickets", statusFilter, priorityFilter, assignedFilter],
    queryFn: () =>
      adminApiClient
        .get(`/admin/support/tickets?${ticketParams.toString()}`)
        .then((res) => res.data.data.tickets),
    refetchInterval: 15000,
  });

  const { data: ticketDetail } = useQuery({
    queryKey: ["admin", "support", "ticket", selectedTicketId],
    queryFn: () =>
      adminApiClient
        .get(`/admin/support/tickets/${selectedTicketId}`)
        .then((res) => res.data.data),
    enabled: !!selectedTicketId,
  });

  const { data: messagesData } = useQuery({
    queryKey: ["admin", "support", "messages", selectedTicketId],
    queryFn: () => {
      const params = lastMessageTimestamp.current
        ? `?since=${encodeURIComponent(lastMessageTimestamp.current)}`
        : "";
      return adminApiClient
        .get(`/admin/support/tickets/${selectedTicketId}/messages${params}`)
        .then((res) => res.data.data);
    },
    enabled: !!selectedTicketId,
    refetchInterval: 4000,
  });

  const { data: notesData, isLoading: loadingNotes } = useQuery({
    queryKey: ["admin", "support", "notes", selectedTicketId],
    queryFn: () =>
      adminApiClient
        .get(`/admin/support/tickets/${selectedTicketId}/notes`)
        .then((res) => res.data.data.notes),
    enabled: !!selectedTicketId,
  });

  const { data: agentsData } = useQuery({
    queryKey: ["admin", "support", "agents"],
    queryFn: () =>
      adminApiClient.get("/admin/support/agents").then((res) => res.data.data.agents),
  });

  useEffect(() => {
    if (!selectedTicketId) return;
    const interval = setInterval(() => {
      adminApiClient
        .post("/admin/support/presence/heartbeat", {
          ticketId: selectedTicketId,
          isTyping,
        })
        .catch(() => {});
    }, 10000);
    adminApiClient
      .post("/admin/support/presence/heartbeat", {
        ticketId: selectedTicketId,
        isTyping,
      })
      .catch(() => {});
    return () => clearInterval(interval);
  }, [selectedTicketId, isTyping]);

  const handleScrollChange = useCallback(() => {
    const el = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distanceFromBottom > 100;
  }, []);

  useEffect(() => {
    const msgs = messagesData?.messages || [];
    if (msgs.length > prevMessageCountRef.current && !userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCountRef.current = msgs.length;
  }, [messagesData?.messages]);

  const handleTypingChange = useCallback(
    (val: string) => {
      setReplyContent(val);
      if (!isTyping) setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
    },
    [isTyping]
  );

  const handleAgentFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAgentFileUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await adminApiClient.post("/admin/support/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setAgentAttachedFile({ url: res.data.data.fileUrl, name: res.data.data.fileName || file.name });
    } catch {
      toast({ title: "Upload failed", description: "Failed to upload file. Please try again.", variant: "destructive" });
    } finally {
      setAgentFileUploading(false);
      if (agentFileInputRef.current) agentFileInputRef.current.value = "";
    }
  };

  const replyMutation = useMutation({
    mutationFn: ({ content, fileUrl, fileName }: { content: string; fileUrl?: string; fileName?: string }) =>
      adminApiClient.post(`/admin/support/tickets/${selectedTicketId}/reply`, { content, fileUrl, fileName }),
    onSuccess: () => {
      setReplyContent("");
      setAgentAttachedFile(null);
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "support", "messages", selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "support", "tickets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to send reply",
        variant: "destructive",
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      adminApiClient.post(`/admin/support/tickets/${selectedTicketId}/assign`),
    onSuccess: () => {
      toast({ title: "Assigned", description: "Ticket assigned to you." });
      queryClient.invalidateQueries({ queryKey: ["admin", "support"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to assign ticket",
        variant: "destructive",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      adminApiClient.post(`/admin/support/tickets/${selectedTicketId}/status`, { status }),
    onSuccess: () => {
      toast({ title: "Updated", description: "Ticket status updated." });
      queryClient.invalidateQueries({ queryKey: ["admin", "support"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: (note: string) =>
      adminApiClient.post(`/admin/support/tickets/${selectedTicketId}/notes`, { note }),
    onSuccess: () => {
      setNoteContent("");
      toast({ title: "Note Added", description: "Internal note saved." });
      queryClient.invalidateQueries({ queryKey: ["admin", "support", "notes", selectedTicketId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add note",
        variant: "destructive",
      });
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) =>
      adminApiClient.post("/admin/support/agents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "support", "agents"] });
      setShowAgentModal(false);
      setAgentForm({ name: "", email: "", password: "" });
      toast({ title: "Agent Created", description: "Support agent has been added." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create agent",
        variant: "destructive",
      });
    },
  });

  const tickets = ticketsData || [];
  const messages = messagesData?.messages || [];
  const presence = messagesData?.presence;
  const notes = notesData || [];
  const agents = agentsData || [];
  const stats = statsData || {};
  const ticket = ticketDetail?.ticket;

  const userOnline = presence?.userOnline;
  const userTyping = presence?.userTyping;

  const getStatusActions = (currentStatus: string) => {
    const actions: { label: string; action: () => void; icon: React.ReactNode; variant?: any }[] = [];
    switch (currentStatus) {
      case "open":
      case "escalated":
        actions.push({
          label: "Assign to Me",
          action: () => assignMutation.mutate(),
          icon: <UserCheck className="h-4 w-4" />,
        });
        break;
      case "assigned":
        actions.push({
          label: "Start Progress",
          action: () => statusMutation.mutate("in_progress"),
          icon: <PlayCircle className="h-4 w-4" />,
        });
        actions.push({
          label: "Resolve",
          action: () => statusMutation.mutate("resolved"),
          icon: <CheckCircle2 className="h-4 w-4" />,
        });
        break;
      case "in_progress":
        actions.push({
          label: "Resolve",
          action: () => statusMutation.mutate("resolved"),
          icon: <CheckCircle2 className="h-4 w-4" />,
        });
        break;
      case "resolved":
        actions.push({
          label: "Close",
          action: () => statusMutation.mutate("closed"),
          icon: <XCircle className="h-4 w-4" />,
        });
        actions.push({
          label: "Reopen",
          action: () => statusMutation.mutate("open"),
          icon: <RotateCcw className="h-4 w-4" />,
          variant: "outline",
        });
        break;
      case "closed":
        actions.push({
          label: "Reopen",
          action: () => statusMutation.mutate("open"),
          icon: <RotateCcw className="h-4 w-4" />,
          variant: "outline",
        });
        break;
    }
    return actions;
  };

  const handleSendReply = () => {
    if (!replyContent.trim() && !agentAttachedFile) return;
    replyMutation.mutate({
      content: replyContent.trim(),
      fileUrl: agentAttachedFile?.url,
      fileName: agentAttachedFile?.name,
    });
    setSuggestions([]);
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

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    addNoteMutation.mutate(noteContent.trim());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">Support Dashboard</h2>
          <p className="text-muted-foreground">Manage tickets, agents, and customer support</p>
        </div>
        <Button onClick={() => setShowAgentModal(true)} className="gap-2">
          <Users className="h-4 w-4" />
          Manage Agents
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.keys(statLabels).map((key) => (
          <Card key={key} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              {statIcons[key]}
              <span className="text-xs text-muted-foreground">{statLabels[key]}</span>
            </div>
            <div className="text-2xl font-bold">{stats[key] ?? 0}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
        <div className="col-span-4 flex flex-col gap-3">
          <Card className="p-3">
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {agents.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Tickets ({tickets.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                {loadingTickets ? (
                  <div className="p-8 text-center">
                    <Loader2 className="animate-spin mx-auto h-6 w-6" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No tickets found
                  </div>
                ) : (
                  <div className="divide-y">
                    {tickets.map((t: any) => (
                      <div
                        key={t.id}
                        className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedTicketId === t.id ? "bg-muted" : ""
                        }`}
                        onClick={() => {
                          setSelectedTicketId(t.id);
                          lastMessageTimestamp.current = null;
                          userScrolledUpRef.current = false;
                          prevMessageCountRef.current = 0;
                        }}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-mono text-muted-foreground">
                            {t.referenceId}
                          </span>
                          <Badge variant={priorityVariant(t.priority)} className="text-[10px] h-5">
                            {t.priority}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium truncate">{t.subject}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor(
                              t.status
                            )}`}
                          >
                            {t.status?.replace("_", " ")}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {t.userName || "Unknown"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {t.agentName || "Unassigned"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {t.createdAt
                              ? formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })
                              : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-8 flex flex-col">
          {selectedTicketId && ticket ? (
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="py-3 px-4 border-b space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{ticket.subject}</CardTitle>
                      <span className="text-xs font-mono text-muted-foreground">
                        {ticket.referenceId}
                      </span>
                    </div>
                    <CardDescription className="mt-0.5">
                      {ticket.userName} &middot; {ticket.userEmail} &middot;{" "}
                      {ticket.category || "General"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(
                        ticket.status
                      )}`}
                    >
                      {ticket.status?.replace("_", " ")}
                    </span>
                    <Badge variant={priorityVariant(ticket.priority)} className="text-xs">
                      {ticket.priority}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusActions(ticket.status).map((a, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={a.variant || "default"}
                      className="h-7 text-xs gap-1"
                      onClick={a.action}
                      disabled={assignMutation.isPending || statusMutation.isPending}
                    >
                      {a.icon}
                      {a.label}
                    </Button>
                  ))}
                  {presence && (
                    <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                      {userOnline ? (
                        <>
                          <Wifi className="h-3 w-3 text-green-500" />
                          {userTyping ? (
                            <span className="text-green-600">User typing...</span>
                          ) : (
                            <span>User online</span>
                          )}
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
              </CardHeader>

              <Tabs defaultValue="messages" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mx-4 mt-2 w-fit">
                  <TabsTrigger value="messages" className="text-xs gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Messages
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs gap-1">
                    <StickyNote className="h-3 w-3" />
                    Notes ({notes.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="messages" className="flex-1 flex flex-col overflow-hidden mt-0 p-0">
                  <ScrollArea className="flex-1 p-4" ref={scrollAreaRef} onScrollCapture={handleScrollChange}>
                    <div className="space-y-3">
                      {messages.map((m: any) => {
                        const isAgent = m.senderType?.toUpperCase() === "AGENT";
                        const isSystem =
                          m.senderType?.toUpperCase() === "SYSTEM" ||
                          m.senderType?.toUpperCase() === "AI";
                        return (
                          <div
                            key={m.id}
                            className={`flex ${
                              isSystem
                                ? "justify-center"
                                : isAgent
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[75%] p-3 rounded-lg ${senderStyle(
                                m.senderType
                              )} ${isSystem ? "text-center max-w-[90%]" : ""}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-semibold uppercase opacity-70">
                                  {m.senderType}
                                </span>
                                {m.senderName && (
                                  <span className="text-[10px] opacity-60">{m.senderName}</span>
                                )}
                              </div>
                              {m.content && <p className="text-sm whitespace-pre-wrap">{m.content}</p>}
                              {m.fileUrl && (
                                <a
                                  href={m.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 mt-1.5 text-xs rounded-lg px-2.5 py-1.5 border border-border bg-background/50 text-foreground hover:opacity-80 transition-opacity"
                                >
                                  <FileIcon className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate max-w-[180px]">{m.attachments?.[0]?.name || m.fileName || "File"}</span>
                                  <Download className="h-3 w-3 shrink-0 ml-auto" />
                                </a>
                              )}
                              <div className="text-[10px] opacity-50 mt-1 text-right">
                                {m.createdAt
                                  ? format(new Date(m.createdAt), "MMM d, h:mm a")
                                  : ""}
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
                  <div className="border-t">
                    {agentAttachedFile && (
                      <div className="px-3 pt-2 flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-muted rounded-lg px-2.5 py-1.5 text-xs flex-1 min-w-0">
                          <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate text-muted-foreground">{agentAttachedFile.name}</span>
                        </div>
                        <button type="button" onClick={() => setAgentAttachedFile(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="p-3 flex gap-2">
                      <input ref={agentFileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.mp4,.mp3" onChange={handleAgentFileSelect} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => agentFileInputRef.current?.click()}
                        disabled={agentFileUploading || replyMutation.isPending}
                        title="Attach file"
                      >
                        {agentFileUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                      </Button>
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyContent}
                        onChange={(e) => handleTypingChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                        className="min-h-[40px] max-h-[100px] resize-none"
                        rows={1}
                      />
                      <Button
                        onClick={handleSendReply}
                        disabled={replyMutation.isPending || agentFileUploading || (!replyContent.trim() && !agentAttachedFile)}
                        size="icon"
                        className="shrink-0"
                      >
                        {replyMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchSuggestions}
                        disabled={loadingSuggestions}
                        title="Get AI reply suggestions"
                        className="shrink-0"
                      >
                        {loadingSuggestions ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-violet-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="flex-1 flex flex-col overflow-hidden mt-0 p-0">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      {loadingNotes ? (
                        <div className="text-center py-8">
                          <Loader2 className="animate-spin mx-auto h-5 w-5" />
                        </div>
                      ) : notes.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No internal notes yet
                        </div>
                      ) : (
                        notes.map((n: any) => (
                          <Card key={n.id} className="p-3">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-medium">{n.agentName}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {n.createdAt
                                  ? format(new Date(n.createdAt), "MMM d, h:mm a")
                                  : ""}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{n.note}</p>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <div className="p-3 border-t flex gap-2">
                    <Textarea
                      placeholder="Add internal note..."
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddNote();
                        }
                      }}
                      className="min-h-[40px] max-h-[100px] resize-none"
                      rows={1}
                    />
                    <Button
                      onClick={handleAddNote}
                      disabled={addNoteMutation.isPending || !noteContent.trim()}
                      size="icon"
                      variant="secondary"
                      className="shrink-0"
                    >
                      {addNoteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <StickyNote className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          ) : (
            <Card className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Select a ticket to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showAgentModal} onOpenChange={setShowAgentModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Support Agents</DialogTitle>
            <DialogDescription>Create and manage support agents for ticket handling</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Full Name</Label>
                <Input
                  value={agentForm.name}
                  onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                  placeholder="Agent Name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input
                  value={agentForm.email}
                  onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
                  placeholder="agent@arapoint.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Password</Label>
                <Input
                  type="password"
                  value={agentForm.password}
                  onChange={(e) => setAgentForm({ ...agentForm, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Current Agents ({agents.length})</h4>
              <ScrollArea className="h-40 border rounded-md">
                {agents.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No agents configured
                  </div>
                ) : (
                  <div className="divide-y">
                    {agents.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-3">
                        <div>
                          <div className="text-sm font-medium">{a.name}</div>
                          <div className="text-xs text-muted-foreground">{a.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {a.activeTickets ?? 0} tickets
                          </Badge>
                          <span
                            className={`h-2 w-2 rounded-full ${
                              a.isActive ? "bg-green-500" : "bg-gray-400"
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgentModal(false)}>
              Close
            </Button>
            <Button
              onClick={() => createAgentMutation.mutate(agentForm)}
              disabled={
                createAgentMutation.isPending ||
                !agentForm.name ||
                !agentForm.email ||
                !agentForm.password
              }
            >
              {createAgentMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Create Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
