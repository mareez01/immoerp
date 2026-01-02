import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Ticket,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles?: string[];
  customerOnly?: boolean;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ClipboardList, label: 'AMC Orders', path: '/orders', roles: ['admin', 'technician', 'support', 'bookkeeping'] },
  { icon: Users, label: 'Staff', path: '/staff', roles: ['admin'] },
  { icon: Building2, label: 'Customers', path: '/customers', roles: ['admin', 'support', 'bookkeeping'] },
  { icon: FileText, label: 'Invoices', path: '/invoices', roles: ['admin', 'bookkeeping', 'support'] },
  { icon: Wrench, label: 'Worksheets', path: '/worksheets', roles: ['admin', 'technician'] },
  { icon: Ticket, label: 'Support Tickets', path: '/tickets', roles: ['admin', 'support'] },
  // Customer portal items
  { icon: ClipboardList, label: 'My Orders', path: '/portal/orders', customerOnly: true },
  { icon: FileText, label: 'My Invoices', path: '/portal/invoices', customerOnly: true },
  { icon: Ticket, label: 'Support', path: '/portal/support', customerOnly: true },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, isCustomer } = useAuth();
  const location = useLocation();

  const filteredNavItems = navItems.filter(item => {
    if (isCustomer) {
      return item.customerOnly;
    }
    if (item.customerOnly) {
      return false;
    }
    if (!item.roles) {
      return true;
    }
    return user?.role && item.roles.includes(user.role);
  });

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen gradient-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <Wrench className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">AMC ERP</span>
            </div>
          )}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary mx-auto">
              <Wrench className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-muted"
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 mt-4">
          {isCustomer && !collapsed && (
            <div className="px-3 py-2 mb-2">
              <p className="text-xs uppercase tracking-wider text-sidebar-muted">Customer Portal</p>
            </div>
          )}
          
          {filteredNavItems.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            const link = (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  collapsed && 'justify-center px-2'
                )}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-current')} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-3">
          {user && (
            <div
              className={cn(
                'flex items-center gap-3 rounded-lg p-2',
                collapsed && 'justify-center'
              )}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground font-semibold text-sm">
                {user.name?.charAt(0) || 'U'}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-sidebar-muted capitalize truncate">
                    {user.role || 'Customer'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
