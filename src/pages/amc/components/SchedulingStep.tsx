import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 9; hour <= 17; hour++) {
    const t = hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    slots.push({ label: `${t}:00 ${ampm}`, value: `${hour.toString().padStart(2, '0')}:00` });
    if (hour < 17) slots.push({ label: `${t}:30 ${ampm}`, value: `${hour.toString().padStart(2, '0')}:30` });
  }
  return slots;
};
const timeSlots = generateTimeSlots();

// Format date to YYYY-MM-DD without timezone issues
const formatDateToYMD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getAvailableDates = () => {
  const dates: { date: Date; dateStr: string }[] = [];
  let d = new Date();
  d.setDate(d.getDate() + 1);
  while (dates.length < 30) {
    if (d.getDay() !== 0) {
      dates.push({ date: new Date(d), dateStr: formatDateToYMD(d) });
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
};

export const SchedulingStep: React.FC = () => {
  const { register, setValue, watch, formState: { errors } } = useFormContext();
  const schedulingErrors = (errors as any).scheduling;
  const selectedDate = watch('scheduling.scheduled_date');
  const selectedTime = watch('scheduling.scheduled_time');
  const availableDates = getAvailableDates();

  const formatDate = (ds: string) => {
    if (!ds) return '';
    const [y, m, day] = ds.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Schedule Your Service</h3>
        <p className="text-sm text-gray-600">Choose a preferred date and time for the initial consultation.</p>
      </div>

      <div>
        <Label>Select Date <span className="text-red-500">*</span></Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 max-h-48 overflow-y-auto border rounded-lg p-3">
          {availableDates.map((item, i) => {
            const isSelected = selectedDate === item.dateStr;
            return (
              <button key={i} type="button" onClick={() => { setValue('scheduling.scheduled_date', item.dateStr); setValue('scheduling.scheduled_time', ''); }}
                className={`p-2 text-sm rounded-lg border ${isSelected ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'}`}>
                <div className="font-medium">{item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div className="text-xs">{item.date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              </button>
            );
          })}
        </div>
        {selectedDate && <Badge className="mt-2 bg-blue-50 text-blue-900">{formatDate(selectedDate)}</Badge>}
        {schedulingErrors?.scheduled_date && <p className="text-sm text-red-500">{schedulingErrors.scheduled_date.message}</p>}
      </div>

      {selectedDate && (
        <div>
          <Label>Select Time <span className="text-red-500">*</span></Label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2">
            {timeSlots.map((s) => {
              const isSelected = selectedTime === s.value;
              return (
                <button key={s.value} type="button" onClick={() => setValue('scheduling.scheduled_time', s.value)}
                  className={`p-2 text-sm rounded-lg border ${isSelected ? 'bg-green-500 text-white' : 'bg-white hover:bg-gray-50'}`}>
                  {s.label}
                </button>
              );
            })}
          </div>
          {selectedTime && <Badge className="mt-2 bg-green-50 text-green-900">{timeSlots.find(t => t.value === selectedTime)?.label}</Badge>}
          {schedulingErrors?.scheduled_time && <p className="text-sm text-red-500">{schedulingErrors.scheduled_time.message}</p>}
        </div>
      )}

      {selectedDate && selectedTime && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <h4 className="font-medium text-blue-900 mb-2">Appointment Summary</h4>
            <p className="text-sm text-blue-800"><strong>Date:</strong> {formatDate(selectedDate)}</p>
            <p className="text-sm text-blue-800"><strong>Time:</strong> {timeSlots.find(t => t.value === selectedTime)?.label}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <Label>Downtime Tolerance</Label>
        <Select onValueChange={(v) => setValue('scheduling.downtime_tolerance', v)}>
          <SelectTrigger><SelectValue placeholder="How critical is a quick fix?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="immediate_fix">Immediate</SelectItem>
            <SelectItem value="same_day">Same Day</SelectItem>
            <SelectItem value="within_week">Within a Week</SelectItem>
            <SelectItem value="flexible">Flexible</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="hidden">
        <Input {...register('scheduling.scheduled_date', { required: 'Select a date' })} />
        <Input {...register('scheduling.scheduled_time', { required: 'Select a time' })} />
      </div>
    </div>
  );
};
