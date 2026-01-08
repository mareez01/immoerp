-- Migration: Fix schema to add role column to profiles and update status constraint
-- Date: January 8, 2026
-- Purpose: 
--   1. Add 'role' column to profiles table (synced from user_roles)
--   2. Update amc_responses status constraint to simplified values
--   3. Fix customer_reminders channel constraint
--   4. Add work_status for tracking technician workflow

-- =====================================================
-- PART 1: Add role column to profiles table
-- =====================================================

-- Add role column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';

-- Sync roles from user_roles table to profiles
UPDATE public.profiles p
SET role = (
  SELECT ur.role::text 
  FROM public.user_roles ur 
  WHERE ur.user_id = p.user_id 
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id
);

-- Create a trigger to keep profiles.role in sync with user_roles
CREATE OR REPLACE FUNCTION sync_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles 
  SET role = NEW.role::text, updated_at = NOW()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_role_change ON public.user_roles;
CREATE TRIGGER on_user_role_change
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_role();

-- =====================================================
-- PART 2: Update amc_responses status constraint
-- =====================================================

-- IMPORTANT: Drop the constraint FIRST before updating data
ALTER TABLE public.amc_responses DROP CONSTRAINT IF EXISTS amc_responses_status_check;

-- Now migrate existing statuses to new values
UPDATE public.amc_responses 
SET status = CASE 
  WHEN status = 'pending' THEN 'new'
  WHEN status = 'in_progress' THEN 'active'
  WHEN status = 'completed' AND unsubscribed = true THEN 'inactive'
  WHEN status = 'completed' THEN 'active'
  WHEN status = 'cancelled' THEN 'inactive'
  WHEN status IS NULL OR status = '' THEN 'new'
  WHEN status NOT IN ('new', 'active', 'inactive') THEN 'new'
  ELSE status
END;

-- Add the new constraint with simplified statuses
ALTER TABLE public.amc_responses ADD CONSTRAINT amc_responses_status_check 
CHECK (status = ANY (ARRAY['new'::text, 'active'::text, 'inactive'::text]));

-- Set default status
ALTER TABLE public.amc_responses ALTER COLUMN status SET DEFAULT 'new';

-- Sync unsubscribed flag with status
UPDATE public.amc_responses SET unsubscribed = true WHERE status = 'inactive' AND (unsubscribed IS NULL OR unsubscribed = false);
UPDATE public.amc_responses SET unsubscribed = false WHERE status IN ('new', 'active') AND unsubscribed = true;

-- =====================================================
-- PART 2B: Add work_status column for tracking workflow
-- =====================================================

-- Add work_status column to track technician workflow
ALTER TABLE public.amc_responses ADD COLUMN IF NOT EXISTS work_status TEXT DEFAULT 'idle';

-- Add constraint for work_status values
ALTER TABLE public.amc_responses DROP CONSTRAINT IF EXISTS amc_responses_work_status_check;
ALTER TABLE public.amc_responses ADD CONSTRAINT amc_responses_work_status_check 
CHECK (work_status = ANY (ARRAY['idle'::text, 'issue_reported'::text, 'in_progress'::text, 'pending_review'::text, 'resolved'::text]));

-- Add column for current issue description
ALTER TABLE public.amc_responses ADD COLUMN IF NOT EXISTS current_issue TEXT;
ALTER TABLE public.amc_responses ADD COLUMN IF NOT EXISTS issue_reported_at TIMESTAMPTZ;
ALTER TABLE public.amc_responses ADD COLUMN IF NOT EXISTS issue_resolved_at TIMESTAMPTZ;

-- =====================================================
-- PART 3: Fix customer_reminders channel constraint
-- =====================================================

-- Update any existing non-email channels to email
UPDATE public.customer_reminders SET channel = 'email' WHERE channel != 'email';

-- Drop old constraint and add new one
ALTER TABLE public.customer_reminders DROP CONSTRAINT IF EXISTS customer_reminders_channel_check;
ALTER TABLE public.customer_reminders ADD CONSTRAINT customer_reminders_channel_check 
CHECK (channel = 'email'::text);

-- =====================================================
-- PART 4: Add updated_at triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to amc_responses
DROP TRIGGER IF EXISTS update_amc_responses_updated_at ON public.amc_responses;
CREATE TRIGGER update_amc_responses_updated_at
    BEFORE UPDATE ON public.amc_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to amc_systems
DROP TRIGGER IF EXISTS update_amc_systems_updated_at ON public.amc_systems;
CREATE TRIGGER update_amc_systems_updated_at
    BEFORE UPDATE ON public.amc_systems
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 5: RLS Policies for editing
-- =====================================================

-- Enable RLS on tables
ALTER TABLE public.amc_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amc_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Admin can update all amc_responses" ON public.amc_responses;
DROP POLICY IF EXISTS "Staff can update assigned amc_responses" ON public.amc_responses;
DROP POLICY IF EXISTS "Admin can update all amc_systems" ON public.amc_systems;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;

-- amc_responses policies
CREATE POLICY "Admin can update all amc_responses" ON public.amc_responses
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "Staff can update assigned amc_responses" ON public.amc_responses
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('support', 'technician')
    AND (amc_responses.assigned_to = p.id OR p.role = 'support')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('support', 'technician')
    AND (amc_responses.assigned_to = p.id OR p.role = 'support')
  )
);

-- amc_systems policies
CREATE POLICY "Admin can update all amc_systems" ON public.amc_systems
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- profiles policies  
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can update all profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Add comments
COMMENT ON COLUMN public.profiles.role IS 'User role: admin, support, technician, customer. Synced from user_roles table.';
COMMENT ON COLUMN public.amc_responses.status IS 'AMC order status: new (pending assignment), active (in service), inactive (expired/cancelled)';
