-- Migration: Cleanup amc_responses table per schema rules
-- Rule: amc_responses stores ONLY order-level and customer-level data
-- System-specific fields should be in amc_systems only

-- Drop amc_started column (no longer needed per schema rules)
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS amc_started;

-- Drop system-level columns that should only be in amc_systems
-- These columns are duplicated in amc_systems table
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS daily_usage_hours;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS usage_pattern;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS primary_usage_time;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS purchase_date;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS purchase_location;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS warranty_status;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS warranty_expiry_date;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS last_service_date;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS last_service_provider;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS current_performance;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS performance_issues;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS system_age_months;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS backup_frequency;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS antivirus_installed;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS antivirus_name;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS regular_maintenance;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS network_environment;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS power_backup;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS system_criticality;
ALTER TABLE public.amc_responses DROP COLUMN IF EXISTS downtime_tolerance;

-- Update status constraint to only allow valid statuses per schema rules
-- Valid statuses: new, active, inactive (only 3)
ALTER TABLE public.amc_responses DROP CONSTRAINT IF EXISTS amc_responses_status_check;
ALTER TABLE public.amc_responses ADD CONSTRAINT amc_responses_status_check 
  CHECK (status IN ('new', 'active', 'inactive'));

-- Add comment to document the schema separation
COMMENT ON TABLE public.amc_responses IS 'Stores order-level and customer-level data only. System-specific data is in amc_systems.';
COMMENT ON TABLE public.amc_systems IS 'Stores device-specific data. Single source of truth for all system information.';
