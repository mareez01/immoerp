-- Fix Worksheet RLS for Admins
CREATE POLICY "Admins can manage all worksheets" ON public.worksheets
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Add status to work_logs for individual log approval
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_logs' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE work_logs ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Update worksheet status check constraint to use pending_approval instead of submitted
ALTER TABLE worksheets DROP CONSTRAINT IF EXISTS worksheets_status_check;
ALTER TABLE worksheets ADD CONSTRAINT worksheets_status_check 
CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected'));

-- Update existing records: 'submitted' -> 'pending_approval'
UPDATE worksheets SET status = 'pending_approval' WHERE status = 'submitted';
