import React, { useEffect, useState } from 'react';
import { useLocation, Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Home, Plus, FileText, Loader2, Clock, CalendarDays, Monitor, User, Mail, Phone, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface AMCData {
  amc_number: string;
  full_name: string;
  email: string;
  phone: string;
  company_name?: string;
  address: string;
  scheduled_date: string;
  scheduled_time: string;
  number_of_systems: number;
  status: string;
}

export const Success: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { amcId, paymentId, verificationPending } = (location.state as { amcId?: string; paymentId?: string; verificationPending?: boolean }) || {};
  const [amcData, setAmcData] = useState<AMCData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!amcId) {
      setIsLoading(false);
      return;
    }

    const fetchAmcData = async () => {
      try {
        // Query by amc_form_id since that's what Payment page passes
        const { data, error } = await supabase
          .from('amc_responses')
          .select('amc_number, full_name, email, phone, company_name, address, scheduled_date, scheduled_time, number_of_systems, status')
          .eq('amc_form_id', amcId)
          .single();

        if (error) {
          console.error('Error fetching AMC data:', error);
        } else {
          setAmcData(data);
        }
      } catch (err) {
        console.error('Failed to fetch AMC data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAmcData();
  }, [amcId]);

  if (!amcId) return <Navigate to="/amc/dashboard" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-0">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
          <CardDescription className="text-base">
            Your AMC registration is complete. You will receive a confirmation email shortly.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {verificationPending && (
            <Alert className="border-amber-200 bg-amber-50">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Your payment is being processed. Status will be updated shortly.
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading order details...</span>
            </div>
          ) : amcData ? (
            <div className="space-y-4">
              {/* AMC Number Badge */}
              {amcData.amc_number && (
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 text-center">
                  <p className="text-xs uppercase tracking-wide opacity-80">Your AMC Number</p>
                  <p className="text-2xl font-bold font-mono mt-1">{amcData.amc_number}</p>
                </div>
              )}

              {/* Customer Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-700 text-sm uppercase tracking-wide">Customer Details</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{amcData.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{amcData.email}</span>
                  </div>
                  {amcData.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{amcData.phone}</span>
                    </div>
                  )}
                  {amcData.company_name && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Company:</span>
                      <span className="font-medium">{amcData.company_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* AMC Details */}
              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-blue-700 text-sm uppercase tracking-wide">AMC Details</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-blue-400" />
                    <span className="text-gray-600">Systems Covered:</span>
                    <span className="font-medium">{amcData.number_of_systems} system{amcData.number_of_systems > 1 ? 's' : ''}</span>
                  </div>
                  {amcData.scheduled_date && (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-blue-400" />
                      <span className="text-gray-600">Scheduled Visit:</span>
                      <span className="font-medium">
                        {format(new Date(amcData.scheduled_date), 'MMMM dd, yyyy')} at {amcData.scheduled_time}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                A confirmation email with your invoice and contract has been sent to {amcData.email}
              </p>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p>Order details could not be loaded.</p>
              <p className="text-sm">Please check your dashboard for order information.</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-6">
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => navigate('/amc/dashboard')}
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" asChild>
              <Link to="/amc/invoices">
                <FileText className="h-4 w-4 mr-2" />
                View Invoices
              </Link>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <Link to="/amc/new-order">
                <Plus className="h-4 w-4 mr-2" />
                New AMC
              </Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Success;
