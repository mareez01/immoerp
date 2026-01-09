-- Migration: Add subscription management columns and audit logging
-- Date: 2026-01-08
-- Description: 
--   1. Add subscription_start_date and subscription_end_date to amc_responses
--   2. Add payment_id and order_id columns to amc_responses for payment tracking
--   3. Create payment_audit_log table for financial audit trail
--   4. Add verified_at column to amc_payments

-- ============================================
-- 1. Add subscription tracking columns to amc_responses
-- ============================================
DO $$ 
BEGIN
    -- Add subscription_start_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'amc_responses' 
        AND column_name = 'subscription_start_date'
    ) THEN
        ALTER TABLE public.amc_responses 
        ADD COLUMN subscription_start_date DATE;
    END IF;

    -- Add subscription_end_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'amc_responses' 
        AND column_name = 'subscription_end_date'
    ) THEN
        ALTER TABLE public.amc_responses 
        ADD COLUMN subscription_end_date DATE;
    END IF;

    -- Add payment_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'amc_responses' 
        AND column_name = 'payment_id'
    ) THEN
        ALTER TABLE public.amc_responses 
        ADD COLUMN payment_id TEXT;
    END IF;

    -- Add order_id (razorpay order) if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'amc_responses' 
        AND column_name = 'order_id'
    ) THEN
        ALTER TABLE public.amc_responses 
        ADD COLUMN order_id TEXT;
    END IF;
END $$;

-- ============================================
-- 2. Add verified_at column to amc_payments
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'amc_payments' 
        AND column_name = 'verified_at'
    ) THEN
        ALTER TABLE public.amc_payments 
        ADD COLUMN verified_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================
-- 3. Create payment_audit_log table for audit trail
-- ============================================
CREATE TABLE IF NOT EXISTS public.payment_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_form_id UUID NOT NULL,
    payment_id TEXT,
    order_id TEXT,
    amount DECIMAL(10, 2),
    action TEXT NOT NULL, -- e.g., 'payment_captured', 'invoice_generated', 'refund_initiated'
    actor TEXT NOT NULL DEFAULT 'system', -- 'system' or user_id
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups by amc_form_id
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_amc_form_id 
ON public.payment_audit_log(amc_form_id);

-- Create index for payment_id lookups
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_payment_id 
ON public.payment_audit_log(payment_id);

-- ============================================
-- 4. Add indexes for subscription date queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_amc_responses_subscription_end 
ON public.amc_responses(subscription_end_date);

CREATE INDEX IF NOT EXISTS idx_amc_responses_status 
ON public.amc_responses(status);

-- ============================================
-- 5. RLS Policies for payment_audit_log
-- ============================================
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can read payment audit logs" ON public.payment_audit_log;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.payment_audit_log;

-- Only admins can read audit logs
CREATE POLICY "Admins can read payment audit logs"
ON public.payment_audit_log
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Service role can insert (used by edge functions)
CREATE POLICY "Service role can insert audit logs"
ON public.payment_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================
-- 6. Comments for documentation
-- ============================================
COMMENT ON COLUMN public.amc_responses.subscription_start_date IS 'Date when the AMC subscription starts (set on payment confirmation)';
COMMENT ON COLUMN public.amc_responses.subscription_end_date IS 'Date when the AMC subscription ends (subscription_start_date + 365 days)';
COMMENT ON COLUMN public.amc_responses.payment_id IS 'Razorpay payment ID for tracking';
COMMENT ON COLUMN public.amc_responses.order_id IS 'Razorpay order ID for tracking';
COMMENT ON TABLE public.payment_audit_log IS 'Audit trail for all payment-related actions - never delete records';
