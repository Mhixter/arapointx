import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, User, Bot, Headset } from "lucide-react";
import { apiClient } from "@/lib/api/client";

interface Message {
  id: string;
  senderType: 'user' | 'ai' | 'agent' | 'system';
  content: string;
  createdAt: string;
}

export default function SupportChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        const res = await apiClient.post('/support/tickets/active');
        const { conversationId } = res.data.data;
        setConversationId(conversationId);
        
        const msgRes = await apiClient.get(`/support/conversations/${conversationId}/messages`);
        setMessages(msgRes.data.data);
      } catch (err) {
        console.error("Failed to init support", err);
      }
    };
    initChat();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversationId) return;

    const userMsg = input;
    setInput("");
    setIsLoading(true);

    // Optimistic update
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: tempId,
      senderType: 'user',
      content: userMsg,
      createdAt: new Date().toISOString()
    }]);

    try {
      const res = await apiClient.post(`/support/conversations/${conversationId}/messages`, { content: userMsg });
      const { aiResponse } = res.data.data;
      
      if (aiResponse) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          senderType: 'ai',
          content: aiResponse,
          createdAt: new Date().toISOString()
        }]);
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Headset className="h-5 w-5 text-primary" />
          Arapoint Support
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[80%] ${msg.senderType === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.senderType === 'user' ? 'bg-primary text-primary-foreground' : 
                    msg.senderType === 'ai' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {msg.senderType === 'user' ? <User className="h-4 w-4" /> : 
                     msg.senderType === 'ai' ? <Bot className="h-4 w-4" /> : <Headset className="h-4 w-4" />}
                  </div>
                  <div className={`p-3 rounded-2xl ${
                    msg.senderType === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 
                    'bg-muted rounded-tl-none'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
        
        <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
          <Input 
            placeholder="Type your message..." 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
