import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AMCAuthProvider, useAMCAuth } from "@/contexts/AMCAuthContext";
import AMCSignUp from "@/pages/amc/SignUp";
import AMCSignIn from "@/pages/amc/SignIn";
import AMCForm from "@/pages/amc/Form";
import AMCPayment from "@/pages/amc/Payment";
import AMCSuccess from "@/pages/amc/Success";
import AMCFailure from "@/pages/amc/Failure";
import CustomerPortalDashboard from "@/pages/amc/CustomerDashboard";
import CustomerPortalInvoices from "@/pages/amc/CustomerInvoices";
import CustomerPortalSupport from "@/pages/amc/CustomerSupport";
import CustomerPortalLayout from "@/pages/amc/CustomerPortalLayout";

const AMCProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAMCAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/amc/signin" replace />;
  }

  return <>{children}</>;
};

const AMCApp = () => (
  <AMCAuthProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" />
      <BrowserRouter>
        <Routes>
          {/* Auth Routes */}
          <Route path="/amc/signup" element={<AMCSignUp />} />
          <Route path="/amc/signin" element={<AMCSignIn />} />
          
          {/* Customer Portal Routes - Protected */}
          <Route path="/amc" element={<AMCProtectedRoute><CustomerPortalLayout /></AMCProtectedRoute>}>
            <Route index element={<CustomerPortalDashboard />} />
            <Route path="dashboard" element={<CustomerPortalDashboard />} />
            <Route path="invoices" element={<CustomerPortalInvoices />} />
            <Route path="support" element={<CustomerPortalSupport />} />
            <Route path="new-order" element={<AMCForm />} />
          </Route>
          
          {/* Payment Flow - Protected */}
          <Route path="/amc/payment" element={<AMCProtectedRoute><AMCPayment /></AMCProtectedRoute>} />
          <Route path="/amc/success" element={<AMCProtectedRoute><AMCSuccess /></AMCProtectedRoute>} />
          <Route path="/amc/failure" element={<AMCProtectedRoute><AMCFailure /></AMCProtectedRoute>} />
          
          {/* Legacy redirect */}
          <Route path="/amc/form" element={<Navigate to="/amc/new-order" replace />} />
          
          {/* Default routes */}
          <Route path="/" element={<Navigate to="/amc/signin" replace />} />
          <Route path="*" element={<Navigate to="/amc/signin" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </AMCAuthProvider>
);

export default AMCApp;
