import React, { useState, useEffect, useCallback } from 'react';
import { Eye, MoreHorizontal, MessageSquare, User, Clock, Send, AlertCircle, UserPlus, FileText, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { DrawerPanel } from '@/components/ui/drawer-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTicketNotifications } from '@/hooks/use-realtime';

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
  resolved_worksheet_id: string | null;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  assigned_to_name?: string;
  order_status?: string;
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

interface StaffMember {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
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
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isTechnician = user?.role === 'technician';
  const isSupport = user?.role === 'support';

  // Real-time ticket notifications
  const fetchTicketsCallback = useCallback(() => {
    fetchTickets();
  }, []);

  const fetchMessagesCallback = useCallback((msg: any) => {
    // Only add message if viewing the same ticket
    if (selectedTicket && msg.ticket_id === selectedTicket.id) {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }
  }, [selectedTicket]);

  useTicketNotifications({
    onNewTicket: fetchTicketsCallback,
    onTicketUpdate: fetchTicketsCallback,
    onNewMessage: fetchMessagesCallback,
  });

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

      // Fetch customer profiles
      const customerIds = [...new Set(data?.map(t => t.customer_user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone')
        .in('user_id', customerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Fetch assigned staff profiles
      const assignedToIds = [...new Set(data?.filter(t => t.assigned_to).map(t => t.assigned_to) || [])];
      const { data: staffProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', assignedToIds);

      const staffMap = new Map(staffProfiles?.map(s => [s.id, s.full_name]) || []);

      // Fetch order statuses
      const orderIds = [...new Set(data?.filter(t => t.amc_order_id).map(t => t.amc_order_id) || [])];
      const { data: orders } = await supabase
        .from('amc_responses')
        .select('amc_form_id, status')
        .in('amc_form_id', orderIds);

      const orderMap = new Map(orders?.map(o => [o.amc_form_id, o.status]) || []);

      const ticketsWithNames = data?.map(ticket => ({
        ...ticket,
        customer_name: profileMap.get(ticket.customer_user_id)?.full_name || 'Unknown',
        customer_email: profileMap.get(ticket.customer_user_id)?.email || '',
        customer_phone: profileMap.get(ticket.customer_user_id)?.phone || '',
        assigned_to_name: ticket.assigned_to ? staffMap.get(ticket.assigned_to) : undefined,
        order_status: ticket.amc_order_id ? orderMap.get(ticket.amc_order_id) : undefined,
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
        .select('user_id, role')
        .in('role', ['admin', 'support', 'technician']);

      if (roles && roles.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, full_name')
          .in('user_id', roles.map(r => r.user_id));
        
        const roleMap = new Map(roles.map(r => [r.user_id, r.role]));
        
        const staffWithRoles = profiles?.map(p => ({
          ...p,
          role: roleMap.get(p.user_id) || '',
        })) || [];
        
        setStaffList(staffWithRoles);
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

  const handleAssignTicket = async (ticketId: string, staffProfileId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          assigned_to: staffProfileId,
          status: 'in_progress',
          updated_at: new Date().toISOString() 
        })
        .eq('id', ticketId);

      if (error) throw error;

      const staffName = staffList.find(s => s.id === staffProfileId)?.full_name;
      toast.success(`Ticket assigned to ${staffName}`);
      fetchTickets();
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ 
          ...selectedTicket, 
          assigned_to: staffProfileId,
          assigned_to_name: staffName,
          status: 'in_progress'
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign ticket');
    }
  };

  const filteredTickets = selectedTab === 'all'
    ? tickets
    : tickets.filter(t => t.status === selectedTab);

  // Calculate stats
  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
  const urgentCount = tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length;
  const unassignedCount = tickets.filter(t => !t.assigned_to && t.status !== 'closed' && t.status !== 'resolved').length;

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
      key: 'assigned_to_name',
      header: 'Assigned To',
      cell: (ticket) => (
        <div>
          {ticket.assigned_to_name ? (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-3 w-3 text-primary" />
              </div>
              <span>{ticket.assigned_to_name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">Unassigned</span>
          )}
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
      key: 'amc_order_id',
      header: 'Related Order',
      cell: (ticket) => (
        <div>
          {ticket.amc_order_id ? (
            <div className="flex items-center gap-2">
              <LinkIcon className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-mono">#{ticket.amc_order_id.slice(0, 8)}</span>
              {ticket.order_status && (
                <StatusBadge variant={ticket.order_status as any} size="sm">
                  {formatStatus(ticket.order_status)}
                </StatusBadge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>
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
            {(isAdmin || isSupport) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleUpdateTicket(ticket.id, { status: 'in_progress' })}>
                  <Clock className="h-4 w-4 mr-2" />
                  Mark In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdateTicket(ticket.id, { status: 'resolved' })}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Mark Resolved
                </DropdownMenuItem>
              </>
            )}
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
          <p className="text-muted-foreground">Manage customer support requests and escalations</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-5">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Open Tickets</p>
          <p className="text-2xl font-bold text-foreground mt-1">{openCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">In Progress</p>
          <p className="text-2xl font-bold text-warning mt-1">{inProgressCount}</p>
        </div>
        <div className="rounded-xl border p-4 shadow-card border-success/30 bg-success/5 flex items-center gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Resolved</p>
            <p className="text-2xl font-bold text-success mt-1">{resolvedCount}</p>
          </div>
          {resolvedCount > 0 && <CheckCircle2 className="h-6 w-6 text-success" />}
        </div>
        <div className={cn(
          "rounded-xl border bg-card p-4 shadow-card flex items-center gap-3",
          unassignedCount > 0 && "border-info bg-info/5"
        )}>
          <div>
            <p className="text-sm text-muted-foreground">Unassigned</p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              unassignedCount > 0 ? "text-info" : "text-foreground"
            )}>{unassignedCount}</p>
          </div>
          {unassignedCount > 0 && <UserPlus className="h-6 w-6 text-info" />}
        </div>
        <div className={cn(
          "rounded-xl border bg-card p-4 shadow-card flex items-center gap-3",
          urgentCount > 0 && "border-destructive bg-destructive/5"
        )}>
          <div>
            <p className="text-sm text-muted-foreground">Urgent/High Priority</p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              urgentCount > 0 ? "text-destructive" : "text-foreground"
            )}>{urgentCount}</p>
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
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge variant={selectedTicket.status as any}>
                  {formatStatus(selectedTicket.status)}
                </StatusBadge>
                <StatusBadge variant={selectedTicket.priority as any}>
                  {formatStatus(selectedTicket.priority)} Priority
                </StatusBadge>
                {selectedTicket.amc_order_id && (
                  <div className="flex items-center gap-1 text-sm bg-muted px-2 py-1 rounded">
                    <LinkIcon className="h-3 w-3" />
                    <span>Order #{selectedTicket.amc_order_id.slice(0, 8)}</span>
                  </div>
                )}
              </div>

              {/* Customer Info */}
              <div className="rounded-lg border p-4 bg-muted/30">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Details
                </h4>
                <div className="grid gap-2 sm:grid-cols-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <span className="ml-2 font-medium">{selectedTicket.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="ml-2">{selectedTicket.customer_email}</span>
                  </div>
                  {selectedTicket.customer_phone && (
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="ml-2">{selectedTicket.customer_phone}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <span className="ml-2">{format(new Date(selectedTicket.created_at), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                </div>
              </div>

              {/* Assignment & Status Controls */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(value) => handleUpdateTicket(selectedTicket.id, { status: value })}
                    disabled={!isAdmin && !isSupport}
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
                  <Label className="text-sm font-medium mb-2 block">Priority</Label>
                  <Select
                    value={selectedTicket.priority}
                    onValueChange={(value) => handleUpdateTicket(selectedTicket.id, { priority: value })}
                    disabled={!isAdmin && !isSupport}
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
                <div>
                  <Label className="text-sm font-medium mb-2 block">Assign To</Label>
                  <Select
                    value={selectedTicket.assigned_to || 'unassigned'}
                    onValueChange={(value) => {
                      if (value === 'unassigned') {
                        handleUpdateTicket(selectedTicket.id, { assigned_to: null, status: 'open' });
                      } else {
                        handleAssignTicket(selectedTicket.id, value);
                      }
                    }}
                    disabled={!isAdmin && !isSupport}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {staffList.map(staff => (
                        <SelectItem key={staff.id} value={staff.id}>
                          <div className="flex items-center gap-2">
                            <span>{staff.full_name}</span>
                            <span className="text-xs text-muted-foreground capitalize">({staff.role})</span>
                          </div>
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
                        className={cn(
                          "rounded-lg p-3",
                          msg.is_internal
                            ? 'bg-warning/10 border border-warning/30'
                            : msg.sender_id === session?.user?.id
                            ? 'bg-primary/10 ml-8'
                            : 'bg-muted mr-8'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
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
            {selectedTicket.status !== 'closed' && (
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
                    <label htmlFor="internal" className="text-sm text-muted-foreground cursor-pointer">
                      Internal note (not visible to customer)
                    </label>
                  </div>
                  <Button
                    className="gradient-primary text-white gap-2"
                    onClick={handleSendMessage}
                    disabled={isSending || !newMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                    {isSending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
            )}

            {selectedTicket.status === 'closed' && (
              <div className="pt-4">
                <div className="rounded-lg border p-4 bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground">This ticket has been closed</p>
                </div>
              </div>
            )}
          </div>
        )}
      </DrawerPanel>
    </div>
  );
}
