import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Shield, Wifi, Truck, Gift, CheckCircle2, Sparkles, Monitor, Clock, MapPin, Wrench, Package, Zap } from 'lucide-react';

const AMC_PRICE_PER_SYSTEM = 999;

const TermsContent = () => (
  <ScrollArea className="h-[400px] p-4">
    <h2 className="text-xl font-bold mb-4">Terms and Conditions</h2>
    <p className="text-sm mb-2">By subscribing to our AMC service, you agree to the terms outlined herein.</p>
    <ul className="space-y-4 text-gray-700 leading-relaxed">

  <li>
    <strong>Introduction</strong>
    <ul className="list-disc ml-6 mt-2">
      <li>These Terms and Conditions govern the use of AMC services provided by FL Smartech through its Admin, Staff, and Customer portals.</li>
      <li>By subscribing to or using our AMC services, the customer agrees to these terms in full.</li>
    </ul>
  </li>

  <li>
    <strong>AMC Service Overview</strong>
    <ul className="list-disc ml-6 mt-2">
      <li>AMC is a subscription-based service providing maintenance and issue resolution for customer devices.</li>
      <li>The AMC plan is priced at ₹999 and is valid for one year from the date of activation.</li>
      <li>Customers are entitled to up to six service requests within the validity period.</li>
      <li>Once all six services are used, a new AMC subscription must be purchased to continue receiving services.</li>
    </ul>
  </li>

  <li>
    <strong>Remote AMC Services</strong>
    <ul className="list-disc ml-6 mt-2">
      <li>Remote AMC allows issues to be diagnosed and resolved without physical visits, saving time and effort.</li>
      <li>Services are available to customers in India and abroad, subject to availability within Indian Standard Time (IST).</li>
      <li>Depending on the plan, services may be delivered by trained staff or AI-assisted systems.</li>
      <li>AI-enabled Remote AMC may allow up to ten service requests per year, subject to feasibility.</li>
    </ul>
  </li>

  <li>
    <strong>Remote AMC to Physical AMC</strong>
    <ul className="list-disc ml-6 mt-2">
      <li>If remote diagnostics indicate physical repair is required, the service will transition to Physical AMC.</li>
      <li>The device will be collected, serviced at our facility, and returned to the customer.</li>
      <li>Logistics and handling charges apply based on the customer’s location.</li>
      <li>Estimated pickup time is 24 to 48 hours from service confirmation.</li>
    </ul>
  </li>

  <li>
    <strong>Physical AMC Services</strong>
    <ul className="list-disc ml-6 mt-2">
      <li>Customers can track their device from pickup to delivery.</li>
      <li>Initial charges cover diagnostic analysis only.</li>
      <li>Any costs for parts, replacements, or advanced repairs will be communicated and require customer approval.</li>
    </ul>
  </li>

  <li>
    <strong>Pricing, Cancellation & Refunds</strong>
    <ul className="list-disc ml-6 mt-2">
      <li>The AMC subscription fee of ₹999 is non-refundable after the second service request.</li>
      <li>Customers may cancel the AMC at any time.</li>
      <li>No refunds are issued once more than two services are used.</li>
      <li>Unused services do not carry forward beyond the validity period.</li>
    </ul>
  </li>

  <li>
    <strong>Complimentary Benefits</strong>
    <ul className="list-disc ml-6 mt-2">
      <li>Antivirus software may be provided if none is installed or if it is nearing expiry.</li>
      <li>If antivirus is not applicable, first-time Remote AMC customers may receive a complimentary laptop bag.</li>
    </ul>
  </li>

  <li>
    <strong>Software Installation During Service</strong>
    <ul className="list-disc ml-6 mt-2">
      <li>Support staff may install reliable free tools for maintenance and optimization.</li>
      <li>All installed tools are selected for safety and minimal storage usage.</li>
      <li>Installation is performed only when relevant to the service.</li>
    </ul>
  </li>

  <li>
    <strong>Service Availability & Limitations</strong>
    <ul className="list-disc ml-6 mt-2">
      <li>All services depend on technical feasibility, device condition, and internet availability.</li>
      <li>Some hardware issues may require Physical AMC or manufacturer service.</li>
    </ul>
  </li>

    </ul>
  </ScrollArea>
);

