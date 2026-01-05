import React, { useState, useEffect } from 'react';
import { ClipboardList, Users, CreditCard, IndianRupee, TrendingUp, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays, addDays } from 'date-fns';

const COLORS = ['hsl(199, 89%, 48%)', 'hsl(38, 92%, 50%)', 'hsl(262, 83%, 58%)', 'hsl(142, 71%, 45%)', 'hsl(0, 84%, 60%)'];

interface DashboardStats {
  total_orders: number;
  active_subscriptions: number;
  pending_invoices: number;
  total_revenue: number;
  open_tickets: number;
  orders_by_status: Record<string, number>;
  monthly_revenue: { month: string; revenue: number }[];
  expiring_subscriptions: number;
  overdue_invoices: number;
  unassigned_orders: number;
}

export default function Dashboard() {
  const { user, isCustomer } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('amc_responses')
        .select('amc_form_id, status, amc_started, assigned_to, created_at')
        .eq('unsubscribed', false);

      if (ordersError) throw ordersError;

      // Fetch invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, amount, status, due_date, validity_end');

      if (invoicesError) throw invoicesError;

      // Fetch support tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('id, status');

      if (ticketsError) throw ticketsError;

      // Calculate stats
      const total_orders = orders?.length || 0;
      const active_subscriptions = invoices?.filter(i => 
        i.status === 'paid' && i.validity_end && new Date(i.validity_end) > new Date()
      ).length || 0;
      const pending_invoices = invoices?.filter(i => i.status !== 'paid' && i.status !== 'cancelled').length || 0;
      const total_revenue = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0) || 0;
      const open_tickets = tickets?.filter(t => t.status === 'open' || t.status === 'in_progress').length || 0;

      // Orders by status
      const orders_by_status: Record<string, number> = {};
      orders?.forEach(order => {
        const status = order.status || 'new';
        orders_by_status[status] = (orders_by_status[status] || 0) + 1;
      });

      // Monthly revenue (last 6 months)
      const monthly_revenue: { month: string; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        
        const monthRevenue = invoices?.filter(inv => {
          if (inv.status !== 'paid') return false;
          const dueDate = new Date(inv.due_date);
          return dueDate >= monthStart && dueDate <= monthEnd;
        }).reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

        monthly_revenue.push({
          month: format(monthDate, 'MMM'),
          revenue: monthRevenue,
        });
      }

      // Expiring subscriptions (next 7 days)
      const expiring_subscriptions = invoices?.filter(inv => {
        if (inv.status !== 'paid' || !inv.validity_end) return false;
        const daysLeft = differenceInDays(new Date(inv.validity_end), new Date());
        return daysLeft > 0 && daysLeft <= 7;
      }).length || 0;

      // Overdue invoices
      const overdue_invoices = invoices?.filter(inv => {
        if (inv.status === 'paid' || inv.status === 'cancelled') return false;
        return new Date(inv.due_date) < new Date();
      }).length || 0;

      // Unassigned orders
      const unassigned_orders = orders?.filter(o => !o.assigned_to && o.status !== 'completed' && o.status !== 'cancelled').length || 0;

      setStats({
        total_orders,
        active_subscriptions,
        pending_invoices,
        total_revenue,
        open_tickets,
        orders_by_status,
        monthly_revenue,
        expiring_subscriptions,
        overdue_invoices,
        unassigned_orders,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect customers to their portal
  if (isCustomer) {
    return <Navigate to="/portal/orders" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load dashboard data
      </div>
    );
  }

  const pieData = Object.entries(stats.orders_by_status).map(([status, count]) => ({
    name: formatStatus(status),
    value: count,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.name}! Here's an overview of your AMC operations.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Orders" value={stats.total_orders} icon={ClipboardList} />
        <StatCard title="Active Subscriptions" value={stats.active_subscriptions} icon={Users} />
        <StatCard title="Pending Invoices" value={stats.pending_invoices} icon={CreditCard} iconClassName="bg-warning/10" />
        <StatCard title="Open Tickets" value={stats.open_tickets} icon={MessageSquare} iconClassName="bg-info/10" />
        <StatCard title="Total Revenue" value={`₹${(stats.total_revenue / 1000).toFixed(0)}K`} icon={IndianRupee} iconClassName="bg-success/10" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Revenue Trend</h3>
              <p className="text-sm text-muted-foreground">Monthly revenue over the last 6 months</p>
            </div>
            <div className="flex items-center gap-2 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Revenue</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.monthly_revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${v/1000}K`} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-card">
          <h3 className="font-semibold text-foreground mb-2">Orders by Status</h3>
          <p className="text-sm text-muted-foreground mb-6">Distribution of all orders</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {pieData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {pieData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              No orders yet
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Alerts & Reminders</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <Clock className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{stats.expiring_subscriptions} Subscriptions Expiring</p>
              <p className="text-xs text-muted-foreground">Within next 7 days</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{stats.overdue_invoices} Overdue Invoices</p>
              <p className="text-xs text-muted-foreground">Payment pending</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-info/10 border border-info/20">
            <ClipboardList className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{stats.unassigned_orders} Unassigned Orders</p>
              <p className="text-xs text-muted-foreground">Awaiting assignment</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
