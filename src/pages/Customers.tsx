import React, { useState, useEffect } from 'react';
import { Filter, Eye, Mail, MessageSquare, MoreHorizontal, Phone, MapPin, CreditCard, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, differenceInDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  id: string;
  user_id: string;
  name: string;
  company_name?: string;
  email: string;
  phone: string;
  location: string;
  status: string;
  total_orders: number;
  total_spent: number;
  subscription_valid_until?: string;
  created_at: string;
}

interface CustomerOrder {
  amc_form_id: string;
  status: string;
  system_usage_purpose: string;
  created_at: string;
  amount?: string;
}

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const canSendReminders = user?.role === 'admin' || user?.role === 'support';

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      // Get all unique customers from amc_responses
      const { data: orders, error } = await supabase
        .from('amc_responses')
        .select('customer_user_id, full_name, company_name, email, phone, city, state, created_at, amount, status')
        .not('customer_user_id', 'is', null);

      if (error) throw error;

      // Fetch invoices for subscription info
      const { data: invoices } = await supabase
        .from('invoices')
        .select('amc_order_id, validity_end, status, amount');

      // Group orders by customer
      const customerMap = new Map<string, Customer>();
      
      orders?.forEach(order => {
        if (!order.customer_user_id) return;
        
        const existing = customerMap.get(order.customer_user_id);
        const orderAmount = parseFloat(order.amount || '0');
        
        if (existing) {
          existing.total_orders += 1;
          existing.total_spent += orderAmount;
        } else {
          customerMap.set(order.customer_user_id, {
            id: order.customer_user_id,
            user_id: order.customer_user_id,
            name: order.full_name,
            company_name: order.company_name || undefined,
            email: order.email,
            phone: order.phone,
            location: `${order.city}, ${order.state}`,
            status: 'active',
            total_orders: 1,
            total_spent: orderAmount,
            created_at: order.created_at,
          });
        }
      });

      // Add subscription info from invoices
      invoices?.forEach(inv => {
        if (inv.status === 'paid' && inv.validity_end) {
          // Find customer by order
          const order = orders?.find(o => o.customer_user_id);
          if (order && customerMap.has(order.customer_user_id)) {
            const customer = customerMap.get(order.customer_user_id)!;
            if (!customer.subscription_valid_until || new Date(inv.validity_end) > new Date(customer.subscription_valid_until)) {
              customer.subscription_valid_until = inv.validity_end;
            }
          }
        }
      });

      // Determine status based on subscription
      customerMap.forEach(customer => {
        if (customer.subscription_valid_until) {
          customer.status = new Date(customer.subscription_valid_until) > new Date() ? 'active' : 'inactive';
        } else {
          customer.status = 'inactive';
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
        .select('amc_form_id, status, system_usage_purpose, created_at, amount')
        .eq('customer_user_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomerOrders(data || []);
    } catch (error) {
      console.error('Error fetching customer orders:', error);
    }
  };

  const filteredCustomers = selectedTab === 'all'
    ? customers
    : customers.filter(c => c.status === selectedTab);

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      cell: (customer) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {customer.name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-foreground">{customer.name}</p>
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
      key: 'subscription_valid_until',
      header: 'Subscription',
      cell: (customer) => {
        if (!customer.subscription_valid_until) {
          return <span className="text-muted-foreground">No subscription</span>;
        }
        const daysLeft = differenceInDays(new Date(customer.subscription_valid_until), new Date());
        return (
          <div>
            <p className="text-sm">{format(new Date(customer.subscription_valid_until), 'MMM dd, yyyy')}</p>
            <p className={`text-xs ${daysLeft < 30 ? 'text-warning' : 'text-muted-foreground'}`}>
              {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
            </p>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      cell: (customer) => (
        <StatusBadge variant={customer.status as any}>
          {formatStatus(customer.status)}
        </StatusBadge>
      ),
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
            {canSendReminders && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSendReminder(customer, 'email')}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email Reminder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSendReminder(customer, 'sms')}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send SMS Reminder
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
    setIsDrawerOpen(true);
  };

  const handleSendReminder = (customer: Customer, type: 'email' | 'sms') => {
    toast.success(`${type === 'email' ? 'Email' : 'SMS'} reminder sent to ${customer.name}`);
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
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="bg-muted/50 p-1">
          {statusTabs.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {tab.label}
            </TabsTrigger>
          ))}
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
            canSendReminders={canSendReminders} 
          />
        )}
      </DrawerPanel>
    </div>
  );
}

function CustomerDetails({ 
  customer, 
  orders,
  canSendReminders 
}: { 
  customer: Customer; 
  orders: CustomerOrder[];
  canSendReminders: boolean;
}) {
  const handleSendReminder = (type: 'invoice' | 'subscription') => {
    toast.success(`${type === 'invoice' ? 'Invoice' : 'Subscription'} reminder sent!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl">
          {customer.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-foreground">{customer.name}</h3>
          {customer.company_name && (
            <p className="text-muted-foreground">{customer.company_name}</p>
          )}
          <StatusBadge variant={customer.status as any} className="mt-2">
            {formatStatus(customer.status)}
          </StatusBadge>
        </div>
      </div>

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

      {customer.subscription_valid_until && (
        <div className="rounded-lg border p-4 bg-info/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-info" />
              <div>
                <p className="font-medium">Subscription Valid Until</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(customer.subscription_valid_until), 'MMMM dd, yyyy')}
                </p>
              </div>
            </div>
            {canSendReminders && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendReminder('subscription')}
              >
                Send Reminder
              </Button>
            )}
          </div>
        </div>
      )}

      <Separator />

      <div>
        <h4 className="font-semibold text-foreground mb-4">Order History ({orders.length})</h4>
        {orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map(order => (
              <div
                key={order.amc_form_id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors"
              >
                <div>
                  <p className="font-medium">{order.system_usage_purpose}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), 'MMM dd, yyyy')}
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
        ) : (
          <p className="text-muted-foreground">No orders found</p>
        )}
      </div>

      {canSendReminders && (
        <>
          <Separator />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => handleSendReminder('invoice')}>
              <Mail className="h-4 w-4" />
              Send Invoice Reminder
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={() => handleSendReminder('subscription')}>
              <MessageSquare className="h-4 w-4" />
              Send SMS
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
