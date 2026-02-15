import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiClient } from "@/lib/api/client";
import { format } from "date-fns";

export default function SupportDashboard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await apiClient.get('/admin/support/tickets');
        setTickets(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTickets();
  }, []);

  const loadConversation = async (ticket: any) => {
    setSelectedTicket(ticket);
    try {
      const res = await apiClient.get(`/admin/support/tickets/${ticket.id}/messages`);
      setMessages(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      <Card className="col-span-4 flex flex-col">
        <CardHeader>
          <CardTitle>Active Tickets</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="divide-y">
              {tickets.map(t => (
                <div 
                  key={t.id} 
                  className={`p-4 cursor-pointer hover:bg-muted ${selectedTicket?.id === t.id ? 'bg-muted' : ''}`}
                  onClick={() => loadConversation(t)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">Ticket #{t.id.slice(0, 8)}</span>
                    <Badge variant={t.priority === 'high' ? 'destructive' : 'secondary'}>
                      {t.priority}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    Status: {t.status}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {format(new Date(t.createdAt), 'MMM d, h:mm a')}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="col-span-8 flex flex-col">
        <CardHeader className="border-b">
          <CardTitle>
            {selectedTicket ? `Conversation - Ticket #${selectedTicket.id.slice(0, 8)}` : 'Select a ticket'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 flex flex-col">
          {selectedTicket ? (
            <>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.senderType === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg ${m.senderType === 'user' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                        <div className="text-xs opacity-70 mb-1">{m.senderType.toUpperCase()}</div>
                        <p className="text-sm">{m.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t">
                <Button className="w-full">Take Over & Reply</Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a ticket to view conversation
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
