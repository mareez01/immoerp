import React, { useState, useEffect } from 'react';
import { Plus, Clock, Image, MoreHorizontal, Eye, Edit, CheckCircle } from 'lucide-react';
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
  time_spent_minutes: number;
  tasks_performed?: string;
  issues_resolved?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface WorkLog {
  id: string;
  worksheet_id: string;
  description: string;
  log_type: string;
  images?: string[];
  created_at: string;
}

interface AssignedOrder {
  amc_form_id: string;
  full_name: string;
  status: string;
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
  const [isLoading, setIsLoading] = useState(true);

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
          amc_responses!worksheets_amc_order_id_fkey (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const worksheetsWithNames = data?.map(w => ({
        id: w.id,
        amc_order_id: w.amc_order_id,
        staff_id: w.staff_id,
        staff_name: w.profiles?.full_name || 'Unknown',
        customer_name: w.amc_responses?.full_name || 'Unknown',
        time_spent_minutes: w.time_spent_minutes || 0,
        tasks_performed: w.tasks_performed,
        issues_resolved: w.issues_resolved,
        status: w.status || 'draft',
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
      // First get the profile id for the current user
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('amc_responses')
        .select('amc_form_id, full_name, status')
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

  const handleCreateWorksheet = async (formData: FormData, status: 'draft' | 'submitted') => {
    if (!session?.user?.id) return;

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

      const worksheetData = {
        amc_order_id: formData.get('amc_order_id') as string,
        staff_id: profile.id,
        time_spent_minutes: hours * 60 + minutes,
        tasks_performed: formData.get('tasks_performed') as string,
        issues_resolved: formData.get('issues_resolved') as string,
        status,
      };

      if (selectedWorksheet) {
        const { error } = await supabase
          .from('worksheets')
          .update(worksheetData)
          .eq('id', selectedWorksheet.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('worksheets')
          .insert(worksheetData);

        if (error) throw error;
      }

      toast.success(selectedWorksheet ? 'Worksheet updated' : 'Worksheet created');
      setIsCreateDrawerOpen(false);
      setSelectedWorksheet(null);
      fetchWorksheets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save worksheet');
    }
  };

  const handleApprove = async (worksheet: Worksheet) => {
    try {
      const { error } = await supabase
        .from('worksheets')
        .update({ status: 'approved' })
        .eq('id', worksheet.id);

      if (error) throw error;

      toast.success('Worksheet approved');
      fetchWorksheets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve worksheet');
    }
  };

  const filteredWorksheets = selectedTab === 'all'
    ? worksheets
    : worksheets.filter(w => w.status === selectedTab);

  const columns: Column<Worksheet>[] = [
    {
      key: 'amc_order_id',
      header: 'Order',
      cell: (worksheet) => (
        <div>
          <p className="font-medium">#{worksheet.amc_order_id.slice(0, 8)}...</p>
          <p className="text-sm text-muted-foreground">{worksheet.customer_name}</p>
        </div>
      ),
    },
    {
      key: 'staff_name',
      header: 'Technician',
      cell: (worksheet) => (
        <span className="text-foreground">{worksheet.staff_name}</span>
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
        <StatusBadge variant={worksheet.status as any}>
          {formatStatus(worksheet.status)}
        </StatusBadge>
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
            {isAdmin && worksheet.status === 'submitted' && (
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
            {isTechnician ? 'Manage your work logs and timesheets' : 'View all technician worksheets'}
          </p>
        </div>
        {isTechnician && assignedOrders.length > 0 && (
          <Button
            className="gradient-primary text-white gap-2"
            onClick={() => {
              setSelectedWorksheet(null);
              setIsCreateDrawerOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Worksheet
          </Button>
        )}
      </div>

      {isTechnician && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Assigned Orders</p>
            <p className="text-2xl font-bold text-foreground mt-1">{assignedOrders.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Total Time Logged</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {Math.floor(worksheets.reduce((sum, w) => sum + w.time_spent_minutes, 0) / 60)}h
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Pending Approval</p>
            <p className="text-2xl font-bold text-warning mt-1">
              {worksheets.filter(w => w.status === 'submitted').length}
            </p>
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
        open={isViewDrawerOpen}
        onClose={() => setIsViewDrawerOpen(false)}
        title="Worksheet Details"
        subtitle={selectedWorksheet ? `Order #${selectedWorksheet.amc_order_id.slice(0, 8)}...` : ''}
        size="xl"
      >
        {selectedWorksheet && (
          <WorksheetDetails worksheet={selectedWorksheet} workLogs={workLogs} />
        )}
      </DrawerPanel>

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
              onClick={() => {
                const form = document.getElementById('worksheet-form') as HTMLFormElement;
                handleCreateWorksheet(new FormData(form), 'draft');
              }}
            >
              Save Draft
            </Button>
            <Button 
              className="flex-1 gradient-primary text-white" 
              onClick={() => {
                const form = document.getElementById('worksheet-form') as HTMLFormElement;
                handleCreateWorksheet(new FormData(form), 'submitted');
              }}
            >
              Submit
            </Button>
          </div>
        }
      >
        <WorksheetForm
          worksheet={selectedWorksheet}
          assignedOrders={assignedOrders}
        />
      </DrawerPanel>
    </div>
  );
}

function WorksheetDetails({ worksheet, workLogs }: { worksheet: Worksheet; workLogs: WorkLog[] }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Technician</p>
          <p className="font-semibold">{worksheet.staff_name}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Time Spent</p>
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

      <div className="rounded-lg border p-4 bg-muted/30">
        <h4 className="font-semibold mb-2">Customer</h4>
        <p className="font-medium">{worksheet.customer_name}</p>
      </div>

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

      {workLogs.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="font-semibold mb-4">Work Logs</h4>
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
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm">{log.description}</p>
                    {log.images && log.images.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {log.images.map((img, i) => (
                          <div
                            key={i}
                            className="h-16 w-16 rounded-md border bg-muted flex items-center justify-center"
                          >
                            <Image className="h-6 w-6 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function WorksheetForm({
  worksheet,
  assignedOrders,
}: {
  worksheet: Worksheet | null;
  assignedOrders: AssignedOrder[];
}) {
  return (
    <form id="worksheet-form" className="space-y-6">
      <div className="space-y-2">
        <Label>Select Order</Label>
        <Select name="amc_order_id" defaultValue={worksheet?.amc_order_id || ''}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an assigned order" />
          </SelectTrigger>
          <SelectContent>
            {assignedOrders.map(order => (
              <SelectItem key={order.amc_form_id} value={order.amc_form_id}>
                #{order.amc_form_id.slice(0, 8)}... - {order.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
    </form>
  );
}
