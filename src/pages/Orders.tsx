import React, { useState, useMemo } from 'react';
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
import { mockOrders, mockStaff } from '@/data/mockData';
import { AMCOrder, OrderStatus } from '@/types';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

const statusTabs: { value: string; label: string; count: number }[] = [
  { value: 'all', label: 'All', count: mockOrders.length },
  { value: 'new', label: 'New', count: mockOrders.filter(o => o.status === 'new').length },
  { value: 'pending', label: 'Pending', count: mockOrders.filter(o => o.status === 'pending').length },
  { value: 'in_progress', label: 'In Progress', count: mockOrders.filter(o => o.status === 'in_progress').length },
  { value: 'completed', label: 'Completed', count: mockOrders.filter(o => o.status === 'completed').length },
];

export default function Orders() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<AMCOrder | null>(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'support';
  const canAssign = user?.role === 'admin';

  const filteredOrders = useMemo(() => {
    let orders = mockOrders.filter(o => !o.unsubscribed);
    if (selectedTab !== 'all') {
      orders = orders.filter(o => o.status === selectedTab);
    }
    // Technicians only see their assigned orders
    if (user?.role === 'technician') {
      orders = orders.filter(o => o.assigned_to === user.id);
    }
    return orders;
  }, [selectedTab, user]);

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
        <StatusBadge variant={order.status as any}>
          {formatStatus(order.status)}
        </StatusBadge>
      ),
    },
    {
      key: 'assigned_to',
      header: 'Assigned To',
      cell: (order) => {
        const staff = mockStaff.find(s => s.id === order.assigned_to);
        return staff ? (
          <span className="text-sm text-foreground">{staff.name}</span>
        ) : (
          <span className="text-sm text-muted-foreground italic">Unassigned</span>
        );
      },
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
              <DropdownMenuItem className="text-destructive">
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
    setIsViewDrawerOpen(true);
  };

  const handleEdit = (order: AMCOrder) => {
    setSelectedOrder(order);
    setIsEditDrawerOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AMC Orders</h1>
          <p className="text-muted-foreground">Manage all annual maintenance contract orders</p>
        </div>
        {canEdit && (
          <Button className="gradient-primary text-white gap-2">
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        )}
      </div>

      {/* Tabs */}
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
            actions={
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            }
          />
        </TabsContent>
      </Tabs>

      {/* View Drawer */}
      <DrawerPanel
        open={isViewDrawerOpen}
        onClose={() => setIsViewDrawerOpen(false)}
        title="Order Details"
        subtitle={selectedOrder ? `AMC ID: ${selectedOrder.amc_form_id}` : ''}
        size="xl"
      >
        {selectedOrder && <OrderDetails order={selectedOrder} />}
      </DrawerPanel>

      {/* Edit Drawer */}
      <DrawerPanel
        open={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        title="Edit Order"
        subtitle={selectedOrder ? `AMC ID: ${selectedOrder.amc_form_id}` : ''}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditDrawerOpen(false)}>
              Cancel
            </Button>
            <Button className="gradient-primary text-white">
              Save Changes
            </Button>
          </div>
        }
      >
        {selectedOrder && <OrderEditForm order={selectedOrder} />}
      </DrawerPanel>
    </div>
  );
}

function OrderDetails({ order }: { order: AMCOrder }) {
  const assignedStaff = mockStaff.find(s => s.id === order.assigned_to);

  return (
    <div className="space-y-6">
      {/* Customer Info */}
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

      {/* Status & Assignment */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Status</p>
          <StatusBadge variant={order.status as any} size="lg">
            {formatStatus(order.status)}
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
          <p className="font-medium">{assignedStaff?.name || 'Unassigned'}</p>
        </div>
      </div>

      <Separator />

      {/* Usage Pattern */}
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

      {/* Systems */}
      {order.systems && order.systems.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Registered Systems
            </h4>
            <div className="space-y-3">
              {order.systems.map(system => (
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

      {/* Appointment */}
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

      {/* Problem Description */}
      {order.problem_description && (
        <>
          <Separator />
          <div>
            <h4 className="font-semibold text-foreground mb-2">Problem Description</h4>
            <p className="text-muted-foreground">{order.problem_description}</p>
          </div>
        </>
      )}

      {/* Notes */}
      {order.notes && (
        <div>
          <h4 className="font-semibold text-foreground mb-2">Internal Notes</h4>
          <p className="text-muted-foreground">{order.notes}</p>
        </div>
      )}
    </div>
  );
}

function OrderEditForm({ order }: { order: AMCOrder }) {
  const technicians = mockStaff.filter(s => s.role === 'technician' && s.active);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select defaultValue={order.status}>
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
          <Select defaultValue={order.urgency_level || ''}>
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
        <Select defaultValue={order.assigned_to || ''}>
          <SelectTrigger>
            <SelectValue placeholder="Select technician" />
          </SelectTrigger>
          <SelectContent>
            {technicians.map(tech => (
              <SelectItem key={tech.id} value={tech.id}>
                {tech.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Internal Notes</Label>
        <Textarea
          defaultValue={order.notes || ''}
          placeholder="Add internal notes about this order..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Service Work Description</Label>
        <Textarea
          defaultValue={order.service_work_description || ''}
          placeholder="Describe the work to be done..."
          rows={4}
        />
      </div>
    </div>
  );
}
