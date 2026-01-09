import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Clock, User, ChevronRight, AlertCircle, CheckCircle, XCircle, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
  customer_phone?: string;
  assigned_to_name?: string;
}

interface TicketMessage {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  is_internal: boolean;
  sender_name?: string;
  is_staff: boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin';
  const isSupport = user?.role === 'support';
  const canManage = isAdmin || isSupport;

  // Fetch on mount
  useEffect(() => {
    fetchTickets();
    fetchStaff();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription for tickets
  useEffect(() => {
    const channel = supabase
      .channel('staff_tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => fetchTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedTicket) return;

    const channel = supabase
      .channel(`staff_messages_${selectedTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          if (messages.some(m => m.id === newMsg.id)) return;

          // Fetch sender info
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', newMsg.sender_id)
            .single();

          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', newMsg.sender_id)
            .single();

          setMessages(prev => [...prev, {
            ...newMsg,
            sender_name: profile?.full_name || 'Unknown',
            is_staff: !!roleData,
          }]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${selectedTicket.id}` },
        () => setMessages([])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket?.id, messages]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch customer profiles
      const customerIds = [...new Set(data?.map(t => t.customer_user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone')
        .in('user_id', customerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Fetch assigned staff
      const assignedIds = [...new Set(data?.filter(t => t.assigned_to).map(t => t.assigned_to) || [])];
      const { data: staffProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', assignedIds);

      const staffMap = new Map(staffProfiles?.map(s => [s.id, s.full_name]) || []);

      const ticketsWithData = data?.map(ticket => ({
        ...ticket,
        customer_name: profileMap.get(ticket.customer_user_id)?.full_name || 'Unknown',
        customer_email: profileMap.get(ticket.customer_user_id)?.email || '',
        customer_phone: profileMap.get(ticket.customer_user_id)?.phone || '',
        assigned_to_name: ticket.assigned_to ? staffMap.get(ticket.assigned_to) : undefined,
      })) || [];

      setTickets(ticketsWithData);
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
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const senderIds = [...new Set(data?.map(m => m.sender_id) || [])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('user_id', senderIds);

      const staffIds = new Set(roles?.map(r => r.user_id) || []);

      setMessages(data?.map(msg => ({
        ...msg,
        sender_name: profileMap.get(msg.sender_id) || 'Unknown',
        is_staff: staffIds.has(msg.sender_id),
      })) || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !session?.user?.id || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: session.user.id,
          message: messageText,
          is_internal: isInternal,
        });

      if (error) throw error;
      setIsInternal(false);
    } catch (error: any) {
      setNewMessage(messageText);
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

      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update ticket');
    }
  };

  const handleAssign = async (ticketId: string, staffId: string | null) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          assigned_to: staffId,
          status: staffId ? 'in_progress' : 'open',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) throw error;
      toast.success(staffId ? 'Ticket assigned' : 'Ticket unassigned');

      if (selectedTicket?.id === ticketId) {
        const staffName = staffList.find(s => s.id === staffId)?.full_name;
        setSelectedTicket(prev => prev ? {
          ...prev,
          assigned_to: staffId,
          assigned_to_name: staffName,
          status: staffId ? 'in_progress' : 'open',
        } : null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign ticket');
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;
      toast.success('Ticket closed');
      setMessages([]);

      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: 'closed' } : null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to close ticket');
    }
  };

  const selectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setMessages([]);
    fetchMessages(ticket.id);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'resolved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'closed': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'low': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatLabel = (s: string) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const filteredTickets = selectedTab === 'all' ? tickets : tickets.filter(t => t.status === selectedTab);

  // Stats
  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const urgentCount = tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground">Manage customer support requests</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Open:</span>
            <Badge variant="secondary">{openCount}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">In Progress:</span>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">{inProgressCount}</Badge>
          </div>
          {urgentCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Urgent:</span>
              <Badge variant="destructive">{urgentCount}</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Tickets List */}
        <Card className="w-2/5 flex flex-col min-h-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Tickets</CardTitle>
              <CardDescription>{filteredTickets.length} tickets</CardDescription>
            </div>
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-2">
              <TabsList className="grid w-full grid-cols-5 h-8">
                {statusTabs.map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-2">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent className="p-2">
              {filteredTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No tickets found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTickets.map(ticket => (
                    <div
                      key={ticket.id}
                      onClick={() => selectTicket(ticket)}
                      className={cn(
                        'p-3 rounded-lg cursor-pointer transition-all border',
                        selectedTicket?.id === ticket.id
                          ? 'bg-primary/10 border-primary/50'
                          : 'hover:bg-muted/50 border-transparent'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(ticket.status)}
                            <span className="font-medium text-sm truncate">{ticket.subject}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{ticket.customer_name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className={cn('text-xs', getStatusColor(ticket.status))}>
                              {formatLabel(ticket.status)}
                            </Badge>
                            <Badge variant="secondary" className={cn('text-xs', getPriorityColor(ticket.priority))}>
                              {formatLabel(ticket.priority)}
                            </Badge>
                            {ticket.assigned_to_name && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {ticket.assigned_to_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(ticket.updated_at), 'MMM dd')}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Conversation Panel */}
        <Card className="flex-1 flex flex-col min-h-0">
          {selectedTicket ? (
            <>
              {/* Ticket Header */}
              <CardHeader className="pb-3 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{selectedTicket.subject}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{selectedTicket.customer_name}</span>
                      {selectedTicket.customer_email && (
                        <>
                          <span>•</span>
                          <span>{selectedTicket.customer_email}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-xs', getPriorityColor(selectedTicket.priority))}>
                      {formatLabel(selectedTicket.priority)}
                    </Badge>
                    <Badge className={cn('text-xs', getStatusColor(selectedTicket.status))}>
                      {formatLabel(selectedTicket.status)}
                    </Badge>
                  </div>
                </div>

                {/* Controls */}
                {canManage && selectedTicket.status !== 'closed' && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                    <div className="flex-1">
                      <Select
                        value={selectedTicket.status}
                        onValueChange={(v) => handleUpdateTicket(selectedTicket.id, { status: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(s => (
                            <SelectItem key={s} value={s}>{formatLabel(s)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Select
                        value={selectedTicket.assigned_to || 'unassigned'}
                        onValueChange={(v) => handleAssign(selectedTicket.id, v === 'unassigned' ? null : v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {staffList.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.full_name} ({s.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCloseTicket(selectedTicket.id)}
                      className="h-8 text-xs"
                    >
                      Close
                    </Button>
                  </div>
                )}

                {/* Description */}
                <p className="text-sm text-muted-foreground mt-3 bg-muted/50 p-2 rounded">
                  {selectedTicket.description}
                </p>
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs">Send a message to start the conversation</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex',
                          msg.is_staff ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[75%] rounded-2xl px-4 py-2.5',
                            msg.is_internal
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-tr-sm'
                              : msg.is_staff
                              ? 'bg-primary text-primary-foreground rounded-tr-sm'
                              : 'bg-muted rounded-tl-sm'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              'text-xs font-medium',
                              msg.is_internal ? 'text-yellow-700 dark:text-yellow-400' : ''
                            )}>
                              {msg.sender_name}
                            </span>
                            {msg.is_internal && (
                              <Badge variant="outline" className="text-xs h-4 px-1 bg-yellow-200/50">
                                <Lock className="h-2 w-2 mr-1" />
                                Internal
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p className={cn(
                            'text-xs mt-1',
                            msg.is_internal
                              ? 'text-yellow-600 dark:text-yellow-500'
                              : msg.is_staff
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          )}>
                            {format(new Date(msg.created_at), 'MMM dd, HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              {selectedTicket.status !== 'closed' ? (
                <div className="p-4 border-t">
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={isSending}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSending}
                      size="icon"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="internal"
                      checked={isInternal}
                      onCheckedChange={(c) => setIsInternal(c as boolean)}
                    />
                    <label htmlFor="internal" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Internal note (not visible to customer)
                    </label>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t bg-muted/30 text-center">
                  <p className="text-sm text-muted-foreground">This ticket is closed</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
              <p className="font-medium">Select a ticket</p>
              <p className="text-sm">Choose a ticket from the list to view details</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
