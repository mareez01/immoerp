-- ============================================================================
-- FIX Support Tickets Policies - Allow technicians to view assigned tickets
-- Date: January 11, 2026
-- Issue: Technicians cannot see tickets assigned to them
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Drop existing support_tickets policies
-- ============================================================================

DROP POLICY IF EXISTS "Customers can manage own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Staff can view all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Staff can update tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Staff can create tickets" ON public.support_tickets;

-- ============================================================================
-- 2. Recreate policies with proper technician access
-- ============================================================================

-- Policy 1: Customers can create and view their own tickets
CREATE POLICY "Customers can manage own tickets" ON public.support_tickets
FOR ALL TO authenticated 
USING (customer_user_id = auth.uid())
WITH CHECK (customer_user_id = auth.uid());

-- Policy 2: Admin and Support can view ALL tickets
-- Technicians can view tickets ASSIGNED to them
CREATE POLICY "Staff can view tickets" ON public.support_tickets
FOR SELECT TO authenticated USING (
    -- Admin and support can view all tickets
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'support')
    )
    -- Technicians can view tickets assigned to them
    OR (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'technician'
        )
        AND assigned_to IN (
            SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
        )
    )
);

-- Policy 3: Staff can INSERT tickets (for creating tickets on behalf of customers)
CREATE POLICY "Staff can create tickets" ON public.support_tickets
FOR INSERT TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'support', 'technician')
    )
);

-- Policy 4: Admin and Support can update ALL tickets
-- Technicians can update tickets ASSIGNED to them
CREATE POLICY "Staff can update tickets" ON public.support_tickets
FOR UPDATE TO authenticated 
USING (
    -- Admin and support can update all tickets
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'support')
    )
    -- Technicians can update tickets assigned to them
    OR (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'technician'
        )
        AND assigned_to IN (
            SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'support')
    )
    OR (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'technician'
        )
        AND assigned_to IN (
            SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
        )
    )
);

COMMIT;
