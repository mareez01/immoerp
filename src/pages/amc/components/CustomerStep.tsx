import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { useAMCAuth } from '@/contexts/AMCAuthContext';
import { Lock } from 'lucide-react';

// Role categories for better UX
const ROLE_OPTIONS = [
  { group: 'Management', options: [
    { value: 'owner', label: 'Business Owner' },
    { value: 'director', label: 'Director' },
    { value: 'manager', label: 'Manager' },
    { value: 'ceo', label: 'CEO / MD' },
  ]},
  { group: 'IT & Technical', options: [
    { value: 'it_manager', label: 'IT Manager' },
    { value: 'it_admin', label: 'IT Administrator' },
    { value: 'developer', label: 'Developer / Engineer' },
    { value: 'technician', label: 'Technician' },
  ]},
  { group: 'Operations', options: [
    { value: 'accountant', label: 'Accountant' },
    { value: 'hr', label: 'HR / Admin' },
    { value: 'receptionist', label: 'Receptionist' },
    { value: 'staff', label: 'Staff' },
  ]},
  { group: 'Other', options: [
    { value: 'student', label: 'Student' },
    { value: 'freelancer', label: 'Freelancer' },
    { value: 'home_user', label: 'Home User' },
    { value: 'other', label: 'Other' },
  ]},
];

export const CustomerStep: React.FC = () => {
  const { user } = useAMCAuth();
  const { register, setValue, watch, formState: { errors } } = useFormContext();
  const customerErrors = (errors as any).customer;
  const currentRole = watch('customer.user_role');
  const currentLang = watch('customer.preferred_lang');
  const currentContact = watch('customer.preferred_contact_method');

  // Check if user is authenticated - if so, name and email are locked
  const isAuthenticated = !!user?.id;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Full Name <span className="text-red-500">*</span>
          {isAuthenticated && <Lock className="h-3 w-3 text-muted-foreground" />}
        </Label>
        <Input 
          {...register('customer.full_name', { required: 'Required' })} 
          placeholder="John Doe"
          disabled={isAuthenticated}
          className={isAuthenticated ? 'bg-muted cursor-not-allowed' : ''}
        />
        {customerErrors?.full_name && <p className="text-sm text-red-500">{customerErrors.full_name.message}</p>}
        {isAuthenticated && (
          <p className="text-xs text-muted-foreground">Linked to your account</p>
        )}
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Email <span className="text-red-500">*</span>
          {isAuthenticated && <Lock className="h-3 w-3 text-muted-foreground" />}
        </Label>
        <Input 
          type="email" 
          {...register('customer.email', { required: 'Required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })}
          disabled={isAuthenticated}
          className={isAuthenticated ? 'bg-muted cursor-not-allowed' : ''}
        />
        {customerErrors?.email && <p className="text-sm text-red-500">{customerErrors.email.message}</p>}
        {isAuthenticated && (
          <p className="text-xs text-muted-foreground">Linked to your account</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Phone <span className="text-red-500">*</span></Label>
        <Input type="tel" {...register('customer.phone', { required: 'Required', pattern: { value: /^\d{10,15}$/, message: 'Invalid phone' } })} />
        {customerErrors?.phone && <p className="text-sm text-red-500">{customerErrors.phone.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Company Name</Label>
        <Input {...register('customer.company_name')} placeholder="Your company or organization" />
      </div>
      <div className="space-y-2">
        <Label>Your Role <span className="text-red-500">*</span></Label>
        <Select value={currentRole} onValueChange={(v) => setValue('customer.user_role', v)}>
          <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((group) => (
              <SelectGroup key={group.group}>
                <SelectLabel className="text-xs font-semibold text-gray-500">{group.group}</SelectLabel>
                {group.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Department</Label>
        <Input {...register('customer.department')} placeholder="e.g., IT, Finance, Operations" />
      </div>
      <div className="space-y-2">
        <Label>City <span className="text-red-500">*</span></Label>
        <Input {...register('customer.city', { required: 'Required' })} placeholder="e.g., Chennai, Mumbai" />
        {customerErrors?.city && <p className="text-sm text-red-500">{customerErrors.city.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>District <span className="text-red-500">*</span></Label>
        <Input {...register('customer.district', { required: 'Required' })} />
        {customerErrors?.district && <p className="text-sm text-red-500">{customerErrors.district.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>State <span className="text-red-500">*</span></Label>
        <Input {...register('customer.state', { required: 'Required' })} placeholder="e.g., Tamil Nadu, Maharashtra" />
        {customerErrors?.state && <p className="text-sm text-red-500">{customerErrors.state.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Preferred Language <span className="text-red-500">*</span></Label>
        <Select value={currentLang} onValueChange={(v) => setValue('customer.preferred_lang', v)}>
          <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="english">🇬🇧 English</SelectItem>
            <SelectItem value="tamil">🇮🇳 தமிழ் (Tamil)</SelectItem>
            <SelectItem value="hindi">🇮🇳 हिंदी (Hindi)</SelectItem>
            <SelectItem value="marathi">🇮🇳 मराठी (Marathi)</SelectItem>
            <SelectItem value="telugu">🇮🇳 తెలుగు (Telugu)</SelectItem>
            <SelectItem value="kannada">🇮🇳 ಕನ್ನಡ (Kannada)</SelectItem>
            <SelectItem value="malayalam">🇮🇳 മലയാളം (Malayalam)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Preferred Contact Method <span className="text-red-500">*</span></Label>
        <Select value={currentContact} onValueChange={(v) => setValue('customer.preferred_contact_method', v)}>
          <SelectTrigger><SelectValue placeholder="How should we reach you?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="whatsapp">📱 WhatsApp (Recommended)</SelectItem>
            <SelectItem value="phone">📞 Phone Call</SelectItem>
            <SelectItem value="email">📧 Email</SelectItem>
            <SelectItem value="sms">💬 SMS</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
