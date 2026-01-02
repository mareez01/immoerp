import React from 'react';
import { ClipboardList, Users, CreditCard, IndianRupee, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { mockDashboardStats, mockOrders } from '@/data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';

const COLORS = ['hsl(199, 89%, 48%)', 'hsl(38, 92%, 50%)', 'hsl(262, 83%, 58%)', 'hsl(142, 71%, 45%)', 'hsl(0, 84%, 60%)'];

export default function Dashboard() {
  const stats = mockDashboardStats;

  const pieData = Object.entries(stats.orders_by_status).map(([status, count]) => ({
    name: formatStatus(status),
    value: count,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's an overview of your AMC operations.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Orders"
          value={stats.total_orders}
          icon={ClipboardList}
          trend={{ value: 12, label: 'from last month' }}
        />
        <StatCard
          title="Active Subscriptions"
          value={stats.active_subscriptions}
          icon={Users}
          trend={{ value: 8, label: 'from last month' }}
        />
        <StatCard
          title="Pending Invoices"
          value={stats.pending_invoices}
          icon={CreditCard}
          iconClassName="bg-warning/10"
        />
        <StatCard
          title="Total Revenue"
          value={`₹${(stats.total_revenue / 1000).toFixed(0)}K`}
          icon={IndianRupee}
          trend={{ value: 15, label: 'from last month' }}
          iconClassName="bg-success/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Revenue Trend</h3>
              <p className="text-sm text-muted-foreground">Monthly revenue over the last 6 months</p>
            </div>
            <div className="flex items-center gap-2 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">+15%</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.monthly_revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${v/1000}K`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by Status */}
        <div className="rounded-xl border bg-card p-6 shadow-card">
          <h3 className="font-semibold text-foreground mb-2">Orders by Status</h3>
          <p className="text-sm text-muted-foreground mb-6">Distribution of all orders</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders & Alerts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-xl border bg-card shadow-card">
          <div className="p-6 border-b">
            <h3 className="font-semibold text-foreground">Recent Orders</h3>
            <p className="text-sm text-muted-foreground">Latest AMC orders received</p>
          </div>
          <div className="divide-y">
            {mockOrders.slice(0, 5).map((order) => (
              <div key={order.amc_form_id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {order.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{order.full_name}</p>
                    <p className="text-sm text-muted-foreground">{order.city}, {order.state}</p>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge variant={order.status as any}>
                    {formatStatus(order.status)}
                  </StatusBadge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(order.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts / Reminders */}
        <div className="rounded-xl border bg-card shadow-card">
          <div className="p-6 border-b">
            <h3 className="font-semibold text-foreground">Alerts & Reminders</h3>
            <p className="text-sm text-muted-foreground">Action items requiring attention</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <Clock className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">3 Subscriptions Expiring</p>
                <p className="text-xs text-muted-foreground">Within next 7 days</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">2 Overdue Invoices</p>
                <p className="text-xs text-muted-foreground">Payment pending for 15+ days</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-info/10 border border-info/20">
              <ClipboardList className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">5 Unassigned Orders</p>
                <p className="text-xs text-muted-foreground">Awaiting technician assignment</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
