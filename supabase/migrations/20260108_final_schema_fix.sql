-- ============================================================================
-- FINAL SCHEMA FIX - Run this to apply all required changes for the ERP revamp
-- Safe to run multiple times - uses IF NOT EXISTS and DROP IF EXISTS patterns
-- amc_form_id is UUID type (not TEXT)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO amc_responses
-- ============================================================================

-- Add amc_number if not exists (human-readable display ID)
ALTER TABLE public.amc_responses ADD COLUMN IF NOT EXISTS amc_number TEXT;

-- Update existing amc_numbers if null - use UUID cast to text
UPDATE public.amc_responses 
SET amc_number = 'AMC-' || UPPER(SUBSTRING(amc_form_id::text, 1, 8))
WHERE amc_number IS NULL;

-- Subscription management columns
ALTER TABLE public.amc_responses ADD COLUMN IF NOT EXISTS subscription_start_date DATE;
ALTER TABLE public.amc_responses ADD COLUMN IF NOT EXISTS subscription_end_date DATE;
ALTER TABLE public.amc_responses ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.amc_responses ADD COLUMN IF NOT EXISTS renewal_reminder_sent BOOLEAN DEFAULT false;
ALTER TABLE public.amc_responses ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE public.amc_responses ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE public.amc_responses ADD COLUMN IF NOT EXISTS contact_notes TEXT;

-- Unsubscribed flag for inactive status
ALTER TABLE public.amc_responses ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN DEFAULT false;

-- Service work description for technicians
ALTER TABLE public.amc_responses ADD COLUMN IF NOT EXISTS service_work_description TEXT;

-- ============================================================================
-- 2. ADD MISSING COLUMNS TO work_logs
-- ============================================================================

ALTER TABLE public.work_logs ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.work_logs ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

-- ============================================================================
-- 3. CREATE customer_reminders TABLE (using UUID for amc_form_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_reminders (
    id SERIAL PRIMARY KEY,
    customer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amc_form_id UUID REFERENCES public.amc_responses(amc_form_id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('payment', 'renewal', 'subscription_expiry', 'general')),
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
    subject TEXT,
    message TEXT,
    sent_by UUID REFERENCES auth.users(id),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'read')),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_reminders_customer ON public.customer_reminders(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_customer_reminders_sent_at ON public.customer_reminders(sent_at);

-- Enable RLS
ALTER TABLE public.customer_reminders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin and support can manage reminders" ON public.customer_reminders;
DROP POLICY IF EXISTS "Customers can view own reminders" ON public.customer_reminders;

-- Create policies
CREATE POLICY "Admin and support can manage reminders" ON public.customer_reminders
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'support')
    )
);

CREATE POLICY "Customers can view own reminders" ON public.customer_reminders
FOR SELECT TO authenticated
USING (customer_user_id = auth.uid());

-- ============================================================================
-- 4. CREATE customer_activity_log TABLE (using UUID for amc_form_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_activity_log (
    id SERIAL PRIMARY KEY,
    customer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amc_form_id UUID REFERENCES public.amc_responses(amc_form_id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'follow_up', 'complaint', 'feedback')),
    description TEXT NOT NULL,
    outcome TEXT,
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_activity_customer ON public.customer_activity_log(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_customer_activity_created ON public.customer_activity_log(created_at);

-- Enable RLS
ALTER TABLE public.customer_activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admin and support can manage activity logs" ON public.customer_activity_log;

-- Create policy
CREATE POLICY "Admin and support can manage activity logs" ON public.customer_activity_log
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'support')
    )
);

-- ============================================================================
-- 5. FIX work_logs RLS - Customers can only see approved public logs
-- ============================================================================

-- Drop old customer policy if exists
DROP POLICY IF EXISTS "Customers can view logs of own worksheets" ON public.work_logs;
DROP POLICY IF EXISTS "Customers can view only public logs" ON public.work_logs;
DROP POLICY IF EXISTS "Customers can view approved public logs only" ON public.work_logs;

-- Create updated policy - customers can only see non-internal logs from approved worksheets
CREATE POLICY "Customers can view approved public logs only" ON public.work_logs
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.worksheets w
        JOIN public.amc_responses ar ON ar.amc_form_id = w.amc_order_id
        WHERE w.id = work_logs.worksheet_id 
        AND ar.customer_user_id = auth.uid()
        AND w.status = 'approved'
    )
    AND (is_internal = false OR is_internal IS NULL)
);

-- ============================================================================
-- 6. TRIGGER: Auto-set amc_number on insert
-- ============================================================================

CREATE OR REPLACE FUNCTION set_amc_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.amc_number IS NULL THEN
        NEW.amc_number := 'AMC-' || UPPER(SUBSTRING(NEW.amc_form_id::text, 1, 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_amc_number ON public.amc_responses;
CREATE TRIGGER trigger_set_amc_number
BEFORE INSERT ON public.amc_responses
FOR EACH ROW EXECUTE FUNCTION set_amc_number();

-- ============================================================================
-- 7. UPDATE amc_responses status to 'active' when payment is made
-- Note: Since there's no separate payments table, subscription dates 
-- should be set manually or via the admin interface when payment is confirmed
-- ============================================================================

-- Helper function to activate subscription (call from admin interface)
CREATE OR REPLACE FUNCTION activate_subscription(p_amc_form_id UUID, p_duration_months INTEGER DEFAULT 12)
RETURNS void AS $$
BEGIN
    UPDATE public.amc_responses
    SET 
        subscription_start_date = CURRENT_DATE,
        subscription_end_date = CURRENT_DATE + (p_duration_months || ' months')::INTERVAL,
        status = 'active'
    WHERE amc_form_id = p_amc_form_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. CREATE SUBSCRIPTION STATUS VIEW
-- ============================================================================

DROP VIEW IF EXISTS public.subscription_status;
CREATE VIEW public.subscription_status AS
SELECT 
    amc_form_id,
    amc_number,
    customer_user_id,
    full_name,
    company_name,
    email,
    phone,
    subscription_start_date,
    subscription_end_date,
    CASE 
        WHEN subscription_end_date IS NULL THEN 'no_subscription'
        WHEN subscription_end_date < CURRENT_DATE THEN 'expired'
        WHEN subscription_end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'active'
    END as subscription_status,
    CASE 
        WHEN subscription_end_date IS NOT NULL 
        THEN subscription_end_date - CURRENT_DATE 
        ELSE NULL 
    END as days_until_expiry,
    renewal_reminder_sent,
    last_contacted_at
FROM public.amc_responses
WHERE customer_user_id IS NOT NULL;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify)
-- ============================================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'amc_responses' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'work_logs' ORDER BY ordinal_position;
-- SELECT * FROM information_schema.tables WHERE table_name IN ('customer_reminders', 'customer_activity_log');
