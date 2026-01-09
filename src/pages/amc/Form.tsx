import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useAMCAuth } from '@/contexts/AMCAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { CustomerStep } from './components/CustomerStep';
import { ContextStep } from './components/ContextStep';
import { SystemsStep } from './components/SystemsStep';
import { SchedulingStep } from './components/SchedulingStep';
import { ReviewStep } from './components/ReviewStep';

// Helper to bypass Supabase type checking for tables added via migration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface AMCFormValues {
  customer: {
    full_name: string;
    email: string;
    phone: string;
    company_name: string;
    user_role: string;
    department: string;
    city: string;
    district: string;
    state: string;
    preferred_lang: string;
    preferred_contact_method: string;
  };
  context: {
    system_usage_purpose: string;
    previous_service_history: string;
    consent_remote_access: boolean;
    remote_software_preference: string;
    languages_known: string[];
  };
  systems: Array<{
    system_name: string;
    system_type: string;
    device_type: string;
    brand: string;
    model: string;
    operating_system: string;
    mac_address: string;
    usage_purpose: string;
    daily_usage_hours: string;
    usage_pattern: string;
    primary_usage_time: string;
    purchase_date: string;
    warranty_status: string;
    current_performance: string;
    performance_issues: string[];
    backup_frequency: string;
    antivirus_installed: boolean;
    antivirus_name: string;
    power_backup: boolean;
    network_environment: string;
    system_criticality: string;
    downtime_tolerance: string;
    issue_description: string;
    urgency_level: string;
  }>;
  scheduling: {
    scheduled_date: string;
    scheduled_time: string;
    downtime_tolerance: string;
  };
  legal: {
    terms_accepted: boolean;
    privacy_accepted: boolean;
    explicit_remote_consent: boolean;
  };
}

const STEPS = [
  { id: 'customer', title: 'Customer Info', description: 'Your contact details' },
  { id: 'context', title: 'AMC Context', description: 'Usage and preferences' },
  { id: 'systems', title: 'Systems', description: 'Add your systems' },
  { id: 'scheduling', title: 'Scheduling', description: 'Pick a date & time' },
  { id: 'review', title: 'Review & Submit', description: 'Finalize your AMC' },
];

const AMC_PRICE_PER_SYSTEM = 999;

