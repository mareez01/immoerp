import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

const USAGE_PURPOSE_OPTIONS = [
  { group: 'Business', options: [
    { value: 'office_work', label: '🏢 Office Work (Documents, Email, etc.)' },
    { value: 'accounting', label: '📊 Accounting & Finance (Tally, SAP, etc.)' },
    { value: 'design', label: '🎨 Design & Creative (Photoshop, CAD, etc.)' },
    { value: 'development', label: '💻 Software Development' },
    { value: 'retail_pos', label: '🛒 Retail / POS Systems' },
    { value: 'manufacturing', label: '🏭 Manufacturing & Industrial' },
    { value: 'healthcare', label: '🏥 Healthcare / Clinic' },
    { value: 'education', label: '📚 Education / Training' },
  ]},
  { group: 'Personal', options: [
    { value: 'home_use', label: '🏠 Home / Personal Use' },
    { value: 'gaming', label: '🎮 Gaming' },
    { value: 'media', label: '📺 Media & Entertainment' },
    { value: 'student', label: '🎓 Student / Academic' },
  ]},
  { group: 'Other', options: [
    { value: 'mixed', label: '🔄 Mixed (Business + Personal)' },
    { value: 'server', label: '🖥️ Server / Network Infrastructure' },
    { value: 'other', label: '❓ Other' },
  ]},
];

const LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English' },
  { value: 'tamil', label: 'தமிழ் (Tamil)' },
  { value: 'hindi', label: 'हिंदी (Hindi)' },
  { value: 'marathi', label: 'मराठी (Marathi)' },
  { value: 'telugu', label: 'తెలుగు (Telugu)' },
  { value: 'kannada', label: 'ಕನ್ನಡ (Kannada)' },
  { value: 'malayalam', label: 'മലയാളം (Malayalam)' },
];

export const ContextStep: React.FC = () => {
  const { register, setValue, watch, formState: { errors } } = useFormContext();
  const contextErrors = (errors as any).context;
  const remoteConsent = watch('context.consent_remote_access');
  const currentPurpose = watch('context.system_usage_purpose');
  const languagesKnown = watch('context.languages_known') || [];

  const toggleLanguage = (lang: string) => {
    const current = Array.isArray(languagesKnown) ? languagesKnown : [];
    if (current.includes(lang)) {
      setValue('context.languages_known', current.filter((l: string) => l !== lang));
    } else {
      setValue('context.languages_known', [...current, lang]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>System Usage Purpose <span className="text-red-500">*</span></Label>
        <Select value={currentPurpose} onValueChange={(v) => setValue('context.system_usage_purpose', v)}>
          <SelectTrigger><SelectValue placeholder="What do you primarily use your systems for?" /></SelectTrigger>
          <SelectContent>
            {USAGE_PURPOSE_OPTIONS.map((group) => (
              <SelectGroup key={group.group}>
                <SelectLabel className="text-xs font-semibold text-gray-500">{group.group}</SelectLabel>
                {group.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {contextErrors?.system_usage_purpose && <p className="text-sm text-red-500">{contextErrors.system_usage_purpose.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Languages You Speak <span className="text-red-500">*</span></Label>
        <p className="text-xs text-gray-500 mb-2">Select all languages you're comfortable communicating in</p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((lang) => {
            const isSelected = Array.isArray(languagesKnown) && languagesKnown.includes(lang.value);
            return (
              <Badge
                key={lang.value}
                variant={isSelected ? "default" : "outline"}
                className={`cursor-pointer transition-all ${isSelected ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-100'}`}
                onClick={() => toggleLanguage(lang.value)}
              >
                {lang.label}
              </Badge>
            );
          })}
        </div>
        {languagesKnown.length === 0 && <p className="text-sm text-amber-600">Please select at least one language</p>}
      </div>

      <div className="space-y-2">
        <Label>Previous Service History</Label>
        <Textarea {...register('context.previous_service_history')} placeholder="Any prior AMC or service experience with us or others..." rows={3} />
      </div>

      <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Checkbox id="remote_consent" checked={remoteConsent} onCheckedChange={(c) => setValue('context.consent_remote_access', c)} className="mt-1" />
          <div>
            <Label htmlFor="remote_consent" className="font-medium text-blue-900">
              I consent to remote access for diagnostics and maintenance <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-blue-700 mt-1">This allows our technicians to remotely diagnose and fix issues on your systems when needed.</p>
          </div>
        </div>
      </div>

      {remoteConsent && (
        <div className="space-y-2 pl-4 border-l-4 border-blue-300">
          <Label>Preferred Remote Tool</Label>
          <Select onValueChange={(v) => setValue('context.remote_software_preference', v)}>
            <SelectTrigger><SelectValue placeholder="Which remote tool do you prefer?" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="anydesk">AnyDesk (Recommended)</SelectItem>
              <SelectItem value="teamviewer">TeamViewer</SelectItem>
              <SelectItem value="rustdesk">RustDesk</SelectItem>
              <SelectItem value="ultraviewer">UltraViewer</SelectItem>
              <SelectItem value="no_preference">No Preference - You Decide</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
