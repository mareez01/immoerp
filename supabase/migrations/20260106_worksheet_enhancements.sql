-- Create storage bucket for worksheet images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'worksheets',
  'worksheets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg']
);

-- Set up RLS policies for the worksheets bucket
CREATE POLICY "Anyone can view worksheet images" ON storage.objects
FOR SELECT USING (bucket_id = 'worksheets');

CREATE POLICY "Authenticated users can upload worksheet images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'worksheets' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'worksheet-images'
);

CREATE POLICY "Users can delete their own worksheet images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'worksheets' 
  AND auth.uid() = owner
);

-- Add time_spent_minutes column to work_logs table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_logs' 
    AND column_name = 'time_spent_minutes'
  ) THEN
    ALTER TABLE work_logs ADD COLUMN time_spent_minutes INTEGER DEFAULT 0;
  END IF;
END $$;

-- Update worksheet status to include pending_approval
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%worksheets_status_check%'
    AND check_clause LIKE '%pending_approval%'
  ) THEN
    -- Drop existing status check if any
    ALTER TABLE worksheets DROP CONSTRAINT IF EXISTS worksheets_status_check;
    
    -- Add new status check with pending_approval
    ALTER TABLE worksheets ADD CONSTRAINT worksheets_status_check 
    CHECK (status IN ('draft', 'submitted', 'pending_approval', 'approved', 'rejected'));
  END IF;
END $$;