import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Orders from "@/pages/Orders";
import StaffPage from "@/pages/Staff";
import CustomersPage from "@/pages/Customers";
import InvoicesPage from "@/pages/Invoices";
import WorksheetsPage from "@/pages/Worksheets";
import SupportTicketsPage from "@/pages/SupportTickets";
import CustomerPortalOrders from "@/pages/portal/CustomerOrders";
import CustomerPortalInvoices from "@/pages/portal/CustomerInvoices";
import CustomerPortalSupport from "@/pages/portal/CustomerSupport";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Staff Routes */}
            <Route element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/orders" element={
                <ProtectedRoute allowedRoles={['admin', 'technician', 'support', 'bookkeeping']}>
                  <Orders />
                </ProtectedRoute>
              } />
              <Route path="/staff" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <StaffPage />
                </ProtectedRoute>
              } />
              <Route path="/customers" element={
                <ProtectedRoute allowedRoles={['admin', 'support', 'bookkeeping']}>
                  <CustomersPage />
                </ProtectedRoute>
              } />
              <Route path="/invoices" element={
                <ProtectedRoute allowedRoles={['admin', 'bookkeeping', 'support']}>
                  <InvoicesPage />
                </ProtectedRoute>
              } />
              <Route path="/worksheets" element={
                <ProtectedRoute allowedRoles={['admin', 'technician']}>
                  <WorksheetsPage />
                </ProtectedRoute>
              } />
              <Route path="/tickets" element={
                <ProtectedRoute allowedRoles={['admin', 'support', 'technician']}>
                  <SupportTicketsPage />
                </ProtectedRoute>
              } />
            </Route>

            {/* Customer Portal Routes - Now Hosted at customer.flsmartech.com */}
            <Route element={
              <ProtectedRoute customerOnly>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route path="/portal/orders" element={<CustomerPortalOrders />} />
              <Route path="/portal/invoices" element={<CustomerPortalInvoices />} />
              <Route path="/portal/support" element={<CustomerPortalSupport />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
