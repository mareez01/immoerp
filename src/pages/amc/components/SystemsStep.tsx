import React, { useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlusCircle, Trash2, Monitor, Laptop, Server, HardDrive, HelpCircle, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

const PERFORMANCE_ISSUES = [
  { label: 'Slow Boot', value: 'slow_boot' },
  { label: 'Freezing', value: 'freezing' },
  { label: 'Blue Screen (BSOD)', value: 'bsod' },
  { label: 'Overheating', value: 'overheating' },
  { label: 'Network Issues', value: 'network' },
  { label: 'Software Crashes', value: 'crashes' },
  { label: 'Slow Performance', value: 'slow_performance' },
  { label: 'Virus/Malware', value: 'malware' },
];

const SYSTEM_TYPE_OPTIONS = [
  { group: 'Personal Devices', options: [
    { value: 'laptop', label: 'Laptop', icon: Laptop },
    { value: 'desktop', label: 'Desktop PC', icon: Monitor },
  ]},
  { group: 'Business & Enterprise', options: [
    { value: 'workstation', label: 'Workstation', icon: HardDrive },
    { value: 'server', label: 'Server', icon: Server },
    { value: 'pos', label: 'POS Terminal', icon: Monitor },
  ]},
];

const AMC_PRICE_PER_SYSTEM = 999;

// MAC Address finder instructions component
function MacAddressHelper() {
  const [copied, setCopied] = useState(false);
  
  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    toast.success('Command copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700 h-6 px-2">
          <HelpCircle className="h-3 w-3 mr-1" />
          How to find MAC?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>How to Find Your MAC Address</DialogTitle>
          <DialogDescription>
            The MAC address is a unique identifier for your network adapter. Follow these steps based on your operating system.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="rounded-lg border p-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Monitor className="h-4 w-4" /> Windows
            </h4>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 rounded border">Win + R</kbd></li>
              <li>Type <code className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">cmd</code> and press Enter</li>
              <li>Run this command:</li>
            </ol>
            <div className="mt-2 flex items-center gap-2 bg-gray-900 text-green-400 p-2 rounded font-mono text-xs">
              <code>getmac /v /fo list</code>
              <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-white hover:bg-gray-700" onClick={() => copyCommand('getmac /v /fo list')}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Look for "Physical Address" - it looks like: <code className="bg-gray-100 px-1 rounded">00-1A-2B-3C-4D-5E</code></p>
          </div>
          
          <div className="rounded-lg border p-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Laptop className="h-4 w-4" /> macOS / Linux
            </h4>
            <p className="text-sm text-gray-600 mb-2">Open Terminal and run:</p>
            <div className="flex items-center gap-2 bg-gray-900 text-green-400 p-2 rounded font-mono text-xs">
              <code>ifconfig | grep ether</code>
              <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-white hover:bg-gray-700" onClick={() => copyCommand('ifconfig | grep ether')}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800">
              <strong>Important:</strong> Use the MAC address of your primary network adapter (usually Wi-Fi or Ethernet). This is used to verify your system during remote support.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const getSystemIcon = (type: string) => {
  switch (type) {
    case 'laptop': return <Laptop className="h-4 w-4" />;
    case 'server': return <Server className="h-4 w-4" />;
    case 'workstation': return <HardDrive className="h-4 w-4" />;
    default: return <Monitor className="h-4 w-4" />;
  }
};

const isValidMac = (mac: string) => /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac);

export const SystemsStep: React.FC = () => {
  const { control, register, setValue, watch, formState: { errors } } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: 'systems' });
  const [openItems, setOpenItems] = useState<string[]>([]);

  const systems = watch('systems') || [];
  const totalAmount = systems.length * AMC_PRICE_PER_SYSTEM;

  const addSystem = () => {
    const newId = `system-${fields.length}`;
    append({
      system_name: `System ${fields.length + 1}`,
      system_type: '',
      device_type: '',
      brand: '',
      model: '',
      operating_system: '',
      mac_address: '',
      usage_purpose: '',
      daily_usage_hours: '',
      usage_pattern: '',
      primary_usage_time: '',
      purchase_date: '',
      warranty_status: '',
      current_performance: '',
      performance_issues: [],
      backup_frequency: '',
      antivirus_installed: false,
      antivirus_name: '',
      power_backup: false,
      network_environment: '',
      system_criticality: '',
      downtime_tolerance: '',
      issue_description: '',
      urgency_level: '',
    });
    // Auto-expand the new system
    setOpenItems([...openItems, newId]);
  };

  return (
    <div className="space-y-4">
      {/* Header with pricing info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Add Your Systems</h3>
          <p className="text-sm text-gray-600">Each system covered under AMC costs ₹{AMC_PRICE_PER_SYSTEM}/year</p>
        </div>
        <div className="flex items-center gap-4">
          {systems.length > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-500">{systems.length} system{systems.length > 1 ? 's' : ''}</p>
              <p className="text-xl font-bold text-blue-600">₹{totalAmount.toLocaleString('en-IN')}</p>
            </div>
          )}
          <Button type="button" onClick={addSystem} className="gap-2">
            <PlusCircle className="h-4 w-4" /> Add System
          </Button>
        </div>
      </div>

      {fields.length === 0 && (
        <div className="text-center py-12 px-6 border-2 border-dashed rounded-lg">
          <Monitor className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-700 mb-2">No systems added yet</h4>
          <p className="text-sm text-gray-500 mb-4">Click "Add System" to register your first device for AMC coverage.</p>
          <Button type="button" onClick={addSystem} variant="outline" className="gap-2">
            <PlusCircle className="h-4 w-4" /> Add Your First System
          </Button>
        </div>
      )}

      {fields.length > 0 && (
        <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="space-y-3">
          {fields.map((field, index) => {
            const systemData = watch(`systems.${index}`);
            const macAddress = systemData?.mac_address || '';
            const macValid = isValidMac(macAddress);
            const systemType = systemData?.system_type || '';
            const systemName = systemData?.system_name || `System ${index + 1}`;
            const performanceIssues = systemData?.performance_issues || [];
            const antivirusInstalled = systemData?.antivirus_installed || false;

            return (
              <AccordionItem
                key={field.id}
                value={`system-${index}`}
                className="border rounded-lg overflow-hidden shadow-sm"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-gray-50">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${systemType ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                        {getSystemIcon(systemType)}
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{systemName}</p>
                        <p className="text-xs text-gray-500">
                          {systemType ? systemType.charAt(0).toUpperCase() + systemType.slice(1) : 'Type not selected'}
                          {systemData?.brand && ` • ${systemData.brand}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {macValid ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> MAC Valid
                        </Badge>
                      ) : macAddress ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" /> Invalid MAC
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                          MAC Required
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); remove(index); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-6">
                    {/* System Identity */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Monitor className="h-4 w-4" /> System Identity
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label>System Name <span className="text-red-500">*</span></Label>
                          <Input {...register(`systems.${index}.system_name`, { required: 'Required' })} placeholder="e.g., Office PC, My Laptop" />
                        </div>
                        <div className="space-y-1">
                          <Label>System Type <span className="text-red-500">*</span></Label>
                          <Select value={systemType} onValueChange={(v) => { setValue(`systems.${index}.system_type`, v); setValue(`systems.${index}.device_type`, v); }}>
                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              {SYSTEM_TYPE_OPTIONS.map((group) => (
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
                        <div className="space-y-1">
                          <Label>Brand</Label>
                          <Input {...register(`systems.${index}.brand`)} placeholder="Dell, HP, Lenovo, etc." />
                        </div>
                        <div className="space-y-1">
                          <Label>Model</Label>
                          <Input {...register(`systems.${index}.model`)} placeholder="e.g., Inspiron 15, ThinkPad T14" />
                        </div>
                        <div className="space-y-1">
                          <Label>Operating System</Label>
                          <Select onValueChange={(v) => setValue(`systems.${index}.operating_system`, v)}>
                            <SelectTrigger><SelectValue placeholder="Select OS" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="windows_11">Windows 11</SelectItem>
                              <SelectItem value="windows_10">Windows 10</SelectItem>
                              <SelectItem value="windows_7">Windows 7</SelectItem>
                              <SelectItem value="macos">macOS</SelectItem>
                              <SelectItem value="linux">Linux</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label>MAC Address <span className="text-red-500">*</span></Label>
                            <MacAddressHelper />
                          </div>
                          <Input
                            {...register(`systems.${index}.mac_address`, {
                              required: 'MAC address is required',
                              pattern: { value: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, message: 'Invalid MAC format' }
                            })}
                            placeholder="00:1A:2B:3C:4D:5E"
                            className={`font-mono ${macAddress && !macValid ? 'border-red-300 focus:border-red-500' : macValid ? 'border-green-300 focus:border-green-500' : ''}`}
                          />
                          {macAddress && !macValid && <p className="text-xs text-red-500">Format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX</p>}
                        </div>
                      </div>
                    </div>

                    {/* Usage Pattern */}
                    <div className="pt-4 border-t">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">📊 Usage Pattern</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label>Daily Usage <span className="text-red-500">*</span></Label>
                          <Select onValueChange={(v) => setValue(`systems.${index}.daily_usage_hours`, v)}>
                            <SelectTrigger><SelectValue placeholder="How many hours?" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1-3">1-3 hours (Light)</SelectItem>
                              <SelectItem value="4-8">4-8 hours (Moderate)</SelectItem>
                              <SelectItem value="8+">8+ hours (Heavy)</SelectItem>
                              <SelectItem value="24/7">24/7 (Always On)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Usage Frequency <span className="text-red-500">*</span></Label>
                          <Select onValueChange={(v) => setValue(`systems.${index}.usage_pattern`, v)}>
                            <SelectTrigger><SelectValue placeholder="How often?" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekdays">Weekdays Only</SelectItem>
                              <SelectItem value="weekly">Few Times a Week</SelectItem>
                              <SelectItem value="occasional">Occasionally</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Primary Usage Time</Label>
                          <Select onValueChange={(v) => setValue(`systems.${index}.primary_usage_time`, v)}>
                            <SelectTrigger><SelectValue placeholder="When mostly used?" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="morning">Morning (6AM-12PM)</SelectItem>
                              <SelectItem value="afternoon">Afternoon (12PM-6PM)</SelectItem>
                              <SelectItem value="evening">Evening (6PM-10PM)</SelectItem>
                              <SelectItem value="night">Night (10PM-6AM)</SelectItem>
                              <SelectItem value="all_day">Throughout the Day</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Performance & Criticality */}
                    <div className="pt-4 border-t">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">⚡ Performance & Criticality</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label>Current Performance <span className="text-red-500">*</span></Label>
                          <Select onValueChange={(v) => setValue(`systems.${index}.current_performance`, v)}>
                            <SelectTrigger><SelectValue placeholder="How is it performing?" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="excellent">🟢 Excellent - No issues</SelectItem>
                              <SelectItem value="good">🟡 Good - Minor issues</SelectItem>
                              <SelectItem value="average">🟠 Average - Some problems</SelectItem>
                              <SelectItem value="poor">🔴 Poor - Needs attention</SelectItem>
                              <SelectItem value="very_poor">⚫ Very Poor - Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>System Criticality <span className="text-red-500">*</span></Label>
                          <Select onValueChange={(v) => setValue(`systems.${index}.system_criticality`, v)}>
                            <SelectTrigger><SelectValue placeholder="How important is this system?" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="business_critical">🔴 Business Critical - Cannot work without it</SelectItem>
                              <SelectItem value="important">🟠 Important - Affects productivity</SelectItem>
                              <SelectItem value="moderate">🟡 Moderate - Can manage temporarily</SelectItem>
                              <SelectItem value="low">🟢 Low - Nice to have</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Performance Issues */}
                      <div className="mt-4">
                        <Label className="mb-2 block">Known Issues (Select all that apply)</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {PERFORMANCE_ISSUES.map((issue) => (
                            <div key={issue.value} className="flex items-center space-x-2">
                              <Checkbox
                                checked={performanceIssues.includes(issue.value)}
                                onCheckedChange={(c) => {
                                  const newVal = c ? [...performanceIssues, issue.value] : performanceIssues.filter((v: string) => v !== issue.value);
                                  setValue(`systems.${index}.performance_issues`, newVal);
                                }}
                              />
                              <Label className="text-sm font-normal cursor-pointer">{issue.label}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Environment & Security */}
                    <div className="pt-4 border-t">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">🔒 Environment & Security</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label>Backup Frequency</Label>
                          <Select onValueChange={(v) => setValue(`systems.${index}.backup_frequency`, v)}>
                            <SelectTrigger><SelectValue placeholder="How often do you backup?" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="rarely">Rarely</SelectItem>
                              <SelectItem value="never">Never</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Network Type</Label>
                          <Select onValueChange={(v) => setValue(`systems.${index}.network_environment`, v)}>
                            <SelectTrigger><SelectValue placeholder="Where is it connected?" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="home">Home Network</SelectItem>
                              <SelectItem value="office">Office Network</SelectItem>
                              <SelectItem value="public">Public WiFi Often</SelectItem>
                              <SelectItem value="mixed">Mixed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Downtime Tolerance</Label>
                          <Select onValueChange={(v) => setValue(`systems.${index}.downtime_tolerance`, v)}>
                            <SelectTrigger><SelectValue placeholder="How urgent is a fix?" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="immediate_fix">Immediate - Cannot wait</SelectItem>
                              <SelectItem value="same_day">Same Day</SelectItem>
                              <SelectItem value="within_week">Within a Week</SelectItem>
                              <SelectItem value="flexible">Flexible</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-6 mt-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox checked={antivirusInstalled} onCheckedChange={(c) => setValue(`systems.${index}.antivirus_installed`, c)} />
                          <Label className="font-normal">Antivirus Installed</Label>
                        </div>
                        {antivirusInstalled && (
                          <Input {...register(`systems.${index}.antivirus_name`)} placeholder="Antivirus name" className="w-48" />
                        )}
                        <div className="flex items-center space-x-2">
                          <Checkbox onCheckedChange={(c) => setValue(`systems.${index}.power_backup`, c)} />
                          <Label className="font-normal">UPS/Power Backup Available</Label>
                        </div>
                      </div>
                    </div>

                    {/* Issue Description */}
                    <div className="pt-4 border-t">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">📝 Current Issues (Optional)</h5>
                      <Textarea
                        {...register(`systems.${index}.issue_description`)}
                        placeholder="Describe any specific problems you're experiencing with this system..."
                        rows={3}
                      />
                      <div className="mt-3 flex items-center gap-4">
                        <Label className="text-sm">Urgency:</Label>
                        <Select onValueChange={(v) => setValue(`systems.${index}.urgency_level`, v)}>
                          <SelectTrigger className="w-40"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">🟢 Low</SelectItem>
                            <SelectItem value="medium">🟡 Medium</SelectItem>
                            <SelectItem value="high">🟠 High</SelectItem>
                            <SelectItem value="critical">🔴 Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {errors.systems && typeof errors.systems.message === 'string' && (
        <p className="text-sm text-red-500">{errors.systems.message}</p>
      )}
    </div>
  );
};
