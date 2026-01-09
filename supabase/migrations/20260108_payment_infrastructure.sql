-- Migration: Complete Payment and Subscription Infrastructure
-- Date: 2026-01-08
-- Description: 
--   1. Fix amc_payments table with proper UUID type
--   2. Add subscription tracking columns to amc_responses
--   3. Create payment_audit_log table for audit trail
--   4. Ensure invoices table has all required columns
--   5. Add RLS policies for all tables

-- ============================================
-- 1. Drop and recreate amc_payments with proper types
-- ============================================
DROP TABLE IF EXISTS public.amc_payments CASCADE;

CREATE TABLE public.amc_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_form_id UUID NOT NULL REFERENCES public.amc_responses(amc_form_id) ON DELETE CASCADE,
    razorpay_order_id TEXT UNIQUE NOT NULL,
    razorpay_payment_id TEXT,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    system_count INTEGER NOT NULL CHECK (system_count > 0),
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'created' CHECK (status IN ('created', 'attempted', 'captured', 'failed', 'refunded')),
    created_at TIMESTAMPTZ DEFAULT now(),
    verified_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for faster lookups
CREATE INDEX idx_amc_payments_form_id ON public.amc_payments(amc_form_id);
CREATE INDEX idx_amc_payments_order_id ON public.amc_payments(razorpay_order_id);
CREATE INDEX idx_amc_payments_payment_id ON public.amc_payments(razorpay_payment_id);
CREATE INDEX idx_amc_payments_status ON public.amc_payments(status);

-- Enable RLS
ALTER TABLE public.amc_payments ENABLE ROW LEVEL SECURITY;

-- Admin and bookkeeping can read all payments
CREATE POLICY "Admin and bookkeeping can read payments"
ON public.amc_payments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'bookkeeping')
    )
);

-- Customers can view their own payments
CREATE POLICY "Customers can view own payments"
ON public.amc_payments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.amc_responses 
        WHERE amc_responses.amc_form_id = amc_payments.amc_form_id 
        AND amc_responses.customer_user_id = auth.uid()
    )
);

-- Service role can insert/update (for edge functions)
CREATE POLICY "Service role can manage payments"
ON public.amc_payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- 2. Add subscription columns to amc_responses
-- ============================================
DO $$ 
BEGIN
    -- Add subscription_start_date if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'amc_responses' 
        AND column_name = 'subscription_start_date'
    ) THEN
        ALTER TABLE public.amc_responses 
        ADD COLUMN subscription_start_date DATE;
    END IF;

    -- Add subscription_end_date if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'amc_responses' 
        AND column_name = 'subscription_end_date'
    ) THEN
        ALTER TABLE public.amc_responses 
        ADD COLUMN subscription_end_date DATE;
    END IF;

    -- Add payment_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'amc_responses' 
        AND column_name = 'payment_id'
    ) THEN
        ALTER TABLE public.amc_responses 
        ADD COLUMN payment_id TEXT;
    END IF;

    -- Add order_id (razorpay order) if not exists
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

-- Create indexes for subscription queries
CREATE INDEX IF NOT EXISTS idx_amc_responses_subscription_end 
ON public.amc_responses(subscription_end_date);

CREATE INDEX IF NOT EXISTS idx_amc_responses_payment_status 
ON public.amc_responses(payment_status);

-- ============================================
-- 3. Create payment_audit_log table
-- ============================================
CREATE TABLE IF NOT EXISTS public.payment_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_form_id UUID NOT NULL,
    payment_id TEXT,
    order_id TEXT,
    amount DECIMAL(10, 2),
    action TEXT NOT NULL, -- 'payment_created', 'payment_captured', 'payment_failed', 'invoice_generated', 'refund_initiated'
    actor TEXT NOT NULL DEFAULT 'system', -- 'system', 'webhook', or user_id
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_amc_form_id 
ON public.payment_audit_log(amc_form_id);

CREATE INDEX IF NOT EXISTS idx_payment_audit_log_payment_id 
ON public.payment_audit_log(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_audit_log_created_at 
ON public.payment_audit_log(created_at);

-- Enable RLS
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
DROP POLICY IF EXISTS "Admins can read payment audit logs" ON public.payment_audit_log;
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

-- Service role can insert (for edge functions)
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.payment_audit_log;
CREATE POLICY "Service role can insert audit logs"
ON public.payment_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================
-- 4. Ensure invoices table has required columns
-- ============================================
DO $$ 
BEGIN
    -- Add paid_at if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'paid_at'
    ) THEN
        ALTER TABLE public.invoices 
        ADD COLUMN paid_at TIMESTAMPTZ;
    END IF;

    -- Add updated_at if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.invoices 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- Create index for invoice queries
CREATE INDEX IF NOT EXISTS idx_invoices_amc_order_id 
ON public.invoices(amc_order_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status 
ON public.invoices(status);

-- ============================================
-- 5. Comments for documentation
-- ============================================
COMMENT ON TABLE public.amc_payments IS 'Stores Razorpay payment records for AMC subscriptions. Amount = system_count × 999.';
COMMENT ON COLUMN public.amc_payments.amount IS 'Total amount in INR. Should be system_count × 999.';
COMMENT ON COLUMN public.amc_payments.system_count IS 'Number of systems covered by this payment.';
COMMENT ON COLUMN public.amc_payments.status IS 'Payment status: created, attempted, captured, failed, refunded';
COMMENT ON COLUMN public.amc_payments.metadata IS 'Additional payment metadata from Razorpay';

COMMENT ON COLUMN public.amc_responses.subscription_start_date IS 'Date when the AMC subscription starts (set on payment confirmation)';
COMMENT ON COLUMN public.amc_responses.subscription_end_date IS 'Date when the AMC subscription ends (subscription_start_date + 365 days)';
COMMENT ON COLUMN public.amc_responses.payment_id IS 'Razorpay payment ID for tracking';
COMMENT ON COLUMN public.amc_responses.order_id IS 'Razorpay order ID for tracking';

COMMENT ON TABLE public.payment_audit_log IS 'Audit trail for all payment-related actions - NEVER DELETE RECORDS';
