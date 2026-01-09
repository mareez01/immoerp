-- Migration: Update AMC order status constraint to only allow 'new', 'active', 'inactive'
-- Date: January 8, 2026
-- Purpose: Simplify status workflow - AMC orders are ongoing until subscription expires

-- First, migrate any existing 'completed' or other statuses to 'active' or 'inactive'
UPDATE amc_responses 
SET status = CASE 
  WHEN status = 'completed' AND unsubscribed = true THEN 'inactive'
  WHEN status = 'completed' THEN 'active'
  WHEN status IN ('pending', 'in_progress', 'assigned') THEN 'active'
  WHEN status = 'cancelled' THEN 'inactive'
  WHEN status IS NULL THEN 'new'
  ELSE status
END
WHERE status NOT IN ('new', 'active', 'inactive') OR status IS NULL;

-- Drop the old constraint
ALTER TABLE amc_responses DROP CONSTRAINT IF EXISTS amc_responses_status_check;

-- Add the new constraint with only 3 valid statuses
ALTER TABLE amc_responses ADD CONSTRAINT amc_responses_status_check 
CHECK (status = ANY (ARRAY['new'::text, 'active'::text, 'inactive'::text]));

-- Set default status to 'new' for new orders
ALTER TABLE amc_responses ALTER COLUMN status SET DEFAULT 'new';

-- Update customer_reminders channel constraint to only allow 'email' 
-- (remove sms and whatsapp for now until integration is ready)
ALTER TABLE customer_reminders DROP CONSTRAINT IF EXISTS customer_reminders_channel_check;
ALTER TABLE customer_reminders ADD CONSTRAINT customer_reminders_channel_check 
CHECK (channel = 'email'::text);

-- Add a comment explaining the workflow
COMMENT ON COLUMN amc_responses.status IS 'AMC order status: new (not yet started), active (technician assigned, subscription running), inactive (subscription expired or cancelled)';

-- Ensure unsubscribed flag is synced with inactive status
UPDATE amc_responses 
SET unsubscribed = true 
WHERE status = 'inactive' AND unsubscribed = false;

UPDATE amc_responses 
SET unsubscribed = false 
WHERE status IN ('new', 'active') AND unsubscribed = true;
