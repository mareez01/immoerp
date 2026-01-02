import React, { useState, useEffect } from 'react';
import { FileText, Download, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';

export default function CustomerPortalInvoices() {
  const { session } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, [session]);

  const fetchInvoices = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          amc_responses!inner (
            customer_user_id,
            full_name,
            company_name
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

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0);
  const totalPending = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((sum, i) => sum + Number(i.amount), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Invoices</h1>
        <p className="text-muted-foreground">View and download your invoices</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Total Invoices</p>
          <p className="text-2xl font-bold text-foreground mt-1">{invoices.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Amount Paid</p>
          <p className="text-2xl font-bold text-success mt-1">₹{totalPaid.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Pending Payment</p>
          <p className="text-2xl font-bold text-warning mt-1">₹{totalPending.toLocaleString()}</p>
        </div>
      </div>

      {/* Invoices List */}
      <div className="rounded-xl border bg-card shadow-card">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Invoice History</h2>
        </div>

        {invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Invoices Found</h3>
            <p className="text-muted-foreground">You don't have any invoices yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {invoices.map(invoice => {
              const isOverdue = invoice.status === 'overdue' || 
                (invoice.status === 'sent' && differenceInDays(new Date(), new Date(invoice.due_date)) > 0);

              return (
                <div key={invoice.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-mono font-semibold">{invoice.invoice_number}</h3>
                        <StatusBadge variant={isOverdue ? 'overdue' : invoice.status as any}>
                          {isOverdue ? 'Overdue' : formatStatus(invoice.status)}
                        </StatusBadge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Created: {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      
                      {/* Validity Period */}
                      {invoice.validity_start && invoice.validity_end && (
                        <p className="text-sm text-muted-foreground mt-2">
                          AMC Valid: {format(new Date(invoice.validity_start), 'MMM dd, yyyy')} - {format(new Date(invoice.validity_end), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold">₹{Number(invoice.amount).toLocaleString()}</p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
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
