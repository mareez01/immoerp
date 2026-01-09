-- ============================================================================
-- FIX ALL POLICIES - Support tickets, AMC orders, real-time subscriptions
-- Date: January 8, 2026
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FIX ticket_messages policies - Allow technicians to participate
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users can create messages on their tickets" ON public.ticket_messages;

-- View messages: Staff (admin, support, technician) can see all messages on assigned tickets
-- Customers can see non-internal messages on their tickets
CREATE POLICY "Users can view ticket messages" ON public.ticket_messages
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.support_tickets st 
        WHERE st.id = ticket_messages.ticket_id
        AND (
            -- Customers can only see non-internal messages on their tickets
            (st.customer_user_id = auth.uid() AND NOT ticket_messages.is_internal)
            -- Staff can see all messages
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = auth.uid()
                AND ur.role IN ('admin', 'support', 'technician')
            )
        )
    )
);

-- Create messages: Staff can always add messages, customers can add on their tickets
CREATE POLICY "Users can create messages on their tickets" ON public.ticket_messages
FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.support_tickets st 
        WHERE st.id = ticket_messages.ticket_id
        AND (
            -- Customer can only add non-internal messages on their own tickets that aren't closed
            (st.customer_user_id = auth.uid() AND NOT is_internal AND st.status != 'closed')
            -- Staff can add any message
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = auth.uid()
                AND ur.role IN ('admin', 'support', 'technician')
            )
        )
    )
);

-- ============================================================================
-- 2. FIX amc_responses UPDATE policy - Ensure technicians can update assigned orders
-- ============================================================================

-- Drop existing update policies
DROP POLICY IF EXISTS "Admin and support can update orders" ON public.amc_responses;
DROP POLICY IF EXISTS "Technicians can update assigned orders" ON public.amc_responses;

-- Recreate with proper conditions
CREATE POLICY "Admin and support can update orders" ON public.amc_responses
FOR UPDATE TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'support')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'support')
    )
);

CREATE POLICY "Technicians can update assigned orders" ON public.amc_responses
FOR UPDATE TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.profiles p ON p.user_id = ur.user_id
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'technician'
        AND p.id = amc_responses.assigned_to
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.profiles p ON p.user_id = ur.user_id
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'technician'
        AND p.id = amc_responses.assigned_to
    )
);

-- ============================================================================
-- 3. FIX support_tickets policies - Allow technicians to view/update assigned tickets
-- ============================================================================

DROP POLICY IF EXISTS "Staff can view all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Staff can update tickets" ON public.support_tickets;

-- Staff view policy
CREATE POLICY "Staff can view all tickets" ON public.support_tickets
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'support')
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.profiles p ON p.user_id = ur.user_id
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'technician'
        AND p.id = support_tickets.assigned_to
    )
);

-- Customers can view own tickets
CREATE POLICY "Customers can view own tickets" ON public.support_tickets
FOR SELECT TO authenticated USING (customer_user_id = auth.uid());

-- Staff can update tickets
CREATE POLICY "Staff can update tickets" ON public.support_tickets
FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'support')
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.profiles p ON p.user_id = ur.user_id
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'technician'
        AND p.id = support_tickets.assigned_to
    )
);

-- ============================================================================
-- 4. Enable Realtime for key tables
-- ============================================================================

-- Enable realtime for support_tickets
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE worksheets;
ALTER PUBLICATION supabase_realtime ADD TABLE work_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE amc_responses;

-- ============================================================================
-- 5. Add resolved_at column to support_tickets for better tracking
-- ============================================================================

ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Trigger to set resolved_at when status changes to resolved or closed
CREATE OR REPLACE FUNCTION set_ticket_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') THEN
        NEW.resolved_at := NOW();
    ELSIF NEW.status NOT IN ('resolved', 'closed') AND OLD.status IN ('resolved', 'closed') THEN
        NEW.resolved_at := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_ticket_resolved_at ON public.support_tickets;
CREATE TRIGGER trigger_set_ticket_resolved_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION set_ticket_resolved_at();

COMMIT;
