import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export const Failure: React.FC = () => {
  const location = useLocation();
  const { amcId, reason } = (location.state as { amcId?: string; reason?: string }) || {};

  if (!amcId) return <Navigate to="/amc/form" replace />;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-red-700">Payment Failed</CardTitle>
          <CardDescription>{reason || 'There was an issue processing your payment.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Your AMC data has been saved. You can retry payment or contact support.</p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button asChild><Link to="/amc/payment" state={{ amcId, amount: 999 }}>Retry Payment</Link></Button>
          <Button asChild variant="outline"><Link to="/amc/form">Start Over</Link></Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Failure;
