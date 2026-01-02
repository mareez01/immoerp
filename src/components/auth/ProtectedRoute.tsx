import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  customerOnly?: boolean;
}

export function ProtectedRoute({ children, allowedRoles, customerOnly }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, isCustomer } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Customer trying to access staff routes
  if (isCustomer && !customerOnly) {
    return <Navigate to="/portal/orders" replace />;
  }

  // Staff trying to access customer-only routes
  if (!isCustomer && customerOnly) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check role-based access for staff
  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
