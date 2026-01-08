import React, { useState, useEffect, useMemo } from 'react';
import { 
  Eye, Mail, MessageSquare, MoreHorizontal, Phone, MapPin, CreditCard, Calendar, 
  AlertTriangle, Bell, RefreshCw, Clock, Building, Users, TrendingUp, Send, 
  FileText, History, CheckCircle, XCircle, ShoppingBag, Edit, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { DrawerPanel } from '@/components/ui/drawer-panel';
import { StatCard } from '@/components/ui/stat-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, differenceInDays, isAfter } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatAmcId } from '@/lib/utils';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Customer {
  id: string;
  user_id: string;
  name: string;
  company_name?: string;
  email: string;
  phone: string;
  location: string;
  status: 'active' | 'inactive' | 'expiring_soon';
  total_orders: number;
  total_spent: number;
  subscription_start_date?: string;
  subscription_end_date?: string;
  days_until_expiry?: number;
  last_contacted_at?: string;
  created_at: string;
}

interface CustomerOrder {
  amc_form_id: string;
  amc_number?: string;
  status: string;
  system_usage_purpose: string;
  created_at: string;
  amount?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  systems_count: number;
  // Customer details from amc_responses
  full_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
}

interface ActivityLog {
  id: number;
  activity_type: string;
  description: string;
  outcome?: string;
  created_at: string;
}

interface ReminderHistory {
  id: number;
  reminder_type: string;
  channel: string;
  subject?: string;
  message?: string;
  sent_at: string;
  status: string;
}

