import React, { useState, useEffect, useRef } from 'react';
import { Plus, Clock, Image, MoreHorizontal, Eye, Edit, CheckCircle, Upload, X, FileText, User, Calendar, MapPin, Phone, AlertCircle } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Worksheet {
  id: string;
  amc_order_id: string;
  staff_id: string;
  staff_name?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_location?: string;
  systems_count?: number;
  time_spent_minutes: number;
  tasks_performed?: string;
  issues_resolved?: string;
  status: string;
  requires_approval: boolean;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
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

interface AssignedOrder {
  amc_form_id: string;
  full_name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  status: string;
  system_usage_purpose: string;
}

export default function WorksheetsPage() {
  const { user, session } = useAuth();
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<AssignedOrder[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedWorksheet, setSelectedWorksheet] = useState<Worksheet | null>(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isAddLogDialogOpen, setIsAddLogDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New log form state
  const [logDescription, setLogDescription] = useState('');
  const [logType, setLogType] = useState('progress');
  const [logTimeHours, setLogTimeHours] = useState(0);
  const [logTimeMinutes, setLogTimeMinutes] = useState(0);

  const isTechnician = user?.role === 'technician';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchWorksheets();
    if (isTechnician) {
      fetchAssignedOrders();
    }
  }, [isTechnician, session?.user?.id]);

  const fetchWorksheets = async () => {
    try {
      const { data, error } = await supabase
        .from('worksheets')
        .select(`
          *,
          profiles!worksheets_staff_id_fkey (full_name),
          amc_responses!worksheets_amc_order_id_fkey (full_name, phone, email, city, state)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get systems count for each order
      const orderIds = data?.map(w => w.amc_order_id) || [];
      const { data: systems } = await supabase
        .from('amc_systems')
        .select('amc_form_id')
        .in('amc_form_id', orderIds);

      const systemsCountMap = new Map<string, number>();
      systems?.forEach(s => {
        systemsCountMap.set(s.amc_form_id, (systemsCountMap.get(s.amc_form_id) || 0) + 1);
      });

      const worksheetsWithNames = data?.map(w => ({
        id: w.id,
        amc_order_id: w.amc_order_id,
        staff_id: w.staff_id,
        staff_name: w.profiles?.full_name || 'Unknown',
        customer_name: w.amc_responses?.full_name || 'Unknown',
        customer_phone: w.amc_responses?.phone,
        customer_email: w.amc_responses?.email,
        customer_location: `${w.amc_responses?.city || ''}, ${w.amc_responses?.state || ''}`,
        systems_count: systemsCountMap.get(w.amc_order_id) || 0,
        time_spent_minutes: w.time_spent_minutes || 0,
        tasks_performed: w.tasks_performed,
        issues_resolved: w.issues_resolved,
        status: w.status || 'draft',
        requires_approval: w.requires_approval || false,
        approved_by: w.approved_by,
        approved_at: w.approved_at,
        created_at: w.created_at,
        updated_at: w.updated_at,
      })) || [];

      setWorksheets(worksheetsWithNames);
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

      const { data, error } = await supabase
        .from('amc_responses')
        .select('amc_form_id, full_name, phone, email, city, state, status, system_usage_purpose')
        .eq('assigned_to', profile.id)
        .not('status', 'eq', 'completed');

      if (error) throw error;
      setAssignedOrders(data || []);
    } catch (error) {
      console.error('Error fetching assigned orders:', error);
    }
  };

  const fetchWorkLogs = async (worksheetId: string) => {
    try {
      const { data, error } = await supabase
        .from('work_logs')
        .select('*')
        .eq('worksheet_id', worksheetId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setWorkLogs(data || []);
    } catch (error) {
      console.error('Error fetching work logs:', error);
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

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');
      
      img.onload = () => {
        // Max dimensions
        const maxWidth = 1200;
        const maxHeight = 1200;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, 'image/jpeg', 0.7);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImages = async (worksheetId: string): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const file of uploadedImages) {
      try {
        const compressed = await compressImage(file);
        const fileName = `${worksheetId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        const { error: uploadError } = await supabase.storage
          .from('worksheet-images')
          .upload(fileName, compressed, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('worksheet-images')
          .getPublicUrl(fileName);

        urls.push(urlData.publicUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
    
    return urls;
  };

  const handleCreateWorksheet = async (formData: FormData, status: 'draft' | 'submitted') => {
    if (!session?.user?.id) return;
    
    const amcOrderId = formData.get('amc_order_id') as string;
    if (!amcOrderId) {
      toast.error('Please select an order');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const hours = parseInt(formData.get('hours') as string) || 0;
      const minutes = parseInt(formData.get('minutes') as string) || 0;
      const totalMinutes = hours * 60 + minutes;

      const worksheetData = {
        amc_order_id: amcOrderId,
        staff_id: profile.id,
        time_spent_minutes: totalMinutes,
        tasks_performed: formData.get('tasks_performed') as string,
        issues_resolved: formData.get('issues_resolved') as string,
        status,
        requires_approval: status === 'submitted',
      };

      let worksheetId: string;

      if (selectedWorksheet) {
        const { error } = await supabase
          .from('worksheets')
          .update({ ...worksheetData, updated_at: new Date().toISOString() })
          .eq('id', selectedWorksheet.id);

        if (error) throw error;
        worksheetId = selectedWorksheet.id;
      } else {
        const { data, error } = await supabase
          .from('worksheets')
          .insert(worksheetData)
          .select('id')
          .single();

        if (error) throw error;
        worksheetId = data.id;

        // Create initial work log
        const description = formData.get('initial_description') as string;
        if (description) {
          const imageUrls = await uploadImages(worksheetId);
          
          await supabase
            .from('work_logs')
            .insert({
              worksheet_id: worksheetId,
              description,
              log_type: 'progress',
              time_spent_minutes: totalMinutes,
              images: imageUrls.length > 0 ? imageUrls : null,
            });
        }
      }

      toast.success(selectedWorksheet ? 'Worksheet updated' : 'Worksheet created');
      setIsCreateDrawerOpen(false);
      setSelectedWorksheet(null);
      setUploadedImages([]);
      setImagePreviews([]);
      fetchWorksheets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save worksheet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddWorkLog = async () => {
    if (!selectedWorksheet || !logDescription.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setIsSubmitting(true);

    try {
      const timeSpent = logTimeHours * 60 + logTimeMinutes;
      const imageUrls = await uploadImages(selectedWorksheet.id);

      const { error } = await supabase
        .from('work_logs')
        .insert({
          worksheet_id: selectedWorksheet.id,
          description: logDescription,
          log_type: logType,
          time_spent_minutes: timeSpent,
          images: imageUrls.length > 0 ? imageUrls : null,
        });

      if (error) throw error;

      // Update worksheet total time and mark as requiring approval
      const newTotalTime = selectedWorksheet.time_spent_minutes + timeSpent;
      await supabase
        .from('worksheets')
        .update({
          time_spent_minutes: newTotalTime,
          requires_approval: true,
          status: 'submitted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedWorksheet.id);

      toast.success('Work log added successfully');
      setIsAddLogDialogOpen(false);
      resetLogForm();
      fetchWorkLogs(selectedWorksheet.id);
      fetchWorksheets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add work log');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetLogForm = () => {
    setLogDescription('');
    setLogType('progress');
    setLogTimeHours(0);
    setLogTimeMinutes(0);
    setUploadedImages([]);
    setImagePreviews([]);
  };

  const handleApprove = async (worksheet: Worksheet) => {
    if (!session?.user?.id) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      const { error } = await supabase
        .from('worksheets')
        .update({
          status: 'approved',
          requires_approval: false,
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', worksheet.id);

      if (error) throw error;

      toast.success('Worksheet approved');
      fetchWorksheets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve worksheet');
    }
  };

  const handleReject = async (worksheet: Worksheet) => {
    try {
      const { error } = await supabase
        .from('worksheets')
        .update({
          status: 'draft',
          requires_approval: false,
        })
        .eq('id', worksheet.id);

      if (error) throw error;

      toast.success('Worksheet sent back for revision');
      fetchWorksheets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject worksheet');
    }
  };

  const filteredWorksheets = selectedTab === 'all'
    ? worksheets
    : selectedTab === 'pending_approval'
    ? worksheets.filter(w => w.requires_approval && w.status === 'submitted')
    : worksheets.filter(w => w.status === selectedTab);

  const pendingApprovalCount = worksheets.filter(w => w.requires_approval && w.status === 'submitted').length;

  const columns: Column<Worksheet>[] = [
    {
      key: 'amc_order_id',
      header: 'Order & Customer',
      cell: (worksheet) => (
        <div>
          <p className="font-medium text-xs text-muted-foreground">#{worksheet.amc_order_id.slice(0, 8)}...</p>
          <p className="font-semibold">{worksheet.customer_name}</p>
          <p className="text-sm text-muted-foreground">{worksheet.customer_location}</p>
        </div>
      ),
    },
    {
      key: 'staff_name',
      header: 'Technician',
      cell: (worksheet) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="text-foreground">{worksheet.staff_name}</span>
        </div>
      ),
    },
    {
      key: 'systems_count',
      header: 'Systems',
      cell: (worksheet) => (
        <span className="font-medium">{worksheet.systems_count}</span>
      ),
    },
    {
      key: 'time_spent_minutes',
      header: 'Time Spent',
      cell: (worksheet) => (
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{Math.floor(worksheet.time_spent_minutes / 60)}h {worksheet.time_spent_minutes % 60}m</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (worksheet) => (
        <div className="flex flex-col gap-1">
          <StatusBadge variant={worksheet.status as any}>
            {formatStatus(worksheet.status)}
          </StatusBadge>
          {worksheet.requires_approval && worksheet.status === 'submitted' && (
            <span className="text-xs text-warning font-medium flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Pending Approval
            </span>
          )}
        </div>
      ),
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
            {(isTechnician || isAdmin) && worksheet.status !== 'approved' && (
              <DropdownMenuItem onClick={() => handleEdit(worksheet)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Worksheet
              </DropdownMenuItem>
            )}
            {isAdmin && worksheet.requires_approval && worksheet.status === 'submitted' && (
              <>
                <DropdownMenuItem onClick={() => handleApprove(worksheet)} className="text-success">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleReject(worksheet)} className="text-destructive">
                  <X className="h-4 w-4 mr-2" />
                  Request Revision
                </DropdownMenuItem>
              </>
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

  const handleEdit = (worksheet: Worksheet) => {
    setSelectedWorksheet(worksheet);
    setIsCreateDrawerOpen(true);
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
            {isTechnician ? 'Manage your work logs and timesheets' : 'View and approve technician worksheets'}
          </p>
        </div>
        {isTechnician && assignedOrders.length > 0 && (
          <Button
            className="gradient-primary text-white gap-2"
            onClick={() => {
              setSelectedWorksheet(null);
              setUploadedImages([]);
              setImagePreviews([]);
              setIsCreateDrawerOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Worksheet
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Total Worksheets</p>
          <p className="text-2xl font-bold text-foreground mt-1">{worksheets.length}</p>
        </div>
        {isTechnician && (
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Assigned Orders</p>
            <p className="text-2xl font-bold text-foreground mt-1">{assignedOrders.length}</p>
          </div>
        )}
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Total Time Logged</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {Math.floor(worksheets.reduce((sum, w) => sum + w.time_spent_minutes, 0) / 60)}h
          </p>
        </div>
        <div className={cn(
          "rounded-xl border bg-card p-4 shadow-card",
          pendingApprovalCount > 0 && isAdmin && "border-warning bg-warning/5"
        )}>
          <p className="text-sm text-muted-foreground">Pending Approval</p>
          <p className={cn(
            "text-2xl font-bold mt-1",
            pendingApprovalCount > 0 ? "text-warning" : "text-foreground"
          )}>
            {pendingApprovalCount}
          </p>
        </div>
      </div>

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
          {isAdmin && (
            <TabsTrigger 
              value="pending_approval" 
              className={cn(
                "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                pendingApprovalCount > 0 && "text-warning"
              )}
            >
              Pending Approval {pendingApprovalCount > 0 && `(${pendingApprovalCount})`}
            </TabsTrigger>
          )}
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

      {/* View Worksheet Drawer */}
      <DrawerPanel
        open={isViewDrawerOpen}
        onClose={() => setIsViewDrawerOpen(false)}
        title="Worksheet Details"
        subtitle={selectedWorksheet ? `Order #${selectedWorksheet.amc_order_id.slice(0, 8)}...` : ''}
        size="xl"
        footer={
          selectedWorksheet && (isTechnician || isAdmin) && selectedWorksheet.status !== 'approved' && (
            <div className="flex gap-3">
              {isTechnician && (
                <Button
                  className="flex-1 gradient-primary text-white"
                  onClick={() => {
                    resetLogForm();
                    setIsAddLogDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Work Log
                </Button>
              )}
              {isAdmin && selectedWorksheet.requires_approval && (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleReject(selectedWorksheet)}
                  >
                    Request Revision
                  </Button>
                  <Button
                    className="flex-1 bg-success hover:bg-success/90 text-white"
                    onClick={() => handleApprove(selectedWorksheet)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </>
              )}
            </div>
          )
        }
      >
        {selectedWorksheet && (
          <WorksheetDetails 
            worksheet={selectedWorksheet} 
            workLogs={workLogs}
            onAddLog={() => {
              resetLogForm();
              setIsAddLogDialogOpen(true);
            }}
          />
        )}
      </DrawerPanel>

      {/* Create/Edit Worksheet Drawer */}
      <DrawerPanel
        open={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        title={selectedWorksheet ? 'Edit Worksheet' : 'Create Worksheet'}
        subtitle="Log your work progress"
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsCreateDrawerOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              className="flex-1" 
              disabled={isSubmitting}
              onClick={() => {
                const form = document.getElementById('worksheet-form') as HTMLFormElement;
                handleCreateWorksheet(new FormData(form), 'draft');
              }}
            >
              Save Draft
            </Button>
            <Button 
              className="flex-1 gradient-primary text-white" 
              disabled={isSubmitting}
              onClick={() => {
                const form = document.getElementById('worksheet-form') as HTMLFormElement;
                handleCreateWorksheet(new FormData(form), 'submitted');
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </div>
        }
      >
        <WorksheetForm
          worksheet={selectedWorksheet}
          assignedOrders={assignedOrders}
          uploadedImages={imagePreviews}
          onRemoveImage={removeImage}
          onSelectFiles={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
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
                placeholder="Describe the work done..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Work Proof Images (Optional)</Label>
              <div className="flex flex-wrap gap-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative h-20 w-20 rounded-lg border overflow-hidden">
                    <img src={preview} alt="" className="h-full w-full object-cover" />
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
    </div>
  );
}

function WorksheetDetails({ 
  worksheet, 
  workLogs,
  onAddLog 
}: { 
  worksheet: Worksheet; 
  workLogs: WorkLog[];
  onAddLog: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Customer & Order Info */}
      <div className="rounded-lg border p-4 bg-muted/30">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <User className="h-4 w-4" />
          Customer Details
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{worksheet.customer_name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Order ID</p>
            <p className="font-medium font-mono text-xs">{worksheet.amc_order_id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{worksheet.customer_phone || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{worksheet.customer_location}</span>
          </div>
        </div>
      </div>

      {/* Worksheet Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Technician</p>
          <p className="font-semibold">{worksheet.staff_name}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Systems</p>
          <p className="font-semibold">{worksheet.systems_count}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Time</p>
          <p className="font-semibold">
            {Math.floor(worksheet.time_spent_minutes / 60)}h {worksheet.time_spent_minutes % 60}m
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Status</p>
          <StatusBadge variant={worksheet.status as any}>
            {formatStatus(worksheet.status)}
          </StatusBadge>
        </div>
      </div>

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

      <Separator />

      {/* Work Logs Timeline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Work Log History ({workLogs.length} entries)</h4>
        </div>
        
        {workLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No work logs yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
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
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
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
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.floor(log.time_spent_minutes / 60)}h {log.time_spent_minutes % 60}m
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm">{log.description}</p>
                    {log.images && log.images.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {log.images.map((img, i) => (
                          <a
                            key={i}
                            href={img}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-16 w-16 rounded-md border overflow-hidden hover:opacity-80 transition-opacity"
                          >
                            <img src={img} alt="" className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Approval Info */}
      {worksheet.approved_at && (
        <div className="rounded-lg border p-4 bg-success/5 border-success/20">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">Approved on {format(new Date(worksheet.approved_at), 'MMM dd, yyyy HH:mm')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function WorksheetForm({
  worksheet,
  assignedOrders,
  uploadedImages,
  onRemoveImage,
  onSelectFiles,
}: {
  worksheet: Worksheet | null;
  assignedOrders: AssignedOrder[];
  uploadedImages: string[];
  onRemoveImage: (index: number) => void;
  onSelectFiles: () => void;
}) {
  const selectedOrder = assignedOrders.find(o => o.amc_form_id === worksheet?.amc_order_id);

  return (
    <form id="worksheet-form" className="space-y-6">
      <div className="space-y-2">
        <Label>Select Order *</Label>
        <Select name="amc_order_id" defaultValue={worksheet?.amc_order_id || ''}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an assigned order" />
          </SelectTrigger>
          <SelectContent>
            {assignedOrders.map(order => (
              <SelectItem key={order.amc_form_id} value={order.amc_form_id}>
                <div className="flex flex-col">
                  <span className="font-medium">{order.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    #{order.amc_form_id.slice(0, 8)} • {order.city}, {order.state}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedOrder && (
        <div className="rounded-lg border p-4 bg-muted/30">
          <h4 className="font-semibold mb-2">Order Details</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span>{selectedOrder.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span>{selectedOrder.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location:</span>
              <span>{selectedOrder.city}, {selectedOrder.state}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <StatusBadge variant={selectedOrder.status as any} size="sm">
                {formatStatus(selectedOrder.status)}
              </StatusBadge>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Hours</Label>
          <Input
            name="hours"
            type="number"
            min="0"
            defaultValue={worksheet ? Math.floor(worksheet.time_spent_minutes / 60) : 0}
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
          placeholder="Describe the tasks you performed..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Issues Resolved</Label>
        <Textarea
          name="issues_resolved"
          defaultValue={worksheet?.issues_resolved || ''}
          placeholder="Describe any issues you resolved..."
          rows={3}
        />
      </div>

      {!worksheet && (
        <div className="space-y-2">
          <Label>Work Proof Images (Optional)</Label>
          <div className="flex flex-wrap gap-2">
            {uploadedImages.map((preview, index) => (
              <div key={index} className="relative h-20 w-20 rounded-lg border overflow-hidden">
                <img src={preview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveImage(index)}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {uploadedImages.length < 5 && (
              <button
                type="button"
                onClick={onSelectFiles}
                className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary transition-colors"
              >
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Upload</span>
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Max 5 images, automatically compressed</p>
        </div>
      )}
    </form>
  );
}
