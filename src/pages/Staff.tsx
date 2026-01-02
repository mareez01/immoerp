import React, { useState } from 'react';
import { Plus, Filter, Mail, Phone, MoreHorizontal, Eye, Edit, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, formatStatus } from '@/components/ui/status-badge';
import { DrawerPanel } from '@/components/ui/drawer-panel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockStaff } from '@/data/mockData';
import { Staff, UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const departments = ['All', 'Management', 'Technical Support', 'Customer Support', 'Finance'];
const roles: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'technician', label: 'Technician' },
  { value: 'support', label: 'Customer Support' },
  { value: 'bookkeeping', label: 'Bookkeeping' },
];

export default function StaffPage() {
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const filteredStaff = selectedDepartment === 'All'
    ? mockStaff
    : mockStaff.filter(s => s.department === selectedDepartment);

  const handleView = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsViewDrawerOpen(true);
  };

  const handleEdit = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsEditDrawerOpen(true);
  };

  const handleAddStaff = () => {
    toast.success('Staff member added successfully!');
    setIsAddDrawerOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">Manage your team members and their roles</p>
        </div>
        <Button className="gradient-primary text-white gap-2" onClick={() => setIsAddDrawerOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {departments.map(dept => (
          <Button
            key={dept}
            variant={selectedDepartment === dept ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDepartment(dept)}
            className={cn(
              selectedDepartment === dept && 'gradient-primary text-white'
            )}
          >
            {dept}
          </Button>
        ))}
      </div>

      {/* Staff Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredStaff.map(staff => (
          <div
            key={staff.id}
            className={cn(
              'rounded-xl border bg-card p-5 shadow-card transition-all hover:shadow-elevated',
              !staff.active && 'opacity-60'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
                  {staff.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{staff.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{staff.role}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleView(staff)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEdit(staff)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <UserX className="h-4 w-4 mr-2" />
                    Deactivate
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{staff.email}</span>
              </div>
              {staff.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{staff.phone}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{staff.department}</span>
              <StatusBadge variant={staff.active ? 'active' : 'inactive'}>
                {staff.active ? 'Active' : 'Inactive'}
              </StatusBadge>
            </div>

            {staff.role === 'technician' && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Assigned Orders</span>
                  <span className="font-semibold text-foreground">{staff.assigned_orders_count || 0}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Staff Drawer */}
      <DrawerPanel
        open={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        title="Add New Staff"
        subtitle="Create a new staff member account"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddDrawerOpen(false)}>
              Cancel
            </Button>
            <Button className="gradient-primary text-white" onClick={handleAddStaff}>
              Add Staff
            </Button>
          </div>
        }
      >
        <StaffForm />
      </DrawerPanel>

      {/* View Staff Drawer */}
      <DrawerPanel
        open={isViewDrawerOpen}
        onClose={() => setIsViewDrawerOpen(false)}
        title="Staff Profile"
        subtitle={selectedStaff?.email}
        size="md"
      >
        {selectedStaff && <StaffDetails staff={selectedStaff} />}
      </DrawerPanel>

      {/* Edit Staff Drawer */}
      <DrawerPanel
        open={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        title="Edit Staff"
        subtitle={selectedStaff?.email}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditDrawerOpen(false)}>
              Cancel
            </Button>
            <Button className="gradient-primary text-white">
              Save Changes
            </Button>
          </div>
        }
      >
        {selectedStaff && <StaffForm staff={selectedStaff} />}
      </DrawerPanel>
    </div>
  );
}

function StaffForm({ staff }: { staff?: Staff }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Full Name</Label>
        <Input defaultValue={staff?.name || ''} placeholder="Enter full name" />
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" defaultValue={staff?.email || ''} placeholder="Enter email address" />
      </div>

      <div className="space-y-2">
        <Label>Phone</Label>
        <Input defaultValue={staff?.phone || ''} placeholder="Enter phone number" />
      </div>

      <div className="space-y-2">
        <Label>Role</Label>
        <Select defaultValue={staff?.role || ''}>
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map(role => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Department</Label>
        <Select defaultValue={staff?.department || ''}>
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.filter(d => d !== 'All').map(dept => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function StaffDetails({ staff }: { staff: Staff }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-2xl">
          {staff.name.charAt(0)}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">{staff.name}</h3>
          <p className="text-muted-foreground capitalize">{staff.role}</p>
          <StatusBadge variant={staff.active ? 'active' : 'inactive'} className="mt-2">
            {staff.active ? 'Active' : 'Inactive'}
          </StatusBadge>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Email</p>
          <p className="font-medium">{staff.email}</p>
        </div>
        {staff.phone && (
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground mb-1">Phone</p>
            <p className="font-medium">{staff.phone}</p>
          </div>
        )}
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Department</p>
          <p className="font-medium">{staff.department}</p>
        </div>
        {staff.role === 'technician' && (
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground mb-1">Assigned Orders</p>
            <p className="font-medium">{staff.assigned_orders_count || 0}</p>
          </div>
        )}
      </div>
    </div>
  );
}
