import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Home, Plus, FileText, Ticket, HelpCircle, ChevronDown, Menu, X, CreditCard, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/Footer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAMCAuth } from '@/contexts/AMCAuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CustomerProfileModal } from '@/components/CustomerProfileModal';

// Customer portal navigation items
const NAV_ITEMS = [
  { href: '/amc/dashboard', label: 'My AMCs', icon: Home },
  { href: '/amc/invoices', label: 'Invoices', icon: CreditCard },
  { href: '/amc/support', label: 'Support', icon: Ticket },
  { href: '/amc/new-order', label: 'New Order', icon: Plus },
];

export default function CustomerPortalLayout() {
  const { user, logout } = useAMCAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [profileModalOpen, setProfileModalOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/amc/signin');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Customer Portal Branding (Business Name Only) */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-white px-4 md:px-6 shadow-sm">
        {/* Logo / Business Name */}
        <Link to="/amc/dashboard" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">FL</span>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">FL Smartech</p>
            <p className="text-xs text-gray-500">Computer AMC Services</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
                           (item.href === '/amc/dashboard' && location.pathname === '/amc');
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-gray-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                  {user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block text-left max-w-[150px]">
                  <p className="text-sm font-medium truncate">{user?.full_name || user?.email?.split('@')[0]}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.full_name || 'Customer'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/amc/dashboard" className="flex items-center">
                  <Home className="h-4 w-4 mr-2" />
                  My AMCs
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/amc/new-order" className="flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  New AMC Order
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setProfileModalOpen(true)}>
                <User className="h-4 w-4 mr-2" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="mailto:support@flsmartech.com" className="flex items-center">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Get Help
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Profile Modal */}
          <CustomerProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />
        </div>
      </header>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b bg-white px-4 py-3 shadow-sm">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
