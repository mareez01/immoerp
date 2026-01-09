-- Migration: Add cancelled status and simplify appointment_status
-- This migration:
-- 1. Adds 'cancelled' to the status constraint in amc_responses
-- 2. Simplifies appointment_status to only 3 values: scheduled, confirmed, cancelled
-- 3. Migrates any existing appointment_status values to the new valid set

BEGIN;

-- Step 1: Drop the existing status constraint and add new one with 'cancelled'
ALTER TABLE public.amc_responses DROP CONSTRAINT IF EXISTS amc_responses_status_check;
ALTER TABLE public.amc_responses ADD CONSTRAINT amc_responses_status_check 
    CHECK (status IS NULL OR status IN ('new', 'active', 'inactive', 'cancelled'));

-- Step 2: Migrate existing appointment_status values to new valid set
-- pending -> scheduled
-- in_progress -> confirmed
-- completed -> confirmed  
-- rescheduled -> scheduled
UPDATE public.amc_responses 
SET appointment_status = CASE 
    WHEN appointment_status = 'pending' THEN 'scheduled'
    WHEN appointment_status = 'in_progress' THEN 'confirmed'
    WHEN appointment_status = 'completed' THEN 'confirmed'
    WHEN appointment_status = 'rescheduled' THEN 'scheduled'
    ELSE appointment_status
END
WHERE appointment_status NOT IN ('scheduled', 'confirmed', 'cancelled');

-- Step 3: Drop old appointment_status constraint and add new one
ALTER TABLE public.amc_responses DROP CONSTRAINT IF EXISTS amc_responses_appointment_status_check;
ALTER TABLE public.amc_responses ADD CONSTRAINT amc_responses_appointment_status_check 
    CHECK (appointment_status IS NULL OR appointment_status IN ('scheduled', 'confirmed', 'cancelled'));

-- Step 4: Add comments for documentation
COMMENT ON COLUMN public.amc_responses.status IS 'Order status: new (just created), active (subscription valid), inactive (expired), cancelled (permanently cancelled)';
COMMENT ON COLUMN public.amc_responses.appointment_status IS 'Appointment status: scheduled, confirmed, or cancelled';

COMMIT;
