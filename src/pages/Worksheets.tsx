import React, { useState } from 'react';
import { Plus, Clock, FileText, Image, MoreHorizontal, Eye, Edit, CheckCircle } from 'lucide-react';
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
import { mockWorksheets, mockOrders, mockStaff } from '@/data/mockData';
import { Worksheet, AMCOrder, WorkLog } from '@/types';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function WorksheetsPage() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedWorksheet, setSelectedWorksheet] = useState<Worksheet | null>(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const isTechnician = user?.role === 'technician';
  const isAdmin = user?.role === 'admin';

  // Filter worksheets based on role
  const worksheets = isTechnician
    ? mockWorksheets.filter(w => w.staff_id === user.id)
    : mockWorksheets;

  const filteredWorksheets = selectedTab === 'all'
    ? worksheets
    : worksheets.filter(w => w.status === selectedTab);

  // Get assigned orders for technician
  const assignedOrders = isTechnician
    ? mockOrders.filter(o => o.assigned_to === user?.id && o.status !== 'completed')
    : mockOrders.filter(o => o.status !== 'completed');

  const columns: Column<Worksheet>[] = [
    {
      key: 'amc_order_id',
      header: 'Order',
      cell: (worksheet) => {
        const order = mockOrders.find(o => o.amc_form_id === worksheet.amc_order_id);
        return (
          <div>
            <p className="font-medium">#{worksheet.amc_order_id}</p>
            <p className="text-sm text-muted-foreground">{order?.full_name || 'Unknown'}</p>
          </div>
        );
      },
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
      key: 'work_logs',
      header: 'Logs',
      cell: (worksheet) => (
        <span className="text-muted-foreground">{worksheet.work_logs.length} entries</span>
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
    setIsViewDrawerOpen(true);
  };

  const handleEdit = (worksheet: Worksheet) => {
    setSelectedWorksheet(worksheet);
    setIsCreateDrawerOpen(true);
  };

  const handleApprove = (worksheet: Worksheet) => {
    toast.success('Worksheet approved successfully!');
  };

  const handleCreateWorksheet = () => {
    toast.success('Worksheet created successfully!');
    setIsCreateDrawerOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
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

      {/* Quick Stats for Technician */}
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

      {/* Tabs */}
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

      {/* View Worksheet Drawer */}
      <DrawerPanel
        open={isViewDrawerOpen}
        onClose={() => setIsViewDrawerOpen(false)}
        title="Worksheet Details"
        subtitle={selectedWorksheet ? `Order #${selectedWorksheet.amc_order_id}` : ''}
        size="xl"
      >
        {selectedWorksheet && <WorksheetDetails worksheet={selectedWorksheet} />}
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
            <Button variant="outline" className="flex-1" onClick={handleCreateWorksheet}>
              Save Draft
            </Button>
            <Button className="flex-1 gradient-primary text-white" onClick={handleCreateWorksheet}>
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

function WorksheetDetails({ worksheet }: { worksheet: Worksheet }) {
  const order = mockOrders.find(o => o.amc_form_id === worksheet.amc_order_id);

  return (
    <div className="space-y-6">
      {/* Summary */}
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

      {/* Customer Info */}
      {order && (
        <div className="rounded-lg border p-4 bg-muted/30">
          <h4 className="font-semibold mb-2">Customer</h4>
          <p className="font-medium">{order.full_name}</p>
          <p className="text-sm text-muted-foreground">{order.city}, {order.state}</p>
        </div>
      )}

      {/* Tasks & Issues */}
      <div className="space-y-4">
        <div className="rounded-lg border p-4">
          <h4 className="font-semibold mb-2">Tasks Performed</h4>
          <p className="text-muted-foreground">{worksheet.tasks_performed}</p>
        </div>
        {worksheet.issues_resolved && (
          <div className="rounded-lg border p-4">
            <h4 className="font-semibold mb-2">Issues Resolved</h4>
            <p className="text-muted-foreground">{worksheet.issues_resolved}</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Work Logs Timeline */}
      <div>
        <h4 className="font-semibold mb-4">Work Logs</h4>
        <div className="space-y-4">
          {worksheet.work_logs.map((log, index) => (
            <div key={log.id} className="relative pl-6">
              {index !== worksheet.work_logs.length - 1 && (
                <div className="absolute left-[9px] top-6 h-full w-0.5 bg-border" />
              )}
              <div
                className={cn(
                  'absolute left-0 top-1.5 h-5 w-5 rounded-full border-2 flex items-center justify-center',
                  log.type === 'progress' && 'border-info bg-info/10',
                  log.type === 'issue' && 'border-warning bg-warning/10',
                  log.type === 'resolution' && 'border-success bg-success/10',
                  log.type === 'note' && 'border-muted-foreground bg-muted'
                )}
              >
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    log.type === 'progress' && 'bg-info',
                    log.type === 'issue' && 'bg-warning',
                    log.type === 'resolution' && 'bg-success',
                    log.type === 'note' && 'bg-muted-foreground'
                  )}
                />
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <StatusBadge
                    variant={
                      log.type === 'progress' ? 'in_progress' :
                      log.type === 'issue' ? 'pending' :
                      log.type === 'resolution' ? 'completed' : 'default'
                    }
                    size="sm"
                  >
                    {formatStatus(log.type)}
                  </StatusBadge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.timestamp), 'MMM dd, HH:mm')}
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
    </div>
  );
}

function WorksheetForm({
  worksheet,
  assignedOrders,
}: {
  worksheet: Worksheet | null;
  assignedOrders: AMCOrder[];
}) {
  const [logs, setLogs] = useState<Partial<WorkLog>[]>(worksheet?.work_logs || []);

  const addLog = () => {
    setLogs([
      ...logs,
      {
        id: `temp-${Date.now()}`,
        timestamp: new Date().toISOString(),
        description: '',
        type: 'progress',
      },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Order Selection */}
      <div className="space-y-2">
        <Label>Select Order</Label>
        <Select defaultValue={worksheet?.amc_order_id || ''}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an assigned order" />
          </SelectTrigger>
          <SelectContent>
            {assignedOrders.map(order => (
              <SelectItem key={order.amc_form_id} value={order.amc_form_id}>
                #{order.amc_form_id} - {order.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Time Spent */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Hours</Label>
          <Input
            type="number"
            min="0"
            defaultValue={worksheet ? Math.floor(worksheet.time_spent_minutes / 60) : 0}
          />
        </div>
        <div className="space-y-2">
          <Label>Minutes</Label>
          <Input
            type="number"
            min="0"
            max="59"
            defaultValue={worksheet ? worksheet.time_spent_minutes % 60 : 0}
          />
        </div>
      </div>

      {/* Tasks Performed */}
      <div className="space-y-2">
        <Label>Tasks Performed</Label>
        <Textarea
          defaultValue={worksheet?.tasks_performed || ''}
          placeholder="Describe the tasks you performed..."
          rows={3}
        />
      </div>

      {/* Issues Resolved */}
      <div className="space-y-2">
        <Label>Issues Resolved</Label>
        <Textarea
          defaultValue={worksheet?.issues_resolved || ''}
          placeholder="Describe any issues you resolved..."
          rows={3}
        />
      </div>

      <Separator />

      {/* Work Logs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Label>Work Logs</Label>
          <Button variant="outline" size="sm" onClick={addLog}>
            <Plus className="h-4 w-4 mr-1" />
            Add Log
          </Button>
        </div>
        <div className="space-y-4">
          {logs.map((log, index) => (
            <div key={log.id || index} className="rounded-lg border p-4 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Label>Type</Label>
                  <Select defaultValue={log.type || 'progress'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="progress">Progress</SelectItem>
                      <SelectItem value="issue">Issue</SelectItem>
                      <SelectItem value="resolution">Resolution</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  defaultValue={log.description}
                  placeholder="Describe what you did..."
                  rows={2}
                />
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Image className="h-4 w-4" />
                Add Images
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