export const AMCForm: React.FC = () => {
  const { user } = useAMCAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill customer info from authenticated user (non-editable)
  const methods = useForm<AMCFormValues>({
    defaultValues: {
      customer: { 
        email: user?.email || '', 
        full_name: user?.full_name || '', 
        phone: '', 
        company_name: '', 
        user_role: '', 
        department: '', 
        city: '', 
        district: '', 
        state: '', 
        preferred_lang: 'english', 
        preferred_contact_method: 'whatsapp' 
      },
      context: { system_usage_purpose: '', previous_service_history: '', consent_remote_access: false, remote_software_preference: '', languages_known: ['english'] },
      systems: [],
      scheduling: { scheduled_date: '', scheduled_time: '', downtime_tolerance: '' },
      legal: { terms_accepted: false, privacy_accepted: false, explicit_remote_consent: false },
    },
    mode: 'onChange',
  });

  // Calculate total amount based on number of systems
  const systemCount = methods.watch('systems')?.length || 0;
  const totalAmount = systemCount * AMC_PRICE_PER_SYSTEM;

  const validateStep = async () => {
    const v = methods.getValues();
    if (step === 0) {
      if (!v.customer.full_name || !v.customer.email || !v.customer.phone) { toast.error('Please fill required customer fields'); return false; }
    } else if (step === 1) {
      if (!v.context.system_usage_purpose) { toast.error('Please select system usage purpose'); return false; }
    } else if (step === 2) {
      if (!v.systems || v.systems.length === 0) { toast.error('Add at least one system'); return false; }
      for (const s of v.systems) {
        if (!s.system_name || !s.system_type) { toast.error('Each system needs name and type'); return false; }
        if (!s.mac_address || !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(s.mac_address)) { 
          toast.error(`System "${s.system_name}" needs a valid MAC address (e.g., 00:1A:2B:3C:4D:5E)`); 
          return false; 
        }
      }
    } else if (step === 3) {
      if (!v.scheduling.scheduled_date || !v.scheduling.scheduled_time) { toast.error('Select date and time'); return false; }
    } else if (step === 4) {
      if (!v.legal.terms_accepted || !v.legal.privacy_accepted || !v.legal.explicit_remote_consent) { toast.error('Please accept all required consents'); return false; }
    }
    return true;
  };

  const handleNext = async () => {
    if (await validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!(await validateStep())) return;
    setIsSubmitting(true);
    try {
      const v = methods.getValues();
      
      // Insert amc_responses - matching exact schema columns
      const { data: amc, error: amcErr } = await db.from('amc_responses').insert({
        // Customer info
        full_name: v.customer.full_name,
        email: v.customer.email,
        phone: v.customer.phone,
        company_name: v.customer.company_name || null,
        city: v.customer.city || '',
        district: v.customer.district || '',
        state: v.customer.state || '',
        preferred_lang: v.customer.preferred_lang || 'english',
        preferred_contact_method: v.customer.preferred_contact_method || 'whatsapp',
        user_role: v.customer.user_role || 'individual', // Required NOT NULL
        department: v.customer.department || null,
        
        // Context info
        system_usage_purpose: v.context.system_usage_purpose || 'personal', // Required NOT NULL
        previous_service_history: v.context.previous_service_history || null,
        consent_remote_access: v.context.consent_remote_access || false,
        remote_software_preference: v.context.remote_software_preference || 'anydesk', // Required NOT NULL
        languages_known: Array.isArray(v.context.languages_known) ? v.context.languages_known.join(', ') : (v.context.languages_known || 'english'), // Text, not array
        
        // Scheduling
        scheduled_date: v.scheduling.scheduled_date || null,
        scheduled_time: v.scheduling.scheduled_time || null,
        
        // Status
        status: 'new',
        payment_status: 'Pending',
        
        // Amount will be updated after systems are counted
        amount: (v.systems.length * AMC_PRICE_PER_SYSTEM).toString(),
        
        // Link to authenticated user if available
        customer_user_id: user?.id || null,
      }).select('amc_form_id').single();
      
      if (amcErr) throw amcErr;
      
      const amcFormId = amc.amc_form_id;

      // Insert amc_systems for each system - matching exact schema columns
      for (const sys of v.systems) {
        const { data: amcSys, error: sysErr } = await db.from('amc_systems').insert({
          amc_form_id: amcFormId,
          device_type: sys.system_type || 'desktop', // Required NOT NULL
          device_name: sys.system_name || null,
          system_name: sys.system_name || null,
          system_type: sys.system_type || null,
          brand: sys.brand || null,
          model: sys.model || null,
          operating_system: sys.operating_system || null,
          // MAC address is stored plaintext in mac_address_hint for now
          // In production, use encryption: mac_address_enc, mac_iv, mac_tag
          mac_address_hint: sys.mac_address || null,
          usage_purpose: sys.usage_purpose || v.context.system_usage_purpose || null,
          daily_usage_hours: sys.daily_usage_hours || null,
          usage_pattern: sys.usage_pattern || null,
          primary_usage_time: sys.primary_usage_time || null,
          current_performance: sys.current_performance || null,
          performance_issues: sys.performance_issues || [],
          backup_frequency: sys.backup_frequency || null,
          antivirus_installed: sys.antivirus_installed || false,
          antivirus_name: sys.antivirus_name || null,
          power_backup: sys.power_backup || false,
          network_environment: sys.network_environment || null,
          system_criticality: sys.system_criticality || null,
          downtime_tolerance: sys.downtime_tolerance || v.scheduling.downtime_tolerance || null,
        }).select('id').single();
        
        if (sysErr) throw sysErr;

        // Insert amc_system_issues if issue exists
        if (sys.issue_description) {
          const { error: issErr } = await db.from('amc_system_issues').insert({
            system_id: amcSys.id,
            issue_category: 'general',
            issue_description: sys.issue_description,
            urgency_level: sys.urgency_level || 'medium',
          });
          if (issErr) console.warn('Issue insert warning:', issErr);
        }
      }

      // Calculate final amount (ensure it's a multiple of 999)
      const finalAmount = v.systems.length * AMC_PRICE_PER_SYSTEM;

      toast.success('AMC application saved!');
      navigate('/amc/payment', { state: { amcId: amcFormId, amount: finalAmount, systemCount: v.systems.length } });
    } catch (err: any) {
      console.error('Submission error:', err);
      toast.error(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AMC Registration</CardTitle>
                  <CardDescription>Step {step + 1} of {STEPS.length}: {STEPS[step].title}</CardDescription>
                </div>
                {systemCount > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{systemCount} system{systemCount > 1 ? 's' : ''}</p>
                    <p className="text-lg font-bold text-blue-600">₹{totalAmount.toLocaleString('en-IN')}</p>
                  </div>
                )}
              </div>
              <Progress value={progress} className="mt-2 h-2" />
            </CardHeader>
            <CardContent className="pt-6">
              <FormProvider {...methods}>
                {step === 0 && <CustomerStep />}
                {step === 1 && <ContextStep />}
                {step === 2 && <SystemsStep />}
                {step === 3 && <SchedulingStep />}
                {step === 4 && <ReviewStep />}
              </FormProvider>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button variant="outline" onClick={handleBack} disabled={step === 0}>Back</Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={handleNext}>Next</Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting || systemCount === 0}>
                  {isSubmitting ? 'Submitting...' : `Pay ₹${totalAmount.toLocaleString('en-IN')}`}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AMCForm;
