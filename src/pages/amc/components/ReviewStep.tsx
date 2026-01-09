import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

const AMC_PRICE_PER_SYSTEM = 999;

const TermsContent = () => (
  <ScrollArea className="h-[400px] p-4">
    <h2 className="text-xl font-bold mb-4">Terms and Conditions</h2>
    <p className="text-sm mb-2">By subscribing to our AMC service, you agree to the terms outlined herein.</p>
    <ul className="list-disc pl-5 text-sm space-y-1">
      <li>Service covers remote maintenance and support as specified.</li>
      <li>Payment is required in advance.</li>
      <li>Services must be scheduled during business hours.</li>
      <li>No refunds after service commencement.</li>
    </ul>
  </ScrollArea>
);

const PrivacyContent = () => (
  <ScrollArea className="h-[400px] p-4">
    <h2 className="text-xl font-bold mb-4">Privacy Policy</h2>
    <p className="text-sm mb-2">We collect information necessary to provide AMC services.</p>
    <ul className="list-disc pl-5 text-sm space-y-1">
      <li>Data is used solely for service delivery.</li>
      <li>We implement industry-standard security measures.</li>
      <li>Your data is not sold to third parties.</li>
    </ul>
  </ScrollArea>
);

export const ReviewStep: React.FC = () => {
  const { watch, setValue, formState: { errors } } = useFormContext();
  const legalErrors = (errors as any).legal;
  const formValues = watch();
  const systemCount = formValues.systems?.length || 0;
  const totalAmount = systemCount * AMC_PRICE_PER_SYSTEM;

  return (
    <div className="space-y-6">
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">AMC Summary</CardTitle>
          <CardDescription>Review your application before submission.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subscriber:</span><span className="font-medium">{formValues.customer?.full_name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span className="font-medium">{formValues.customer?.email}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Systems:</span><span className="font-medium">{systemCount}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Date:</span><span className="font-medium">{formValues.scheduling?.scheduled_date}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Time:</span><span className="font-medium">{formValues.scheduling?.scheduled_time}</span></div>
          <div className="border-t pt-2 mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>₹{AMC_PRICE_PER_SYSTEM} × {systemCount} system{systemCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">Total Amount</span>
              <span className="font-bold text-2xl text-primary">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <Checkbox id="terms" checked={formValues.legal?.terms_accepted} onCheckedChange={(c) => setValue('legal.terms_accepted', c, { shouldValidate: true })} />
          <div>
            <Label htmlFor="terms">I agree to the <Dialog><DialogTrigger className="underline text-primary">Terms and Conditions</DialogTrigger><DialogContent><TermsContent /></DialogContent></Dialog> <span className="text-red-500">*</span></Label>
            {legalErrors?.terms_accepted && <p className="text-sm text-red-500">{legalErrors.terms_accepted.message}</p>}
          </div>
        </div>
        <div className="flex items-start space-x-3">
          <Checkbox id="privacy" checked={formValues.legal?.privacy_accepted} onCheckedChange={(c) => setValue('legal.privacy_accepted', c, { shouldValidate: true })} />
          <div>
            <Label htmlFor="privacy">I have read and accept the <Dialog><DialogTrigger className="underline text-primary">Privacy Policy</DialogTrigger><DialogContent><PrivacyContent /></DialogContent></Dialog> <span className="text-red-500">*</span></Label>
            {legalErrors?.privacy_accepted && <p className="text-sm text-red-500">{legalErrors.privacy_accepted.message}</p>}
          </div>
        </div>
        <div className="flex items-start space-x-3">
          <Checkbox id="remote" checked={formValues.legal?.explicit_remote_consent} onCheckedChange={(c) => setValue('legal.explicit_remote_consent', c, { shouldValidate: true })} />
          <div>
            <Label htmlFor="remote">I explicitly consent to remote access for diagnostics and repair. <span className="text-red-500">*</span></Label>
            {legalErrors?.explicit_remote_consent && <p className="text-sm text-red-500">{legalErrors.explicit_remote_consent.message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
