import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Shield, Lock, CreditCard, Monitor, CheckCircle2, AlertCircle } from 'lucide-react';

declare global {
  interface Window { Razorpay: any; }
}

const AMC_PRICE_PER_SYSTEM = 999;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface PaymentState {
  amcId: string;
  amount: number;
  systemCount: number;
}

export const Payment: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { amcId, amount, systemCount } = (location.state as PaymentState) || {};
  const [loading, setLoading] = useState(false);
  const [amcData, setAmcData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate amount on mount
  const isAmountValid = amount && systemCount && amount === systemCount * AMC_PRICE_PER_SYSTEM && amount % AMC_PRICE_PER_SYSTEM === 0;

  useEffect(() => {
    if (!amcId) return;
    db.from('amc_responses').select('full_name, email, phone, amc_form_id').eq('amc_form_id', amcId).single().then(({ data }: { data: any }) => setAmcData(data));
  }, [amcId]);

  if (!amcId) return <Navigate to="/amc/form" replace />;

  const handlePayment = async () => {
    if (!isAmountValid) {
      setError('Invalid payment amount. Please go back and try again.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Call backend to create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke('razorpay-create-order', {
        body: {
          amcFormId: amcId,
          systemCount,
          customerName: amcData?.full_name || 'Customer',
          customerEmail: amcData?.email || '',
          customerPhone: amcData?.phone || '',
        },
      });

      if (orderError) throw new Error(orderError.message || 'Failed to create payment order');
      if (!orderData?.success) throw new Error(orderData?.error || 'Order creation failed');

      // Load Razorpay SDK
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        document.head.appendChild(script);
        await new Promise((res) => (script.onload = res));
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amountInPaise,
        currency: orderData.currency,
        name: 'FL Smartech',
        description: `AMC for ${systemCount} system${systemCount > 1 ? 's' : ''}`,
        order_id: orderData.orderId,
        prefill: orderData.prefill,
        handler: async (response: any) => {
          try {
            // Verify payment on backend
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('razorpay-verify-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amc_form_id: amcId,
              },
            });

            if (verifyError) throw new Error(verifyError.message || 'Payment verification failed');
            if (!verifyData?.verified) throw new Error('Payment verification failed');

            toast.success('Payment Successful!');
            navigate('/amc/success', { state: { amcId, paymentId: response.razorpay_payment_id } });
          } catch (verifyErr: any) {
            console.error('Verification error:', verifyErr);
            toast.error('Payment completed but verification failed. Please contact support.');
            navigate('/amc/success', { state: { amcId, paymentId: response.razorpay_payment_id, verificationPending: true } });
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast.info('Payment cancelled');
          },
        },
        theme: { color: '#1d4ed8' },
        notes: {
          amc_form_id: amcId,
          system_count: systemCount.toString(),
        },
      };

      const rz = new window.Razorpay(options);
      rz.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        setError(response.error.description || 'Payment failed. Please try again.');
        setLoading(false);
        navigate('/amc/failure', { state: { amcId, error: response.error.description } });
      });
      rz.open();
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment initialization failed');
      toast.error(err.message || 'Payment failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-blue-100 w-fit">
            <CreditCard className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Complete Payment</CardTitle>
          <CardDescription>Secure payment via Razorpay</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Pricing breakdown */}
          <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-blue-600" />
                <span className="text-gray-700">Systems Covered</span>
              </div>
              <Badge variant="outline" className="bg-white">{systemCount || 1}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>₹{AMC_PRICE_PER_SYSTEM} × {systemCount || 1} system{(systemCount || 1) > 1 ? 's' : ''}</span>
            </div>
            <Separator className="my-3" />
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Total Amount</span>
              <span className="text-3xl font-bold text-blue-600">₹{(amount || 0).toLocaleString('en-IN')}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">Annual Maintenance Contract (1 Year)</p>
          </div>

          {/* Customer info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <span className="text-sm text-gray-500">Customer</span>
              <span className="font-medium">{amcData?.full_name || 'Loading...'}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm">{amcData?.email || 'Loading...'}</span>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Amount validation warning */}
          {!isAmountValid && amount && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Invalid payment amount detected. Expected ₹{(systemCount || 1) * AMC_PRICE_PER_SYSTEM}.
              </AlertDescription>
            </Alert>
          )}

          {/* Security badges */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Shield className="h-4 w-4 text-green-600" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Lock className="h-4 w-4 text-green-600" />
              <span>Encrypted</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Verified</span>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3">
          <Button 
            className="w-full h-12 text-lg gradient-primary text-white" 
            onClick={handlePayment} 
            disabled={loading || !isAmountValid}
          >
            {loading ? (
              <>
                <div className="h-5 w-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </>
            ) : (
              <>Pay ₹{(amount || 0).toLocaleString('en-IN')} Now</>
            )}
          </Button>
          <p className="text-xs text-center text-gray-500">
            By proceeding, you agree to our Terms of Service
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Payment;
