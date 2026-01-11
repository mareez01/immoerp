import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, Clock, ArrowRight, Phone, Mail, Building2, FileText, User, CreditCard, AlertTriangle, CheckCircle2, IndianRupee } from 'lucide-react';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInHours, startOfWeek } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SupportStats {
  open_tickets: number;
  in_progress_tickets: number;
  resolved_this_week: number;
  my_assigned_tickets: number;
  active_amcs: number;
  total_customers: number;
  unpaid_orders_count: number;
  unpaid_orders_amount: number;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  customer_name?: string;
  amc_order_id?: string;
}

interface RecentCustomer {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name?: string;
  created_at: string;
  status: string;
  payment_status?: string;
}

interface UnpaidOrder {
  amc_form_id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name?: string;
  amount: number;
  created_at: string;
}

interface PendingInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: string;
  customer_name?: string;
}

export default function SupportDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [openTickets, setOpenTickets] = useState<Ticket[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);
  const [unpaidOrders, setUnpaidOrders] = useState<UnpaidOrder[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user?.profile_id]);

  const fetchDashboardData = async () => {
    try {
      // Fetch tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('id, subject, status, priority, created_at, updated_at, assigned_to, amc_order_id, customer_user_id')
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      // Fetch customer profiles separately (since customer_user_id references auth.users, not profiles)
      const customerIds = [...new Set((tickets || []).map(t => t.customer_user_id).filter(Boolean))];
      const { data: customerProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', customerIds);
      
      const customerMap = new Map(customerProfiles?.map(p => [p.user_id, p.full_name]) || []);

      // Process tickets data
      const processedTickets = (tickets || []).map(t => ({
        ...t,
        customer_name: customerMap.get(t.customer_user_id) || 'Unknown Customer'
      }));

      // Filter for open/in_progress tickets
      const activeTickets = processedTickets.filter(t => 
        t.status === 'open' || t.status === 'in_progress'
      );
      setOpenTickets(activeTickets.slice(0, 10));

      // Fetch all customers (AMC responses) with payment status
      const { data: customers, error: customersError } = await supabase
        .from('amc_responses')
        .select('amc_form_id, full_name, email, phone, company_name, created_at, status, payment_status, amount')
        .eq('unsubscribed', false)
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;
      
      // Recent customers for display
      setRecentCustomers((customers || []).slice(0, 10).map(c => ({
        id: c.amc_form_id,
        full_name: c.full_name,
        email: c.email,
        phone: c.phone,
        company_name: c.company_name,
        created_at: c.created_at,
        status: c.status,
        payment_status: c.payment_status
      })));

      // Filter unpaid orders (payment_status is 'Pending' or null, not 'Paid' or 'SUCCESS')
      const unpaidOrdersData = (customers || []).filter(c => 
        c.payment_status !== 'Paid' && c.payment_status !== 'SUCCESS' && c.amount
      );
      setUnpaidOrders(unpaidOrdersData.map(c => ({
        amc_form_id: c.amc_form_id,
        full_name: c.full_name,
        email: c.email,
        phone: c.phone,
        company_name: c.company_name,
        amount: parseFloat(c.amount) || 0,
        created_at: c.created_at
      })));

      // Calculate unpaid orders total
      const unpaidTotal = unpaidOrdersData.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

      // Fetch pending invoices (actual invoices from invoices table)
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, amount, due_date, status,
          amc_response:amc_responses!amc_order_id (full_name)
        `)
        .in('status', ['sent', 'overdue', 'pending'])
        .order('due_date', { ascending: true })
        .limit(10);

      if (invoicesError) throw invoicesError;
      setPendingInvoices((invoices || []).map(i => ({
        id: i.id,
        invoice_number: i.invoice_number,
        amount: i.amount,
        due_date: i.due_date,
        status: i.status,
        customer_name: (i.amc_response as any)?.full_name || 'Unknown'
      })));

      // Calculate stats
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });

      const resolvedThisWeek = processedTickets.filter(t => 
        t.status === 'resolved' && new Date(t.updated_at) >= weekStart
      ).length;

      // Count active AMCs
      const activeAmcs = (customers || []).filter(c => c.status === 'active').length;

      setStats({
        open_tickets: processedTickets.filter(t => t.status === 'open').length,
        in_progress_tickets: processedTickets.filter(t => t.status === 'in_progress').length,
        resolved_this_week: resolvedThisWeek,
        my_assigned_tickets: processedTickets.filter(t => 
          t.assigned_to === user?.profile_id && (t.status === 'open' || t.status === 'in_progress')
        ).length,
        active_amcs: activeAmcs,
        total_customers: customers?.length || 0,
        unpaid_orders_count: unpaidOrdersData.length,
        unpaid_orders_amount: unpaidTotal,
      });

    } catch (error) {
      console.error('Error fetching support dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-info text-info-foreground';
      default: return 'bg-muted';
    }
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
      {/* Welcome Header */}
      <div className="rounded-xl gradient-primary p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome, {user?.name}!</h1>
        <p className="text-white/80 mt-1">Support Dashboard - Here's your overview for today</p>
      </div>

      {/* Quick Stats - Compact */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-card border">
          <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.open_tickets || 0}</p>
            <p className="text-xs text-muted-foreground">Open Tickets</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg bg-card border">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.my_assigned_tickets || 0}</p>
            <p className="text-xs text-muted-foreground">My Assigned</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg bg-card border">
          <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.active_amcs || 0}</p>
            <p className="text-xs text-muted-foreground">Active AMCs</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg bg-card border">
          <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-info" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.total_customers || 0}</p>
            <p className="text-xs text-muted-foreground">Total Customers</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <IndianRupee className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-400">₹{(stats?.unpaid_orders_amount || 0).toLocaleString()}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">{stats?.unpaid_orders_count || 0} Unpaid Orders</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Open Tickets */}
        <div className="rounded-xl border bg-card shadow-card">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Active Support Tickets
              </h3>
              <p className="text-sm text-muted-foreground">Tickets requiring attention</p>
            </div>
            <Link to="/tickets">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          
          {openTickets.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No open tickets</p>
            </div>
          ) : (
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {openTickets.map(ticket => (
                <div key={ticket.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getPriorityColor(ticket.priority))}>
                          {ticket.priority}
                        </span>
                        <StatusBadge variant={ticket.status as any} size="sm">
                          {formatStatus(ticket.status)}
                        </StatusBadge>
                        {!ticket.assigned_to && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">
                            Unassigned
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-sm truncate">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.customer_name} • {format(new Date(ticket.created_at), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Customers */}
        <div className="rounded-xl border bg-card shadow-card">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-info" />
                Recent Customers
              </h3>
              <p className="text-sm text-muted-foreground">Latest AMC registrations</p>
            </div>
            <Link to="/customers">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          
          {recentCustomers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No customers found</p>
            </div>
          ) : (
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {recentCustomers.slice(0, 5).map(customer => (
                <div key={customer.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{customer.full_name}</span>
                        <StatusBadge variant={customer.status as any} size="sm">
                          {formatStatus(customer.status)}
                        </StatusBadge>
                      </div>
                      {customer.company_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {customer.company_name}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {customer.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {customer.email}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(customer.created_at), 'MMM dd')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payments to Collect - Unpaid Orders */}
      <div className="rounded-xl border bg-card shadow-card">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Payments to Collect
            </h3>
            <p className="text-sm text-muted-foreground">Orders saved but not yet paid</p>
          </div>
          <Link to="/orders">
            <Button variant="ghost" size="sm" className="gap-1">
              View All Orders <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        
        {unpaidOrders.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50 text-success" />
            <p>All orders are paid!</p>
          </div>
        ) : (
          <div className="divide-y max-h-[300px] overflow-y-auto">
            {unpaidOrders.slice(0, 8).map(order => (
              <div key={order.amc_form_id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{order.full_name}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      <CreditCard className="h-3 w-3" />
                      Pending
                    </span>
                  </div>
                  {order.company_name && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {order.company_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(order.created_at), 'MMM dd, yyyy')} • {order.phone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">₹{order.amount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">To collect</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {unpaidOrders.length > 0 && (
          <div className="p-4 border-t bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total to Collect</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                ₹{(stats?.unpaid_orders_amount || 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pending Invoices - Actual invoices from invoices table */}
      {pendingInvoices.length > 0 && (
        <div className="rounded-xl border bg-card shadow-card">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-warning" />
                Pending Invoices
              </h3>
              <p className="text-sm text-muted-foreground">Generated invoices awaiting payment</p>
            </div>
            <Link to="/invoices">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 p-4">
            {pendingInvoices.slice(0, 5).map(invoice => (
              <div key={invoice.id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-medium">{invoice.invoice_number}</span>
                  <StatusBadge variant={invoice.status as any} size="sm">
                    {formatStatus(invoice.status)}
                  </StatusBadge>
                </div>
                <p className="text-lg font-bold text-primary">₹{invoice.amount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground truncate">{invoice.customer_name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
