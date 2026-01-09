-- Migration: Extend amc_systems table for multi-system support
-- This migration is idempotent and safe for production.
-- It only adds new columns to the existing amc_systems table.

BEGIN;

-- Add new columns to amc_systems if they do not exist
-- Using DO block for conditional column addition

DO $$
BEGIN
    -- System Identity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'system_name') THEN
        ALTER TABLE public.amc_systems ADD COLUMN system_name text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'system_type') THEN
        ALTER TABLE public.amc_systems ADD COLUMN system_type text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'brand') THEN
        ALTER TABLE public.amc_systems ADD COLUMN brand text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'model') THEN
        ALTER TABLE public.amc_systems ADD COLUMN model text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'serial_number') THEN
        ALTER TABLE public.amc_systems ADD COLUMN serial_number text;
    END IF;

    -- Usage Patterns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'usage_purpose') THEN
        ALTER TABLE public.amc_systems ADD COLUMN usage_purpose text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'daily_usage_hours') THEN
        ALTER TABLE public.amc_systems ADD COLUMN daily_usage_hours text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'usage_pattern') THEN
        ALTER TABLE public.amc_systems ADD COLUMN usage_pattern text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'primary_usage_time') THEN
        ALTER TABLE public.amc_systems ADD COLUMN primary_usage_time text;
    END IF;

    -- Purchase & Warranty
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'purchase_date') THEN
        ALTER TABLE public.amc_systems ADD COLUMN purchase_date date;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'purchase_location') THEN
        ALTER TABLE public.amc_systems ADD COLUMN purchase_location text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'warranty_status') THEN
        ALTER TABLE public.amc_systems ADD COLUMN warranty_status text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'warranty_expiry_date') THEN
        ALTER TABLE public.amc_systems ADD COLUMN warranty_expiry_date date;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'system_age_months') THEN
        ALTER TABLE public.amc_systems ADD COLUMN system_age_months integer;
    END IF;

    -- Performance
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'current_performance') THEN
        ALTER TABLE public.amc_systems ADD COLUMN current_performance text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'performance_issues') THEN
        ALTER TABLE public.amc_systems ADD COLUMN performance_issues text[];
    END IF;

    -- Environment & Care
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'backup_frequency') THEN
        ALTER TABLE public.amc_systems ADD COLUMN backup_frequency text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'regular_maintenance') THEN
        ALTER TABLE public.amc_systems ADD COLUMN regular_maintenance text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'antivirus_installed') THEN
        ALTER TABLE public.amc_systems ADD COLUMN antivirus_installed boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'antivirus_name') THEN
        ALTER TABLE public.amc_systems ADD COLUMN antivirus_name text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'power_backup') THEN
        ALTER TABLE public.amc_systems ADD COLUMN power_backup boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'network_environment') THEN
        ALTER TABLE public.amc_systems ADD COLUMN network_environment text;
    END IF;

    -- Criticality
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'system_criticality') THEN
        ALTER TABLE public.amc_systems ADD COLUMN system_criticality text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'downtime_tolerance') THEN
        ALTER TABLE public.amc_systems ADD COLUMN downtime_tolerance text;
    END IF;

    -- Timestamps
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'amc_systems' AND column_name = 'updated_at') THEN
        ALTER TABLE public.amc_systems ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- Create amc_system_issues table if it does not exist
CREATE TABLE IF NOT EXISTS public.amc_system_issues (
    issue_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id integer NOT NULL REFERENCES public.amc_systems(id) ON DELETE CASCADE,
    issue_category text,
    issue_description text,
    urgency_level text CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    reported_at timestamptz DEFAULT now()
);

-- Create index on system_id for amc_system_issues if not exists
CREATE INDEX IF NOT EXISTS idx_amc_system_issues_system_id ON public.amc_system_issues(system_id);

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to amc_systems if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_amc_systems_update'
    ) THEN
        CREATE TRIGGER on_amc_systems_update
            BEFORE UPDATE ON public.amc_systems
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

COMMIT;
