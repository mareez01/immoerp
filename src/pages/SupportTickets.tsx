import React, { useState, useEffect } from 'react';
import { Eye, MoreHorizontal, MessageSquare, User, Clock, Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { DrawerPanel } from '@/components/ui/drawer-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  customer_user_id: string;
  amc_order_id: string | null;
  assigned_to: string | null;
  customer_name?: string;
  customer_email?: string;
  assigned_to_name?: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  sender_name?: string;
}

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const priorityOptions = ['low', 'medium', 'high', 'urgent'];
const statusOptions = ['open', 'in_progress', 'resolved', 'closed'];

export default function SupportTicketsPage() {
  const { user, session } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [staffList, setStaffList] = useState<{id: string, full_name: string}[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchStaff();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch customer profiles for names
      const customerIds = [...new Set(data?.map(t => t.customer_user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', customerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const ticketsWithNames = data?.map(ticket => ({
        ...ticket,
        customer_name: profileMap.get(ticket.customer_user_id)?.full_name || 'Unknown',
        customer_email: profileMap.get(ticket.customer_user_id)?.email || '',
      })) || [];

      setTickets(ticketsWithNames);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'support']);

      if (roles && roles.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('user_id', roles.map(r => r.user_id));
        
        setStaffList(profiles || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch sender names
      const senderIds = [...new Set(data?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      const messagesWithNames = data?.map(msg => ({
        ...msg,
        sender_name: profileMap.get(msg.sender_id) || 'Unknown',
      })) || [];

      setMessages(messagesWithNames);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !session?.user?.id) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: session.user.id,
          message: newMessage,
          is_internal: isInternal,
        });

      if (error) throw error;

      toast.success(isInternal ? 'Internal note added' : 'Message sent');
      setNewMessage('');
      setIsInternal(false);
      fetchMessages(selectedTicket.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateTicket = async (ticketId: string, updates: Partial<Ticket>) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;

      toast.success('Ticket updated');
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, ...updates });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update ticket');
    }
  };

  const filteredTickets = selectedTab === 'all'
    ? tickets
    : tickets.filter(t => t.status === selectedTab);

  const columns: Column<Ticket>[] = [
    {
      key: 'subject',
      header: 'Subject',
      cell: (ticket) => (
        <div>
          <p className="font-medium text-foreground">{ticket.subject}</p>
          <p className="text-sm text-muted-foreground truncate max-w-xs">{ticket.description}</p>
        </div>
      ),
    },
    {
      key: 'customer_name',
      header: 'Customer',
      cell: (ticket) => (
        <div>
          <p className="font-medium">{ticket.customer_name}</p>
          <p className="text-sm text-muted-foreground">{ticket.customer_email}</p>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (ticket) => (
        <StatusBadge variant={ticket.priority as any}>
          {formatStatus(ticket.priority)}
        </StatusBadge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (ticket) => (
        <StatusBadge variant={ticket.status as any}>
          {formatStatus(ticket.status)}
        </StatusBadge>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      cell: (ticket) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(ticket.created_at), 'MMM dd, yyyy')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (ticket) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(ticket)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdateTicket(ticket.id, { status: 'in_progress' })}>
              <Clock className="h-4 w-4 mr-2" />
              Mark In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdateTicket(ticket.id, { status: 'resolved' })}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Mark Resolved
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-12',
    },
  ];

  const handleView = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDrawerOpen(true);
    fetchMessages(ticket.id);
  };

  // Calculate stats
  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const urgentCount = tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support Tickets</h1>
          <p className="text-muted-foreground">Manage customer support requests</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Open Tickets</p>
          <p className="text-2xl font-bold text-foreground mt-1">{openCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">In Progress</p>
          <p className="text-2xl font-bold text-warning mt-1">{inProgressCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card flex items-center gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Urgent/High Priority</p>
            <p className="text-2xl font-bold text-destructive mt-1">{urgentCount}</p>
          </div>
          {urgentCount > 0 && <AlertCircle className="h-6 w-6 text-destructive" />}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="bg-muted/50 p-1">
          {statusTabs.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          <DataTable
            data={filteredTickets}
            columns={columns}
            searchable
            searchKey="subject"
            searchPlaceholder="Search by subject..."
            onRowClick={handleView}
            emptyMessage="No tickets found"
          />
        </TabsContent>
      </Tabs>

      {/* Ticket Details Drawer */}
      <DrawerPanel
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Ticket Details"
        subtitle={selectedTicket?.subject}
        size="lg"
      >
        {selectedTicket && (
          <div className="flex flex-col h-full">
            {/* Ticket Info */}
            <div className="space-y-4 pb-4">
              <div className="flex items-center gap-3">
                <StatusBadge variant={selectedTicket.status as any}>
                  {formatStatus(selectedTicket.status)}
                </StatusBadge>
                <StatusBadge variant={selectedTicket.priority as any}>
                  {formatStatus(selectedTicket.priority)} Priority
                </StatusBadge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedTicket.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedTicket.customer_email}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{format(new Date(selectedTicket.created_at), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              </div>

              {/* Status and Assignment Controls */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(value) => handleUpdateTicket(selectedTicket.id, { status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(status => (
                        <SelectItem key={status} value={status}>
                          {formatStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <Select
                    value={selectedTicket.priority}
                    onValueChange={(value) => handleUpdateTicket(selectedTicket.id, { priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map(priority => (
                        <SelectItem key={priority} value={priority}>
                          {formatStatus(priority)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{selectedTicket.description}</p>
              </div>
            </div>

            <Separator />

            {/* Messages */}
            <div className="flex-1 min-h-0 py-4">
              <h4 className="font-semibold mb-3">Conversation</h4>
              <ScrollArea className="h-[300px] pr-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`rounded-lg p-3 ${
                          msg.is_internal
                            ? 'bg-warning/10 border border-warning/30'
                            : msg.sender_id === session?.user?.id
                            ? 'bg-primary/10 ml-8'
                            : 'bg-muted mr-8'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{msg.sender_name}</span>
                          {msg.is_internal && (
                            <span className="text-xs bg-warning text-warning-foreground px-1.5 py-0.5 rounded">
                              Internal Note
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {format(new Date(msg.created_at), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <Separator />

            {/* Reply Form */}
            <div className="pt-4 space-y-3">
              <Textarea
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="internal"
                    checked={isInternal}
                    onCheckedChange={(checked) => setIsInternal(checked as boolean)}
                  />
                  <label htmlFor="internal" className="text-sm text-muted-foreground">
                    Internal note (not visible to customer)
                  </label>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isSending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DrawerPanel>
    </div>
  );
}
