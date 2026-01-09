import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Clock, Image as ImageIcon, MoreHorizontal, Eye, Edit, CheckCircle, FileText, Camera, MessageCircle, Search, Building, Phone, Mail, MapPin, AlertCircle, X, Upload, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { DrawerPanel } from '@/components/ui/drawer-panel';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn, formatAmcId } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorksheetNotifications } from '@/hooks/use-realtime';

// Utility function to compress images
const compressImage = (file: File, maxWidth = 1024, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new window.Image();
    
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/jpeg', quality);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Upload images to Supabase storage
const uploadImages = async (files: FileList | File[]): Promise<string[]> => {
  const uploadPromises = Array.from(files).map(async (file) => {
    try {
      // Compress image
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      // Generate unique filename
      const fileExt = 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `worksheet-images/${fileName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('worksheets')
        .upload(filePath, compressedFile);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('worksheets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  });

  return Promise.all(uploadPromises);
};

interface Worksheet {
  id: string;
  amc_order_id: string;
  amc_form_id: string; // Added for clarity
  amc_number?: string;
  staff_id: string;
  staff_name?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_company?: string;
  customer_city?: string;
  order_description?: string;
  urgency_level?: string;
  time_spent_minutes: number;
  tasks_performed?: string;
  issues_resolved?: string;
  status: string;
  created_at: string;
  updated_at: string;
  systems_count: number;
}

interface WorkLog {
  id: string;
  worksheet_id: string;
  description: string;
  log_type: string;
  time_spent_minutes: number;
  images?: string[];
  status?: 'pending' | 'approved' | 'rejected';
  is_internal?: boolean;
  internal_notes?: string;
  created_at: string;
}

interface SystemInfo {
  id: number;
  device_type: string;
  device_name: string;
  operating_system?: string;
}

interface AmcOrderDetail {
  amc_form_id: string;
  amc_number?: string;
  full_name: string;
  email: string;
  phone: string;
  company_name?: string;
  city: string;
  state: string;
  district: string;
  problem_description?: string;
  service_work_description?: string;
  internal_notes?: string;
  remote_software_preference?: string;
  preferred_lang?: string;
  consent_remote_access?: boolean;
  urgency_level?: string;
  status: string;
  created_at: string;
  systems: SystemInfo[];
}

export default function WorksheetsPage() {
  const { user, session } = useAuth();
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<AmcOrderDetail[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedWorksheet, setSelectedWorksheet] = useState<Worksheet | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<AmcOrderDetail | null>(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isAddLogDrawerOpen, setIsAddLogDrawerOpen] = useState(false);
  const [isOrderSearchOpen, setIsOrderSearchOpen] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AmcOrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddLogDialogOpen, setIsAddLogDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');

  // Real-time worksheet notifications
  const fetchWorksheetsCallback = useCallback(() => {
    fetchWorksheets();
  }, []);

  useWorksheetNotifications({
    onNewWorksheet: fetchWorksheetsCallback,
    onWorksheetUpdate: fetchWorksheetsCallback,
    onNewWorkLog: (log) => {
      if (selectedWorksheet && log.worksheet_id === selectedWorksheet.id) {
        fetchWorkLogs(selectedWorksheet.id);
      }
    },
  });

  const handleWorksheetFileUpload = async (files: FileList) => {
    if (files.length === 0) return;
    try {
      setIsUploadingImages(true);
      const urls = await uploadImages(files);
      setUploadedImageUrls(prev => [...prev, ...urls]);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload images');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removeUploadedImageUrl = (index: number) => {
    setUploadedImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const [logType, setLogType] = useState('progress');
  const [logTimeHours, setLogTimeHours] = useState(0);
  const [logTimeMinutes, setLogTimeMinutes] = useState(15);
  const [logDescription, setLogDescription] = useState('');
  const [isInternalLog, setIsInternalLog] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTechnician = user?.role === 'technician';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchWorksheets();
    if (isTechnician) {
      fetchAssignedOrders();
    }
  }, [isTechnician, session?.user?.id]);

  // Calculate total time spent on an order
  const calculateTotalTimeSpent = (logs: WorkLog[], worksheetTime: number = 0): number => {
    const logTime = logs.reduce((total, log) => total + (log.time_spent_minutes || 0), 0);
    return logTime + worksheetTime;
  };

  const fetchWorksheets = async () => {
    try {
      let query = supabase
        .from('worksheets')
        .select(`
          *,
          staff:profiles!worksheets_staff_id_fkey (full_name),
          order:amc_responses!worksheets_amc_order_id_fkey (
            amc_form_id,
            amc_number,
            full_name,
            email,
            phone,
            company_name,
            city,
            state,
            district,
            problem_description,
            urgency_level,
            system_usage_purpose
          )
        `);

      // Filter for technician
      if (isTechnician && user?.profile_id) {
        query = query.eq('staff_id', user.profile_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Use amc_form_id for system count - cast data to any to handle schema type mismatches
      const worksheetData = data as any[];
      const formIds = worksheetData?.map(w => w.order?.amc_form_id).filter(Boolean) || [];
      const { data: systems } = await supabase
        .from('amc_systems')
        .select('amc_form_id')
        .in('amc_form_id', formIds);

      const systemsCountMap = new Map<string, number>();
      systems?.forEach(s => {
        systemsCountMap.set(s.amc_form_id, (systemsCountMap.get(s.amc_form_id) || 0) + 1);
      });

      const worksheetsWithDetails = (data || []).map((w: any) => {
        // Handle cases where join results might be arrays or using aliases
        const profile = Array.isArray(w.staff) ? w.staff[0] : w.staff;
        const response = Array.isArray(w.order) ? w.order[0] : w.order;

        return {
          id: w.id,
          amc_order_id: w.amc_order_id,
          amc_form_id: response?.amc_form_id || w.amc_order_id,
          amc_number: response?.amc_number || '',
          staff_id: w.staff_id,
          staff_name: profile?.full_name || 'Unknown',
          customer_name: response?.full_name || 'Unknown',
          customer_email: response?.email || '',
          customer_phone: response?.phone || '',
          customer_company: response?.company_name || '',
          customer_city: `${response?.city || ''}, ${response?.state || ''}`,
          order_description: response?.problem_description || response?.system_usage_purpose || '',
          urgency_level: response?.urgency_level || 'normal',
          time_spent_minutes: w.time_spent_minutes || 0,
          tasks_performed: w.tasks_performed,
          issues_resolved: w.issues_resolved,
          status: w.status || 'draft',
          created_at: w.created_at,
          updated_at: w.updated_at,
          systems_count: systemsCountMap.get(response?.amc_form_id) || 0,
        };
      });

      setWorksheets(worksheetsWithDetails);
    } catch (error) {
      console.error('Error fetching worksheets:', error);
      toast.error('Failed to load worksheets');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssignedOrders = async () => {
    if (!session?.user?.id) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) return;

      const { data, error } = await (supabase
        .from('amc_responses')
        .select('*')
        .eq('assigned_to', profile.id)
        .not('status', 'eq', 'inactive')
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;

      const ordersWithSystems = await Promise.all(
        ((data as any[]) || []).map(async (order) => {
          const { data: systems } = await supabase
            .from('amc_systems')
            .select('*')
            .eq('amc_form_id', order.amc_form_id);

          return {
            ...order,
            systems: systems || [],
          };
        })
      );

      setAssignedOrders(ordersWithSystems);
    } catch (error) {
      console.error('Error fetching assigned orders:', error);
    }
  };

  const fetchWorkLogs = async (worksheetId: string) => {
    try {
      const { data: logsData, error: logsError } = await supabase
        .from('work_logs')
        .select('*')
        .eq('worksheet_id', worksheetId)
        .order('created_at', { ascending: true });

      if (logsError) throw logsError;

      const logs = (logsData || []).map((log: any) => ({
        id: log.id,
        worksheet_id: log.worksheet_id,
        description: log.description,
        log_type: log.log_type,
        time_spent_minutes: log.time_spent_minutes || 0,
        images: log.images || [],
        status: 'approved' as const,
        is_internal: log.is_internal ?? false,
        internal_notes: log.internal_notes || '',
        created_at: log.created_at
      }));

      // Calculate sum from logs to ensure accuracy in current view
      const logsSum = logs.reduce((sum, log) => sum + (log.time_spent_minutes || 0), 0);

      setWorkLogs(logs);
      setTotalTimeSpent(logsSum);
    } catch (error: any) {
      console.error('Error fetching work logs:', error);
      toast.error('Failed to load work logs. Please ensure database migrations are applied.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 images
    const newFiles = files.slice(0, 5 - uploadedImages.length);
    setUploadedImages(prev => [...prev, ...newFiles]);

    // Create previews
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Handle adding work log from dialog
  const handleAddWorkLog = async () => {
    if (!selectedWorksheet) return;

    // Determine values based on which UI is actually open
    let description = logDescription;
    let type = logType;
    let hours = logTimeHours;
    let minutes = logTimeMinutes;
    let isInternal = isInternalLog;
    let notes = internalNotes;

    // If using the Drawer panel (which uses a native form), get values from there
    if (isAddLogDrawerOpen) {
      const logForm = document.getElementById('log-form') as HTMLFormElement;
      if (logForm) {
        const formData = new FormData(logForm);
        description = formData.get('description') as string || '';
        type = formData.get('log_type') as string || 'progress';
        hours = parseInt(formData.get('log_hours') as string || '0');
        minutes = parseInt(formData.get('log_minutes') as string || '0');
        isInternal = formData.get('is_internal') === 'true';
        notes = formData.get('internal_notes') as string || '';
      }
    }

    if (!description || !description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Calculate total time spent
      const timeSpent = hours * 60 + minutes;
      
      // Upload images if any
      let imageUrls: string[] = [];
      if (uploadedImages.length > 0) {
        try {
          imageUrls = await uploadImages(uploadedImages);
        } catch (uploadErr) {
          console.error('Image upload failed during log addition:', uploadErr);
          toast.error('Failed to upload some images. Proceeding with log only.');
        }
      }

      // Add the work log
      await addWorkLog(
        selectedWorksheet.id,
        description,
        type,
        imageUrls,
        timeSpent,
        isInternal,
        notes
      );

      toast.success(
        isAdmin 
          ? 'Log entry added successfully' 
          : 'Log entry added - worksheet pending approval'
      );
      resetLogForm();
      setIsAddLogDialogOpen(false);
      setIsAddLogDrawerOpen(false);
      fetchWorksheets();
    } catch (error: any) {
      console.error('Error in handleAddWorkLog:', error);
      toast.error(error.message || 'Failed to add work log');
    } finally {
      setIsSubmitting(false);
    }
  };

  const searchOrders = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('amc_responses')
        .select(`
          amc_form_id,
          amc_number,
          full_name,
          email,
          phone,
          company_name,
          city,
          state,
          district,
          problem_description,
          service_work_description,
          internal_notes,
          remote_software_preference,
          preferred_lang,
          consent_remote_access,
          urgency_level,
          status,
          created_at
        `)
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,amc_number.ilike.%${query}%`)
        .not('status', 'in', '("inactive", "cancelled")')
        .limit(10);

      if (error) throw error;

      const ordersWithSystems = await Promise.all(
        ((data as any[]) || []).map(async (order) => {
          const { data: systems } = await supabase
            .from('amc_systems')
            .select('*')
            .eq('amc_form_id', order.amc_form_id);

          return {
            ...order,
            systems: systems || [],
          };
        })
      );

      setSearchResults(ordersWithSystems);
    } catch (error) {
      console.error('Error searching orders:', error);
      toast.error('Failed to search orders');
    }
  };

  const handleCreateWorksheet = async (orderDetail: AmcOrderDetail) => {
    setSelectedOrderDetail(orderDetail);
    setUploadedImageUrls([]);
    setIsOrderSearchOpen(false);
    setIsCreateDrawerOpen(true);
  };

  const handleSaveWorksheet = async (formData: FormData, status: 'draft' | 'pending_approval') => {
    if (!session?.user?.id || !selectedOrderDetail) return;

    try {
      setIsSubmitting(true);
      // Get profile id
      const { data: profile } = await supabase  
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const hours = parseInt(formData.get('hours') as string) || 0;
      const minutes = parseInt(formData.get('minutes') as string) || 0;
      const initialTimeSpent = hours * 60 + minutes;

      // For edits, require approval unless it's admin
      const finalStatus = selectedWorksheet && !isAdmin ? 'pending_approval' : status;

      const worksheetData: any = {
        amc_order_id: selectedOrderDetail.amc_form_id,
        staff_id: profile.id,
        tasks_performed: formData.get('tasks_performed') as string,
        issues_resolved: formData.get('issues_resolved') as string,
        status: finalStatus,
      };

      let worksheetId: string;

      if (selectedWorksheet) {
        const { error } = await supabase
          .from('worksheets')
          .update({ ...worksheetData, updated_at: new Date().toISOString() })
          .eq('id', selectedWorksheet.id);

        if (error) throw error;
        worksheetId = selectedWorksheet.id;
        
        // If the user changed hours/minutes in the edit form, we don't apply it directly
        // to worksheets table anymore, because logs are the source of truth.
        // We could theoretically add a correction log, but usually tech should use Log Entry.
        
        await addWorkLog(
          worksheetId, 
          'Worksheet details updated', 
          'note', 
          uploadedImageUrls,
          0,
          true, // internal log for edits
          'Details updated via edit form'
        );
      } else {
        const { data: newWorksheet, error } = await supabase
          .from('worksheets')
          .insert({ ...worksheetData, time_spent_minutes: 0 }) 
          .select('id')
          .single();

        if (error) throw error;
        worksheetId = newWorksheet.id;

        // Create initial log entry with the time from the form
        const initialDescription = (formData.get('initial_description') as string) || `Worksheet created. Initial work session: ${Math.floor(initialTimeSpent / 60)}h ${initialTimeSpent % 60}m`;
        await addWorkLog(
          worksheetId, 
          initialDescription, 
          'progress', 
          uploadedImageUrls,
          initialTimeSpent
        );
      }

      toast.success(
        selectedWorksheet 
          ? (isAdmin ? 'Worksheet updated' : 'Worksheet updated - pending approval')
          : 'Worksheet created successfully'
      );
      
      // Reset upload state
      setUploadedImageUrls([]);
      setIsCreateDrawerOpen(false);
      setSelectedWorksheet(null);
      setSelectedOrderDetail(null);
      fetchWorksheets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save worksheet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addWorkLog = async (
    worksheetId: string, 
    description: string, 
    logType: string = 'progress', 
    images: string[] = [],
    timeSpentMinutes: number = 0,
    isInternal: boolean = false,
    internalNotes: string = ''
  ) => {
    try {
      const { error: logError } = await supabase
        .from('work_logs')
        .insert({
          worksheet_id: worksheetId,
          description,
          log_type: logType,
          time_spent_minutes: timeSpentMinutes,
          images: images.length > 0 ? images : null,
          is_internal: isInternal,
          internal_notes: internalNotes,
        });

      if (logError) throw logError;
      
      // Prepare worksheet updates
      const worksheetUpdates: any = {
        updated_at: new Date().toISOString()
      };

      // Force status to pending_approval for all non-admin work entries
      // This ensures fresh logs are always reviewed by an admin
      if (!isAdmin) {
        worksheetUpdates.status = 'pending_approval';
      }

      // Update the worksheet
      const { error: wsUpdateError } = await supabase
        .from('worksheets')
        .update(worksheetUpdates)
        .eq('id', worksheetId);
          
      if (wsUpdateError) throw wsUpdateError;

      // Update local state for immediate UI feedback
      if (selectedWorksheet && selectedWorksheet.id === worksheetId) {
        setSelectedWorksheet(prev => prev ? { ...prev, ...worksheetUpdates } : null);
        fetchWorkLogs(worksheetId);
      }
      
      // Refresh the list to reflect status changes everywhere
      fetchWorksheets();
    } catch (error) {
      console.error('Error adding work log:', error);
      throw error;
    }
  };

  const filteredWorksheets = selectedTab === 'all'
    ? worksheets
    : worksheets.filter(w => w.status === selectedTab);

  const pendingApprovalCount = worksheets.filter(w => w.status === 'pending_approval').length;

  const columns: Column<Worksheet>[] = [
    {
      key: 'amc_form_id',
      header: 'AMC ID',
      cell: (worksheet) => <span className="font-mono text-xs">{formatAmcId(worksheet.amc_number, worksheet.amc_form_id)}</span>,
    },
    {
      key: 'customer_name',
      header: 'Customer',
      cell: (worksheet) => (
        <div className="flex flex-col">
          <span className="font-medium">{worksheet.customer_name}</span>
          <span className="text-xs text-muted-foreground">{worksheet.customer_email}</span>
        </div>
      ),
    },
    {
      key: 'staff_name',
      header: 'Technician',
      cell: (worksheet) => (
        <span className="text-foreground font-medium">{worksheet.staff_name}</span>
      ),
    },
    {
      key: 'time_spent_minutes',
      header: 'Time Logged',
      cell: (worksheet) => (
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {Math.floor(worksheet.time_spent_minutes / 60)}h {worksheet.time_spent_minutes % 60}m
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (worksheet) => {
        const variant = worksheet.status === 'pending_approval' ? 'pending' : worksheet.status;
        return (
          <StatusBadge variant={variant as any}>
            {worksheet.status === 'pending_approval' ? 'Pending Approval' : formatStatus(worksheet.status)}
          </StatusBadge>
        );
      },
    },
    {
      key: 'updated_at',
      header: 'Last Updated',
      cell: (worksheet) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(worksheet.updated_at), 'MMM dd, yyyy HH:mm')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (worksheet) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(worksheet)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {isTechnician && (
              <>
                <DropdownMenuItem onClick={() => handleAddLogEntry(worksheet)}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Add Log Entry
                </DropdownMenuItem>
                {worksheet.status !== 'approved' && (
                  <DropdownMenuItem onClick={() => handleEdit(worksheet)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Worksheet
                  </DropdownMenuItem>
                )}
              </>
            )}
            {isAdmin && worksheet.status === 'pending_approval' && (
              <DropdownMenuItem onClick={() => handleApprove(worksheet)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-12',
    },
  ];

  const resetLogForm = () => {
    setLogDescription('');
    setLogType('progress');
    setLogTimeHours(0);
    setLogTimeMinutes(15);
    setIsInternalLog(false);
    setInternalNotes('');
    setUploadedImages([]);
    setImagePreviews([]);
  };

  const handleApprove = async (worksheet: Worksheet) => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('worksheets')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', worksheet.id);

      if (error) throw error;
      toast.success('Worksheet approved');
      setIsViewDrawerOpen(false);
      fetchWorksheets();
    } catch (error) {
      console.error('Error approving worksheet:', error);
      toast.error('Failed to approve worksheet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (worksheet: Worksheet) => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('worksheets')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', worksheet.id);

      if (error) throw error;
      toast.success('Worksheet rejected');
      setIsViewDrawerOpen(false);
      fetchWorksheets();
    } catch (error) {
      console.error('Error rejecting worksheet:', error);
      toast.error('Failed to reject worksheet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestApproval = async (worksheet: Worksheet) => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('worksheets')
        .update({ status: 'pending_approval', updated_at: new Date().toISOString() })
        .eq('id', worksheet.id);

      if (error) throw error;
      
      toast.success('Approval requested successfully');
      setIsViewDrawerOpen(false);
      fetchWorksheets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to request approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleView = (worksheet: Worksheet) => {
    setSelectedWorksheet(worksheet);
    fetchWorkLogs(worksheet.id);
    setIsViewDrawerOpen(true);
  };

  const handleEdit = async (worksheet: Worksheet) => {
    // Fetch full order details for editing
    const { data: orderData } = await (supabase
      .from('amc_responses')
      .select(`
        amc_form_id,
        amc_number,
        full_name,
        email,
        phone,
        company_name,
        city,
        state,
        district,
        problem_description,
        urgency_level,
        status,
        created_at
      `)
      .eq('amc_form_id', worksheet.amc_order_id)
      .single() as any);

    if (orderData) {
      const { data: systems } = await supabase
        .from('amc_systems')
        .select('*')
        .eq('amc_form_id', orderData.amc_form_id);

      setSelectedOrderDetail({
        ...(orderData as any),
        systems: systems || [],
      });
    }
    
    setSelectedWorksheet(worksheet);
    setUploadedImageUrls([]);
    setIsCreateDrawerOpen(true);
  };

  const handleAddLogEntry = (worksheet: Worksheet) => {
    setSelectedWorksheet(worksheet);
    setIsAddLogDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Worksheets</h1>
          <p className="text-muted-foreground">
            {isTechnician ? 'Manage your work logs and service documentation' : 'View all technician worksheets and service history'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isTechnician && (
            <>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setIsOrderSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
                Find Order
              </Button>
              <Button
                className="gradient-primary text-white gap-2"
                onClick={() => {
                  setSelectedWorksheet(null);
                  setSelectedOrderDetail(null);
                  setUploadedImageUrls([]);
                  setIsOrderSearchOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                New Worksheet
              </Button>
            </>
          )}
        </div>
      </div>

      {isTechnician && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Assigned Orders</p>
            <p className="text-2xl font-bold text-foreground mt-1">{assignedOrders.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Total Time Logged</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {(() => {
                const totalMinutes = worksheets.reduce((sum, w) => sum + (w.time_spent_minutes || 0), 0);
                const hrs = Math.floor(totalMinutes / 60);
                const mins = totalMinutes % 60;
                return `${hrs}h ${mins}m`;
              })()}
            </p>
            <p className="text-xs text-muted-foreground">Incl. all activity logs</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Pending Approval</p>
            <p className="text-2xl font-bold text-warning mt-1">
              {worksheets.filter(w => w.status === 'pending_approval').length}
            </p>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-success mt-1">
              {worksheets.filter(w => w.status === 'approved').length}
            </p>
            <p className="text-xs text-muted-foreground">Completed work</p>
          </div>
        </div>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="all" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            All
          </TabsTrigger>
          <TabsTrigger value="draft" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Draft
          </TabsTrigger>
          <TabsTrigger value="pending_approval" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Pending Approval
          </TabsTrigger>
          <TabsTrigger value="approved" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Approved
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          <DataTable
            data={filteredWorksheets}
            columns={columns}
            searchable
            searchKey="customer_name"
            searchPlaceholder="Search by customer..."
            onRowClick={handleView}
            emptyMessage="No worksheets found"
          />
        </TabsContent>
      </Tabs>

      <DrawerPanel
        open={isOrderSearchOpen}
        onClose={() => {
          setIsOrderSearchOpen(false);
          setOrderSearchQuery('');
          setSearchResults([]);
        }}
        title="Find AMC Order"
        subtitle="Search for an order to create a worksheet"
        size="lg"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Search Orders</Label>
            <Input
              placeholder="Search by Order ID, Customer Name, Email, or Phone..."
              value={orderSearchQuery}
              onChange={(e) => {
                setOrderSearchQuery(e.target.value);
                searchOrders(e.target.value);
              }}
              autoFocus
            />
          </div>

          {/* Assigned Orders for Technicians */}
          {isTechnician && assignedOrders.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground">Your Assigned Orders</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {assignedOrders.map((order) => (
                  <OrderCard 
                    key={order.amc_form_id} 
                    order={order} 
                    onSelect={handleCreateWorksheet}
                    showAssignedBadge={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground">Search Results</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((order) => (
                  <OrderCard 
                    key={order.amc_form_id} 
                    order={order} 
                    onSelect={handleCreateWorksheet}
                    showAssignedBadge={true}
                  />
                ))}
              </div>
            </div>
          )}

          {orderSearchQuery && searchResults.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No orders found matching "{orderSearchQuery}"</p>
            </div>
          )}
        </div>
      </DrawerPanel>

      <DrawerPanel
        open={isViewDrawerOpen}
        onClose={() => setIsViewDrawerOpen(false)}
        title={`Worksheet: ${selectedWorksheet?.amc_form_id || ''}`}
        subtitle={`For ${selectedWorksheet?.customer_name || 'N/A'}`}
        size="xl"
        footer={
          selectedWorksheet && (isTechnician || isAdmin) && selectedWorksheet.status !== 'approved' && (
            <div className="flex flex-col gap-3 w-full">
              <div className="flex gap-3">
                {isTechnician && (
                  <>
                    <Button
                      className="flex-1 gradient-primary text-white"
                      disabled={isSubmitting}
                      onClick={() => {
                        resetLogForm();
                        setIsAddLogDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Work Log
                    </Button>
                    {(selectedWorksheet.status === 'rejected' || selectedWorksheet.status === 'draft') && (
                      <Button
                        className="flex-1 bg-info hover:bg-info/90 text-white"
                        disabled={isSubmitting}
                        onClick={() => handleRequestApproval(selectedWorksheet)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Request Approval
                      </Button>
                    )}
                  </>
                )}
                {isAdmin && selectedWorksheet.status === 'pending_approval' && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={isSubmitting}
                      onClick={() => handleReject(selectedWorksheet)}
                    >
                      Request Revision
                    </Button>
                    <Button
                      className="flex-1 bg-success hover:bg-success/90 text-white"
                      disabled={isSubmitting}
                      onClick={() => handleApprove(selectedWorksheet)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </>
                )}
              </div>
              {isTechnician && selectedWorksheet.status === 'rejected' && (
                <div className="space-y-2">
                  <p className="text-xs text-center text-destructive font-medium">
                    This worksheet was rejected. Please review logs and request approval again.
                  </p>
                  <Button 
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2"
                    onClick={async () => {
                      try {
                        setIsSubmitting(true);
                        await addWorkLog(
                          selectedWorksheet.id,
                          'Resubmitted for approval after rejection',
                          'note',
                          [],
                          0,
                          true,
                          'Manual resubmission by technician'
                        );
                        toast.success('Worksheet resubmitted for approval');
                      } catch (err: any) {
                        toast.error(err.message || 'Failed to resubmit');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    <Send className="h-4 w-4" />
                    {isSubmitting ? 'Resubmitting...' : 'Request Approval Again'}
                  </Button>
                </div>
              )}
            </div>
          )
        }
      >
        {selectedWorksheet && (
          <WorksheetDetails 
            worksheet={selectedWorksheet} 
            workLogs={workLogs} 
            onAddLog={() => setIsAddLogDrawerOpen(true)}
            isAdmin={isAdmin}
            onImageClick={(url) => {
              setPreviewImageUrl(url);
              setIsPreviewOpen(true);
            }}
          />
        )}
      </DrawerPanel>

      {/* Create/Edit Worksheet Drawer */}
      <DrawerPanel
        open={isCreateDrawerOpen}
        onClose={() => {
          setIsCreateDrawerOpen(false);
          setSelectedWorksheet(null);
          setSelectedOrderDetail(null);
        }}
        title="Create New Worksheet"
        subtitle={selectedOrderDetail ? `For: ${selectedOrderDetail.full_name}` : 'Search for an order to begin'}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => {
                setIsCreateDrawerOpen(false);
                setSelectedWorksheet(null);
                setSelectedOrderDetail(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="outline" 
              className="flex-1" 
              disabled={isSubmitting}
              onClick={() => {
                const form = document.getElementById('worksheet-form') as HTMLFormElement;
                handleSaveWorksheet(new FormData(form), 'draft');
              }}
            >
              Save Draft
            </Button>
            <Button 
              className="flex-1 gradient-primary text-white" 
              disabled={isSubmitting}
              onClick={() => {
                const form = document.getElementById('worksheet-form') as HTMLFormElement;
                handleSaveWorksheet(new FormData(form), 'pending_approval');
              }}
            >
              Submit for Approval
            </Button>
          </div>
        }
      >
        {selectedOrderDetail && (
          <WorksheetForm
            worksheet={selectedWorksheet}
            orderDetail={selectedOrderDetail}
            uploadedImageUrls={uploadedImageUrls}
            isUploadingImages={isUploadingImages}
            handleWorksheetFileUpload={handleWorksheetFileUpload}
            removeUploadedImage={removeUploadedImageUrl}
            onImageClick={(url) => {
              setPreviewImageUrl(url);
              setIsPreviewOpen(true);
            }}
          />
        )}
      </DrawerPanel>

      <DrawerPanel
        open={isAddLogDrawerOpen}
        onClose={() => {
          setIsAddLogDrawerOpen(false);
          resetLogForm();
        }}
        title="Add Work Log Entry"
        subtitle={selectedWorksheet ? `Order #${selectedWorksheet.amc_order_id.slice(0, 8)}...` : ''}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsAddLogDrawerOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="flex-1 gradient-primary text-white" 
              onClick={handleAddWorkLog}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Log Entry'}
            </Button>
          </div>
        }
      >
        <LogEntryForm 
          onFileSelect={handleFileSelect}
          onRemoveFile={removeImage}
          selectedFiles={uploadedImages}
        />
      </DrawerPanel>

      {/* Add Work Log Dialog */}
      <Dialog open={isAddLogDialogOpen} onOpenChange={setIsAddLogDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Work Log Entry</DialogTitle>
            <DialogDescription>
              Log your work progress with time spent and proof images
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Log Type</Label>
              <Select value={logType} onValueChange={setLogType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="progress">Progress Update</SelectItem>
                  <SelectItem value="issue">Issue Found</SelectItem>
                  <SelectItem value="resolution">Issue Resolved</SelectItem>
                  <SelectItem value="note">General Note</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time Spent</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    type="number"
                    min="0"
                    value={logTimeHours}
                    onChange={(e) => setLogTimeHours(parseInt(e.target.value) || 0)}
                    placeholder="Hours"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Hours</p>
                </div>
                <div>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={logTimeMinutes}
                    onChange={(e) => setLogTimeMinutes(parseInt(e.target.value) || 0)}
                    placeholder="Minutes"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Minutes</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Current total: {Math.floor((selectedWorksheet?.time_spent_minutes || 0) / 60)}h {(selectedWorksheet?.time_spent_minutes || 0) % 60}m
                → New total: {Math.floor(((selectedWorksheet?.time_spent_minutes || 0) + logTimeHours * 60 + logTimeMinutes) / 60)}h {((selectedWorksheet?.time_spent_minutes || 0) + logTimeHours * 60 + logTimeMinutes) % 60}m
              </p>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={logDescription}
                onChange={(e) => setLogDescription(e.target.value)}
                placeholder="Describe the work done for the customer..."
                rows={3}
              />
              <p className="text-[10px] text-muted-foreground">This description will be visible to the customer in their portal.</p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="is-internal-dialog"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={isInternalLog}
                onChange={(e) => setIsInternalLog(e.target.checked)}
              />
              <Label htmlFor="is-internal-dialog" className="text-sm font-medium leading-none cursor-pointer">
                Add Team-Only Private Note
              </Label>
            </div>

            {isInternalLog && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                <Label>Internal Note (Private)</Label>
                <Textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Private details for team and admin only. Not visible to customer."
                  rows={2}
                  className="bg-amber-50/30 border-amber-200"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Work Proof Images (Optional)</Label>
              <div className="flex flex-wrap gap-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative h-20 w-20 rounded-lg border overflow-hidden">
                    <img 
                      src={preview} 
                      alt="" 
                      className="h-full w-full object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                      onClick={() => {
                        setPreviewImageUrl(preview);
                        setIsPreviewOpen(true);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {uploadedImages.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary transition-colors"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Max 5 images, automatically compressed</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddLogDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="gradient-primary text-white"
              onClick={handleAddWorkLog}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Log Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden file input for dialog */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Image Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl p-1 bg-transparent border-none shadow-none">
          <div className="relative w-full h-full flex items-center justify-center">
            <button 
              onClick={() => setIsPreviewOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-primary transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            <img 
              src={previewImageUrl} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderCard({ order, onSelect, showAssignedBadge }: { 
  order: AmcOrderDetail; 
  onSelect: (order: AmcOrderDetail) => void; 
  showAssignedBadge: boolean;
}) {
  return (
    <div 
      className="border rounded-lg p-4 hover:bg-muted/30 cursor-pointer transition-colors"
      onClick={() => onSelect(order)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="font-bold text-xs text-primary">{formatAmcId(order.amc_number, order.amc_form_id)}</span>
            </div>
            {showAssignedBadge && (
              <StatusBadge variant="in_progress" size="sm">
                {order.status}
              </StatusBadge>
            )}
          </div>
          <p className="font-semibold text-foreground mt-1">{order.full_name}</p>
        </div>
        <Button size="sm" className="gradient-primary text-white">
          Select
        </Button>
      </div>
      
      <div className="grid gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Building className="h-3 w-3" />
          {order.company_name || 'Individual'}
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {order.city}, {order.state}
        </div>
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3" />
          {order.phone}
        </div>
        {order.urgency_level && (
          <div className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {order.urgency_level} priority
          </div>
        )}
      </div>

      {/* Service Description for Technicians */}
      {order.service_work_description && (
        <div className="mt-3 pt-2 border-t">
          <p className="text-xs font-semibold text-primary mb-1">Service Instructions:</p>
          <p className="text-xs text-foreground bg-primary/5 p-2 rounded border border-primary/20">
            {order.service_work_description}
          </p>
        </div>
      )}

      {/* Internal Notes for Technicians */}
      {order.internal_notes && (
        <div className="mt-2">
          <p className="text-xs font-semibold text-amber-700 mb-1">Internal Notes:</p>
          <p className="text-xs text-amber-900 bg-amber-50 p-2 rounded border border-amber-200">
            {order.internal_notes}
          </p>
        </div>
      )}

      {/* Remote Access Preferences */}
      {(order.remote_software_preference || order.preferred_lang) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {order.remote_software_preference && (
            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
              Remote: {order.remote_software_preference}
            </span>
          )}
          {order.preferred_lang && (
            <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-200">
              Lang: {order.preferred_lang}
            </span>
          )}
          {order.consent_remote_access === false && (
            <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-200">
              No Remote Access
            </span>
          )}
        </div>
      )}
      
      {order.systems.length > 0 && (
        <div className="mt-3 pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">{order.systems.length} system(s):</p>
          <div className="flex gap-1 flex-wrap">
            {order.systems.map((system, i) => (
              <span key={system.id} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {system.device_type}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WorksheetDetails({ 
  worksheet, 
  workLogs, 
  onAddLog,
  isAdmin,
  onImageClick,
}: { 
  worksheet: Worksheet; 
  workLogs: WorkLog[];
  onAddLog: () => void;
  isAdmin: boolean;
  onImageClick: (url: string) => void;
}) {
  const localTotalTime = workLogs.reduce((sum, log) => sum + (log.time_spent_minutes || 0), 0);
  const totalTimeSpent = localTotalTime > 0 ? localTotalTime : worksheet.time_spent_minutes;
  
  return (
    <div className="space-y-6">
      {/* Order Information */}
      <div className="rounded-lg border p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Order Information</h4>
          <StatusBadge variant={worksheet.urgency_level === 'high' ? 'pending' : 'completed'}>
            {worksheet.urgency_level || 'normal'} priority
          </StatusBadge>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Customer</p>
            <p className="font-medium">{worksheet.customer_name}</p>
            {worksheet.customer_company && (
              <p className="text-sm text-muted-foreground">{worksheet.customer_company}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Location</p>
            <p className="font-medium">{worksheet.customer_city}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Contact</p>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm">
                <Phone className="h-3 w-3" />
                {worksheet.customer_phone}
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Mail className="h-3 w-3" />
                {worksheet.customer_email}
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Order Details</p>
            <div className="flex flex-col">
              {worksheet.amc_number && (
                <p className="font-bold text-primary">{worksheet.amc_number}</p>
              )}
              <p className="text-xs text-muted-foreground">ID: #{worksheet.amc_order_id.slice(0, 16)}...</p>
            </div>
          </div>
        </div>

        {worksheet.order_description && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-1">Problem Description</p>
            <p className="text-sm">{worksheet.order_description}</p>
          </div>
        )}
      </div>

      {/* Worksheet Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Technician</p>
          <p className="font-semibold">{worksheet.staff_name}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Time</p>
          <p className="font-semibold text-primary">
            {Math.floor(totalTimeSpent / 60)}h {totalTimeSpent % 60}m
          </p>
          <p className="text-xs text-muted-foreground">All sessions combined</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Status</p>
          <StatusBadge variant={worksheet.status === 'pending_approval' ? 'pending' : worksheet.status as any}>
            {worksheet.status === 'pending_approval' ? 'Pending Approval' : formatStatus(worksheet.status)}
          </StatusBadge>
          {worksheet.status === 'pending_approval' && (
            <p className="text-xs text-muted-foreground mt-1">Awaiting admin review</p>
          )}
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Log Entries</p>
          <p className="font-semibold">{workLogs.length}</p>
          <p className="text-xs text-muted-foreground">
            {workLogs.filter(l => l.time_spent_minutes > 0).length} with time
          </p>
        </div>
      </div>

      {/* Work Summary */}
      <div className="space-y-4">
        {worksheet.tasks_performed && (
          <div className="rounded-lg border p-4">
            <h4 className="font-semibold mb-2">Tasks Performed</h4>
            <p className="text-muted-foreground">{worksheet.tasks_performed}</p>
          </div>
        )}
        {worksheet.issues_resolved && (
          <div className="rounded-lg border p-4">
            <h4 className="font-semibold mb-2">Issues Resolved</h4>
            <p className="text-muted-foreground">{worksheet.issues_resolved}</p>
          </div>
        )}
      </div>

      {/* Work Logs Timeline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Work Timeline</h4>
          <Button size="sm" onClick={onAddLog} className="gradient-primary text-white gap-2">
            <Plus className="h-4 w-4" />
            Add Entry
          </Button>
        </div>
        
        {workLogs.length > 0 ? (
          <div className="space-y-4">
            {workLogs.map((log, index) => (
              <div key={log.id} className="relative pl-6">
                {index !== workLogs.length - 1 && (
                  <div className="absolute left-[9px] top-6 h-full w-0.5 bg-border" />
                )}
                <div
                  className={cn(
                    'absolute left-0 top-1.5 h-5 w-5 rounded-full border-2 flex items-center justify-center',
                    log.log_type === 'progress' && 'border-info bg-info/10',
                    log.log_type === 'issue' && 'border-warning bg-warning/10',
                    log.log_type === 'resolution' && 'border-success bg-success/10',
                    log.log_type === 'note' && 'border-muted-foreground bg-muted'
                  )}
                >
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      log.log_type === 'progress' && 'bg-info',
                      log.log_type === 'issue' && 'bg-warning',
                      log.log_type === 'resolution' && 'bg-success',
                      log.log_type === 'note' && 'bg-muted-foreground'
                    )}
                  />
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        variant={
                          log.log_type === 'progress' ? 'in_progress' :
                          log.log_type === 'issue' ? 'pending' :
                          log.log_type === 'resolution' ? 'completed' : 'default'
                        }
                        size="sm"
                      >
                        {formatStatus(log.log_type || 'note')}
                      </StatusBadge>
                      {log.time_spent_minutes > 0 && (
                        <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                          <Clock className="h-3 w-3" />
                          {Math.floor(log.time_spent_minutes / 60)}h {log.time_spent_minutes % 60}m
                        </div>
                      )}
                      {log.is_internal && (
                        <div className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 uppercase font-bold tracking-wider">
                          Private Note Included
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm">{log.description}</p>
                  
                  {log.is_internal && log.internal_notes && (
                    <div className="mt-2 p-2 bg-amber-50/50 border border-amber-100 rounded text-xs italic text-amber-900/80">
                      <span className="font-bold not-italic mr-1 text-[10px] text-amber-700">TEAM-ONLY NOTE:</span>
                      {log.internal_notes}
                    </div>
                  )}

                  {log.images && log.images.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {log.images.map((imageUrl, i) => (
                        <div key={i} className="relative">
                          <img
                            src={imageUrl}
                            alt={`Log image ${i + 1}`}
                            className="h-16 w-16 object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => onImageClick(imageUrl)}
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/20 rounded-md transition-opacity pointer-events-none">
                            <Eye className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No work log entries yet</p>
            <p className="text-sm">Add entries to track your progress</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WorksheetForm({
  worksheet,
  orderDetail,
  uploadedImageUrls,
  isUploadingImages,
  handleWorksheetFileUpload,
  removeUploadedImage,
  onImageClick,
}: {
  worksheet: Worksheet | null;
  orderDetail: AmcOrderDetail;
  uploadedImageUrls: string[];
  isUploadingImages: boolean;
  handleWorksheetFileUpload: (files: FileList) => Promise<void>;
  removeUploadedImage: (index: number) => void;
  onImageClick: (url: string) => void;
}) {
  return (
    <form id="worksheet-form" className="space-y-6">
      {/* Order Summary */}
      <div className="rounded-lg border p-4 bg-muted/30">
        <h4 className="font-semibold mb-3">Order Summary</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-medium">{orderDetail.full_name}</p>
            {orderDetail.company_name && (
              <p className="text-xs text-muted-foreground">{orderDetail.company_name}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Order Details</p>
            <p className="font-bold text-xs text-primary">{formatAmcId(orderDetail.amc_number, orderDetail.amc_form_id)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="font-medium">{orderDetail.city}, {orderDetail.state}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Priority</p>
            <StatusBadge
              variant={
                orderDetail.urgency_level === 'high' ? 'pending' :
                orderDetail.urgency_level === 'medium' ? 'in_progress' : 'completed'
              }
              size="sm"
            >
              {orderDetail.urgency_level || 'normal'}
            </StatusBadge>
          </div>
        </div>
        
        {orderDetail.systems.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground mb-2">Systems ({orderDetail.systems.length})</p>
            <div className="flex gap-2 flex-wrap">
              {orderDetail.systems.map((system) => (
                <div key={system.id} className="text-xs bg-background border px-2 py-1 rounded">
                  {system.device_type} {system.device_name && `- ${system.device_name}`}
                </div>
              ))}
            </div>
          </div>
        )}

        {orderDetail.problem_description && (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">Problem Description</p>
            <p className="text-sm">{orderDetail.problem_description}</p>
          </div>
        )}
      </div>

      {orderDetail && (
        <div className="rounded-lg border p-4 bg-muted/30">
          <h4 className="font-semibold mb-2">Order Details</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span>{orderDetail.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span>{orderDetail.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location:</span>
              <span>{orderDetail.city}, {orderDetail.state}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <StatusBadge variant={orderDetail.status as any} size="sm">
                {formatStatus(orderDetail.status)}
              </StatusBadge>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Hours Worked</Label>
          <Input
            name="hours"
            type="number"
            min="0"
            defaultValue={worksheet ? Math.floor(worksheet.time_spent_minutes / 60) : 0}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label>Minutes</Label>
          <Input
            name="minutes"
            type="number"
            min="0"
            max="59"
            defaultValue={worksheet ? worksheet.time_spent_minutes % 60 : 0}
            placeholder="0"
          />
        </div>
      </div>

      {!worksheet && (
        <div className="space-y-2">
          <Label>Initial Work Description</Label>
          <Textarea
            name="initial_description"
            placeholder="Describe the initial work or inspection..."
            rows={3}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Tasks Performed</Label>
        <Textarea
          name="tasks_performed"
          defaultValue={worksheet?.tasks_performed || ''}
          placeholder="Describe the technical work you performed, steps taken, configurations made..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Issues Resolved</Label>
        <Textarea
          name="issues_resolved"
          defaultValue={worksheet?.issues_resolved || ''}
          placeholder="Document any problems found and how they were resolved..."
          rows={4}
        />
      </div>

      {/* Image Upload Section */}
      <div className="space-y-3">
        <Label>Attach Images (Optional)</Label>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
          <div className="text-center">
            <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Click to upload images or drag and drop
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              JPG, PNG up to 5MB each. Images will be compressed automatically.
            </p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => e.target.files && handleWorksheetFileUpload(e.target.files)}
              className="hidden"
              id="worksheet-file-upload"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('worksheet-file-upload')?.click()}
              disabled={isUploadingImages}
            >
              {isUploadingImages ? 'Uploading...' : 'Choose Images'}
            </Button>
          </div>
        </div>
        
        {/* Show uploaded images */}
        {uploadedImageUrls.length > 0 && (
          <div className="grid gap-2 grid-cols-4">
            {uploadedImageUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => onImageClick(url)}
                />
                <button
                  type="button"
                  onClick={() => removeUploadedImage(index)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4 bg-muted/10">
        <h4 className="font-medium mb-2">Worksheet Guidelines</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Document all technical work performed clearly</li>
          <li>• Include specific system configurations or changes made</li>
          <li>• Note any follow-up actions or recommendations</li>
          <li>• Use the work log timeline for detailed progress tracking</li>
        </ul>
      </div>
    </form>
  );
}

function LogEntryForm({ 
  onFileSelect, 
  onRemoveFile, 
  selectedFiles 
}: { 
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  selectedFiles: File[];
}) {
  return (
    <form id="log-form" className="space-y-6">
      <div className="space-y-2">
        <Label>Entry Type</Label>
        <Select name="log_type" defaultValue="progress">
          <SelectTrigger>
            <SelectValue placeholder="Select entry type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="progress">Progress Update</SelectItem>
            <SelectItem value="issue">Issue/Problem</SelectItem>
            <SelectItem value="resolution">Resolution/Fix</SelectItem>
            <SelectItem value="note">General Note</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Time Tracking */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Time Spent - Hours</Label>
          <Input
            name="log_hours"
            type="number"
            min="0"
            placeholder="0"
            defaultValue="0"
          />
        </div>
        <div className="space-y-2">
          <Label>Minutes</Label>
          <Input
            name="log_minutes"
            type="number"
            min="0"
            max="59"
            placeholder="0"
            defaultValue="0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          name="description"
          placeholder="Describe the work done for the customer..."
          rows={3}
          required
        />
        <p className="text-[10px] text-muted-foreground">This description will be visible to the customer.</p>
      </div>

      <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="is_internal_toggle"
            id="is-internal-drawer"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            onChange={(e) => {
              const notesField = document.getElementById('internal-notes-container');
              if (notesField) notesField.style.display = e.target.checked ? 'block' : 'none';
              const hiddenInput = document.getElementById('is_internal_hidden') as HTMLInputElement;
              if (hiddenInput) hiddenInput.value = e.target.checked ? 'true' : 'false';
            }}
          />
          <Label htmlFor="is-internal-drawer" className="font-medium cursor-pointer">
            Internal Team Entry
          </Label>
        </div>
        
        <input type="hidden" name="is_internal" id="is_internal_hidden" value="false" />

        <div id="internal-notes-container" className="space-y-2" style={{ display: 'none' }}>
          <Label>Internal Notes / Admin Feedback</Label>
          <Textarea
            name="internal_notes"
            placeholder="Private notes for team and admin only..."
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Attach Images (Optional)</Label>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
          <div className="text-center">
            <Camera className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Add photos to document your work
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              JPG, PNG up to 5MB each. Images will be compressed.
            </p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={onFileSelect}
              className="hidden"
              id="log-file-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('log-file-upload')?.click()}
            >
              Choose Images
            </Button>
          </div>
        </div>
        
        {/* Show selected files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{selectedFiles.length} file(s) selected:</p>
            <div className="grid gap-2 grid-cols-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative">
                  <div className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                    <span className="truncate text-xs">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveFile(index)}
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4 bg-muted/10">
        <h4 className="font-medium mb-2">Logging Best Practices</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Track time spent on specific tasks for accurate billing</li>
          <li>• Include timestamps for critical steps or discoveries</li>
          <li>• Attach photos of hardware issues or configurations</li>
          <li>• Use clear, professional language for reports</li>
        </ul>
      </div>
    </form>
  );
}
