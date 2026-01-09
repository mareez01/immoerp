-- Add time_spent_minutes to work_logs for per-log time tracking
ALTER TABLE public.work_logs ADD COLUMN IF NOT EXISTS time_spent_minutes integer DEFAULT 0;

-- Create storage bucket for worksheet images
INSERT INTO storage.buckets (id, name, public)
VALUES ('worksheet-images', 'worksheet-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for worksheet-images bucket
CREATE POLICY "Staff can upload worksheet images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'worksheet-images' AND
  (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'technician')
    )
  )
);

CREATE POLICY "Authenticated users can view worksheet images"
ON storage.objects FOR SELECT
USING (bucket_id = 'worksheet-images');

CREATE POLICY "Staff can update worksheet images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'worksheet-images' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'technician')
  )
);

CREATE POLICY "Admins can delete worksheet images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'worksheet-images' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Add pending_approval status for worksheets and flag for approval tracking
ALTER TABLE public.worksheets ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false;
ALTER TABLE public.worksheets ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.worksheets ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Add assigned_to (technician) column to support_tickets for technician assignment
-- (It already exists, but let's ensure relationship constraints are correct)

-- Add column for linking support ticket resolution to worksheet/work_log
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS resolved_worksheet_id uuid REFERENCES public.worksheets(id);

-- Allow technicians to view tickets assigned to them
DROP POLICY IF EXISTS "Staff can view all tickets" ON public.support_tickets;
CREATE POLICY "Staff can view all tickets"
ON public.support_tickets FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'support') OR
  (has_role(auth.uid(), 'technician') AND assigned_to IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ))
);

-- Allow technicians to update assigned tickets
DROP POLICY IF EXISTS "Staff can update tickets" ON public.support_tickets;
CREATE POLICY "Staff can update tickets"
ON public.support_tickets FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'support') OR
  (has_role(auth.uid(), 'technician') AND assigned_to IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ))
);