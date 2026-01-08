import React, { useEffect, useState } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export const Success: React.FC = () => {
  const location = useLocation();
  const { amcId } = (location.state as { amcId?: string }) || {};
  const [amcData, setAmcData] = useState<any>(null);

  useEffect(() => {
    if (!amcId) return;
    (supabase.from('amc_responses') as any).select('amc_number, full_name, email, scheduled_date, scheduled_time').eq('id', amcId).single().then(({ data }: { data: any }) => setAmcData(data));
  }, [amcId]);

  if (!amcId) return <Navigate to="/amc/form" replace />;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-green-700">Payment Successful!</CardTitle>
          <CardDescription>Your AMC registration is complete.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {amcData?.amc_number && <p><strong>AMC Number:</strong> {amcData.amc_number}</p>}
          <p><strong>Name:</strong> {amcData?.full_name}</p>
          <p><strong>Email:</strong> {amcData?.email}</p>
          <p><strong>Scheduled:</strong> {amcData?.scheduled_date} at {amcData?.scheduled_time}</p>
          <p className="text-xs text-muted-foreground mt-4">A confirmation email will be sent shortly.</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild variant="outline"><Link to="/amc/form">Register Another AMC</Link></Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Success;
