-- Migration: Fix AMC status constraint and add edit capabilities
-- Date: January 8, 2026
-- Purpose: Ensure status constraint allows new/active/inactive and add updated_at tracking

-- First, check if the old constraint exists and drop it
DO $$ 
BEGIN
  -- Drop all possible status constraints
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'amc_responses_status_check') THEN
    ALTER TABLE amc_responses DROP CONSTRAINT amc_responses_status_check;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'amc_responses_status_check1') THEN
    ALTER TABLE amc_responses DROP CONSTRAINT amc_responses_status_check1;
  END IF;
END $$;

-- Migrate any existing legacy statuses to valid values
UPDATE amc_responses 
SET status = CASE 
  WHEN status = 'completed' AND unsubscribed = true THEN 'inactive'
  WHEN status = 'completed' THEN 'active'
  WHEN status IN ('pending', 'in_progress', 'assigned') THEN 'active'
  WHEN status = 'cancelled' THEN 'inactive'
  WHEN status IS NULL OR status = '' THEN 'new'
  WHEN status NOT IN ('new', 'active', 'inactive') THEN 'new'
  ELSE status
END
WHERE status IS NULL OR status = '' OR status NOT IN ('new', 'active', 'inactive');

-- Add the new constraint with only 3 valid statuses
ALTER TABLE amc_responses ADD CONSTRAINT amc_responses_status_check 
CHECK (status = ANY (ARRAY['new'::text, 'active'::text, 'inactive'::text]));

-- Set default status to 'new' for new orders
ALTER TABLE amc_responses ALTER COLUMN status SET DEFAULT 'new';

-- Ensure unsubscribed flag is synced with inactive status
UPDATE amc_responses SET unsubscribed = true WHERE status = 'inactive' AND (unsubscribed IS NULL OR unsubscribed = false);
UPDATE amc_responses SET unsubscribed = false WHERE status IN ('new', 'active') AND unsubscribed = true;

-- Add updated_at column if it doesn't exist (for tracking edits)
ALTER TABLE amc_responses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add trigger to auto-update updated_at on any change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_amc_responses_updated_at ON amc_responses;
CREATE TRIGGER update_amc_responses_updated_at
    BEFORE UPDATE ON amc_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Also add to amc_systems for edit tracking
ALTER TABLE amc_systems ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS update_amc_systems_updated_at ON amc_systems;
CREATE TRIGGER update_amc_systems_updated_at
    BEFORE UPDATE ON amc_systems
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ensure RLS policies allow admin to update everything
-- Drop existing update policies
DROP POLICY IF EXISTS "Admin can update all amc_responses" ON amc_responses;
DROP POLICY IF EXISTS "Admin can update all amc_systems" ON amc_systems;
DROP POLICY IF EXISTS "Staff can update assigned amc_responses" ON amc_responses;

-- Create new update policies
CREATE POLICY "Admin can update all amc_responses" ON amc_responses
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
);

CREATE POLICY "Staff can update assigned amc_responses" ON amc_responses
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('support', 'technician')
    AND (amc_responses.assigned_to = profiles.id OR profiles.role = 'support')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('support', 'technician')
    AND (amc_responses.assigned_to = profiles.id OR profiles.role = 'support')
  )
);

CREATE POLICY "Admin can update all amc_systems" ON amc_systems
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
);

-- Add comment
COMMENT ON TABLE amc_responses IS 'AMC order responses - editable by admin and assigned staff';
COMMENT ON TABLE amc_systems IS 'Systems registered under AMC orders - editable by admin';
