import React, { useState, useEffect } from 'react';
import { ClipboardList, FileText, Ticket, Clock, CreditCard, Calendar, Package, Eye, MessageCircle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { useAMCAuth } from '@/contexts/AMCAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn, formatAmcId } from '@/lib/utils';

export default function CustomerPortalOrders() {
  const { user, session } = useAMCAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [worksheets, setWorksheets] = useState<any[]>([]);
  const [isLoadingWorksheets, setIsLoadingWorksheets] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  const fetchWorksheets = async (orderId: string) => {
    setIsLoadingWorksheets(true);
    try {
      const { data, error } = await supabase
        .from('worksheets')
        .select(`
          *,
          work_logs (
            id,
            description,
            log_type,
            images,
            created_at,
            time_spent_minutes,
            is_internal
          )
        `)
        .eq('amc_order_id', orderId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out internal logs for customer view
      const filteredData = (data || []).map(ws => ({
        ...ws,
        work_logs: (ws.work_logs || []).filter((log: any) => !log.is_internal)
      }));
      
      setWorksheets(filteredData);
    } catch (error) {
      console.error('Error fetching worksheets:', error);
    } finally {
      setIsLoadingWorksheets(false);
    }
  };

  const activeOrders = orders.filter(o => !o.unsubscribed && o.status === 'active');
  const inactiveOrders = orders.filter(o => o.unsubscribed || o.status === 'inactive');
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
        <h1 className="text-2xl font-bold">Welcome, {user?.full_name || 'Customer'}!</h1>
        <p className="text-white/80 mt-1">Manage your AMC subscriptions and service requests</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Subscriptions"
          value={activeOrders.length}
          icon={ClipboardList}
        />
        <StatCard
          title="Past Subscriptions"
          value={inactiveOrders.length}
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
                      <h3 className="font-semibold">Order {formatAmcId(order.amc_number, order.amc_form_id)}</h3>
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
                  <div className="flex flex-col md:items-end gap-2">
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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => {
                        setSelectedOrder(order);
                        fetchWorksheets(order.amc_form_id);
                      }}
                    >
                      <Clock className="h-4 w-4" />
                      View Service Progress
                    </Button>
                  </div>
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

      {/* Service Progress Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Service Progress
            </SheetTitle>
            <SheetDescription>
              {selectedOrder ? formatAmcId(selectedOrder.amc_number, selectedOrder.amc_form_id) : ''}
            </SheetDescription>
          </SheetHeader>

          {isLoadingWorksheets ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading service updates...</p>
            </div>
          ) : worksheets.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-muted/20">
              <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="font-medium">No updates yet</p>
              <p className="text-sm text-muted-foreground">Service records will appear here as technicians work on your order.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {worksheets.map((ws) => (
                <div key={ws.id} className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-bold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Worksheet: {format(new Date(ws.created_at), 'MMM dd')}
                    </h3>
                    <StatusBadge variant={ws.status as any} size="sm">
                      {formatStatus(ws.status)}
                    </StatusBadge>
                  </div>

                  <div className="space-y-6">
                    {ws.work_logs?.length > 0 ? (
                      <div className="space-y-4">
                        {ws.work_logs.map((log: any, idx: number) => (
                          <div key={log.id} className="relative pl-6">
                            {idx !== ws.work_logs.length - 1 && (
                              <div className="absolute left-[9px] top-6 h-full w-0.5 bg-border" />
                            )}
                            <div
                              className={cn(
                                'absolute left-0 top-1.5 h-5 w-5 rounded-full border-2 flex items-center justify-center',
                                log.log_type === 'progress' && 'border-blue-500 bg-blue-50',
                                log.log_type === 'issue' && 'border-amber-500 bg-amber-50',
                                log.log_type === 'resolution' && 'border-green-500 bg-green-50',
                                log.log_type === 'note' && 'border-gray-400 bg-gray-50'
                              )}
                            >
                              <div
                                className={cn(
                                  'h-2 w-2 rounded-full',
                                  log.log_type === 'progress' && 'bg-blue-500',
                                  log.log_type === 'issue' && 'bg-amber-500',
                                  log.log_type === 'resolution' && 'bg-green-500',
                                  log.log_type === 'note' && 'bg-gray-400'
                                )}
                              />
                            </div>
                            <div className="rounded-lg border p-3 bg-card shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                    {log.log_type}
                                  </span>
                                  {log.time_spent_minutes > 0 && (
                                    <div className="text-[10px] bg-primary/5 text-primary px-1.5 py-0.5 rounded border border-primary/10">
                                      {Math.floor(log.time_spent_minutes / 60)}h {log.time_spent_minutes % 60}m
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(log.created_at), 'HH:mm')}
                                </span>
                              </div>
                              <p className="text-sm text-foreground/90">{log.description}</p>
                              
                              {log.images && log.images.length > 0 && (
                                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                                  {log.images.map((img: string, i: number) => (
                                    <div key={i} className="relative flex-shrink-0">
                                      <img
                                        src={img}
                                        alt="Work attachment"
                                        className="h-16 w-16 object-cover rounded border cursor-pointer hover:opacity-80"
                                        onClick={() => setPreviewImage(img)}
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/10 rounded transition-opacity pointer-events-none">
                                        <Eye className="h-4 w-4 text-white" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic px-2">No specific progress entries for this day.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <img 
              src={previewImage} 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
              alt="Preview" 
            />
            <Button
              className="absolute top-[-40px] right-0 text-white"
              variant="ghost"
              onClick={() => setPreviewImage(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
