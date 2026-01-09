-- Add internal_notes and is_internal to work_logs
ALTER TABLE public.work_logs ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.work_logs ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

-- Policy to ensure customers can't see internal logs
-- We need to update existing policies or add a filter in the application.
-- The current policy in 20260102171829_30afdc2c-bcb2-4301-b0dc-cb5926d93cc3.sql
-- for "Customers can view logs of own worksheets" doesn't filter by is_internal.

CREATE OR REPLACE POLICY "Customers can view only public logs" ON public.work_logs
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.worksheets w
        JOIN public.amc_responses ar ON ar.amc_form_id = w.amc_order_id
        WHERE w.id = work_logs.worksheet_id 
        AND ar.customer_user_id = auth.uid()
    )
    AND is_internal = false
);

-- Note: We might need to drop the old policy first if it exists exactly with that name, 
-- but normally people use more specific names. 
-- In the previous migration it was:
-- CREATE POLICY "Customers can view logs of own worksheets" ON public.work_logs
-- FOR SELECT TO authenticated USING (...)

DROP POLICY IF EXISTS "Customers can view logs of own worksheets" ON public.work_logs;
