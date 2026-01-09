import React, { useState, useEffect } from 'react';
import { Plus, Download, Eye, MoreHorizontal, Send, FileText, Edit, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { DrawerPanel } from '@/components/ui/drawer-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface InvoiceWithCustomer {
  id: string;
  amc_order_id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  validity_start: string | null;
  validity_end: string | null;
  invoice_url: string | null;
  contract_url: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  customer_name?: string;
  customer_email?: string;
}

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

const statusOptions = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceWithCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithCustomer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    amount: 0,
    status: '',
    due_date: '',
    validity_start: '',
    validity_end: '',
  });

  const canEdit = user?.role === 'admin' || user?.role === 'bookkeeping';

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          amc_responses!inner (
            full_name,
            email,
            customer_user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const invoicesWithCustomer = data?.map(inv => ({
        id: inv.id,
        amc_order_id: inv.amc_order_id,
        invoice_number: inv.invoice_number,
        amount: inv.amount,
        status: inv.status,
        due_date: inv.due_date,
        validity_start: inv.validity_start,
        validity_end: inv.validity_end,
        invoice_url: inv.invoice_url,
        contract_url: inv.contract_url,
        created_at: inv.created_at,
        updated_at: inv.updated_at,
        paid_at: inv.paid_at,
        customer_name: inv.amc_responses?.full_name || 'Unknown',
        customer_email: inv.amc_responses?.email || '',
      })) || [];

      setInvoices(invoicesWithCustomer);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateInvoice = async () => {
    if (!selectedInvoice) return;

    try {
      const updates: any = {
        amount: editForm.amount,
        status: editForm.status,
        due_date: editForm.due_date,
        validity_start: editForm.validity_start || null,
        validity_end: editForm.validity_end || null,
        updated_at: new Date().toISOString(),
      };

      if (editForm.status === 'paid' && !selectedInvoice.paid_at) {
        updates.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', selectedInvoice.id);

      if (error) throw error;

      toast.success('Invoice updated successfully');
      setIsEditMode(false);
      fetchInvoices();
      setSelectedInvoice({ ...selectedInvoice, ...updates });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update invoice');
    }
  };

  const handleResendInvoice = async (invoice: InvoiceWithCustomer) => {
    try {
      const { error } = await supabase.functions.invoke('generate-invoice-contract', {
        body: { amc_form_id: invoice.amc_order_id },
      });

      if (error) throw error;
      toast.success(`Invoice ${invoice.invoice_number} resent to ${invoice.customer_email}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend invoice');
    }
  };

  const filteredInvoices = selectedTab === 'all'
    ? invoices
    : invoices.filter(i => i.status === selectedTab);

  const columns: Column<InvoiceWithCustomer>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      cell: (invoice) => (
        <span className="font-mono font-medium text-foreground">{invoice.invoice_number}</span>
      ),
    },
    {
      key: 'customer_name',
      header: 'Customer',
      cell: (invoice) => (
        <div>
          <span className="font-medium text-foreground">{invoice.customer_name}</span>
          <p className="text-sm text-muted-foreground">{invoice.customer_email}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (invoice) => (
        <span className="font-semibold text-foreground">₹{invoice.amount.toLocaleString()}</span>
      ),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      cell: (invoice) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
        </span>
      ),
    },
    {
      key: 'validity',
      header: 'Validity',
      cell: (invoice) => invoice.validity_start && invoice.validity_end ? (
        <div className="text-sm">
          <p>{format(new Date(invoice.validity_start), 'MMM dd, yyyy')}</p>
          <p className="text-muted-foreground">to {format(new Date(invoice.validity_end), 'MMM dd, yyyy')}</p>
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (invoice) => (
        <StatusBadge variant={invoice.status as any}>
          {formatStatus(invoice.status)}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (invoice) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(invoice)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={() => handleEditClick(invoice)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Invoice
              </DropdownMenuItem>
            )}
            {invoice.invoice_url && (
              <DropdownMenuItem onClick={() => window.open(invoice.invoice_url!, '_blank')}>
                <Download className="h-4 w-4 mr-2" />
                Download Invoice
              </DropdownMenuItem>
            )}
            {invoice.contract_url && (
              <DropdownMenuItem onClick={() => window.open(invoice.contract_url!, '_blank')}>
                <FileText className="h-4 w-4 mr-2" />
                Download Contract
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleResendInvoice(invoice)}>
              <Send className="h-4 w-4 mr-2" />
              Resend to Customer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-12',
    },
  ];

  const handleView = (invoice: InvoiceWithCustomer) => {
    setSelectedInvoice(invoice);
    setIsEditMode(false);
    setIsDrawerOpen(true);
  };

  const handleEditClick = (invoice: InvoiceWithCustomer) => {
    setSelectedInvoice(invoice);
    setEditForm({
      amount: invoice.amount,
      status: invoice.status,
      due_date: invoice.due_date,
      validity_start: invoice.validity_start || '',
      validity_end: invoice.validity_end || '',
    });
    setIsEditMode(true);
    setIsDrawerOpen(true);
  };

  // Calculate totals
  const totalAmount = invoices.reduce((sum, i) => sum + i.amount, 0);
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const pendingAmount = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((sum, i) => sum + i.amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">Manage customer invoices and contracts</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Total Invoiced</p>
          <p className="text-2xl font-bold text-foreground mt-1">₹{totalAmount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Collected</p>
          <p className="text-2xl font-bold text-success mt-1">₹{paidAmount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-warning mt-1">₹{pendingAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
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
            data={filteredInvoices}
            columns={columns}
            searchable
            searchKey="customer_name"
            searchPlaceholder="Search by customer..."
            onRowClick={handleView}
            emptyMessage="No invoices found"
          />
        </TabsContent>
      </Tabs>

      {/* Invoice Details / Edit Drawer */}
      <DrawerPanel
        open={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setIsEditMode(false);
        }}
        title={isEditMode ? 'Edit Invoice' : 'Invoice Details'}
        subtitle={selectedInvoice?.invoice_number}
        size="lg"
        footer={
          isEditMode ? (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditMode(false)}>
                Cancel
              </Button>
              <Button className="flex-1 gradient-primary text-white" onClick={handleUpdateInvoice}>
                Save Changes
              </Button>
            </div>
          ) : selectedInvoice?.invoice_url ? (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(selectedInvoice.invoice_url!, '_blank')}>
                <Download className="h-4 w-4" />
                Download Invoice
              </Button>
              {selectedInvoice.contract_url && (
                <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(selectedInvoice.contract_url!, '_blank')}>
                  <FileText className="h-4 w-4" />
                  Download Contract
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {selectedInvoice && (
          isEditMode ? (
            <EditInvoiceForm
              form={editForm}
              onChange={setEditForm}
            />
          ) : (
            <InvoiceDetails invoice={selectedInvoice} onEdit={() => handleEditClick(selectedInvoice)} canEdit={canEdit} />
          )
        )}
      </DrawerPanel>
    </div>
  );
}

function EditInvoiceForm({
  form,
  onChange,
}: {
  form: { amount: number; status: string; due_date: string; validity_start: string; validity_end: string };
  onChange: (form: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Amount (₹)</label>
        <Input
          type="number"
          value={form.amount}
          onChange={(e) => onChange({ ...form, amount: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Status</label>
        <Select value={form.status} onValueChange={(value) => onChange({ ...form, status: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(status => (
              <SelectItem key={status} value={status}>
                {formatStatus(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Due Date</label>
        <Input
          type="date"
          value={form.due_date}
          onChange={(e) => onChange({ ...form, due_date: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium mb-2 block">Validity Start</label>
          <Input
            type="date"
            value={form.validity_start}
            onChange={(e) => onChange({ ...form, validity_start: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Validity End</label>
          <Input
            type="date"
            value={form.validity_end}
            onChange={(e) => onChange({ ...form, validity_end: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

function InvoiceDetails({ invoice, onEdit, canEdit }: { invoice: InvoiceWithCustomer; onEdit: () => void; canEdit: boolean }) {
  return (
    <div className="space-y-6">
      {/* Invoice Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Invoice Number</p>
          <p className="text-xl font-mono font-bold">{invoice.invoice_number}</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          <StatusBadge variant={invoice.status as any} size="lg">
            {formatStatus(invoice.status)}
          </StatusBadge>
        </div>
      </div>

      <Separator />

      {/* Customer & Amount */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Customer</p>
          <p className="font-semibold text-lg">{invoice.customer_name}</p>
          <p className="text-sm text-muted-foreground">{invoice.customer_email}</p>
        </div>
        <div className="rounded-lg border p-4 bg-primary/5">
          <p className="text-sm text-muted-foreground mb-1">Amount</p>
          <p className="font-bold text-2xl text-primary">₹{invoice.amount.toLocaleString()}</p>
        </div>
      </div>

      {/* Dates */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Created Date</p>
          <p className="font-medium">{format(new Date(invoice.created_at), 'MMMM dd, yyyy')}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Due Date</p>
          <p className="font-medium">{format(new Date(invoice.due_date), 'MMMM dd, yyyy')}</p>
        </div>
      </div>

      {/* Paid At */}
      {invoice.paid_at && (
        <div className="rounded-lg border p-4 bg-success/10">
          <p className="text-sm text-muted-foreground mb-1">Paid On</p>
          <p className="font-medium text-success">{format(new Date(invoice.paid_at), 'MMMM dd, yyyy HH:mm')}</p>
        </div>
      )}

      {/* Validity Period */}
      {invoice.validity_start && invoice.validity_end && (
        <div className="rounded-lg border p-4 bg-info/5">
          <p className="text-sm text-muted-foreground mb-2">AMC Validity Period</p>
          <div className="flex items-center gap-2">
            <span className="font-medium">{format(new Date(invoice.validity_start), 'MMM dd, yyyy')}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-medium">{format(new Date(invoice.validity_end), 'MMM dd, yyyy')}</span>
          </div>
        </div>
      )}

      {/* Documents */}
      <div>
        <h4 className="font-semibold mb-3">Documents</h4>
        <div className="space-y-2">
          {invoice.invoice_url ? (
            <a
              href={invoice.invoice_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Invoice Document</span>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border p-3 text-muted-foreground">
              <FileText className="h-5 w-5" />
              <span>Invoice not yet generated</span>
            </div>
          )}
          {invoice.contract_url ? (
            <a
              href={invoice.contract_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">AMC Contract</span>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border p-3 text-muted-foreground">
              <FileText className="h-5 w-5" />
              <span>Contract not yet generated</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
