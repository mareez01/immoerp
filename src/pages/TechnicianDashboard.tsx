import React, { useState, useEffect } from 'react';
import { ClipboardList, Clock, MessageSquare, FileText, Wrench, AlertCircle, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn, formatAmcId } from '@/lib/utils';

interface TechnicianStats {
  assigned_orders: number;
  pending_worksheets: number;
  open_tickets: number;
  total_logged_minutes: number;
  completed_this_month: number;
}

interface AssignedOrder {
  amc_form_id: string;
  status: string;
  full_name: string;
  phone: string;
  scheduled_date: string | null;
  urgency_level: string | null;
  system_usage_purpose: string;
  created_at: string;
}

interface PendingWorksheet {
  id: string;
  amc_order_id: string;
  status: string;
  created_at: string;
  time_spent_minutes: number;
  amc_response?: {
    full_name: string;
    amc_form_id: string;
  };
}

interface OpenTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  amc_response?: {
    full_name: string;
  };
}

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TechnicianStats | null>(null);
  const [assignedOrders, setAssignedOrders] = useState<AssignedOrder[]>([]);
  const [pendingWorksheets, setPendingWorksheets] = useState<PendingWorksheet[]>([]);
  const [openTickets, setOpenTickets] = useState<OpenTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.profile_id) {
      fetchDashboardData();
    }
  }, [user?.profile_id]);

  const fetchDashboardData = async () => {
    if (!user?.profile_id) return;

    try {
      // Fetch assigned orders
      const { data: orders, error: ordersError } = await supabase
        .from('amc_responses')
        .select('amc_form_id, status, full_name, phone, scheduled_date, urgency_level, system_usage_purpose, created_at')
        .eq('assigned_to', user.profile_id)
        .eq('unsubscribed', false)
        .in('status', ['new', 'active', 'in_progress'])
        .order('scheduled_date', { ascending: true, nullsFirst: false });

      if (ordersError) throw ordersError;
      setAssignedOrders(orders || []);

      // Fetch pending worksheets (draft or submitted awaiting approval)
      const { data: worksheets, error: worksheetsError } = await supabase
        .from('worksheets')
        .select(`
          id, amc_order_id, status, created_at, time_spent_minutes,
          amc_response:amc_responses!amc_order_id (full_name, amc_form_id)
        `)
        .eq('staff_id', user.profile_id)
        .in('status', ['draft', 'submitted'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (worksheetsError) throw worksheetsError;
      setPendingWorksheets(worksheets as any || []);

      // Fetch open tickets assigned to technician
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select(`
          id, subject, status, priority, created_at,
          amc_response:amc_responses!amc_order_id (full_name)
        `)
        .eq('assigned_to', user.profile_id)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (ticketsError) throw ticketsError;
      setOpenTickets(tickets as any || []);

      // Fetch all worksheets for time calculation
      const { data: allWorksheets, error: allWsError } = await supabase
        .from('worksheets')
        .select('time_spent_minutes, status, created_at')
        .eq('staff_id', user.profile_id);

      if (allWsError) throw allWsError;

      // Calculate stats
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const total_logged_minutes = allWorksheets?.reduce((sum, w) => sum + (w.time_spent_minutes || 0), 0) || 0;
      const completed_this_month = allWorksheets?.filter(w => 
        w.status === 'approved' && new Date(w.created_at) >= firstOfMonth
      ).length || 0;

      setStats({
        assigned_orders: orders?.length || 0,
        pending_worksheets: worksheets?.filter(w => w.status === 'draft' || w.status === 'submitted').length || 0,
        open_tickets: tickets?.length || 0,
        total_logged_minutes,
        completed_this_month,
      });

    } catch (error) {
      console.error('Error fetching technician dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScheduleLabel = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    if (isToday(d)) return { label: 'Today', className: 'bg-primary text-primary-foreground' };
    if (isTomorrow(d)) return { label: 'Tomorrow', className: 'bg-warning/20 text-warning-foreground' };
    const days = differenceInDays(d, new Date());
    if (days < 0) return { label: 'Overdue', className: 'bg-destructive text-destructive-foreground' };
    if (days <= 7) return { label: `In ${days} days`, className: 'bg-muted' };
    return null;
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
        <p className="text-white/80 mt-1">Here's your work overview for today</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard 
          title="Assigned Orders" 
          value={stats?.assigned_orders || 0} 
          icon={ClipboardList}
        />
        <StatCard 
          title="Pending Worksheets" 
          value={stats?.pending_worksheets || 0} 
          icon={FileText}
          iconClassName="bg-warning/10"
        />
        <StatCard 
          title="Open Tickets" 
          value={stats?.open_tickets || 0} 
          icon={MessageSquare}
          iconClassName="bg-info/10"
        />
        <StatCard 
          title="Time Logged" 
          value={`${Math.floor((stats?.total_logged_minutes || 0) / 60)}h ${(stats?.total_logged_minutes || 0) % 60}m`} 
          icon={Clock}
        />
        <StatCard 
          title="Completed (Month)" 
          value={stats?.completed_this_month || 0} 
          icon={CheckCircle2}
          iconClassName="bg-success/10"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Assigned Orders */}
        <div className="rounded-xl border bg-card shadow-card">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />
                My Assigned Orders
              </h3>
              <p className="text-sm text-muted-foreground">Orders awaiting your service</p>
            </div>
            <Link to="/orders">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          
          {assignedOrders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No orders assigned to you</p>
            </div>
          ) : (
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {assignedOrders.slice(0, 5).map(order => {
                const scheduleInfo = getScheduleLabel(order.scheduled_date);
                return (
                  <div key={order.amc_form_id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-sm">
                            {formatAmcId(null, order.amc_form_id)}
                          </span>
                          <StatusBadge variant={order.status as any} size="sm">
                            {formatStatus(order.status)}
                          </StatusBadge>
                          {order.urgency_level && order.urgency_level !== 'normal' && (
                            <StatusBadge variant={order.urgency_level as any} size="sm">
                              {formatStatus(order.urgency_level)}
                            </StatusBadge>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">{order.full_name}</p>
                        <p className="text-xs text-muted-foreground">{order.phone}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {scheduleInfo && (
                          <span className={cn('text-xs px-2 py-1 rounded-full font-medium', scheduleInfo.className)}>
                            {scheduleInfo.label}
                          </span>
                        )}
                        {order.scheduled_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(order.scheduled_date), 'MMM dd, HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Worksheets */}
        <div className="rounded-xl border bg-card shadow-card">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-warning" />
                Pending Worksheets
              </h3>
              <p className="text-sm text-muted-foreground">Worksheets awaiting completion or approval</p>
            </div>
            <Link to="/worksheets">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          
          {pendingWorksheets.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No pending worksheets</p>
            </div>
          ) : (
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {pendingWorksheets.map(ws => (
                <div key={ws.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {formatAmcId(null, ws.amc_response?.amc_form_id || ws.amc_order_id)}
                        </span>
                        <StatusBadge variant={ws.status as any} size="sm">
                          {formatStatus(ws.status)}
                        </StatusBadge>
                      </div>
                      <p className="text-sm truncate">{ws.amc_response?.full_name || 'Unknown Customer'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(ws.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium">
                        {Math.floor(ws.time_spent_minutes / 60)}h {ws.time_spent_minutes % 60}m
                      </span>
                      <p className="text-xs text-muted-foreground">logged</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Support Tickets */}
      <div className="rounded-xl border bg-card shadow-card">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-info" />
              Open Support Tickets
            </h3>
            <p className="text-sm text-muted-foreground">Tickets assigned to you</p>
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
            <p>No open tickets assigned to you</p>
          </div>
        ) : (
          <div className="divide-y">
            {openTickets.map(ticket => (
              <div key={ticket.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge variant={ticket.priority as any} size="sm">
                        {formatStatus(ticket.priority)}
                      </StatusBadge>
                      <StatusBadge variant={ticket.status as any} size="sm">
                        {formatStatus(ticket.status)}
                      </StatusBadge>
                    </div>
                    <p className="font-medium text-sm truncate">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.amc_response?.full_name || 'Unknown'} • {format(new Date(ticket.created_at), 'MMM dd')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
