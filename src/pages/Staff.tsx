import React, { useState, useEffect } from 'react';
import { Plus, Mail, Phone, MoreHorizontal, Eye, Edit, UserX } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { accessSync } from 'fs';

interface Staff {
  id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  is_active: boolean;
  role?: string;
  assigned_orders_count?: number;
}

const departments = ['All', 'Management', 'Technical Support', 'Customer Support', 'Finance'];
const roles = [
  { value: 'admin', label: 'Admin' },
  { value: 'technician', label: 'Technician' },
  { value: 'support', label: 'Customer Support' },
  { value: 'bookkeeping', label: 'Bookkeeping' },
];

export default function StaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;

      // Fetch roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap = new Map(userRoles?.map(r => [r.user_id, r.role]) || []);

      // Fetch assigned orders count for technicians
      const { data: orders } = await supabase
        .from('amc_responses')
        .select('assigned_to')
        .not('assigned_to', 'is', null);

      const assignedCounts = new Map<string, number>();
      orders?.forEach(o => {
        if (o.assigned_to) {
          assignedCounts.set(o.assigned_to, (assignedCounts.get(o.assigned_to) || 0) + 1);
        }
      });

      // Only include profiles that have roles (staff members)
      const staffWithRoles = profiles?.filter(p => 
        p.user_id && roleMap.has(p.user_id)
      ).map(p => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone || undefined,
        department: p.department || 'General',
        is_active: p.is_active ?? true,
        role: roleMap.get(p.user_id),
        assigned_orders_count: assignedCounts.get(p.id) || 0,
      })) || [];

      setStaffList(staffWithRoles);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStaff = async (staffId: string, updates: Partial<Staff>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', staffId);

      if (error) throw error;

      toast.success('Staff updated successfully');
      fetchStaff();
      setIsEditDrawerOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update staff');
    }
  };

  const handleDeactivate = async (staff: Staff) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !staff.is_active })
        .eq('id', staff.id);

      if (error) throw error;

      toast.success(staff.is_active ? 'Staff deactivated' : 'Staff activated');
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update staff status');
    }
  };
  // NOTE: Password generation moved to server-side edge function if needed.

  const handleAddStaff = async (formData: {
    full_name: string;
    email: string;
    phone: string;
    department: string;
    role: string;
    password?: string | null;
  }) => {
    setIsAddingStaff(true);

    try {
      // Get current authenticated user info to include in the edge function request
      const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

      const accessToken = sessionData.session.access_token;
      console.log(accessToken);

      if (sessionError || !sessionData.session) {
        throw new Error("Not authenticated");
      }



      // Call the Supabase Edge Function `create-staff`.
      // The edge function will validate the current user's role (must be admin)
      // and perform user creation + profile + user_roles assignment server-side.
      const payload = {
        staff: formData,
      };

      const res = await fetch(
      "http://localhost:3000/api/admin/create-staff",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          staff: formData,
        }),
      }
    );

    const text = await res.text();

    if (!res.ok) {
      console.error("Edge function error:", text);
      throw new Error(text);
    }

    const fnData = JSON.parse(text);
  
      // Attempt to parse the function response (it may be string/Uint8Array)
      let result: any = fnData;
      try {
        if (fnData instanceof Uint8Array) {
          result = JSON.parse(new TextDecoder().decode(fnData));
        } else if (typeof fnData === 'string') {
          result = JSON.parse(fnData);
        }
      } catch (e) {
        // fallback: leave result as-is
      }

      // Show success message returned from function if present
      const successMsg = result?.message || 'Staff added successfully';
      toast.success(successMsg, { duration: 10000 });

      // If the function returned a generated/temporary password, copy it
      const returnedPassword = result?.password || formData.password;
      if (returnedPassword) {
        try {
          await navigator.clipboard.writeText(returnedPassword);
          toast.success('Password copied to clipboard!');
        } catch (e) {
          console.log('Could not copy to clipboard:', e);
        }
      }

      fetchStaff();
      setIsAddDrawerOpen(false);
    } catch (error: any) {
      console.error('Error adding staff:', error);
      toast.error(error.message || 'Failed to add staff member');
    } finally {
      setIsAddingStaff(false);
    }
  };

  const filteredStaff = selectedDepartment === 'All'
    ? staffList
    : staffList.filter(s => s.department === selectedDepartment);

  const handleView = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsViewDrawerOpen(true);
  };

  const handleEdit = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsEditDrawerOpen(true);
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
          <h1 className="text-2xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">Manage your team members and their roles</p>
        </div>
        <Button 
          onClick={() => setIsAddDrawerOpen(true)}
          className="gradient-primary text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Staff
        </Button>
      </div>

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

      {filteredStaff.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No staff members found
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStaff.map(staff => (
            <div
              key={staff.id}
              className={cn(
                'rounded-xl border bg-card p-5 shadow-card transition-all hover:shadow-elevated',
                !staff.is_active && 'opacity-60'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
                    {staff.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{staff.full_name}</p>
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
                    <DropdownMenuItem 
                      className={staff.is_active ? 'text-destructive' : 'text-success'}
                      onClick={() => handleDeactivate(staff)}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      {staff.is_active ? 'Deactivate' : 'Activate'}
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
                <StatusBadge variant={staff.is_active ? 'active' : 'inactive'}>
                  {staff.is_active ? 'Active' : 'Inactive'}
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
      )}

      <DrawerPanel
        open={isViewDrawerOpen}
        onClose={() => setIsViewDrawerOpen(false)}
        title="Staff Profile"
        subtitle={selectedStaff?.email}
        size="md"
      >
        {selectedStaff && <StaffDetails staff={selectedStaff} />}
      </DrawerPanel>

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
            <Button 
              className="gradient-primary text-white"
              onClick={() => {
                if (selectedStaff) {
                  const form = document.getElementById('staff-form') as HTMLFormElement;
                  const formData = new FormData(form);
                  handleUpdateStaff(selectedStaff.id, {
                    full_name: formData.get('full_name') as string,
                    phone: formData.get('phone') as string,
                    department: formData.get('department') as string,
                  });
                }
              }}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        {selectedStaff && <StaffForm staff={selectedStaff} />}
      </DrawerPanel>

      <DrawerPanel
        open={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        title="Add New Staff"
        subtitle="Create a new staff account with auto-generated password"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsAddDrawerOpen(false)}
              disabled={isAddingStaff}
            >
              Cancel
            </Button>
            <Button 
              className="gradient-primary text-white"
              disabled={isAddingStaff}
              onClick={() => {
                const form = document.getElementById('add-staff-form') as HTMLFormElement;
                const formData = new FormData(form);
                
                const staffData = {
                  full_name: formData.get('full_name') as string,
                  email: formData.get('email') as string,
                  phone: formData.get('phone') as string,
                  department: formData.get('department') as string,
                  role: formData.get('role') as string,
                  password: formData.get('password') as string,
                };
                
                // Basic validation
                if (!staffData.full_name || !staffData.email || !staffData.department || !staffData.role || !staffData.password) {
                  toast.error('Please fill in all required fields');
                  return;
                }
                
                handleAddStaff(staffData);
              }}
            >
              {isAddingStaff ? 'Adding Staff...' : 'Add Staff'}
            </Button>
          </div>
        }
      >
        <AddStaffForm />
      </DrawerPanel>
    </div>
  );
}

function StaffForm({ staff }: { staff?: Staff }) {
  return (
    <form id="staff-form" className="space-y-4">
      <div className="space-y-2">
        <Label>Full Name</Label>
        <Input name="full_name" defaultValue={staff?.full_name || ''} placeholder="Enter full name" />
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" defaultValue={staff?.email || ''} placeholder="Enter email address" disabled />
        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
      </div>

      <div className="space-y-2">
        <Label>Phone</Label>
        <Input name="phone" defaultValue={staff?.phone || ''} placeholder="Enter phone number" />
      </div>

      <div className="space-y-2">
        <Label>Department</Label>
        <Select name="department" defaultValue={staff?.department || ''}>
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
    </form>
  );
}

function AddStaffForm() {
  return (
    <form id="add-staff-form" className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Full Name *</Label>
        <Input 
          name="full_name" 
          id="full_name"
          placeholder="Enter full name" 
          required 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <Input 
          type="email" 
          name="email" 
          id="email"
          placeholder="Enter email address" 
          required 
        />
        <p className="text-xs text-muted-foreground">
          A temporary password will be auto-generated and shown after account creation
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input 
          name="phone" 
          id="phone"
          placeholder="Enter phone number (optional)" 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <Input
          type="password"
          name="password"
          id="password"
          placeholder="Enter temporary password"
          required
        />
        <p className="text-xs text-muted-foreground">Provide a temporary password for the user.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">Department *</Label>
        <Select name="department" required>
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

      <div className="space-y-2">
        <Label htmlFor="role">Role *</Label>
        <Select name="role" required>
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

      <div className="rounded-lg border bg-muted/30 p-4">
        <h4 className="text-sm font-medium mb-2">Security Information</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Provide a temporary password for the new account</li>
          <li>• The password will be copied to clipboard</li>
          <li>• Please share the password with the staff member securely</li>
          <li>• They can change their password after first login</li>
        </ul>
      </div>
    </form>
  );
}

function StaffDetails({ staff }: { staff: Staff }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-2xl">
          {staff.full_name.charAt(0)}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">{staff.full_name}</h3>
          <p className="text-muted-foreground capitalize">{staff.role}</p>
          <StatusBadge variant={staff.is_active ? 'active' : 'inactive'} className="mt-2">
            {staff.is_active ? 'Active' : 'Inactive'}
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
