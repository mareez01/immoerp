import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Filter, Eye, Edit, UserMinus, MoreHorizontal, Phone, Mail, MapPin, Clock, Monitor, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { DrawerPanel } from '@/components/ui/drawer-panel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AMCOrder {
  amc_form_id: string;
  full_name: string;
  company_name?: string;
  email: string;
  phone: string;
  city: string;
  district: string;
  state: string;
  problem_description?: string;
  consent_remote_access?: boolean;
  payment_status?: string;
  created_at: string;
  updated_at: string;
  user_role: string;
  system_usage_purpose: string;
  urgency_level?: string;
  remote_software_preference: string;
  languages_known: string;
  preferred_lang: string;
  amount?: string;
  status?: string;
  amc_started?: boolean;
  assigned_to?: string;
  unsubscribed?: boolean;
  daily_usage_hours?: string;
  usage_pattern?: string;
  current_performance?: string;
  system_criticality?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  appointment_status?: string;
  notes?: string;
  service_work_description?: string;
  assigned_to_name?: string;
}

interface AMCSystem {
  id: number;
  amc_form_id: string;
  device_name?: string;
  operating_system?: string;
  device_type: string;
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
  const [isLoading, setIsLoading] = useState(true);

  const canEdit = user?.role === 'admin' || user?.role === 'support';
  const canAssign = user?.role === 'admin';

