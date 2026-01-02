import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Send, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { DrawerPanel } from '@/components/ui/drawer-panel';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CustomerPortalSupport() {
  const { session } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Form state
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [relatedOrderId, setRelatedOrderId] = useState('');

  useEffect(() => {
    fetchTickets();
    fetchOrders();
  }, [session]);

  const fetchTickets = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('customer_user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrders = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('amc_responses')
        .select('amc_form_id, system_usage_purpose')
        .eq('customer_user_id', session.user.id);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('is_internal', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleCreateTicket = async () => {
    if (!subject || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          customer_user_id: session?.user?.id,
          subject,
          description,
          priority,
          amc_order_id: relatedOrderId || null,
        });

      if (error) throw error;

      toast.success('Support ticket created successfully!');
      setIsCreateDrawerOpen(false);
      setSubject('');
      setDescription('');
      setPriority('medium');
      setRelatedOrderId('');
      fetchTickets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create ticket');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: session?.user?.id,
          message: newMessage,
          is_internal: false,
        });

      if (error) throw error;

      setNewMessage('');
      fetchMessages(selectedTicket.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    }
  };

  const openTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    await fetchMessages(ticket.id);
    setIsViewDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support</h1>
          <p className="text-muted-foreground">Get help with your AMC services</p>
        </div>
        <Button className="gradient-primary text-white gap-2" onClick={() => setIsCreateDrawerOpen(true)}>
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </div>

      {/* Tickets List */}
      <div className="rounded-xl border bg-card shadow-card">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">My Support Tickets</h2>
        </div>

        {tickets.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Support Tickets</h3>
            <p className="text-muted-foreground mb-4">Need help? Create a support ticket.</p>
            <Button onClick={() => setIsCreateDrawerOpen(true)}>Create Ticket</Button>
          </div>
        ) : (
          <div className="divide-y">
            {tickets.map(ticket => (
              <div
                key={ticket.id}
                className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => openTicket(ticket)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{ticket.subject}</h3>
                      <StatusBadge variant={ticket.status === 'open' ? 'new' : ticket.status as any}>
                        {formatStatus(ticket.status)}
                      </StatusBadge>
                      <StatusBadge variant={ticket.priority as any} size="sm">
                        {formatStatus(ticket.priority)}
                      </StatusBadge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{ticket.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Ticket Drawer */}
      <DrawerPanel
        open={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        title="Create Support Ticket"
        subtitle="Describe your issue and we'll get back to you"
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsCreateDrawerOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1 gradient-primary text-white" onClick={handleCreateTicket}>
              Submit Ticket
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
            />
          </div>

          <div className="space-y-2">
            <Label>Related Order (Optional)</Label>
            <Select value={relatedOrderId} onValueChange={setRelatedOrderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No specific order</SelectItem>
                {orders.map(order => (
                  <SelectItem key={order.amc_form_id} value={order.amc_form_id}>
                    #{order.amc_form_id.slice(0, 8)} - {order.system_usage_purpose}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your issue in detail..."
              rows={5}
            />
          </div>
        </div>
      </DrawerPanel>

      {/* View Ticket Drawer */}
      <DrawerPanel
        open={isViewDrawerOpen}
        onClose={() => setIsViewDrawerOpen(false)}
        title={selectedTicket?.subject || 'Ticket Details'}
        subtitle={selectedTicket ? `Created ${format(new Date(selectedTicket.created_at), 'MMM dd, yyyy')}` : ''}
        size="lg"
      >
        {selectedTicket && (
          <div className="space-y-6">
            {/* Ticket Info */}
            <div className="flex items-center gap-3">
              <StatusBadge variant={selectedTicket.status === 'open' ? 'new' : selectedTicket.status as any}>
                {formatStatus(selectedTicket.status)}
              </StatusBadge>
              <StatusBadge variant={selectedTicket.priority as any}>
                {formatStatus(selectedTicket.priority)}
              </StatusBadge>
            </div>

            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="text-sm">{selectedTicket.description}</p>
            </div>

            {/* Messages */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-4">Conversation</h4>
              
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-sm">No messages yet. Start the conversation below.</p>
              ) : (
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`rounded-lg p-3 ${
                        msg.sender_id === session?.user?.id
                          ? 'bg-primary/10 ml-8'
                          : 'bg-muted mr-8'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(msg.created_at), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Input */}
              {selectedTicket.status !== 'closed' && (
                <div className="mt-4 flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} className="gradient-primary text-white">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </DrawerPanel>
    </div>
  );
}