export default function CustomersPage() {
  const { user, session } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [reminderHistory, setReminderHistory] = useState<ReminderHistory[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    type: 'renewal',
    channel: 'email',
    subject: '',
    message: ''
  });
  const [activityForm, setActivityForm] = useState({
    type: 'call',
    description: '',
    outcome: ''
  });
  const [editForm, setEditForm] = useState({
    full_name: '',
    company_name: '',
    email: '',
    phone: '',
    city: '',
    state: ''
  });

  const isAdmin = user?.role === 'admin';
  const canSendReminders = user?.role === 'admin' || user?.role === 'support';

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      // Get all orders with subscription info - using select('*') for schema flexibility
      const { data: orders, error } = await supabase
        .from('amc_responses')
        .select('*')
        .not('customer_user_id', 'is', null) as any;

      if (error) throw error;

      // Group orders by customer - track if they have ANY active order
      const customerMap = new Map<string, Customer & { hasActiveOrder: boolean }>();
      
      (orders as any[])?.forEach((order: any) => {
        if (!order.customer_user_id) return;
        
        const existing = customerMap.get(order.customer_user_id);
        const orderAmount = parseFloat(order.amount || '0');
        const subEndDate = order.subscription_end_date ? new Date(order.subscription_end_date) : null;
        const daysUntilExpiry = subEndDate ? differenceInDays(subEndDate, new Date()) : null;
        
        // Check if THIS order is active
        // Active statuses: 'new', 'active', 'pending', 'in_progress' (legacy), 'completed' (legacy, if not unsubscribed)
        // Inactive statuses: 'inactive', 'cancelled', or any status with unsubscribed=true
        const activeStatuses = ['new', 'active', 'pending', 'in_progress'];
        const isActiveStatus = activeStatuses.includes(order.status) || 
          (order.status === 'completed' && !order.unsubscribed);
        
        const isOrderActive = (
          isActiveStatus && 
          !order.unsubscribed && 
          (!subEndDate || isAfter(subEndDate, new Date()))
        );
        
        // Determine order-level status
        let orderStatus: 'active' | 'inactive' | 'expiring_soon' = 'inactive';
        if (isOrderActive) {
          orderStatus = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0 
            ? 'expiring_soon' 
            : 'active';
        }
        
        if (existing) {
          existing.total_orders += 1;
          existing.total_spent += orderAmount;
          
          // Customer is active if they have AT LEAST ONE active order
          if (isOrderActive) {
            existing.hasActiveOrder = true;
          }
          
          // Track the best subscription end date for display
          if (subEndDate && isOrderActive) {
            if (!existing.subscription_end_date || isAfter(subEndDate, new Date(existing.subscription_end_date))) {
              existing.subscription_end_date = order.subscription_end_date;
              existing.subscription_start_date = order.subscription_start_date;
              existing.days_until_expiry = daysUntilExpiry ?? undefined;
            }
          }
          
          // Update status based on having any active order
          if (existing.hasActiveOrder) {
            existing.status = existing.days_until_expiry !== undefined && existing.days_until_expiry <= 30 && existing.days_until_expiry > 0
              ? 'expiring_soon'
              : 'active';
          }
          
          if (order.last_contacted_at) {
            existing.last_contacted_at = order.last_contacted_at;
          }
        } else {
          customerMap.set(order.customer_user_id, {
            id: order.customer_user_id,
            user_id: order.customer_user_id,
            name: order.full_name,
            company_name: order.company_name || undefined,
            email: order.email,
            phone: order.phone,
            location: `${order.city}, ${order.state}`,
            status: orderStatus,
            total_orders: 1,
            total_spent: orderAmount,
            subscription_start_date: isOrderActive ? order.subscription_start_date : undefined,
            subscription_end_date: isOrderActive ? order.subscription_end_date : undefined,
            days_until_expiry: isOrderActive ? (daysUntilExpiry ?? undefined) : undefined,
            last_contacted_at: order.last_contacted_at,
            created_at: order.created_at,
            hasActiveOrder: isOrderActive,
          });
        }
      });

      setCustomers(Array.from(customerMap.values()));
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('amc_responses')
        .select('*')
        .eq('customer_user_id', customerId)
        .order('created_at', { ascending: false }) as any;

      if (error) throw error;

      // Get system counts
      const formIds = (data as any[])?.map((o: any) => o.amc_form_id) || [];
      const { data: systems } = await supabase
        .from('amc_systems')
        .select('amc_form_id')
        .in('amc_form_id', formIds);

      const countMap = new Map<string, number>();
      systems?.forEach(s => {
        countMap.set(s.amc_form_id, (countMap.get(s.amc_form_id) || 0) + 1);
      });

      setCustomerOrders(((data as any[]) || []).map((o: any) => ({
        ...o,
        systems_count: countMap.get(o.amc_form_id) || 0
      })));
    } catch (error) {
      console.error('Error fetching customer orders:', error);
    }
  };

  const fetchActivityLogs = async (customerId: string) => {
    try {
      const { data, error } = await (supabase
        .from('customer_activity_log' as any)
        .select('*')
        .eq('customer_user_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20) as any);

      if (error) {
        console.log('Activity log table may not exist:', error);
        setActivityLogs([]);
        return;
      }

      setActivityLogs((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      setActivityLogs([]);
    }
  };

  const fetchReminderHistory = async (customerId: string) => {
    try {
      const { data, error } = await (supabase
        .from('customer_reminders' as any)
        .select('*')
        .eq('customer_user_id', customerId)
        .order('sent_at', { ascending: false })
        .limit(20) as any);

      if (error) {
        console.log('Reminders table may not exist:', error);
        setReminderHistory([]);
        return;
      }

      setReminderHistory((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching reminder history:', error);
      setReminderHistory([]);
    }
  };

  const handleSendReminder = async () => {
    if (!selectedCustomer || !session?.user?.id) return;

    try {
      setIsSending(true);

      const { error } = await (supabase
        .from('customer_reminders' as any)
        .insert({
          customer_user_id: selectedCustomer.user_id,
          reminder_type: reminderForm.type,
          channel: reminderForm.channel,
          subject: reminderForm.subject || `${formatStatus(reminderForm.type)} Reminder`,
          message: reminderForm.message,
          sent_by: session.user.id,
          status: 'sent'
        }) as any);

      if (error) throw error;

      // Update last contacted
      await (supabase
        .from('amc_responses')
        .update({ 
          last_contacted_at: new Date().toISOString(),
          renewal_reminder_sent: reminderForm.type === 'renewal',
          renewal_reminder_sent_at: reminderForm.type === 'renewal' ? new Date().toISOString() : undefined
        } as any)
        .eq('customer_user_id', selectedCustomer.user_id) as any);

      toast.success(`${formatStatus(reminderForm.channel)} reminder sent successfully!`);
      setIsReminderDialogOpen(false);
      setReminderForm({ type: 'renewal', channel: 'email', subject: '', message: '' });
      
      fetchReminderHistory(selectedCustomer.user_id);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      toast.error(error.message || 'Failed to send reminder');
    } finally {
      setIsSending(false);
    }
  };

  const handleLogActivity = async () => {
    if (!selectedCustomer || !session?.user?.id) return;

    try {
      setIsSending(true);

      const { error } = await (supabase
        .from('customer_activity_log' as any)
        .insert({
          customer_user_id: selectedCustomer.user_id,
          activity_type: activityForm.type,
          description: activityForm.description,
          outcome: activityForm.outcome,
          performed_by: session.user.id
        }) as any);

      if (error) throw error;

      // Update last contacted
      await (supabase
        .from('amc_responses')
        .update({ last_contacted_at: new Date().toISOString() } as any)
        .eq('customer_user_id', selectedCustomer.user_id) as any);

      toast.success('Activity logged successfully!');
      setIsActivityDialogOpen(false);
      setActivityForm({ type: 'call', description: '', outcome: '' });
      
      fetchActivityLogs(selectedCustomer.user_id);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error logging activity:', error);
      toast.error(error.message || 'Failed to log activity');
    } finally {
      setIsSending(false);
    }
  };

  const handleEditCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditDrawerOpen(true);
    
    // Fetch the latest order data directly to pre-fill the form
    try {
      const { data, error } = await supabase
        .from('amc_responses')
        .select('*')
        .eq('customer_user_id', customer.user_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const order = data[0] as any;
        setEditForm({
          full_name: order.full_name || customer.name,
          company_name: order.company_name || customer.company_name || '',
          email: order.email || customer.email,
          phone: order.phone || customer.phone,
          city: order.city || '',
          state: order.state || ''
        });
      } else {
        setEditForm({
          full_name: customer.name,
          company_name: customer.company_name || '',
          email: customer.email,
          phone: customer.phone,
          city: customer.location?.split(', ')[0] || '',
          state: customer.location?.split(', ')[1] || ''
        });
      }
    } catch (err) {
      // Fallback to customer data
      setEditForm({
        full_name: customer.name,
        company_name: customer.company_name || '',
        email: customer.email,
        phone: customer.phone,
        city: customer.location?.split(', ')[0] || '',
        state: customer.location?.split(', ')[1] || ''
      });
    }
  };

  const handleSaveCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      setIsSubmitting(true);

      // Update all orders for this customer with the new info
      const { error } = await supabase
        .from('amc_responses')
        .update({
          full_name: editForm.full_name,
          company_name: editForm.company_name,
          email: editForm.email,
          phone: editForm.phone,
          city: editForm.city,
          state: editForm.state,
          updated_at: new Date().toISOString()
        })
        .eq('customer_user_id', selectedCustomer.user_id);

      if (error) throw error;

      toast.success('Customer details updated successfully!');
      setIsEditDrawerOpen(false);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast.error(error.message || 'Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const active = customers.filter(c => c.status === 'active').length;
    const expiringSoon = customers.filter(c => c.status === 'expiring_soon').length;
    const inactive = customers.filter(c => c.status === 'inactive').length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
    return { active, expiringSoon, inactive, total: customers.length, totalRevenue };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    if (selectedTab === 'all') return customers;
    if (selectedTab === 'expiring') return customers.filter(c => c.status === 'expiring_soon');
    return customers.filter(c => c.status === selectedTab);
  }, [customers, selectedTab]);

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      cell: (customer) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {customer.name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-medium text-foreground">{customer.name || 'Unknown'}</p>
            <p className="text-sm text-muted-foreground">{customer.company_name || customer.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      cell: (customer) => (
        <span className="text-sm text-muted-foreground">{customer.location}</span>
      ),
    },
    {
      key: 'total_orders',
      header: 'Orders',
      cell: (customer) => (
        <span className="font-medium">{customer.total_orders}</span>
      ),
    },
    {
      key: 'total_spent',
      header: 'Total Spent',
      cell: (customer) => (
        <span className="font-medium">₹{customer.total_spent.toLocaleString()}</span>
      ),
    },
    {
      key: 'subscription_end_date',
      header: 'Subscription',
      cell: (customer) => {
        if (!customer.subscription_end_date) {
          return <span className="text-muted-foreground">No subscription</span>;
        }
        const daysLeft = customer.days_until_expiry ?? differenceInDays(new Date(customer.subscription_end_date), new Date());
        return (
          <div>
            <p className="text-sm">{format(new Date(customer.subscription_end_date), 'MMM dd, yyyy')}</p>
            <p className={`text-xs ${daysLeft <= 30 && daysLeft > 0 ? 'text-warning' : daysLeft <= 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
            </p>
          </div>
        );
      },
    },
    {
      key: 'last_contacted_at',
      header: 'Last Contact',
      cell: (customer) => customer.last_contacted_at 
        ? format(new Date(customer.last_contacted_at), 'MMM dd, yyyy') 
        : <span className="text-muted-foreground">Never</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (customer) => {
        const variant = customer.status === 'expiring_soon' ? 'warning' : customer.status as any;
        const label = customer.status === 'expiring_soon' ? 'Expiring Soon' : formatStatus(customer.status);
        return (
          <StatusBadge variant={variant}>
            {label}
          </StatusBadge>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      cell: (customer) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(customer)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Customer
              </DropdownMenuItem>
            )}
            {canSendReminders && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleOpenReminder(customer)}>
                  <Bell className="h-4 w-4 mr-2" />
                  Send Reminder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenActivity(customer)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Log Activity
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-12',
    },
  ];

  const handleView = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchCustomerOrders(customer.user_id);
    fetchActivityLogs(customer.user_id);
    fetchReminderHistory(customer.user_id);
    setIsDrawerOpen(true);
  };

  const handleOpenReminder = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsReminderDialogOpen(true);
  };

  const handleOpenActivity = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsActivityDialogOpen(true);
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
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground">Manage customer accounts and subscriptions</p>
        </div>
        <Button variant="outline" onClick={fetchCustomers} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Customers"
          value={stats.total}
          icon={Users}
          subtitle="All registered customers"
        />
        <StatCard
          title="Active"
          value={stats.active}
          icon={CheckCircle}
          subtitle="Valid subscriptions"
          className="border-l-4 border-l-success"
        />
        <StatCard
          title="Expiring Soon"
          value={stats.expiringSoon}
          icon={AlertTriangle}
          subtitle="Within 30 days"
          className="border-l-4 border-l-warning"
        />
        <StatCard
          title="Inactive"
          value={stats.inactive}
          icon={XCircle}
          subtitle="Expired or no subscription"
          className="border-l-4 border-l-destructive"
        />
        <StatCard
          title="Total Revenue"
          value={`₹${(stats.totalRevenue / 1000).toFixed(1)}K`}
          icon={TrendingUp}
          subtitle="From all customers"
          className="border-l-4 border-l-primary"
        />
      </div>

      {/* Expiring Alert */}
      {stats.expiringSoon > 0 && (
        <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <p className="text-sm flex-1">
            <span className="font-semibold">{stats.expiringSoon} customer(s)</span> have subscriptions expiring within 30 days. 
            Consider sending renewal reminders.
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedTab('expiring')}
          >
            View Expiring
          </Button>
        </div>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="all" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            All ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Active ({stats.active})
          </TabsTrigger>
          <TabsTrigger value="expiring" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Expiring ({stats.expiringSoon})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Inactive ({stats.inactive})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          <DataTable
            data={filteredCustomers}
            columns={columns}
            searchable
            searchKey="name"
            searchPlaceholder="Search customers..."
            onRowClick={handleView}
            emptyMessage="No customers found"
          />
        </TabsContent>
      </Tabs>

      <DrawerPanel
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Customer Details"
        subtitle={selectedCustomer?.email}
        size="xl"
      >
        {selectedCustomer && (
          <CustomerDetails 
            customer={selectedCustomer} 
            orders={customerOrders}
            activityLogs={activityLogs}
            reminderHistory={reminderHistory}
            canSendReminders={canSendReminders}
            onSendReminder={() => {
              setIsReminderDialogOpen(true);
            }}
            onLogActivity={() => {
              setIsActivityDialogOpen(true);
            }}
          />
        )}
      </DrawerPanel>

      {/* Reminder Dialog */}
      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Reminder</DialogTitle>
            <DialogDescription>
              Send a reminder to {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reminder Type</Label>
              <Select value={reminderForm.type} onValueChange={(v) => setReminderForm({ ...reminderForm, type: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="renewal">Renewal Reminder</SelectItem>
                  <SelectItem value="payment">Payment Reminder</SelectItem>
                  <SelectItem value="general">General Message</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={reminderForm.channel} onValueChange={(v) => setReminderForm({ ...reminderForm, channel: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject (optional)</Label>
              <Input 
                value={reminderForm.subject}
                onChange={(e) => setReminderForm({ ...reminderForm, subject: e.target.value })}
                placeholder="Reminder subject..."
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea 
                value={reminderForm.message}
                onChange={(e) => setReminderForm({ ...reminderForm, message: e.target.value })}
                placeholder="Enter your message..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendReminder} disabled={isSending || !reminderForm.message}>
              {isSending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Log Dialog */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
            <DialogDescription>
              Record an activity for {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Activity Type</Label>
              <Select value={activityForm.type} onValueChange={(v) => setActivityForm({ ...activityForm, type: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">General Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={activityForm.description}
                onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                placeholder="What happened..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Outcome (optional)</Label>
              <Input 
                value={activityForm.outcome}
                onChange={(e) => setActivityForm({ ...activityForm, outcome: e.target.value })}
                placeholder="Result or next steps..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActivityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogActivity} disabled={isSending || !activityForm.description}>
              {isSending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Save Activity
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Drawer */}
      <DrawerPanel
        open={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        title="Edit Customer"
        subtitle={selectedCustomer?.name || ''}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditDrawerOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomer} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_full_name">Full Name *</Label>
              <Input
                id="edit_full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit_company_name">Company Name</Label>
              <Input
                id="edit_company_name"
                value={editForm.company_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, company_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit_email">Email *</Label>
              <Input
                id="edit_email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit_phone">Phone *</Label>
              <Input
                id="edit_phone"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit_city">City</Label>
              <Input
                id="edit_city"
                value={editForm.city}
                onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit_state">State</Label>
              <Input
                id="edit_state"
                value={editForm.state}
                onChange={(e) => setEditForm(prev => ({ ...prev, state: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            * Updating customer details will apply to all their AMC orders.
          </p>
        </div>
      </DrawerPanel>
    </div>
  );
}

function CustomerDetails({ 
  customer, 
  orders,
  activityLogs,
  reminderHistory,
  canSendReminders,
  onSendReminder,
  onLogActivity
}: { 
  customer: Customer; 
  orders: CustomerOrder[];
  activityLogs: ActivityLog[];
  reminderHistory: ReminderHistory[];
  canSendReminders: boolean;
  onSendReminder: () => void;
  onLogActivity: () => void;
}) {
  const [detailTab, setDetailTab] = useState<'orders' | 'activity' | 'reminders'>('orders');

  return (
    <div className="space-y-6">
      {/* Customer Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl">
          {customer.name?.charAt(0) || '?'}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-foreground">{customer.name || 'Unknown'}</h3>
          {customer.company_name && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-4 w-4" />
              {customer.company_name}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge variant={customer.status === 'expiring_soon' ? 'warning' : customer.status as any}>
              {customer.status === 'expiring_soon' ? 'Expiring Soon' : formatStatus(customer.status)}
            </StatusBadge>
            {customer.days_until_expiry !== undefined && customer.days_until_expiry > 0 && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {customer.days_until_expiry} days left
              </Badge>
            )}
          </div>
        </div>
        {canSendReminders && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onLogActivity}>
              <FileText className="h-4 w-4 mr-1" />
              Log Activity
            </Button>
            <Button size="sm" onClick={onSendReminder}>
              <Bell className="h-4 w-4 mr-1" />
              Send Reminder
            </Button>
          </div>
        )}
      </div>

      {/* Contact Info Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{customer.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Phone className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">{customer.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="font-medium">{customer.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="font-medium">₹{customer.total_spent.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Subscription Info */}
      {customer.subscription_end_date && (
        <div className={`rounded-lg border p-4 ${customer.status === 'expiring_soon' ? 'bg-warning/10 border-warning/30' : 'bg-info/5'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className={`h-5 w-5 ${customer.status === 'expiring_soon' ? 'text-warning' : 'text-info'}`} />
              <div>
                <p className="font-medium">Subscription Period</p>
                <p className="text-sm text-muted-foreground">
                  {customer.subscription_start_date && format(new Date(customer.subscription_start_date), 'MMM dd, yyyy')} - {format(new Date(customer.subscription_end_date), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
            {customer.last_contacted_at && (
              <div className="text-right text-sm">
                <p className="text-muted-foreground">Last Contacted</p>
                <p className="font-medium">{format(new Date(customer.last_contacted_at), 'MMM dd, yyyy')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Separator />

      {/* Tabs for Orders/Activity/Reminders */}
      <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
          <TabsTrigger value="orders" className="data-[state=active]:bg-background">
            Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-background">
            Activity ({activityLogs.length})
          </TabsTrigger>
          <TabsTrigger value="reminders" className="data-[state=active]:bg-background">
            Reminders ({reminderHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          {orders.length > 0 ? (
            <ScrollArea className="h-[300px] pr-3">
              <div className="space-y-3">
                {orders.map(order => (
                  <div
                    key={order.amc_form_id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{formatAmcId(order.amc_number, order.amc_form_id)}</p>
                        {order.systems_count > 0 && (
                          <Badge variant="secondary" className="text-xs">{order.systems_count} systems</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{order.system_usage_purpose}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(order.created_at), 'MMM dd, yyyy')}
                        {order.subscription_end_date && ` • Valid until ${format(new Date(order.subscription_end_date), 'MMM dd, yyyy')}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge variant={(order.status || 'new') as any}>
                        {formatStatus(order.status || 'new')}
                      </StatusBadge>
                      {order.amount && (
                        <p className="text-sm font-medium mt-1">₹{order.amount}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No orders found</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          {activityLogs.length > 0 ? (
            <ScrollArea className="h-[300px] pr-3">
              <div className="space-y-3">
                {activityLogs.map(log => (
                  <div key={log.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{formatStatus(log.activity_type)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm">{log.description}</p>
                    {log.outcome && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">Outcome:</span> {log.outcome}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No activity logged yet</p>
              {canSendReminders && (
                <Button variant="outline" size="sm" className="mt-2" onClick={onLogActivity}>
                  Log First Activity
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reminders" className="mt-4">
          {reminderHistory.length > 0 ? (
            <ScrollArea className="h-[300px] pr-3">
              <div className="space-y-3">
                {reminderHistory.map(reminder => (
                  <div key={reminder.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={reminder.channel === 'email' ? 'default' : 'secondary'}>
                          {reminder.channel}
                        </Badge>
                        <Badge variant="outline">{formatStatus(reminder.reminder_type)}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(reminder.sent_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    {reminder.subject && (
                      <p className="font-medium text-sm">{reminder.subject}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{reminder.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <StatusBadge variant={reminder.status === 'sent' ? 'completed' : 'inactive'}>
                        {formatStatus(reminder.status)}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No reminders sent yet</p>
              {canSendReminders && (
                <Button variant="outline" size="sm" className="mt-2" onClick={onSendReminder}>
                  Send First Reminder
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
