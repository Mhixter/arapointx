import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User, ChevronDown, AlertCircle, Minimize2 } from "lucide-react";
import { tokenStorage } from "@/lib/tokenStorage";

const getToken = () => tokenStorage.getItem("accessToken");

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I'm **Ara**, Arapoint's AI assistant 👋\n\nI can help you with:\n• Account info & wallet balance\n• NIN/BVN verifications\n• Education result checks\n• Airtime, data & bill payments\n• Funding your wallet\n• Complaints & support\n\nHow can I help you today?",
  createdAt: new Date(),
};

function sanitizeAndFormat(text: string): string {
  const stripped = text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');
  return stripped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-current opacity-60"
          style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }}
        />
      ))}
    </div>
  );
}

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (open) {
      scrollToBottom();
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, messages, scrollToBottom]);

  const createSession = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/chat/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (data.status === "success") {
        setSessionId(data.data.sessionId);
        return data.data.sessionId;
      }
    } catch {
      setError("Unable to connect. Please try again.");
    }
    return null;
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);

    let sid = sessionId;
    if (!sid) {
      sid = await createSession();
      if (!sid) return;
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text, createdAt: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    scrollToBottom();

    try {
      const token = getToken();
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId: sid, message: text }),
      });
      const data = await res.json();
      if (data.status === "success") {
        const aiMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: data.data.reply, createdAt: new Date() };
        setMessages(prev => [...prev, aiMsg]);
        if (!open) setUnread(u => u + 1);
      } else {
        setError(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId, createSession, open, scrollToBottom]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleOpen = async () => {
    setOpen(true);
    setUnread(0);
    if (!sessionId) {
      await createSession();
    }
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setSessionId(null);
    setError(null);
    createSession();
  };

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .chat-panel {
          animation: slideUp 0.2s ease-out forwards;
        }
        .chat-bubble-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
        }
        .chat-messages-scroll {
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        .chat-textarea {
          font-size: 16px !important;
          resize: none;
        }
        .chat-btn {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          cursor: pointer;
        }
      `}</style>

      {/* Floating Button — clears iOS home indicator via safe-area-inset-bottom */}
      <div
        className="fixed right-6 z-50 flex flex-col items-end gap-3"
        style={{ bottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 0.5rem))" }}
      >
        {!open && (
          <div
            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-[180px] text-center font-normal text-[8px]"
            style={{ animation: "slideUp 0.3s ease-out" }}
          >
            Need help?
          </div>
        )}
        <button
          onClick={() => open ? setOpen(false) : handleOpen()}
          className="chat-btn w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95 relative"
          style={{ background: "linear-gradient(135deg, #059669, #047857)" }}
          aria-label="Chat with Ara AI"
        >
          {open ? (
            <ChevronDown className="w-6 h-6 text-white" />
          ) : (
            <>
              <MessageCircle className="w-7 h-7 text-white" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {unread}
                </span>
              )}
            </>
          )}
          {!open && <span className="absolute inset-0 rounded-full chat-bubble-pulse" />}
        </button>
      </div>

      {/* Chat Panel */}
      {open && (
        <div
          className="chat-panel fixed right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            bottom: "max(5.5rem, calc(env(safe-area-inset-bottom) + 5rem))",
            width: "min(380px, calc(100vw - 24px))",
            /* dvh shrinks when iOS keyboard appears; vh fallback for older Safari */
            height: "min(560px, calc(100dvh - 140px))",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #059669, #047857)" }}
          >
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">Ara — Arapoint AI</p>
              <p className="text-green-100 text-xs">Always here to help</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                title="New chat"
                className="chat-btn w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                title="Close"
                className="chat-btn w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages — -webkit-overflow-scrolling:touch for smooth iOS scroll */}
          <div
            className="chat-messages-scroll flex-1 px-4 py-3 space-y-3"
            style={{ background: "#f9fafb" }}
          >
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold
                  ${msg.role === "user" ? "bg-blue-500" : "bg-emerald-600"}`}>
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                    ${msg.role === "user"
                      ? "bg-blue-500 text-white rounded-tr-sm"
                      : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-sm shadow-sm border border-gray-100 dark:border-gray-700"
                    }`}
                  dangerouslySetInnerHTML={{ __html: sanitizeAndFormat(msg.content) }}
                />
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-emerald-600 text-white">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-gray-800 px-3.5 py-2.5 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                  <TypingDots />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input — font-size 16px prevents iOS auto-zoom on textarea focus */}
          <div
            className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message…"
                rows={1}
                disabled={loading}
                className="chat-textarea flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
                style={{ minHeight: "42px", maxHeight: "100px" }}
                onInput={e => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = `${Math.min(t.scrollHeight, 100)}px`;
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="chat-btn w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #059669, #047857)" }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              Powered by Ara AI · <a href="/contact" className="hover:underline text-emerald-600">Contact Support</a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
