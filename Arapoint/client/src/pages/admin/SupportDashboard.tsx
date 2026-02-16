import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiClient } from "@/lib/api/client";
import { format } from "date-fns";
import { Users, Plus, MessageSquare, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function SupportDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [agentForm, setAgentForm] = useState({ name: '', email: '', password: '' });

  const { data: ticketsData, isLoading: loadingTickets } = useQuery({
    queryKey: ['admin', 'support', 'tickets'],
    queryFn: () => apiClient.get('/admin/support/tickets').then(res => res.data.data || []),
  });

  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ['admin', 'support', 'messages', selectedTicket?.id],
    queryFn: () => apiClient.get(`/admin/support/tickets/${selectedTicket.id}/messages`).then(res => res.data.data || []),
    enabled: !!selectedTicket,
  });

  const { data: agentsData } = useQuery({
    queryKey: ['admin', 'support', 'agents'],
    queryFn: () => apiClient.get('/admin/support/agents').then(res => res.data.data || []),
  });

  const createAgentMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/admin/users', { ...data, role: 'support_agent' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'agents'] });
      setShowAgentModal(false);
      setAgentForm({ name: '', email: '', password: '' });
      toast({ title: "Agent Created", description: "Support agent has been added successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to create agent", variant: "destructive" });
    }
  });

  const tickets = ticketsData || [];
  const messages = messagesData || [];
  const agents = agentsData || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">Support Dashboard</h2>
          <p className="text-muted-foreground">Manage tickets and support agents</p>
        </div>
        <Button onClick={() => setShowAgentModal(true)} className="gap-2">
          <Users className="h-4 w-4" />
          Manage Agents
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-250px)]">
        <Card className="col-span-4 flex flex-col">
          <CardHeader>
            <CardTitle>Active Tickets</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              {loadingTickets ? (
                <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>
              ) : tickets.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No active tickets</div>
              ) : (
                <div className="divide-y">
                  {tickets.map((t: any) => (
                    <div 
                      key={t.id} 
                      className={`p-4 cursor-pointer hover:bg-muted ${selectedTicket?.id === t.id ? 'bg-muted' : ''}`}
                      onClick={() => setSelectedTicket(t)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium">#{t.id.slice(0, 8)}</span>
                        <Badge variant={t.priority === 'high' ? 'destructive' : 'secondary'}>
                          {t.priority}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium truncate">{t.subject}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Status: {t.status} • {format(new Date(t.createdAt), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="col-span-8 flex flex-col">
          <CardHeader className="border-b">
            <CardTitle>
              {selectedTicket ? `Conversation - ${selectedTicket.subject}` : 'Select a ticket'}
            </CardTitle>
            {selectedTicket && (
              <CardDescription>Ticket ID: {selectedTicket.id}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-0 flex flex-col">
            {selectedTicket ? (
              <>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((m: any) => (
                      <div key={m.id} className={`flex ${m.senderType === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${m.senderType === 'user' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                          <div className="text-xs opacity-70 mb-1">{m.senderType.toUpperCase()}</div>
                          <p className="text-sm">{m.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t flex gap-2">
                  <Input placeholder="Type your response..." />
                  <Button>Send</Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Select a ticket to view conversation</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAgentModal} onOpenChange={setShowAgentModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Support Agents</DialogTitle>
            <DialogDescription>Create new support agents to handle user complaints</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                value={agentForm.name} 
                onChange={e => setAgentForm({...agentForm, name: e.target.value})}
                placeholder="Agent Name" 
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                value={agentForm.email} 
                onChange={e => setAgentForm({...agentForm, email: e.target.value})}
                placeholder="agent@arapoint.com" 
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input 
                type="password"
                value={agentForm.password} 
                onChange={e => setAgentForm({...agentForm, password: e.target.value})}
                placeholder="********" 
              />
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-2">Current Agents ({agents.length})</h4>
              <ScrollArea className="h-32 border rounded-md p-2">
                {agents.map((a: any) => (
                  <div key={a.id} className="text-sm py-1 border-b last:border-0">
                    {a.name} ({a.email})
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgentModal(false)}>Close</Button>
            <Button 
              onClick={() => createAgentMutation.mutate(agentForm)}
              disabled={createAgentMutation.isPending || !agentForm.email || !agentForm.password}
            >
              {createAgentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
