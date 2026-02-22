import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { format, formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  senderType: "user" | "ai" | "agent" | "system";
  senderName?: string;
  content: string;
  createdAt: string;
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

type View = "lobby" | "chat";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "identity", label: "Identity Verification" },
  { value: "education", label: "Education Services" },
  { value: "vtu", label: "VTU / Airtime & Data" },
  { value: "wallet", label: "Wallet & Payments" },
  { value: "cac", label: "CAC Registration" },
];

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "open":
      return "default";
    case "escalated":
      return "destructive";
    case "in_progress":
      return "secondary";
    default:
      return "outline";
  }
}

export default function SupportChat() {
  const [view, setView] = useState<View>("lobby");
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [initialMessage, setInitialMessage] = useState("");
  const [creating, setCreating] = useState(false);

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
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchActiveTickets();
  }, [fetchActiveTickets]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadMessages = useCallback(async (convId: string, sinceTimestamp?: string) => {
    try {
      let url = `/support/conversations/${convId}/messages`;
      if (sinceTimestamp) {
        url += `?since=${encodeURIComponent(sinceTimestamp)}`;
      }
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
          lastMessageTimestampRef.current =
            newMsgs[newMsgs.length - 1].createdAt;
        }
      } else {
        const allMsgs: Message[] = data.messages || [];
        setMessages(allMsgs);
        if (allMsgs.length > 0) {
          lastMessageTimestampRef.current =
            allMsgs[allMsgs.length - 1].createdAt;
        }
      }

      setPresence(data.presence || []);
      setIsActive(data.isActive);
      setClosedReason(data.closedReason || null);
      setTicketStatus(data.ticketStatus || null);
      setReferenceId(data.referenceId || null);
      setAgentName(data.agentName || null);

      return data.isActive;
    } catch {
      return true;
    }
  }, []);

  const startPolling = useCallback(
    (convId: string) => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        const still = await loadMessages(
          convId,
          lastMessageTimestampRef.current || undefined
        );
        if (still === false) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }, 4000);
    },
    [loadMessages]
  );

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback((tId: string) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    const sendBeat = () => {
      apiClient
        .post("/support/presence/heartbeat", {
          ticketId: tId,
          isTyping: isTypingRef.current,
        })
        .catch(() => {});
    };
    sendBeat();
    heartbeatRef.current = setInterval(sendBeat, 10000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const openChat = useCallback(
    async (ticket: Ticket) => {
      if (!ticket.conversationId) return;
      setCurrentTicket(ticket);
      setConversationId(ticket.conversationId);
      setView("chat");
      setLoadingMessages(true);
      lastMessageTimestampRef.current = null;

      await loadMessages(ticket.conversationId);
      setLoadingMessages(false);
      startPolling(ticket.conversationId);
      startHeartbeat(ticket.id);
    },
    [loadMessages, startPolling, startHeartbeat]
  );

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

  const handleCreateTicket = async () => {
    if (!subject.trim() || !initialMessage.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await apiClient.post("/support/tickets", {
        subject: subject.trim(),
        category,
        message: initialMessage.trim(),
      });
      const { ticket, conversationId: convId } = res.data.data;
      const newTicket: Ticket = {
        id: ticket.id,
        referenceId: ticket.referenceId,
        subject: ticket.subject,
        status: ticket.status,
        conversationId: convId,
        agentName: null,
      };
      setSubject("");
      setCategory("general");
      setInitialMessage("");
      openChat(newTicket);
    } catch (error: any) {
      setCreateError(error.response?.data?.message || "Failed to create ticket. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleTrack = async () => {
    if (!trackRef.trim()) return;
    setTracking(true);
    setTrackError("");
    setTrackResult(null);
    try {
      const res = await apiClient.get(
        `/support/tickets/track/${encodeURIComponent(trackRef.trim().toUpperCase())}`
      );
      const ticket = res.data.data.ticket;
      setTrackResult(ticket);
      setTrackDialogOpen(true);
    } catch {
      setTrackError("Ticket not found. Check the reference ID and try again.");
    } finally {
      setTracking(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversationId || !isActive) return;

    const userMsg = input.trim();
    setInput("");
    setSending(true);
    isTypingRef.current = false;

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        senderType: "user",
        content: userMsg,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await apiClient.post(
        `/support/conversations/${conversationId}/messages`,
        { content: userMsg }
      );
      const data = res.data.data;

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: data.message.id, createdAt: data.message.createdAt } : m))
      );
      lastMessageTimestampRef.current = data.message.createdAt;

      if (data.aiResponse) {
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          senderType: "ai",
          senderName: "AI Assistant",
          content: data.aiResponse,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        lastMessageTimestampRef.current = aiMsg.createdAt;
      }

      if (data.escalated) {
        const sysMsg: Message = {
          id: `sys-${Date.now()}`,
          senderType: "system",
          senderName: "System",
          content:
            "Your ticket has been escalated to a human support agent. An agent will be assigned shortly.",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, sysMsg]);
        setTicketStatus("escalated");
      }
    } catch (error: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setChatError(error.response?.data?.message || "Failed to send message. Please try again.");
      setTimeout(() => setChatError(null), 5000);
    } finally {
      setSending(false);
    }
  };

  const handleEscalate = async () => {
    if (!conversationId) return;
    setEscalating(true);
    try {
      await apiClient.post(`/support/conversations/${conversationId}/escalate`);
      setTicketStatus("escalated");
      await loadMessages(conversationId);
    } catch {
      // silent
    } finally {
      setEscalating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    isTypingRef.current = true;
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 3000);
  };

  const agentPresence = presence.find((p) => p.participantType === "agent");

  if (view === "chat") {
    return (
      <Card className="w-full max-w-2xl mx-auto h-[600px] flex flex-col">
        <CardHeader className="border-b px-4 py-3 space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Headset className="h-5 w-5 text-primary" />
              <div className="flex flex-col">
                <CardTitle className="text-sm font-semibold leading-tight">
                  {currentTicket?.subject || "Support Chat"}
                </CardTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  {referenceId && (
                    <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">
                      {referenceId}
                    </Badge>
                  )}
                  {ticketStatus && (
                    <Badge variant={statusBadgeVariant(ticketStatus)} className="text-xs px-1.5 py-0">
                      {ticketStatus}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {agentName && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="relative">
                    <Headset className="h-3.5 w-3.5" />
                    {agentPresence?.isOnline && (
                      <Circle className="h-2 w-2 fill-green-500 text-green-500 absolute -bottom-0.5 -right-0.5" />
                    )}
                  </div>
                  <span>{agentName}</span>
                </div>
              )}
              {ticketStatus !== "escalated" && isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleEscalate}
                  disabled={escalating}
                >
                  {escalating ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Headset className="h-3 w-3 mr-1" />
                  )}
                  Escalate
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {loadingMessages ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {messages.map((msg) => {
                  if (msg.senderType === "system") {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <div className="bg-muted/60 text-muted-foreground text-xs px-3 py-1.5 rounded-full max-w-[85%] text-center">
                          <AlertCircle className="h-3 w-3 inline mr-1 -mt-0.5" />
                          {msg.content}
                        </div>
                      </div>
                    );
                  }

                  const isUser = msg.senderType === "user";
                  const isAI = msg.senderType === "ai";

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex gap-2 max-w-[80%] ${isUser ? "flex-row-reverse" : ""}`}
                      >
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                            isUser
                              ? "bg-primary text-primary-foreground"
                              : isAI
                                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                                : "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
                          }`}
                        >
                          {isUser ? (
                            <User className="h-3.5 w-3.5" />
                          ) : isAI ? (
                            <Bot className="h-3.5 w-3.5" />
                          ) : (
                            <Headset className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div>
                          <div
                            className={`p-3 rounded-2xl ${
                              isUser
                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                : "bg-muted rounded-tl-sm"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {msg.content}
                            </p>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 px-1">
                            {msg.createdAt
                              ? formatDistanceToNow(new Date(msg.createdAt), {
                                  addSuffix: true,
                                })
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

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
            <div className="px-4 py-3 border-t bg-muted/30">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>
                  This conversation has been closed
                  {closedReason ? ` (${closedReason})` : ""}. You can create a
                  new ticket for further help.
                </span>
              </div>
            </div>
          )}

          {chatError && (
            <div className="px-4 py-2 border-t bg-red-50">
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {chatError}
              </p>
            </div>
          )}

          {isActive && (
            <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={handleInputChange}
                disabled={sending}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={sending || !input.trim()}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto h-[600px] flex flex-col">
        <CardHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Headset className="h-5 w-5 text-primary" />
              Arapoint Support
            </CardTitle>
            <div className="flex items-center gap-1">
              <Input
                placeholder="Track: ARP-XXXXXX"
                value={trackRef}
                onChange={(e) => {
                  setTrackRef(e.target.value);
                  setTrackError("");
                }}
                className="h-8 w-36 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTrack();
                }}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleTrack}
                disabled={tracking || !trackRef.trim()}
              >
                {tracking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
          {trackError && (
            <p className="text-xs text-destructive mt-1">{trackError}</p>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <Tabs defaultValue="tickets" className="flex flex-col h-full">
            <TabsList className="mx-4 mt-3 grid grid-cols-2">
              <TabsTrigger value="tickets">Active Tickets</TabsTrigger>
              <TabsTrigger value="new">
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Ticket
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tickets" className="flex-1 overflow-auto px-4 pb-4 mt-3">
              {loadingTickets ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activeTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No active tickets
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Create a new ticket to get support
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      onClick={() => openChat(ticket)}
                      disabled={!ticket.conversationId}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {ticket.subject}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono px-1 py-0"
                            >
                              {ticket.referenceId}
                            </Badge>
                            <Badge
                              variant={statusBadgeVariant(ticket.status)}
                              className="text-[10px] px-1 py-0"
                            >
                              {ticket.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {ticket.agentName && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Headset className="h-3 w-3" />
                              {ticket.agentName}
                            </p>
                          )}
                          {ticket.createdAt && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(
                                new Date(ticket.createdAt),
                                { addSuffix: true }
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="new" className="flex-1 overflow-auto px-4 pb-4 mt-3">
              <div className="space-y-4">
                {createError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700">{createError}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Quick issue selection:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { subject: "Failed Transaction", category: "wallet", message: "I have a failed transaction that was debited but not completed." },
                      { subject: "NIN Verification Issue", category: "identity", message: "I'm having trouble with my NIN verification." },
                      { subject: "BVN Retrieval Problem", category: "identity", message: "I need help retrieving my BVN details." },
                      { subject: "Wallet Funding Issue", category: "wallet", message: "I'm unable to fund my wallet." },
                      { subject: "WAEC Result Check", category: "education", message: "I need help checking my WAEC result." },
                      { subject: "Airtime/Data Issue", category: "vtu", message: "I purchased airtime/data but didn't receive it." },
                    ].map((quick, i) => (
                      <button
                        key={i}
                        className="text-left text-xs p-2 rounded-md border hover:bg-primary/5 hover:border-primary/30 transition-colors"
                        onClick={() => {
                          setSubject(quick.subject);
                          setCategory(quick.category);
                          setInitialMessage(quick.message);
                        }}
                      >
                        {quick.subject}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    placeholder="Brief description of your issue"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="Describe your issue in detail..."
                    value={initialMessage}
                    onChange={(e) => setInitialMessage(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreateTicket}
                  disabled={
                    creating || !subject.trim() || !initialMessage.trim()
                  }
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating Ticket...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Create Ticket & Start Chat
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {trackResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {trackResult.referenceId}
                </Badge>
                <Badge variant={statusBadgeVariant(trackResult.status)}>
                  {trackResult.status}
                </Badge>
              </div>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Subject:</span>{" "}
                  {trackResult.subject}
                </p>
                {trackResult.agentName && (
                  <p>
                    <span className="text-muted-foreground">Agent:</span>{" "}
                    {trackResult.agentName}
                  </p>
                )}
                {trackResult.createdAt && (
                  <p>
                    <span className="text-muted-foreground">Created:</span>{" "}
                    {format(new Date(trackResult.createdAt), "PPp")}
                  </p>
                )}
              </div>
              {trackResult.conversationId &&
                trackResult.status !== "closed" &&
                trackResult.status !== "resolved" && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setTrackDialogOpen(false);
                      openChat(trackResult);
                    }}
                  >
                    Open Conversation
                  </Button>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
