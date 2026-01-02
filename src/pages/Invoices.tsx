import React, { useState } from 'react';
import { Plus, Download, Eye, MoreHorizontal, Send, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { DrawerPanel } from '@/components/ui/drawer-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockInvoices } from '@/data/mockData';
import { Invoice } from '@/types';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

export default function InvoicesPage() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const canCreate = user?.role === 'admin' || user?.role === 'bookkeeping';

  const filteredInvoices = selectedTab === 'all'
    ? mockInvoices
    : mockInvoices.filter(i => i.status === selectedTab);

  const columns: Column<Invoice>[] = [
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
        <span className="font-medium text-foreground">{invoice.customer_name}</span>
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
            <DropdownMenuItem>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSendInvoice(invoice)}>
              <Send className="h-4 w-4 mr-2" />
              Send to Customer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-12',
    },
  ];

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDrawerOpen(true);
  };

  const handleSendInvoice = (invoice: Invoice) => {
    toast.success(`Invoice ${invoice.invoice_number} sent to ${invoice.customer_name}`);
  };

  // Calculate totals
  const totalAmount = mockInvoices.reduce((sum, i) => sum + i.amount, 0);
  const paidAmount = mockInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const pendingAmount = mockInvoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">Manage customer invoices and contracts</p>
        </div>
        {canCreate && (
          <Button className="gradient-primary text-white gap-2">
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
        )}
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

      {/* Invoice Details Drawer */}
      <DrawerPanel
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Invoice Details"
        subtitle={selectedInvoice?.invoice_number}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button className="flex-1 gradient-primary text-white gap-2">
              <Send className="h-4 w-4" />
              Send Invoice
            </Button>
          </div>
        }
      >
        {selectedInvoice && <InvoiceDetails invoice={selectedInvoice} />}
      </DrawerPanel>
    </div>
  );
}

function InvoiceDetails({ invoice }: { invoice: Invoice }) {
  return (
    <div className="space-y-6">
      {/* Invoice Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Invoice Number</p>
          <p className="text-xl font-mono font-bold">{invoice.invoice_number}</p>
        </div>
        <StatusBadge variant={invoice.status as any} size="lg">
          {formatStatus(invoice.status)}
        </StatusBadge>
      </div>

      <Separator />

      {/* Customer & Amount */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Customer</p>
          <p className="font-semibold text-lg">{invoice.customer_name}</p>
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
          <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Invoice PDF</span>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </div>
          {invoice.contract_url && (
            <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">AMC Contract</span>
              </div>
              <Download className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
