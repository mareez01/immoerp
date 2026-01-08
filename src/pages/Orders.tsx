import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Filter, Eye, Edit, UserMinus, UserPlus, MoreHorizontal, Phone, Mail, MapPin, Clock, Monitor, Calendar, Laptop, Server, HardDrive, Copy, Check, AlertCircle, Shield, Zap, Save, Pencil, User, Building, Wrench, PlayCircle, CheckCircle, PauseCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { DrawerPanel } from '@/components/ui/drawer-panel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatAmcId } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOrderNotifications } from '@/hooks/use-realtime';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AMCOrder {
  amc_form_id: string;
  amc_number?: string;
  // Customer identity & contact
  full_name: string;
  company_name?: string;
  email: string;
  phone: string;
  city: string;
  district: string;
  state: string;
  user_role: string;
  department?: string;
  languages_known: string;
  preferred_lang: string;
  // AMC order details
  amount?: string;
  payment_status?: string;
  payment_id?: string;
  order_id?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  // Subscription status
  status?: string; // new, active, inactive, cancelled
  unsubscribed?: boolean;
  // Assignment details
  assigned_to?: string;
  assigned_to_name?: string;
  // Overall work status
  work_status?: string; // idle, issue_reported, in_progress, pending_review, resolved
  current_issue?: string;
  issue_reported_at?: string;
  issue_resolved_at?: string;
  // Order description & notes
  problem_description?: string;
  service_work_description?: string;
  system_usage_purpose: string;
  urgency_level?: string;
  internal_notes?: string;
  notes?: string;
  // Scheduling
  scheduled_date?: string;
  scheduled_time?: string;
  preferred_time_slot?: string;
  appointment_status?: string;
  // Remote access preferences (order-level)
  consent_remote_access?: boolean;
  remote_software_preference: string;
  // Timestamps
  created_at: string;
  updated_at: string;
}

