import React, { useState, useEffect } from 'react';
import { FileText, Download, CreditCard, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { useAMCAuth } from '@/contexts/AMCAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast } from 'date-fns';
import { StatCard } from '@/components/ui/stat-card';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  validity_start: string | null;
  validity_end: string | null;
  invoice_url: string | null;
  contract_url: string | null;
  created_at: string;
  paid_at: string | null;
}

export default function CustomerInvoices() {
  const { session } = useAMCAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchInvoices();
    }
  }, [session]);

  const fetchInvoices = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          amc_responses!inner (
            customer_user_id
          )
        `)
        .eq('amc_responses.customer_user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEffectiveStatus = (invoice: Invoice) => {
    if (invoice.status === 'paid') return 'paid';
    if (isPast(new Date(invoice.due_date)) && invoice.status !== 'paid') return 'overdue';
    return invoice.status;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'active';
      case 'overdue': return 'urgent';
      case 'sent': return 'pending';
      default: return 'new';
    }
  };

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalPending = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((sum, i) => sum + i.amount, 0);
  const activeSubscriptions = invoices.filter(i => {
    if (!i.validity_end || i.status !== 'paid') return false;
    return !isPast(new Date(i.validity_end));
  }).length;

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
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Invoices & Contracts</h1>
        <p className="text-muted-foreground">View your billing history and download documents</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Paid"
          value={`₹${totalPaid.toLocaleString()}`}
          icon={CheckCircle}
          iconClassName="bg-success/10"
        />
        <StatCard
          title="Pending Payment"
          value={`₹${totalPending.toLocaleString()}`}
          icon={Clock}
          iconClassName="bg-warning/10"
        />
        <StatCard
          title="Active Subscriptions"
          value={activeSubscriptions}
          icon={CreditCard}
        />
      </div>

      {/* Invoices List */}
      <div className="rounded-xl border bg-card shadow-card">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Invoice History</h2>
        </div>

        {invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Invoices Yet</h3>
            <p className="text-muted-foreground">Your invoices will appear here after you make a purchase.</p>
          </div>
        ) : (
          <div className="divide-y">
            {invoices.map(invoice => {
              const effectiveStatus = getEffectiveStatus(invoice);
              return (
                <div key={invoice.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{invoice.invoice_number}</h3>
                        <StatusBadge variant={getStatusVariant(effectiveStatus) as any}>
                          {formatStatus(effectiveStatus)}
                        </StatusBadge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>Created: {format(new Date(invoice.created_at), 'MMM dd, yyyy')}</span>
                        {invoice.validity_end && (
                          <span>Valid until: {format(new Date(invoice.validity_end), 'MMM dd, yyyy')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-bold">₹{invoice.amount.toLocaleString()}</p>
                        {invoice.paid_at && (
                          <p className="text-xs text-muted-foreground">
                            Paid on {format(new Date(invoice.paid_at), 'MMM dd, yyyy')}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {invoice.invoice_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={invoice.invoice_url} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-4 w-4 mr-1" />
                              Invoice
                            </a>
                          </Button>
                        )}
                        {invoice.contract_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={invoice.contract_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Contract
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