const PrivacyContent = () => (
  <ScrollArea className="h-[400px] p-4">
    <h2 className="text-xl font-bold mb-4">Privacy Policy</h2>
    <p className="text-sm mb-2">We collect information necessary to provide AMC services.</p>
    <ul className="space-y-4 text-gray-700 leading-relaxed">

  <li>
    <strong>Commitment to Data Privacy</strong>
    <ul className="list-disc ml-6 mt-2">
      <li>FL Smartech is committed to protecting customer privacy and data security.</li>
      <li>This policy explains how data is accessed, used, and protected during AMC service delivery.</li>
    </ul>
  </li>

  <li>
    <strong>Access to Devices During Remote AMC</strong>
    <ul className="list-disc ml-6 mt-2">
      <li>Remote AMC requires temporary access to the customer’s device for diagnosis and repair.</li>
      <li>Access is granted only with the customer’s consent.</li>
      <li>No continuous or background access is maintained after the service session ends.</li>
    </ul>
  </li>

  <li>
    <strong>Data Handling & Confidentiality</strong>
    <ul className="list-disc ml-6 mt-2">
      <li>We do not view, copy, store, or share personal files, documents, credentials, or private data.</li>
      <li>All actions are limited to system maintenance and issue resolution.</li>
    </ul>
  </li>

  <li>
    <strong>Security Measures</strong>
    <ul className="list-disc ml-6 mt-2">
      <li>Industry-standard security practices are followed during remote and physical services.</li>
      <li>Devices collected for Physical AMC are handled only by authorized staff and stored securely.</li>
    </ul>
  </li>

  <li>
    <strong>Software & Tools Usage</strong>
    <ul className="list-disc ml-6 mt-2">
      <li>Only trusted and necessary free utilities are installed during service.</li>
      <li>These tools do not collect or transmit personal customer data.</li>
      <li>Customers may request removal of installed tools after service completion.</li>
    </ul>
  </li>

  <li>
    <strong>Data Sharing & Third Parties</strong>
    <ul className="list-disc ml-6 mt-2">
      <li>Customer data is never sold, rented, or shared for marketing purposes.</li>
      <li>Data may only be disclosed if legally required by authorities.</li>
    </ul>
  </li>

  <li>
    <strong>Customer Control & Consent</strong>
    <ul className="list-disc ml-6 mt-2">
      <li>Customers retain full ownership and control over their devices and data.</li>
      <li>By requesting AMC service, customers consent to limited access solely for service delivery.</li>
    </ul>
  </li>

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
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 text-blue-200 text-sm font-medium mb-2">
            <Shield className="h-4 w-4" />
            <span>FL Smartech AMC</span>
          </div>
          <h2 className="text-2xl font-bold mb-1">Your Affordable AMC Plan</h2>
          <p className="text-blue-100 text-sm">Complete device protection for just ₹999/year</p>
          
          {/* Quick Stats */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-3 py-1.5">
              <Zap className="h-4 w-4 text-yellow-300" />
              <span className="text-sm font-medium">6 Services/Year</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-3 py-1.5">
              <Clock className="h-4 w-4 text-green-300" />
              <span className="text-sm font-medium">Pickup within 24-48hr</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-3 py-1.5">
              <MapPin className="h-4 w-4 text-pink-300" />
              <span className="text-sm font-medium">India & Abroad</span>
            </div>
          </div>
        </div>
      </div>

      {/* Service Types - Bento Grid Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Remote AMC */}
        <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 p-5 transition-all hover:shadow-lg hover:border-cyan-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-3 shadow-lg shadow-cyan-500/20">
              <Wifi className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Remote AMC</h3>
            <p className="text-sm text-muted-foreground mb-3">AI-assisted diagnostics from anywhere</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-cyan-600 flex-shrink-0" />
                <span>Up to 10 requests with AI support</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-cyan-600 flex-shrink-0" />
                <span>No travel required, instant access</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-cyan-600 flex-shrink-0" />
                <span>Available for customers abroad</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Physical AMC */}
        <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 p-5 transition-all hover:shadow-lg hover:border-orange-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mb-3 shadow-lg shadow-orange-500/20">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Physical AMC</h3>
            <p className="text-sm text-muted-foreground mb-3">Door-to-door device servicing</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <span>24-48 hour device pickup</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <span>Real-time device tracking</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <span>Transparent repair costs</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Complimentary Benefits - Floating Cards */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-rose-500/5 rounded-2xl" />
        <div className="relative rounded-2xl border border-purple-200/50 dark:border-purple-800/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Gift className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Complimentary Benefits</h3>
              <p className="text-xs text-muted-foreground">Included free with your AMC</p>
            </div>
            <div className="ml-auto">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium">
                <Sparkles className="h-3 w-3" />
                FREE
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border shadow-sm">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Antivirus</p>
                <p className="text-xs text-muted-foreground">Premium protection</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border shadow-sm">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Laptop Bag</p>
                <p className="text-xs text-muted-foreground">First-time customers</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border shadow-sm">
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Wrench className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Optimization</p>
                <p className="text-xs text-muted-foreground">Free utility tools</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Summary */}
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
