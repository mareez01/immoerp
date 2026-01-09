-- Update policy to allow customers to see log descriptions even if they have internal notes
-- We'll rely on the application to not render the internal_notes field for customers,
-- or use column-level security if needed.

DROP POLICY IF EXISTS "Customers can view only public logs" ON public.work_logs;

CREATE POLICY "Customers can view logs of own worksheets" ON public.work_logs
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.worksheets w
        JOIN public.amc_responses ar ON ar.amc_form_id = w.amc_order_id
        WHERE w.id = work_logs.worksheet_id 
        AND ar.customer_user_id = auth.uid()
    )
);

-- For strict security, we can use column level grants if we were using a custom DB role,
-- but since Supabase 'authenticated' is shared, we'll perform a row-level check for the column
-- via a view if strictly necessary. For now, we'll just allow the row access.
