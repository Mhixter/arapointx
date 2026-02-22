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

export default function SupportAgentDashboard() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [agent, setAgent] = useState<any>(null);
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
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("adminUser") || "{}");
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
      setTicketDetail(res.data.data.ticket || null);
    } catch {}
  }, []);

  const fetchNotes = useCallback(async (ticketId: string) => {
    try {
      const res = await adminApiClient.get(`/admin/support/tickets/${ticketId}/notes`);
      setNotes(res.data.data.notes || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (!selectedTicketId) return;
    fetchMessages(selectedTicketId);
    fetchTicketDetail(selectedTicketId);
    fetchNotes(selectedTicketId);
    const interval = setInterval(() => fetchMessages(selectedTicketId), 4000);
    return () => clearInterval(interval);
  }, [selectedTicketId, fetchMessages, fetchTicketDetail, fetchNotes]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminRefreshToken");
    localStorage.removeItem("adminUser");
    setLocation("/support/agent/login");
  };

  const getActions = (status: string) => {
    const actions: { label: string; action: () => void; icon: React.ReactNode }[] = [];
    if (status === "open" || status === "escalated") {
      actions.push({ label: "Assign to Me", action: handleAssign, icon: <UserCheck className="h-4 w-4" /> });
    }
    if (status === "assigned") {
      actions.push({ label: "Start Progress", action: () => handleStatusChange("in_progress"), icon: <PlayCircle className="h-4 w-4" /> });
      actions.push({ label: "Resolve", action: () => handleStatusChange("resolved"), icon: <CheckCircle2 className="h-4 w-4" /> });
    }
    if (status === "in_progress") {
      actions.push({ label: "Resolve", action: () => handleStatusChange("resolved"), icon: <CheckCircle2 className="h-4 w-4" /> });
    }
    if (status === "resolved") {
      actions.push({ label: "Close", action: () => handleStatusChange("closed"), icon: <XCircle className="h-4 w-4" /> });
      actions.push({ label: "Reopen", action: () => handleStatusChange("open"), icon: <RotateCcw className="h-4 w-4" /> });
    }
    if (status === "closed") {
      actions.push({ label: "Reopen", action: () => handleStatusChange("open"), icon: <RotateCcw className="h-4 w-4" /> });
    }
    return actions;
  };

  if (!agent) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Headset className="h-6 w-6 text-emerald-600" />
          <div>
            <h1 className="text-lg font-bold">Support Dashboard</h1>
            <p className="text-xs text-muted-foreground">Welcome, {agent.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-3 text-xs">
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

      <div className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-65px)]">
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
                          setSuggestions([]);
                        }}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{t.referenceId}</span>
                          <Badge variant={priorityVariant(t.priority)} className="text-[10px] h-5">
                            {t.priority}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium truncate">{t.subject}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor(t.status)}`}>
                            {t.status?.replace("_", " ")}
                          </span>
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

        <div className="col-span-8 flex flex-col">
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
                <div className="flex items-center gap-2 flex-wrap">
                  {getActions(ticketDetail.status).map((a, i) => (
                    <Button key={i} size="sm" className="h-7 text-xs gap-1" onClick={a.action}>
                      {a.icon}
                      {a.label}
                    </Button>
                  ))}
                  {presence && (
                    <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                      {presence.userOnline ? (
                        <>
                          <Wifi className="h-3 w-3 text-green-500" />
                          {presence.userTyping ? (
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

              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex border-b">
                  <button
                    className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${!showNotes ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setShowNotes(false)}
                  >
                    <MessageSquare className="h-3 w-3 inline mr-1" />
                    Messages
                  </button>
                  <button
                    className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${showNotes ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setShowNotes(true)}
                  >
                    <StickyNote className="h-3 w-3 inline mr-1" />
                    Notes ({notes.length})
                  </button>
                </div>

                {!showNotes ? (
                  <>
                    <ScrollArea className="flex-1">
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
                      <div className="p-3 border-t space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Type your reply..."
                            value={replyContent}
                            onChange={(e) => handleTypingChange(e.target.value)}
                            className="flex-1"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendReply();
                              }
                            }}
                          />
                          <Button
                            size="icon"
                            onClick={handleSendReply}
                            disabled={sending || !replyContent.trim()}
                          >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={fetchSuggestions}
                            disabled={loadingSuggestions}
                            title="Get AI suggestions"
                          >
                            {loadingSuggestions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-violet-500" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
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
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddNote();
                          }
                        }}
                      />
                      <Button size="icon" onClick={handleAddNote} disabled={!noteContent.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
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
    </div>
  );
}