  useEffect(() => {
    fetchOrders();
    fetchStaff();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('amc_responses')
        .select('*')
        .eq('unsubscribed', false)
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

  const handleUpdateOrder = async (orderId: string, updates: Partial<AMCOrder>) => {
    try {
      const { error } = await supabase
        .from('amc_responses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('amc_form_id', orderId);

      if (error) throw error;

      toast.success('Order updated successfully');
      fetchOrders();
      setIsEditDrawerOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update order');
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach(o => {
      const status = o.status || 'new';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (selectedTab !== 'all') {
      filtered = filtered.filter(o => (o.status || 'new') === selectedTab);
    }
    return filtered;
  }, [orders, selectedTab]);

  const statusTabs = [
    { value: 'all', label: 'All', count: statusCounts.all || 0 },
    { value: 'new', label: 'New', count: statusCounts.new || 0 },
    { value: 'pending', label: 'Pending', count: statusCounts.pending || 0 },
    { value: 'in_progress', label: 'In Progress', count: statusCounts.in_progress || 0 },
    { value: 'completed', label: 'Completed', count: statusCounts.completed || 0 },
  ];

  const columns: Column<AMCOrder>[] = [
    {
      key: 'full_name',
      header: 'Customer',
      cell: (order) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {order.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-foreground">{order.full_name}</p>
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
      cell: (order) => (
        <StatusBadge variant={(order.status || 'new') as any}>
          {formatStatus(order.status || 'new')}
        </StatusBadge>
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
            <DropdownMenuItem onClick={() => handleView(order)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={() => handleEdit(order)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Order
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {canEdit && (
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => handleUpdateOrder(order.amc_form_id, { unsubscribed: true })}
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Unsubscribe
              </DropdownMenuItem>
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
    setIsEditDrawerOpen(true);
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
        subtitle={selectedOrder ? `AMC ID: ${selectedOrder.amc_form_id.slice(0, 8)}...` : ''}
        size="xl"
      >
        {selectedOrder && (
          <OrderDetails 
            order={selectedOrder} 
            systems={systems[selectedOrder.amc_form_id] || []}
          />
        )}
      </DrawerPanel>

      <DrawerPanel
        open={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        title="Edit Order"
        subtitle={selectedOrder ? `AMC ID: ${selectedOrder.amc_form_id.slice(0, 8)}...` : ''}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditDrawerOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="gradient-primary text-white"
              onClick={() => {
                if (selectedOrder) {
                  const form = document.getElementById('edit-form') as HTMLFormElement;
                  const formData = new FormData(form);
                  handleUpdateOrder(selectedOrder.amc_form_id, {
                    status: formData.get('status') as string,
                    urgency_level: formData.get('urgency_level') as string,
                    assigned_to: formData.get('assigned_to') as string || null,
                    notes: formData.get('notes') as string,
                    service_work_description: formData.get('service_work_description') as string,
                  });
                }
              }}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        {selectedOrder && (
          <OrderEditForm 
            order={selectedOrder} 
            technicians={staffList}
          />
        )}
      </DrawerPanel>
    </div>
  );
}

function OrderDetails({ order, systems }: { order: AMCOrder; systems: AMCSystem[] }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4">
        <h4 className="font-semibold text-foreground mb-4">Customer Information</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
              {order.full_name.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-foreground">{order.full_name}</p>
              {order.company_name && (
                <p className="text-sm text-muted-foreground">{order.company_name}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{order.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{order.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{order.city}, {order.district}, {order.state}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Status</p>
          <StatusBadge variant={(order.status || 'new') as any} size="lg">
            {formatStatus(order.status || 'new')}
          </StatusBadge>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Urgency</p>
          {order.urgency_level ? (
            <StatusBadge variant={order.urgency_level as any} size="lg">
              {formatStatus(order.urgency_level)}
            </StatusBadge>
          ) : (
            <span className="text-muted-foreground">Not set</span>
          )}
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Assigned To</p>
          <p className="font-medium">{order.assigned_to_name || 'Unassigned'}</p>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Usage Pattern
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">Daily Usage</p>
            <p className="font-medium">{order.daily_usage_hours || 'N/A'} hours</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">Usage Pattern</p>
            <p className="font-medium">{order.usage_pattern || 'N/A'}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">System Purpose</p>
            <p className="font-medium">{order.system_usage_purpose}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">System Criticality</p>
            <p className="font-medium capitalize">{order.system_criticality?.replace('_', ' ') || 'N/A'}</p>
          </div>
        </div>
      </div>

      {systems.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Registered Systems
            </h4>
            <div className="space-y-3">
              {systems.map(system => (
                <div key={system.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{system.device_name || 'Unknown Device'}</p>
                    <p className="text-sm text-muted-foreground">{system.operating_system}</p>
                  </div>
                  <StatusBadge variant="default" dot={false}>
                    {system.device_type}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {order.scheduled_date && (
        <>
          <Separator />
          <div>
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Appointment
            </h4>
            <div className="rounded-lg border p-4 bg-info/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {format(new Date(order.scheduled_date), 'EEEE, MMMM dd, yyyy')}
                  </p>
                  {order.scheduled_time && (
                    <p className="text-sm text-muted-foreground">at {order.scheduled_time}</p>
                  )}
                </div>
                {order.appointment_status && (
                  <StatusBadge variant={order.appointment_status as any}>
                    {formatStatus(order.appointment_status)}
                  </StatusBadge>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {order.problem_description && (
        <>
          <Separator />
          <div>
            <h4 className="font-semibold text-foreground mb-2">Problem Description</h4>
            <p className="text-muted-foreground">{order.problem_description}</p>
          </div>
        </>
      )}

      {order.notes && (
        <div>
          <h4 className="font-semibold text-foreground mb-2">Internal Notes</h4>
          <p className="text-muted-foreground">{order.notes}</p>
        </div>
      )}
    </div>
  );
}

function OrderEditForm({ order, technicians }: { order: AMCOrder; technicians: StaffMember[] }) {
  return (
    <form id="edit-form" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select name="status" defaultValue={order.status || 'new'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Urgency Level</Label>
          <Select name="urgency_level" defaultValue={order.urgency_level || ''}>
            <SelectTrigger>
              <SelectValue placeholder="Select urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Assign Technician</Label>
        <Select name="assigned_to" defaultValue={order.assigned_to || ''}>
          <SelectTrigger>
            <SelectValue placeholder="Select technician" />
          </SelectTrigger>
          <SelectContent>
            {technicians.map(tech => (
              <SelectItem key={tech.id} value={tech.id}>
                {tech.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Internal Notes</Label>
        <Textarea
          name="notes"
          defaultValue={order.notes || ''}
          placeholder="Add internal notes about this order..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Service Work Description</Label>
        <Textarea
          name="service_work_description"
          defaultValue={order.service_work_description || ''}
          placeholder="Describe the work to be done..."
          rows={4}
        />
      </div>
    </form>
  );
}
