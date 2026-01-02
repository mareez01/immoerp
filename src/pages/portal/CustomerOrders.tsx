import React, { useState, useEffect } from 'react';
import { ClipboardList, FileText, Ticket, Clock, CreditCard, Calendar, Package } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';

export default function CustomerPortalOrders() {
  const { user, session } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [session]);

  const fetchOrders = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('amc_responses')
        .select(`
          *,
          amc_systems (*)
        `)
        .eq('customer_user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const activeOrders = orders.filter(o => !o.unsubscribed && o.status !== 'cancelled');
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalSpent = orders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);

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
        <p className="text-white/80 mt-1">Manage your AMC subscriptions and service requests</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Orders"
          value={activeOrders.length}
          icon={ClipboardList}
        />
        <StatCard
          title="Completed Services"
          value={completedOrders.length}
          icon={Package}
        />
        <StatCard
          title="Total Spent"
          value={`₹${totalSpent.toLocaleString()}`}
          icon={CreditCard}
        />
        <StatCard
          title="Registered Systems"
          value={orders.reduce((sum, o) => sum + (o.amc_systems?.length || 0), 0)}
          icon={Clock}
        />
      </div>

      {/* Orders List */}
      <div className="rounded-xl border bg-card shadow-card">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">My AMC Orders</h2>
            <p className="text-sm text-muted-foreground">View and track your service orders</p>
          </div>
          <Link to="/portal/support">
            <Button className="gradient-primary text-white gap-2">
              <Ticket className="h-4 w-4" />
              Raise Ticket
            </Button>
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Orders Found</h3>
            <p className="text-muted-foreground">You don't have any AMC orders yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {orders.map(order => (
              <div key={order.amc_form_id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">Order #{order.amc_form_id.slice(0, 8)}</h3>
                      <StatusBadge variant={order.status as any}>
                        {formatStatus(order.status)}
                      </StatusBadge>
                      {order.urgency_level && (
                        <StatusBadge variant={order.urgency_level as any} size="sm">
                          {formatStatus(order.urgency_level)}
                        </StatusBadge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {order.system_usage_purpose}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(order.created_at), 'MMM dd, yyyy')}
                      </span>
                      {order.amount && (
                        <span className="flex items-center gap-1 font-medium">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          ₹{order.amount}
                        </span>
                      )}
                      {order.amc_systems?.length > 0 && (
                        <span className="text-muted-foreground">
                          {order.amc_systems.length} system(s)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Appointment Info */}
                  {order.scheduled_date && (
                    <div className="md:text-right">
                      <p className="text-sm text-muted-foreground">Scheduled</p>
                      <p className="font-medium">
                        {format(new Date(order.scheduled_date), 'MMM dd, yyyy')}
                      </p>
                      {order.appointment_status && (
                        <StatusBadge variant={order.appointment_status as any} size="sm" className="mt-1">
                          {formatStatus(order.appointment_status)}
                        </StatusBadge>
                      )}
                    </div>
                  )}
                </div>

                {/* Systems Preview */}
                {order.amc_systems?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {order.amc_systems.map((system: any) => (
                      <div key={system.id} className="px-3 py-1.5 rounded-md bg-muted text-sm">
                        {system.device_name || system.device_type} • {system.operating_system}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
