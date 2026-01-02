import React from 'react';
import { Bell, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

export function Header() {
  const { user, switchRole } = useAuth();

  const roles: { value: UserRole; label: string }[] = [
    { value: 'admin', label: 'Admin' },
    { value: 'technician', label: 'Technician' },
    { value: 'support', label: 'Customer Support' },
    { value: 'bookkeeping', label: 'Bookkeeping' },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      {/* Search */}
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search orders, customers, staff..."
          className="pl-9 bg-muted/50 border-transparent focus:bg-background focus:border-input"
        />
      </div>

      <div className="flex items-center gap-4">
        {/* Role Switcher (Demo) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Role:</span>
              <span className="font-medium capitalize">{user?.role}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Switch Role (Demo)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {roles.map(role => (
              <DropdownMenuItem
                key={role.value}
                onClick={() => switchRole(role.value)}
                className={user?.role === role.value ? 'bg-muted' : ''}
              >
                {role.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            3
          </span>
        </Button>

        {/* User Avatar */}
        {user && (
          <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary text-white font-semibold text-sm">
            {user.name.charAt(0)}
          </div>
        )}
      </div>
    </header>
  );
}
