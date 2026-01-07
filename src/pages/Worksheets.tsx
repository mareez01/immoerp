import React, { useState, useEffect } from 'react';
import { Plus, Clock, Image, MoreHorizontal, Eye, Edit, CheckCircle, FileText, Camera, MessageCircle, Search, Building, Phone, Mail, MapPin, AlertCircle } from 'lucide-react';
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
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Worksheet {
  id: string;
  amc_order_id: string;
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
  systems_count?: number;
}

interface WorkLog {
  id: string;
  worksheet_id: string;
  description: string;
  log_type: string;
  time_spent_minutes: number;
  images?: string[];
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
  full_name: string;
  email: string;
  phone: string;
  company_name?: string;
  city: string;
  state: string;
  district: string;
  problem_description?: string;
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

  const isTechnician = user?.role === 'technician';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchWorksheets();
    if (isTechnician) {
      fetchAssignedOrders();
    }
  }, [isTechnician, session?.user?.id]);

  // Utility function to compress images
  const compressImage = (file: File, maxWidth = 1024, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new HTMLImageElement();
      
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Upload images to Supabase storage
  const uploadImages = async (files: FileList): Promise<string[]> => {
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

  // Calculate total time spent on an order
  const calculateTotalTimeSpent = (logs: WorkLog[], worksheetTime: number = 0): number => {
    const logTime = logs.reduce((total, log) => total + (log.time_spent_minutes || 0), 0);
    return logTime + worksheetTime;
  };

  const fetchWorksheets = async () => {
    try {
      const { data, error } = await supabase
        .from('worksheets')
        .select(`
          *,
          profiles!worksheets_staff_id_fkey (full_name),
          amc_responses!worksheets_amc_order_id_fkey (
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
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const worksheetsWithDetails = await Promise.all(
        (data || []).map(async (w) => {
          // Get systems count for this order
          const { data: systems } = await supabase
            .from('amc_systems')
            .select('id')
            .eq('amc_form_id', w.amc_order_id);

          return {
            id: w.id,
            amc_order_id: w.amc_order_id,
            staff_id: w.staff_id,
            staff_name: w.profiles?.full_name || 'Unknown',
            customer_name: w.amc_responses?.full_name || 'Unknown',
            customer_email: w.amc_responses?.email || '',
            customer_phone: w.amc_responses?.phone || '',
            customer_company: w.amc_responses?.company_name || '',
            customer_city: `${w.amc_responses?.city || ''}, ${w.amc_responses?.state || ''}`,
            order_description: w.amc_responses?.problem_description || w.amc_responses?.system_usage_purpose || '',
            urgency_level: w.amc_responses?.urgency_level || 'normal',
            time_spent_minutes: w.time_spent_minutes || 0,
            tasks_performed: w.tasks_performed,
            issues_resolved: w.issues_resolved,
            status: w.status || 'draft',
            created_at: w.created_at,
            updated_at: w.updated_at,
            systems_count: systems?.length || 0,
          };
        })
      );

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
      // First get the profile id for the current user
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('amc_responses')
        .select(`
          amc_form_id,
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
        .eq('assigned_to', profile.id)
        .not('status', 'eq', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ordersWithSystems = await Promise.all(
        (data || []).map(async (order) => {
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
      const { data, error } = await supabase
        .from('work_logs')
        .select('id, worksheet_id, description, log_type, images, created_at')
        .eq('worksheet_id', worksheetId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const logs = (data || []).map(log => ({
        id: log.id,
        worksheet_id: log.worksheet_id,
        description: log.description,
        log_type: log.log_type,
        time_spent_minutes: 0, // Default to 0 since column doesn't exist yet
        images: log.images || [],
        created_at: log.created_at
      }));
      setWorkLogs(logs);
      
      // Calculate total time from logs
      const selectedWs = worksheets.find(w => w.id === worksheetId);
      const total = calculateTotalTimeSpent(logs, selectedWs?.time_spent_minutes || 0);
      setTotalTimeSpent(total);
    } catch (error) {
      console.error('Error fetching work logs:', error);
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
        .or(
          `amc_form_id.ilike.%${query}%,full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`
        )
        .limit(10);

      if (error) throw error;

      const ordersWithSystems = await Promise.all(
        (data || []).map(async (order) => {
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
    setIsOrderSearchOpen(false);
    setIsCreateDrawerOpen(true);
  };

  const handleSaveWorksheet = async (formData: FormData, status: 'draft' | 'submitted') => {
    if (!session?.user?.id || !selectedOrderDetail) return;

    try {
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

      const worksheetData = {
        amc_order_id: selectedOrderDetail.amc_form_id,
        staff_id: profile.id,
        time_spent_minutes: initialTimeSpent,
        tasks_performed: formData.get('tasks_performed') as string,
        issues_resolved: formData.get('issues_resolved') as string,
        status: finalStatus,
      };

      let worksheetId: string;

      if (selectedWorksheet) {
        const { error } = await supabase
          .from('worksheets')
          .update(worksheetData)
          .eq('id', selectedWorksheet.id);

        if (error) throw error;
        worksheetId = selectedWorksheet.id;
        
        // Add edit log entry
        await addWorkLog(
          worksheetId, 
          'Worksheet updated - requires approval', 
          'note', 
          uploadedImageUrls,
          0
        );
      } else {
        const { data: newWorksheet, error } = await supabase
          .from('worksheets')
          .insert(worksheetData)
          .select('id')
          .single();

        if (error) throw error;
        worksheetId = newWorksheet.id;

        // Create initial log entry with upload capability
        const initialDescription = `Worksheet created. Initial work session: ${Math.floor(initialTimeSpent / 60)}h ${initialTimeSpent % 60}m`;
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
    }
  };

  const addWorkLog = async (
    worksheetId: string, 
    description: string, 
    logType: string = 'progress', 
    images: string[] = [],
    timeSpentMinutes: number = 0
  ) => {
    try {
      const { error } = await supabase
        .from('work_logs')
        .insert({
          worksheet_id: worksheetId,
          description,
          log_type: logType,
          time_spent_minutes: timeSpentMinutes,
          images: images.length > 0 ? images : null,
        });

      if (error) throw error;
      
      // Update worksheet status to require approval for new log entries (unless admin)
      if (!isAdmin) {
        await supabase
          .from('worksheets')
          .update({ status: 'pending_approval' })
          .eq('id', worksheetId);
      }
      
      // Refresh work logs if we're viewing this worksheet
      if (selectedWorksheet && selectedWorksheet.id === worksheetId) {
        fetchWorkLogs(worksheetId);
      }
    } catch (error) {
      console.error('Error adding work log:', error);
      throw error;
    }
  };

  const handleAddLog = async (formData: FormData) => {
    if (!selectedWorksheet) return;

    try {
      setIsUploadingImages(true);
      
      const description = formData.get('description') as string;
      const logType = formData.get('log_type') as string;
      const hours = parseInt(formData.get('log_hours') as string) || 0;
      const minutes = parseInt(formData.get('log_minutes') as string) || 0;
      const timeSpent = hours * 60 + minutes;
      
      if (!description.trim()) {
        toast.error('Please enter a description');
        return;
      }

      let imageUrls: string[] = [];
      
      // Get files from the form element directly
      const logForm = document.getElementById('log-form') as HTMLFormElement;
      const fileInput = logForm.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Upload images if any
      if (fileInput?.files && fileInput.files.length > 0) {
        try {
          imageUrls = await uploadImages(fileInput.files);
        } catch (error) {
          console.error('Image upload failed:', error);
          toast.error('Failed to upload images. Log will be saved without images.');
        }
      }

      await addWorkLog(selectedWorksheet.id, description, logType, imageUrls, timeSpent);
      
      toast.success(
        isAdmin 
          ? 'Log entry added successfully' 
          : 'Log entry added - worksheet pending approval'
      );
      
      setIsAddLogDrawerOpen(false);
      
      // Refresh worksheets to show updated status
      fetchWorksheets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add log entry');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleApprove = async (worksheet: Worksheet) => {
    try {
      const { error } = await supabase
        .from('worksheets')
        .update({ status: 'approved' })
        .eq('id', worksheet.id);

      if (error) throw error;

      toast.success('Worksheet approved successfully');
      fetchWorksheets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve worksheet');
    }
  };

  // Handle file uploads during worksheet creation
  const handleWorksheetFileUpload = async (files: FileList) => {
    if (files.length === 0) return;
    
    try {
      setIsUploadingImages(true);
      const urls = await uploadImages(files);
      setUploadedImageUrls(prev => [...prev, ...urls]);
      toast.success(`${files.length} image(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload images');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const filteredWorksheets = selectedTab === 'all'
    ? worksheets
    : worksheets.filter(w => w.status === selectedTab);

  const columns: Column<Worksheet>[] = [
    {
      key: 'amc_order_id',
      header: 'Order Details',
      cell: (worksheet) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">#{worksheet.amc_order_id.slice(0, 8)}...</span>
          </div>
          <p className="font-semibold text-foreground">{worksheet.customer_name}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building className="h-3 w-3" />
            {worksheet.customer_company || 'Individual'}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {worksheet.customer_city}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {worksheet.systems_count} system{worksheet.systems_count !== 1 ? 's' : ''}
            </span>
            {worksheet.urgency_level && (
              <StatusBadge
                variant={
                  worksheet.urgency_level === 'high' ? 'pending' :
                  worksheet.urgency_level === 'medium' ? 'in_progress' : 'completed'
                }
                size="sm"
              >
                {worksheet.urgency_level} priority
              </StatusBadge>
            )}
          </div>
        </div>
      ),
      className: 'w-80',
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
            {(isTechnician || isAdmin) && (
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
            {isAdmin && (worksheet.status === 'submitted' || worksheet.status === 'pending_approval') && (
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

  const handleView = (worksheet: Worksheet) => {
    setSelectedWorksheet(worksheet);
    fetchWorkLogs(worksheet.id);
    setIsViewDrawerOpen(true);
  };

  const handleEdit = async (worksheet: Worksheet) => {
    // Fetch full order details for editing
    const { data: orderData } = await supabase
      .from('amc_responses')
      .select(`
        amc_form_id,
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
      .single();

    if (orderData) {
      const { data: systems } = await supabase
        .from('amc_systems')
        .select('*')
        .eq('amc_form_id', orderData.amc_form_id);

      setSelectedOrderDetail({
        ...orderData,
        systems: systems || [],
      });
    }
    
    setSelectedWorksheet(worksheet);
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
              {Math.floor(worksheets.reduce((sum, w) => sum + w.time_spent_minutes, 0) / 60)}h
            </p>
            <p className="text-xs text-muted-foreground">Worksheet time only</p>
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
          <TabsTrigger value="submitted" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Submitted
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
            searchKey="staff_name"
            searchPlaceholder="Search worksheets..."
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
        title="Worksheet Details"
        subtitle={selectedWorksheet ? `Order #${selectedWorksheet.amc_order_id.slice(0, 8)}... - ${selectedWorksheet.customer_name}` : ''}
        size="xl"
      >
        {selectedWorksheet && (
          <WorksheetDetails worksheet={selectedWorksheet} workLogs={workLogs} onAddLog={() => setIsAddLogDrawerOpen(true)} />
        )}
      </DrawerPanel>

      <DrawerPanel
        open={isCreateDrawerOpen}
        onClose={() => {
          setIsCreateDrawerOpen(false);
          setSelectedWorksheet(null);
          setSelectedOrderDetail(null);
        }}
        title={selectedWorksheet ? 'Edit Worksheet' : 'Create Worksheet'}
        subtitle={selectedOrderDetail ? `${selectedOrderDetail.full_name} - Order #${selectedOrderDetail.amc_form_id.slice(0, 8)}...` : 'Log your service progress'}
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
              onClick={() => {
                const form = document.getElementById('worksheet-form') as HTMLFormElement;
                handleSaveWorksheet(new FormData(form), 'draft');
              }}
            >
              Save Draft
            </Button>
            <Button 
              className="flex-1 gradient-primary text-white" 
              onClick={() => {
                const form = document.getElementById('worksheet-form') as HTMLFormElement;
                handleSaveWorksheet(new FormData(form), 'submitted');
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
          />
        )}
      </DrawerPanel>

      <DrawerPanel
        open={isAddLogDrawerOpen}
        onClose={() => setIsAddLogDrawerOpen(false)}
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
              onClick={() => {
                const form = document.getElementById('log-form') as HTMLFormElement;
                handleAddLog(new FormData(form));
              }}
            >
              Add Log Entry
            </Button>
          </div>
        }
      >
        <LogEntryForm />
      </DrawerPanel>
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
            <span className="font-medium text-sm">#{order.amc_form_id.slice(0, 8)}...</span>
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

function WorksheetDetails({ worksheet, workLogs, onAddLog }: { 
  worksheet: Worksheet; 
  workLogs: WorkLog[];
  onAddLog: () => void;
}) {
  const totalTimeSpent = workLogs.reduce((sum, log) => sum + (log.time_spent_minutes || 0), 0) + worksheet.time_spent_minutes;
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
            <p className="text-sm text-muted-foreground mb-1">Order ID</p>
            <p className="font-medium">#{worksheet.amc_order_id.slice(0, 16)}...</p>
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
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm">{log.description}</p>
                  {log.images && log.images.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {log.images.map((imageUrl, i) => (
                        <div key={i} className="relative">
                          <img
                            src={imageUrl}
                            alt={`Log image ${i + 1}`}
                            className="h-16 w-16 object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(imageUrl, '_blank')}
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/20 rounded-md transition-opacity">
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
}: {
  worksheet: Worksheet | null;
  orderDetail: AmcOrderDetail;
}) {
  const [isUploadingImages, setIsUploadingImages] = React.useState(false);
  const [uploadedImageUrls, setUploadedImageUrls] = React.useState<string[]>([]);

  // Upload images to Supabase storage
  const uploadImages = async (files: FileList): Promise<string[]> => {
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

  // Utility function to compress images
  const compressImage = (file: File, maxWidth = 1024, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new HTMLImageElement();
      
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Handle file uploads during worksheet creation
  const handleWorksheetFileUpload = async (files: FileList) => {
    if (files.length === 0) return;
    
    try {
      setIsUploadingImages(true);
      const urls = await uploadImages(files);
      setUploadedImageUrls(prev => [...prev, ...urls]);
      // toast.success(`${files.length} image(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload failed:', error);
      // toast.error('Failed to upload images');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImageUrls(prev => prev.filter((_, i) => i !== index));
  };
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
            <p className="text-sm text-muted-foreground">Order ID</p>
            <p className="font-medium">#{orderDetail.amc_form_id.slice(0, 16)}...</p>
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
                  className="w-full h-16 object-cover rounded border"
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

function LogEntryForm() {
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

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
          placeholder="Describe the work progress, issue found, or resolution applied..."
          rows={4}
          required
        />
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
              onChange={handleFileSelection}
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
                      onClick={() => removeFile(index)}
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