interface AMCSystem {
  id: number;
  amc_form_id: string;
  // Device identity
  device_name?: string;
  system_name?: string;
  device_type: string;
  system_type?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  operating_system?: string;
  mac_address_hint?: string;
  // Usage details
  usage_purpose?: string;
  daily_usage_hours?: string;
  usage_pattern?: string;
  primary_usage_time?: string;
  // Performance indicators
  current_performance?: string;
  performance_issues?: string[];
  system_criticality?: string;
  downtime_tolerance?: string;
  // Warranty & purchase info
  purchase_date?: string;
  purchase_location?: string;
  warranty_status?: string;
  warranty_expiry_date?: string;
  system_age_months?: number;
  // Maintenance info
  backup_frequency?: string;
  regular_maintenance?: string;
  antivirus_installed?: boolean;
  antivirus_name?: string;
  power_backup?: boolean;
  network_environment?: string;
  // System-level issue
  issue_description?: string;
  urgency_level?: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  user_id?: string;
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<AMCOrder[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [systems, setSystems] = useState<Record<string, AMCSystem[]>>({});
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<AMCOrder | null>(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isAssignDrawerOpen, setIsAssignDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assigningTo, setAssigningTo] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState({ title: '', description: '', onConfirm: () => {} });

  const canEdit = user?.role === 'admin' || user?.role === 'support';
  const canAssign = user?.role === 'admin';

  // Real-time order notifications
  const fetchOrdersCallback = useCallback(() => {
    fetchOrders();
  }, []);

  useOrderNotifications({
    onNewOrder: fetchOrdersCallback,
    onOrderUpdate: fetchOrdersCallback,
  });

  useEffect(() => {
    fetchOrders();
    fetchStaff();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('amc_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch staff names for assigned orders
      const assignedIds = [...new Set(data?.filter(o => o.assigned_to).map(o => o.assigned_to) || [])];
      if (assignedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', assignedIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

        const ordersWithNames = data?.map(order => ({
          ...order,
          assigned_to_name: order.assigned_to ? profileMap.get(order.assigned_to) : undefined,
        })) || [];

        setOrders(ordersWithNames);
      } else {
        setOrders(data || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'technician');

      if (roles && roles.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, user_id')
          .in('user_id', roles.map(r => r.user_id));

        setStaffList(profiles || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchSystems = async (orderId: string) => {
    if (systems[orderId]) return;

    try {
      const { data, error } = await supabase
        .from('amc_systems')
        .select('*')
        .eq('amc_form_id', orderId);

      if (error) throw error;
      setSystems(prev => ({ ...prev, [orderId]: data || [] }));
    } catch (error) {
      console.error('Error fetching systems:', error);
    }
  };

  const handleUpdateOrder = async (orderId: string, updates: Partial<AMCOrder>, successMessage: string = 'Order updated successfully') => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('amc_responses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('amc_form_id', orderId);

      if (error) throw error;

      toast.success(successMessage);
      fetchOrders(); // Refresh data
      
      // Close drawers if they are open
      setIsEditDrawerOpen(false);
      
      // If viewing, update the selected order to reflect changes instantly
      if (isViewDrawerOpen && selectedOrder?.amc_form_id === orderId) {
        const { data: updatedOrder } = await supabase
          .from('amc_responses')
          .select('*')
          .eq('amc_form_id', orderId)
          .single();
        if (updatedOrder) {
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', updatedOrder.assigned_to).single();
          setSelectedOrder({ ...updatedOrder, assigned_to_name: profile?.full_name });
        }
      }

    } catch (error: any) {
      toast.error(error.message || 'Failed to update order');
    } finally {
      setIsSubmitting(false);
      setAssigningTo(null);
    }
  };

  const handleUpdateSystem = async (systemId: number, updates: Partial<AMCSystem>) => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('amc_systems')
        .update(updates)
        .eq('id', systemId);

      if (error) throw error;

      toast.success('System updated successfully');
      
      // Refresh systems for the current order
      if (selectedOrder) {
        fetchSystems(selectedOrder.amc_form_id);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update system');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignTechnician = (orderId: string, technicianId: string | null) => {
    const currentOrder = orders.find(o => o.amc_form_id === orderId);
    if (!currentOrder) return;

    const updates: Partial<AMCOrder> = {
      assigned_to: technicianId,
    };
    
    // If assigning a technician and status is 'new', validate subscription before activating
    if (technicianId && currentOrder.status === 'new') {
      // Check if subscription is expired
      if (currentOrder.subscription_end_date) {
        const endDate = new Date(currentOrder.subscription_end_date);
        if (endDate < new Date()) {
          // Subscription expired - mark as inactive instead
          toast.error('Cannot activate: Subscription has expired. Marking as inactive.');
          updates.status = 'inactive';
          updates.unsubscribed = true;
          handleUpdateOrder(orderId, updates, 'Order marked as inactive due to expired subscription');
          return;
        }
      }
      // Subscription valid or no end date - activate the order
      updates.status = 'active';
    }
    
    const message = technicianId ? 'Technician assigned successfully' : 'Technician unassigned successfully';
    handleUpdateOrder(orderId, updates, message);
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    // Valid statuses: 'new', 'active', 'inactive', 'cancelled'
    const validStatuses = ['new', 'active', 'inactive', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      toast.error('Invalid status');
      return;
    }
    
    const currentOrder = orders.find(o => o.amc_form_id === orderId);
    
    // Before marking active, validate subscription_end_date
    if (newStatus === 'active' && currentOrder?.subscription_end_date) {
      const endDate = new Date(currentOrder.subscription_end_date);
      if (endDate < new Date()) {
        toast.error('Cannot activate: Subscription has expired');
        return;
      }
    }
    
    const updates: Partial<AMCOrder> = { status: newStatus };
    if (newStatus === 'inactive' || newStatus === 'cancelled') {
      updates.unsubscribed = true;
    } else {
      updates.unsubscribed = false;
    }
    
    handleUpdateOrder(orderId, updates, `Order status changed to ${formatStatus(newStatus)}`);
  };

  // Handle order cancellation - sets both status and appointment to cancelled
  const handleCancelOrder = (orderId: string) => {
    const updates: Partial<AMCOrder> = {
      status: 'cancelled',
      appointment_status: 'cancelled',
      unsubscribed: true,
    };
    
    handleUpdateOrder(orderId, updates, 'Order has been cancelled');
  };

  // Handle work status for tracking technician workflow - ADMIN ONLY
  const handleWorkStatusChange = (orderId: string, workStatus: string, issue?: string) => {
    // Work status can only be updated by admin
    if (user?.role !== 'admin') {
      toast.error('Only admin can update work status');
      return;
    }
    
    const updates: Partial<AMCOrder> = { work_status: workStatus };
    
    if (workStatus === 'issue_reported' && issue) {
      updates.current_issue = issue;
      updates.issue_reported_at = new Date().toISOString();
    } else if (workStatus === 'resolved') {
      updates.issue_resolved_at = new Date().toISOString();
    }
    
    handleUpdateOrder(orderId, updates, `Work status updated to ${formatStatus(workStatus)}`);
  };

  const confirmAction = (title: string, description: string, onConfirm: () => void) => {
    setDialogContent({ title, description, onConfirm });
    setShowConfirmDialog(true);
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, new: 0, active: 0, inactive: 0 };
    orders.forEach(o => {
      counts.all++;
      const status = o.unsubscribed ? 'inactive' : (o.status || 'new');
      // Only count the 3 valid statuses
      if (status === 'new') counts.new++;
      else if (status === 'active') counts.active++;
      else if (status === 'inactive') counts.inactive++;
      else counts.new++; // Default unknown to new
    });
    return counts;
  }, [orders]);

  // Work status counts for workflow tracking
  const workStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { 
      idle: 0, 
      issue_reported: 0, 
      in_progress: 0, 
      pending_review: 0, 
      resolved: 0 
    };
    orders.forEach(o => {
      const ws = o.work_status || 'idle';
      if (ws in counts) counts[ws]++;
    });
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (selectedTab === 'all') return orders;
    return orders.filter(o => {
      const status = o.unsubscribed ? 'inactive' : (o.status || 'new');
      return status === selectedTab;
    });
  }, [orders, selectedTab]);

  const statusTabs = [
    { value: 'all', label: 'All', count: statusCounts.all || 0 },
    { value: 'new', label: 'New', count: statusCounts.new || 0 },
    { value: 'active', label: 'Active', count: statusCounts.active || 0 },
    { value: 'inactive', label: 'Inactive', count: statusCounts.inactive || 0 },
  ];

  const columns: Column<AMCOrder>[] = [
    {
      key: 'full_name',
      header: 'Customer',
      cell: (order) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {order.full_name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-medium text-foreground">{order.full_name || 'Unknown'}</p>
            <p className="text-sm text-muted-foreground">{order.company_name || order.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'Location',
      cell: (order) => (
        <div className="text-sm">
          <p className="text-foreground">{order.city}</p>
          <p className="text-muted-foreground">{order.state}</p>
        </div>
      ),
    },
    {
      key: 'urgency_level',
      header: 'Urgency',
      cell: (order) => order.urgency_level && (
        <StatusBadge variant={order.urgency_level as any}>
          {formatStatus(order.urgency_level)}
        </StatusBadge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (order) => {
        const status = order.unsubscribed ? 'inactive' : (order.status || 'new');
        return (
          <StatusBadge variant={status as any}>
            {formatStatus(status)}
          </StatusBadge>
        );
      }
    },
    {
      key: 'work_status',
      header: 'Work Status',
      cell: (order) => {
        const ws = order.work_status || 'idle';
        const variants: Record<string, string> = {
          'idle': 'default',
          'issue_reported': 'high',
          'in_progress': 'in_progress',
          'pending_review': 'pending',
          'resolved': 'completed'
        };
        return (
          <StatusBadge variant={variants[ws] as any || 'default'}>
            {formatStatus(ws.replace('_', ' '))}
          </StatusBadge>
        );
      }
    },
    {
      key: 'scheduled_date',
      header: 'Scheduled',
      cell: (order) => order.scheduled_date ? (
        <div className="text-sm">
          <p className="font-medium">{format(new Date(order.scheduled_date), 'MMM dd')}</p>
          {order.scheduled_time && (
            <p className="text-muted-foreground">{order.scheduled_time}</p>
          )}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground italic">Not scheduled</span>
      ),
    },
    {
      key: 'assigned_to',
      header: 'Assigned To',
      cell: (order) => order.assigned_to_name ? (
        <span className="text-sm text-foreground">{order.assigned_to_name}</span>
      ) : (
        <span className="text-sm text-muted-foreground italic">Unassigned</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      cell: (order) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(order.created_at), 'MMM dd, yyyy')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (order) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleView(order)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={() => handleEdit(order)}>
                <Edit className="h-4 w-4 mr-2" />
                Update Details
              </DropdownMenuItem>
            )}
            {canAssign && (
              <DropdownMenuItem onClick={() => handleAssignClick(order)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Technician
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {canAssign && (
              <>
                <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleStatusChange(order.amc_form_id, 'active')}>Mark as Active</DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => confirmAction(
                    'Deactivate Order?',
                    `This will mark order ${formatAmcId(order.amc_number, order.amc_form_id)} as inactive. This is for expired or cancelled contracts.`,
                    () => handleStatusChange(order.amc_form_id, 'inactive')
                  )}
                >
                  Mark as Inactive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive font-medium"
                  onClick={() => confirmAction(
                    'Cancel Order?',
                    `This will permanently cancel order ${formatAmcId(order.amc_number, order.amc_form_id)}. The appointment will also be cancelled and subscription marked as unsubscribed.`,
                    () => handleCancelOrder(order.amc_form_id)
                  )}
                >
                  Cancel Order
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-12',
    },
  ];

  const handleView = (order: AMCOrder) => {
    setSelectedOrder(order);
    fetchSystems(order.amc_form_id);
    setIsViewDrawerOpen(true);
  };

  const handleEdit = (order: AMCOrder) => {
    setSelectedOrder(order);
    fetchSystems(order.amc_form_id);
    setIsEditDrawerOpen(true);
  };

  const handleAssignClick = (order: AMCOrder) => {
    setSelectedOrder(order);
    setIsAssignDrawerOpen(true);
  };

  // Handle full assignment with work status, notes, and urgency
  const handleFullAssignment = (orderId: string, assignmentData: {
    assigned_to: string | null;
    work_status: string;
    urgency_level: string;
    internal_notes: string;
    service_work_description: string;
  }) => {
    const currentOrder = orders.find(o => o.amc_form_id === orderId);
    
    const updates: Partial<AMCOrder> = {
      assigned_to: assignmentData.assigned_to,
      work_status: assignmentData.work_status,
      urgency_level: assignmentData.urgency_level,
      internal_notes: assignmentData.internal_notes,
      service_work_description: assignmentData.service_work_description,
    };
    
    // If assigning a technician and status is 'new', validate subscription before activating
    if (assignmentData.assigned_to && currentOrder?.status === 'new') {
      if (currentOrder?.subscription_end_date) {
        const endDate = new Date(currentOrder.subscription_end_date);
        if (endDate < new Date()) {
          // Subscription expired - mark as inactive
          updates.status = 'inactive';
        } else {
          // Subscription valid - activate
          updates.status = 'active';
        }
      } else {
        // No end date set - activate
        updates.status = 'active';
      }
    }
    
    const message = assignmentData.assigned_to 
      ? 'Technician assigned and order updated successfully' 
      : 'Assignment updated successfully';
    handleUpdateOrder(orderId, updates, message);
    setIsAssignDrawerOpen(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AMC Orders</h1>
          <p className="text-muted-foreground">Manage all annual maintenance contract orders</p>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold text-foreground mt-1">{statusCounts.all}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border p-4 shadow-card hover:shadow-md transition-shadow border-warning/30 bg-warning/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">New Orders</p>
              <p className="text-2xl font-bold text-warning mt-1">{statusCounts.new}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border p-4 shadow-card hover:shadow-md transition-shadow border-success/30 bg-success/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Contracts</p>
              <p className="text-2xl font-bold text-success mt-1">{statusCounts.active}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-success" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold text-muted-foreground mt-1">{statusCounts.inactive}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="bg-muted/50 p-1">
          {statusTabs.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
            >
              {tab.label}
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {tab.count}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>


        <TabsContent value={selectedTab} className="mt-6">
          <DataTable
            data={filteredOrders}
            columns={columns}
            searchable
            searchKey="full_name"
            searchPlaceholder="Search by customer name..."
            onRowClick={handleView}
            emptyMessage="No orders found"
          />
        </TabsContent>
      </Tabs>

      <DrawerPanel
        open={isViewDrawerOpen}
        onClose={() => setIsViewDrawerOpen(false)}
        title="Order Details"
        subtitle={selectedOrder ? `AMC ID: ${formatAmcId(selectedOrder.amc_number, selectedOrder.amc_form_id)}` : ''}
        size="xl"
      >
        {selectedOrder && (
          <OrderDetails 
            order={selectedOrder} 
            systems={systems[selectedOrder.amc_form_id] || []}
            technicians={staffList}
            onAssign={handleAssignTechnician}
            onWorkStatusChange={handleWorkStatusChange}
            isAssigning={isSubmitting}
            canAssign={canAssign}
            isAdmin={user?.role === 'admin'}
          />
        )}
      </DrawerPanel>

      <DrawerPanel
        open={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        title="Edit Order"
        subtitle={selectedOrder ? `AMC ID: ${formatAmcId(selectedOrder.amc_number, selectedOrder.amc_form_id)}` : ''}
        size="xl"
      >
        {selectedOrder && (
          <OrderEditForm 
            order={selectedOrder}
            systems={systems[selectedOrder.amc_form_id] || []}
            onSaveOrder={(updates) => handleUpdateOrder(selectedOrder.amc_form_id, updates)}
            onSaveSystem={handleUpdateSystem}
            isSubmitting={isSubmitting}
          />
        )}
      </DrawerPanel>

      <DrawerPanel
        open={isAssignDrawerOpen}
        onClose={() => setIsAssignDrawerOpen(false)}
        title="Assign Technician"
        subtitle={selectedOrder ? `AMC ID: ${formatAmcId(selectedOrder.amc_number, selectedOrder.amc_form_id)} - ${selectedOrder.full_name}` : ''}
        size="md"
      >
        {selectedOrder && (
          <AssignmentForm 
            order={selectedOrder}
            technicians={staffList}
            onAssign={(data) => handleFullAssignment(selectedOrder.amc_form_id, data)}
            isSubmitting={isSubmitting}
          />
        )}
      </DrawerPanel>
      
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogContent.title}</DialogTitle>
            <DialogDescription>{dialogContent.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              dialogContent.onConfirm();
              setShowConfirmDialog(false);
            }}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MacAddressDisplay({ macAddress }: { macAddress?: string }) {
  const [copied, setCopied] = useState(false);

  if (!macAddress) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(macAddress);
    setCopied(true);
    toast.success('MAC address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed">
      <span className="text-xs text-muted-foreground font-medium">MAC:</span>
      <code className="font-mono text-xs bg-muted px-2 py-1 rounded text-primary font-bold tracking-wider">
        {macAddress}
      </code>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}

function getSystemIcon(type?: string) {
  switch (type) {
    case 'laptop': return <Laptop className="h-4 w-4" />;
    case 'server': return <Server className="h-4 w-4" />;
    case 'workstation': return <HardDrive className="h-4 w-4" />;
    default: return <Monitor className="h-4 w-4" />;
  }
}

function OrderDetails({ 
  order, 
  systems,
  technicians,
  onAssign,
  onWorkStatusChange,
  isAssigning,
  canAssign,
  isAdmin,
}: { 
  order: AMCOrder; 
  systems: AMCSystem[];
  technicians: StaffMember[];
  onAssign: (orderId: string, techId: string | null) => void;
  onWorkStatusChange: (orderId: string, workStatus: string, issue?: string) => void;
  isAssigning: boolean;
  canAssign: boolean;
  isAdmin: boolean;
}) {
  const [selectedTech, setSelectedTech] = useState(order.assigned_to || 'unassign');
  const [newIssue, setNewIssue] = useState('');
  const [showIssueForm, setShowIssueForm] = useState(false);

  useEffect(() => {
    setSelectedTech(order.assigned_to || 'unassign');
  }, [order.assigned_to]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Contact */}
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-semibold text-foreground mb-4">Customer Information</h4>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xl">
                {order.full_name?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg text-foreground">{order.full_name || 'Unknown'}</p>
                {order.company_name && (
                  <p className="text-sm text-muted-foreground">{order.company_name}</p>
                )}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="h-4 w-4" /> <span>{order.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Phone className="h-4 w-4" /> <span>{order.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> <span>{`${order.city}, ${order.district || ''}, ${order.state}`}</span>
                  </div>
                  {order.user_role && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <User className="h-4 w-4" /> <span>Role: {order.user_role}</span>
                    </div>
                  )}
                  {order.department && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Building className="h-4 w-4" /> <span>Dept: {order.department}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-semibold text-foreground mb-4">Order Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">AMC Number</p>
                <p className="font-semibold">{order.amc_number || formatAmcId(order.amc_number, order.amc_form_id)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <StatusBadge variant={(order.unsubscribed ? 'inactive' : order.status || 'new') as any}>
                  {formatStatus(order.unsubscribed ? 'inactive' : order.status || 'new')}
                </StatusBadge>
              </div>
              <div>
                <p className="text-muted-foreground">Work Status</p>
                <StatusBadge variant={
                  order.work_status === 'resolved' ? 'completed' :
                  order.work_status === 'issue_reported' ? 'high' :
                  order.work_status === 'in_progress' ? 'in_progress' :
                  order.work_status === 'pending_review' ? 'pending' : 'default'
                }>
                  {formatStatus(order.work_status?.replace('_', ' ') || 'idle')}
                </StatusBadge>
              </div>
              <div>
                <p className="text-muted-foreground">Urgency</p>
                <StatusBadge variant={order.urgency_level as any}>
                  {formatStatus(order.urgency_level || 'normal')}
                </StatusBadge>
              </div>
              <div>
                <p className="text-muted-foreground">Submitted</p>
                <p className="font-semibold">{format(new Date(order.created_at), 'PPpp')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-semibold">{formatDistanceToNow(new Date(order.updated_at), { addSuffix: true })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">AMC Amount</p>
                <p className="font-semibold text-primary">₹{order.amount || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Status</p>
                <StatusBadge variant={order.payment_status === 'SUCCESS' ? 'paid' : 'pending'}>
                  {order.payment_status || 'Pending'}
                </StatusBadge>
              </div>
            </div>
            
            {/* Scheduled Appointment */}
            {(order.scheduled_date || order.scheduled_time) && (
              <>
                <Separator className="my-4" />
                <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                  <h5 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Scheduled Appointment
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <p className="font-semibold">{order.scheduled_date ? format(new Date(order.scheduled_date), 'PPP') : 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Time</p>
                      <p className="font-semibold">{order.scheduled_time || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Preferred Slot</p>
                      <p className="font-semibold capitalize">{order.preferred_time_slot || 'Any'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Appointment Status</p>
                      <StatusBadge variant={order.appointment_status as any}>
                        {formatStatus(order.appointment_status || 'pending')}
                      </StatusBadge>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator className="my-4" />
            <div>
              <p className="text-muted-foreground mb-1 font-medium">Problem Description</p>
              <p className="text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{order.problem_description || 'No description provided.'}</p>
            </div>
            
            <Separator className="my-4" />
            <div>
              <p className="text-muted-foreground mb-1 font-medium">Service Work Description (for Technician)</p>
              <p className="text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{order.service_work_description || 'No specific instructions provided.'}</p>
            </div>
            
            {order.system_usage_purpose && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-muted-foreground mb-1 font-medium">System Usage Purpose</p>
                  <p className="text-foreground bg-muted/50 p-3 rounded-md">{order.system_usage_purpose}</p>
                </div>
              </>
            )}
          </div>

          {/* Subscription Information */}
          {(order.subscription_start_date || order.subscription_end_date) && (
            <div className="rounded-lg border bg-card p-4">
              <h4 className="font-semibold text-foreground mb-4">Subscription Period</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-muted/50 rounded-md p-3">
                  <span className="text-xs text-muted-foreground block">Start Date</span>
                  <span className="font-medium">
                    {order.subscription_start_date ? format(new Date(order.subscription_start_date), 'PPP') : 'Not set'}
                  </span>
                </div>
                <div className="bg-muted/50 rounded-md p-3">
                  <span className="text-xs text-muted-foreground block">End Date</span>
                  <span className="font-medium">
                    {order.subscription_end_date ? format(new Date(order.subscription_end_date), 'PPP') : 'Not set'}
                  </span>
                  {order.subscription_end_date && new Date(order.subscription_end_date) < new Date() && (
                    <Badge variant="destructive" className="ml-2 text-xs">Expired</Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Current Issue Tracking */}
          {order.work_status !== 'idle' && order.current_issue && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                Current Issue
              </h4>
              <p className="text-foreground whitespace-pre-wrap">{order.current_issue}</p>
              {order.issue_reported_at && (
                <p className="text-xs text-muted-foreground mt-2">Reported: {format(new Date(order.issue_reported_at), 'PPpp')}</p>
              )}
              {order.issue_resolved_at && (
                <p className="text-xs text-success mt-1">Resolved: {format(new Date(order.issue_resolved_at), 'PPpp')}</p>
              )}
            </div>
          )}

          {/* Systems */}
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-semibold text-foreground mb-4">Systems ({systems.length})</h4>
            <Accordion type="single" collapsible className="w-full">
              {systems.map((system, index) => (
                <AccordionItem value={`item-${index}`} key={system.id}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      {getSystemIcon(system.device_type)}
                      <span className="font-semibold">{system.device_name || system.system_name || `System ${index + 1}`}</span>
                      <Badge variant="outline">{system.operating_system || system.device_type}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 p-3">
                      {/* Basic Info */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div className="bg-muted/50 rounded-md p-2">
                          <span className="text-xs text-muted-foreground block">Device Type</span>
                          <span className="font-medium capitalize">{system.device_type || 'N/A'}</span>
                        </div>
                        <div className="bg-muted/50 rounded-md p-2">
                          <span className="text-xs text-muted-foreground block">Brand</span>
                          <span className="font-medium">{system.brand || 'N/A'}</span>
                        </div>
                        <div className="bg-muted/50 rounded-md p-2">
                          <span className="text-xs text-muted-foreground block">Model</span>
                          <span className="font-medium">{system.model || 'N/A'}</span>
                        </div>
                        <div className="bg-muted/50 rounded-md p-2">
                          <span className="text-xs text-muted-foreground block">Operating System</span>
                          <span className="font-medium">{system.operating_system || 'N/A'}</span>
                        </div>
                        <div className="bg-muted/50 rounded-md p-2">
                          <span className="text-xs text-muted-foreground block">System Type</span>
                          <span className="font-medium capitalize">{system.system_type || 'N/A'}</span>
                        </div>
                        <div className="bg-muted/50 rounded-md p-2">
                          <span className="text-xs text-muted-foreground block">Serial Number</span>
                          <span className="font-medium">{(system as any).serial_number || 'N/A'}</span>
                        </div>
                      </div>
                      
                      {/* Issue Description */}
                      {system.issue_description && (
                        <div className="border-t pt-3">
                          <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">System Issue Description</h5>
                          <p className="text-sm bg-warning/10 border border-warning/30 p-2 rounded">{system.issue_description}</p>
                        </div>
                      )}
                      
                      {/* Usage & Performance */}
                      <div className="border-t pt-3">
                        <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Usage & Performance</h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div className="bg-muted/50 rounded-md p-2">
                            <span className="text-xs text-muted-foreground block">Daily Usage</span>
                            <span className="font-medium">{system.daily_usage_hours ? `${system.daily_usage_hours} hours` : 'N/A'}</span>
                          </div>
                          <div className="bg-muted/50 rounded-md p-2">
                            <span className="text-xs text-muted-foreground block">Usage Pattern</span>
                            <span className="font-medium capitalize">{system.usage_pattern || 'N/A'}</span>
                          </div>
                          <div className="bg-muted/50 rounded-md p-2">
                            <span className="text-xs text-muted-foreground block">Performance</span>
                            <span className="font-medium capitalize">{system.current_performance || 'N/A'}</span>
                          </div>
                          <div className="bg-muted/50 rounded-md p-2">
                            <span className="text-xs text-muted-foreground block">Criticality</span>
                            <span className="font-medium capitalize">{system.system_criticality?.replace('_', ' ') || 'N/A'}</span>
                          </div>
                          <div className="bg-muted/50 rounded-md p-2">
                            <span className="text-xs text-muted-foreground block">Downtime Tolerance</span>
                            <span className="font-medium capitalize">{system.downtime_tolerance?.replace('_', ' ') || 'N/A'}</span>
                          </div>
                          <div className="bg-muted/50 rounded-md p-2">
                            <span className="text-xs text-muted-foreground block">Network</span>
                            <span className="font-medium capitalize">{system.network_environment || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Security & Maintenance */}
                      <div className="border-t pt-3">
                        <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Security & Maintenance</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="bg-muted/50 rounded-md p-2">
                            <span className="text-xs text-muted-foreground block">Antivirus</span>
                            <span className="font-medium">{system.antivirus_installed ? (system.antivirus_name || 'Yes') : 'No'}</span>
                          </div>
                          <div className="bg-muted/50 rounded-md p-2">
                            <span className="text-xs text-muted-foreground block">Backup Frequency</span>
                            <span className="font-medium capitalize">{system.backup_frequency || 'N/A'}</span>
                          </div>
                          <div className="bg-muted/50 rounded-md p-2">
                            <span className="text-xs text-muted-foreground block">Power Backup</span>
                            <span className="font-medium">{system.power_backup ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="bg-muted/50 rounded-md p-2">
                            <span className="text-xs text-muted-foreground block">Regular Maintenance</span>
                            <span className="font-medium capitalize">{(system as any).regular_maintenance?.replace('_', ' ') || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Performance Issues if any */}
                      {system.performance_issues && system.performance_issues.length > 0 && (
                        <div className="border-t pt-3">
                          <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Reported Issues</h5>
                          <div className="flex flex-wrap gap-2">
                            {system.performance_issues.map((issue: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-warning border-warning/30 bg-warning/10">
                                {issue.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* MAC Address */}
                      {system.mac_address_hint && <MacAddressDisplay macAddress={system.mac_address_hint} />}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Work Status Controls */}
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Work Status
            </h4>
            <div className="space-y-3">
              <div className="p-2 bg-muted/50 rounded-md text-sm">
                <p className="text-muted-foreground">Current Status:</p>
                <StatusBadge variant={
                  order.work_status === 'resolved' ? 'completed' :
                  order.work_status === 'issue_reported' ? 'high' :
                  order.work_status === 'in_progress' ? 'in_progress' :
                  order.work_status === 'pending_review' ? 'pending' : 'default'
                } className="mt-1">
                  {formatStatus(order.work_status?.replace('_', ' ') || 'idle')}
                </StatusBadge>
              </div>
              
              {isAdmin && (
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    size="sm" 
                    variant={order.work_status === 'idle' ? 'default' : 'outline'}
                    onClick={() => onWorkStatusChange(order.amc_form_id, 'idle')}
                    className="gap-1"
                  >
                    <PauseCircle className="h-3 w-3" />
                    Idle
                  </Button>
                  <Button 
                    size="sm" 
                    variant={order.work_status === 'in_progress' ? 'default' : 'outline'}
                    onClick={() => onWorkStatusChange(order.amc_form_id, 'in_progress')}
                    className="gap-1"
                  >
                    <PlayCircle className="h-3 w-3" />
                    In Progress
                  </Button>
                  <Button 
                    size="sm" 
                    variant={order.work_status === 'pending_review' ? 'default' : 'outline'}
                    onClick={() => onWorkStatusChange(order.amc_form_id, 'pending_review')}
                    className="gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    Review
                  </Button>
                  <Button 
                    size="sm" 
                    variant={order.work_status === 'resolved' ? 'default' : 'outline'}
                    onClick={() => onWorkStatusChange(order.amc_form_id, 'resolved')}
                    className="gap-1 text-success border-success hover:bg-success/10"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Resolved
                  </Button>
                </div>
              )}
              
              {/* Report New Issue */}
              {isAdmin && (
                <div className="pt-2 border-t">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full gap-2 text-warning border-warning/50 hover:bg-warning/10"
                    onClick={() => setShowIssueForm(!showIssueForm)}
                  >
                    <AlertCircle className="h-3 w-3" />
                    Report Issue
                  </Button>
                  
                  {showIssueForm && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder="Describe the issue..."
                        value={newIssue}
                        onChange={(e) => setNewIssue(e.target.value)}
                        rows={3}
                        className="text-sm"
                      />
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          if (newIssue.trim()) {
                            onWorkStatusChange(order.amc_form_id, 'issue_reported', newIssue);
                            setNewIssue('');
                            setShowIssueForm(false);
                          }
                        }}
                        disabled={!newIssue.trim()}
                      >
                        Submit Issue
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Assignment */}
          {canAssign && (
            <div className="rounded-lg border bg-card p-4">
              <h4 className="font-semibold text-foreground mb-4">Technician Assignment</h4>
              {order.assigned_to_name && (
                <div className="mb-3 p-2 bg-primary/10 rounded-md text-sm">
                  <p className="text-muted-foreground">Currently assigned to:</p>
                  <p className="font-semibold text-primary">{order.assigned_to_name}</p>
                </div>
              )}
              <div className="space-y-3">
                <Select value={selectedTech} onValueChange={setSelectedTech}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a technician..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassign">Unassign</SelectItem>
                    {technicians.map(tech => (
                      <SelectItem key={tech.id} value={tech.id}>{tech.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  className="w-full" 
                  onClick={() => onAssign(order.amc_form_id, selectedTech === 'unassign' ? null : selectedTech)}
                  disabled={isAssigning || selectedTech === (order.assigned_to || 'unassign')}
                >
                  {isAssigning ? 'Assigning...' : 'Update Assignment'}
                </Button>
              </div>
            </div>
          )}

          {/* Internal Notes */}
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-semibold text-foreground mb-4">Internal Notes</h4>
            <div className="text-sm bg-muted p-3 rounded-md min-h-[100px] whitespace-pre-wrap">
              {order.internal_notes || <span className="text-muted-foreground italic">No internal notes.</span>}
            </div>
          </div>
          
          {/* General Notes */}
          {order.notes && (
            <div className="rounded-lg border bg-card p-4">
              <h4 className="font-semibold text-foreground mb-4">General Notes</h4>
              <div className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                {order.notes}
              </div>
            </div>
          )}

          {/* Preferences */}
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-semibold text-foreground mb-4">Preferences</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Remote Access</span>
                <Badge variant={order.consent_remote_access ? 'default' : 'destructive'}>
                  {order.consent_remote_access ? 'Allowed' : 'Denied'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Remote Tool</span>
                <span className="font-semibold capitalize">{order.remote_software_preference || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Preferred Language</span>
                <span className="font-semibold">{order.preferred_lang || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Languages Known</span>
                <span className="font-semibold">{order.languages_known || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Assignment Form Component for admin to assign technician with full context
function AssignmentForm({ order, technicians, onAssign, isSubmitting }: { 
  order: AMCOrder; 
  technicians: StaffMember[];
  onAssign: (data: {
    assigned_to: string | null;
    work_status: string;
    urgency_level: string;
    internal_notes: string;
    service_work_description: string;
  }) => void;
  isSubmitting: boolean;
}) {
  const [selectedTech, setSelectedTech] = useState(order.assigned_to || '');
  const [workStatus, setWorkStatus] = useState(order.work_status || 'idle');
  const [urgencyLevel, setUrgencyLevel] = useState(order.urgency_level || 'normal');
  const [internalNotes, setInternalNotes] = useState(order.internal_notes || '');
  const [serviceDescription, setServiceDescription] = useState(order.service_work_description || '');

  const handleSubmit = () => {
    onAssign({
      assigned_to: selectedTech || null,
      work_status: workStatus,
      urgency_level: urgencyLevel,
      internal_notes: internalNotes,
      service_work_description: serviceDescription,
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Order Info */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Customer:</span>
            <p className="font-medium">{order.full_name}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>
            <StatusBadge variant={order.status as any} className="ml-2">
              {formatStatus(order.status || 'new')}
            </StatusBadge>
          </div>
          <div>
            <span className="text-muted-foreground">Phone:</span>
            <p className="font-medium">{order.phone}</p>
          </div>
          <div>
            <span className="text-muted-foreground">City:</span>
            <p className="font-medium">{order.city}</p>
          </div>
        </div>
        {order.problem_description && (
          <div className="mt-3 pt-3 border-t">
            <span className="text-muted-foreground text-sm">Problem:</span>
            <p className="text-sm mt-1">{order.problem_description}</p>
          </div>
        )}
      </div>

      {/* Technician Selection */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Assign Technician</Label>
        {order.assigned_to_name && (
          <div className="mb-2 p-2 bg-primary/10 rounded-md text-sm">
            <span className="text-muted-foreground">Currently assigned: </span>
            <span className="font-semibold text-primary">{order.assigned_to_name}</span>
          </div>
        )}
        <Select value={selectedTech} onValueChange={setSelectedTech}>
          <SelectTrigger>
            <SelectValue placeholder="Select a technician..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Unassign</SelectItem>
            {technicians.map(tech => (
              <SelectItem key={tech.id} value={tech.id}>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {tech.full_name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Work Status */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Work Status</Label>
        <Select value={workStatus} onValueChange={setWorkStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="idle">
              <div className="flex items-center gap-2">
                <PauseCircle className="h-4 w-4 text-muted-foreground" />
                Idle - Not started
              </div>
            </SelectItem>
            <SelectItem value="in_progress">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-blue-500" />
                In Progress - Working on it
              </div>
            </SelectItem>
            <SelectItem value="pending_review">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending Review - Awaiting confirmation
              </div>
            </SelectItem>
            <SelectItem value="issue_reported">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Issue Reported - Problem found
              </div>
            </SelectItem>
            <SelectItem value="resolved">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Resolved - Work completed
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Urgency Level */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Urgency Level</Label>
        <Select value={urgencyLevel} onValueChange={setUrgencyLevel}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">🟢 Low - Can wait</SelectItem>
            <SelectItem value="normal">🟡 Normal - Standard priority</SelectItem>
            <SelectItem value="high">🟠 High - Needs attention soon</SelectItem>
            <SelectItem value="critical">🔴 Critical - Immediate action required</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Service Work Description */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Instructions for Technician</Label>
        <Textarea
          value={serviceDescription}
          onChange={(e) => setServiceDescription(e.target.value)}
          placeholder="Describe what work needs to be done, special instructions, or notes for the technician..."
          rows={3}
        />
      </div>

      {/* Internal Notes */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Internal Notes (Admin Only)</Label>
        <Textarea
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          placeholder="Confidential notes, payment info, special considerations..."
          rows={3}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
          <UserPlus className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : selectedTech ? 'Assign & Save' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

function OrderEditForm({ order, systems, onSaveOrder, onSaveSystem, isSubmitting }: { 
  order: AMCOrder; 
  systems: AMCSystem[];
  onSaveOrder: (updates: Partial<AMCOrder>) => void;
  onSaveSystem: (systemId: number, updates: Partial<AMCSystem>) => void;
  isSubmitting: boolean;
}) {
  const [activeTab, setActiveTab] = useState('customer');
  const [orderData, setOrderData] = useState<Partial<AMCOrder>>({
    // Customer Info
    full_name: order.full_name,
    company_name: order.company_name,
    email: order.email,
    phone: order.phone,
    city: order.city,
    district: order.district,
    state: order.state,
    user_role: order.user_role,
    department: order.department,
    languages_known: order.languages_known,
    preferred_lang: order.preferred_lang,
    // Order Details
    urgency_level: order.urgency_level,
    problem_description: order.problem_description,
    service_work_description: order.service_work_description,
    system_usage_purpose: order.system_usage_purpose,
    internal_notes: order.internal_notes,
    notes: order.notes,
    // Schedule
    scheduled_date: order.scheduled_date,
    scheduled_time: order.scheduled_time,
    preferred_time_slot: order.preferred_time_slot,
    appointment_status: order.appointment_status,
    // Preferences
    consent_remote_access: order.consent_remote_access,
    remote_software_preference: order.remote_software_preference,
  });

  const [systemsData, setSystemsData] = useState<Record<number, Partial<AMCSystem>>>({});

  useEffect(() => {
    const initial: Record<number, Partial<AMCSystem>> = {};
    systems.forEach(sys => {
      initial[sys.id] = { ...sys };
    });
    setSystemsData(initial);
  }, [systems]);

  const handleOrderChange = (field: keyof AMCOrder, value: any) => {
    setOrderData(prev => ({ ...prev, [field]: value }));
  };

  const handleSystemChange = (systemId: number, field: keyof AMCSystem, value: any) => {
    setSystemsData(prev => ({
      ...prev,
      [systemId]: { ...prev[systemId], [field]: value }
    }));
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="customer">Customer</TabsTrigger>
          <TabsTrigger value="order">Order</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="systems">Systems ({systems.length})</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 mt-4">
          <TabsContent value="customer" className="mt-0 space-y-4 p-1">
            {/* Read-only info */}
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">AMC ID:</span> <span className="font-mono font-semibold">{formatAmcId(order.amc_number, order.amc_form_id)}</span></p>
              <p><span className="text-muted-foreground">Payment Status:</span> <span className="font-semibold">{order.payment_status || 'Pending'}</span></p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={orderData.full_name || ''}
                  onChange={(e) => handleOrderChange('full_name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={orderData.company_name || ''}
                  onChange={(e) => handleOrderChange('company_name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={orderData.email || ''}
                  onChange={(e) => handleOrderChange('email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={orderData.phone || ''}
                  onChange={(e) => handleOrderChange('phone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={orderData.city || ''}
                  onChange={(e) => handleOrderChange('city', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={orderData.district || ''}
                  onChange={(e) => handleOrderChange('district', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={orderData.state || ''}
                  onChange={(e) => handleOrderChange('state', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="user_role">User Role</Label>
                <Input
                  id="user_role"
                  value={orderData.user_role || ''}
                  onChange={(e) => handleOrderChange('user_role', e.target.value)}
                  placeholder="e.g. Business Owner, IT Admin..."
                />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={orderData.department || ''}
                  onChange={(e) => handleOrderChange('department', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="languages_known">Languages Known</Label>
                <Input
                  id="languages_known"
                  value={orderData.languages_known || ''}
                  onChange={(e) => handleOrderChange('languages_known', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="preferred_lang">Preferred Language</Label>
                <Select 
                  value={orderData.preferred_lang || 'english'} 
                  onValueChange={(v) => handleOrderChange('preferred_lang', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="tamil">Tamil</SelectItem>
                    <SelectItem value="hindi">Hindi</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Remote Access Consent</Label>
                  <p className="text-xs text-muted-foreground">Allow remote access for support</p>
                </div>
                <Switch
                  checked={orderData.consent_remote_access || false}
                  onCheckedChange={(checked) => handleOrderChange('consent_remote_access', checked)}
                />
              </div>
              <div>
                <Label htmlFor="remote_software_preference">Preferred Remote Software</Label>
                <Select 
                  value={orderData.remote_software_preference || 'none'} 
                  onValueChange={(v) => handleOrderChange('remote_software_preference', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="AnyDesk">AnyDesk</SelectItem>
                    <SelectItem value="TeamViewer">TeamViewer</SelectItem>
                    <SelectItem value="RustDesk">RustDesk</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => onSaveOrder(orderData)} disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Saving...' : 'Save Customer Info'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="order" className="mt-0 space-y-4 p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="urgency_level">Urgency Level</Label>
                <Select 
                  value={orderData.urgency_level || 'normal'} 
                  onValueChange={(v) => handleOrderChange('urgency_level', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="system_usage_purpose">System Usage Purpose</Label>
              <Textarea
                id="system_usage_purpose"
                value={orderData.system_usage_purpose || ''}
                onChange={(e) => handleOrderChange('system_usage_purpose', e.target.value)}
                rows={2}
                placeholder="How is the system used? (e.g., Accounting, business operations...)"
              />
            </div>

            <div>
              <Label htmlFor="problem_description">Problem Description</Label>
              <Textarea
                id="problem_description"
                value={orderData.problem_description || ''}
                onChange={(e) => handleOrderChange('problem_description', e.target.value)}
                rows={3}
                placeholder="Customer's reported problem..."
              />
            </div>

            <div>
              <Label htmlFor="service_work_description">Service Work Description (for Technician)</Label>
              <Textarea
                id="service_work_description"
                value={orderData.service_work_description || ''}
                onChange={(e) => handleOrderChange('service_work_description', e.target.value)}
                rows={3}
                placeholder="Instructions for the technician..."
              />
            </div>

            <Separator />

            <div>
              <Label htmlFor="internal_notes">Internal Notes (Admin/Support only)</Label>
              <Textarea
                id="internal_notes"
                value={orderData.internal_notes || ''}
                onChange={(e) => handleOrderChange('internal_notes', e.target.value)}
                rows={3}
                placeholder="Confidential notes..."
              />
            </div>

            <div>
              <Label htmlFor="notes">General Notes</Label>
              <Textarea
                id="notes"
                value={orderData.notes || ''}
                onChange={(e) => handleOrderChange('notes', e.target.value)}
                rows={3}
                placeholder="Any other relevant notes..."
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => onSaveOrder(orderData)} disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Saving...' : 'Save Order Details'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="mt-0 space-y-4 p-1">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4" />
                Appointment Scheduling
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduled_date">Scheduled Date</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={orderData.scheduled_date || ''}
                    onChange={(e) => handleOrderChange('scheduled_date', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="scheduled_time">Scheduled Time</Label>
                  <Input
                    id="scheduled_time"
                    type="time"
                    value={orderData.scheduled_time || ''}
                    onChange={(e) => handleOrderChange('scheduled_time', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="preferred_time_slot">Preferred Time Slot</Label>
                  <Select 
                    value={orderData.preferred_time_slot || 'Morning'} 
                    onValueChange={(v) => handleOrderChange('preferred_time_slot', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning">Morning (9 AM - 12 PM)</SelectItem>
                      <SelectItem value="Afternoon">Afternoon (12 PM - 5 PM)</SelectItem>
                      <SelectItem value="Evening">Evening (5 PM - 8 PM)</SelectItem>
                      <SelectItem value="Any">Any Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="appointment_status">Appointment Status</Label>
                  <Select 
                    value={orderData.appointment_status || 'scheduled'} 
                    onValueChange={(v) => handleOrderChange('appointment_status', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => onSaveOrder(orderData)} disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Saving...' : 'Save Schedule'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="systems" className="mt-0 space-y-4 p-1">
            {systems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No systems registered for this order.
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {systems.map((system, index) => (
                  <AccordionItem value={`system-${system.id}`} key={system.id}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-3">
                        {getSystemIcon(system.device_type)}
                        <span>{system.device_name || system.system_name || `System ${index + 1}`}</span>
                        <Badge variant="outline">{system.device_type}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 p-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Device Name</Label>
                            <Input
                              value={systemsData[system.id]?.device_name || ''}
                              onChange={(e) => handleSystemChange(system.id, 'device_name', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Device Type</Label>
                            <Select 
                              value={systemsData[system.id]?.device_type || 'desktop'} 
                              onValueChange={(v) => handleSystemChange(system.id, 'device_type', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="desktop">Desktop</SelectItem>
                                <SelectItem value="laptop">Laptop</SelectItem>
                                <SelectItem value="server">Server</SelectItem>
                                <SelectItem value="workstation">Workstation</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Brand</Label>
                            <Input
                              value={systemsData[system.id]?.brand || ''}
                              onChange={(e) => handleSystemChange(system.id, 'brand', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Model</Label>
                            <Input
                              value={systemsData[system.id]?.model || ''}
                              onChange={(e) => handleSystemChange(system.id, 'model', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Operating System</Label>
                            <Input
                              value={systemsData[system.id]?.operating_system || ''}
                              onChange={(e) => handleSystemChange(system.id, 'operating_system', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>System Type</Label>
                            <Select 
                              value={systemsData[system.id]?.system_type || 'personal'} 
                              onValueChange={(v) => handleSystemChange(system.id, 'system_type', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="personal">Personal</SelectItem>
                                <SelectItem value="business">Business</SelectItem>
                                <SelectItem value="server">Server</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Daily Usage (hours)</Label>
                            <Input
                              type="number"
                              value={systemsData[system.id]?.daily_usage_hours || ''}
                              onChange={(e) => handleSystemChange(system.id, 'daily_usage_hours', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Usage Pattern</Label>
                            <Select 
                              value={systemsData[system.id]?.usage_pattern || 'regular'} 
                              onValueChange={(v) => handleSystemChange(system.id, 'usage_pattern', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="regular">Regular</SelectItem>
                                <SelectItem value="heavy">Heavy</SelectItem>
                                <SelectItem value="24x7">24x7</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Current Performance</Label>
                            <Select 
                              value={systemsData[system.id]?.current_performance || 'good'} 
                              onValueChange={(v) => handleSystemChange(system.id, 'current_performance', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="excellent">Excellent</SelectItem>
                                <SelectItem value="good">Good</SelectItem>
                                <SelectItem value="average">Average</SelectItem>
                                <SelectItem value="poor">Poor</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>System Criticality</Label>
                            <Select 
                              value={systemsData[system.id]?.system_criticality || 'normal'} 
                              onValueChange={(v) => handleSystemChange(system.id, 'system_criticality', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="mission_critical">Mission Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Downtime Tolerance</Label>
                            <Select 
                              value={systemsData[system.id]?.downtime_tolerance || 'hours'} 
                              onValueChange={(v) => handleSystemChange(system.id, 'downtime_tolerance', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="minutes">Minutes</SelectItem>
                                <SelectItem value="hours">Hours</SelectItem>
                                <SelectItem value="days">Days</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Network Environment</Label>
                            <Select 
                              value={systemsData[system.id]?.network_environment || 'home'} 
                              onValueChange={(v) => handleSystemChange(system.id, 'network_environment', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="home">Home</SelectItem>
                                <SelectItem value="office">Office</SelectItem>
                                <SelectItem value="datacenter">Datacenter</SelectItem>
                                <SelectItem value="mixed">Mixed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Backup Frequency</Label>
                            <Select 
                              value={systemsData[system.id]?.backup_frequency || 'weekly'} 
                              onValueChange={(v) => handleSystemChange(system.id, 'backup_frequency', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <Label>Antivirus Installed</Label>
                            </div>
                            <Switch
                              checked={systemsData[system.id]?.antivirus_installed || false}
                              onCheckedChange={(checked) => handleSystemChange(system.id, 'antivirus_installed', checked)}
                            />
                          </div>
                          {systemsData[system.id]?.antivirus_installed && (
                            <div>
                              <Label>Antivirus Name</Label>
                              <Input
                                value={systemsData[system.id]?.antivirus_name || ''}
                                onChange={(e) => handleSystemChange(system.id, 'antivirus_name', e.target.value)}
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <Label>Power Backup (UPS)</Label>
                            </div>
                            <Switch
                              checked={systemsData[system.id]?.power_backup || false}
                              onCheckedChange={(checked) => handleSystemChange(system.id, 'power_backup', checked)}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button 
                            size="sm"
                            onClick={() => onSaveSystem(system.id, systemsData[system.id])} 
                            disabled={isSubmitting}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save System
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
