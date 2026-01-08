-- Migration: Backfill amc_systems from existing amc_responses
-- This migration is idempotent and safe for production.
-- It only inserts rows into amc_systems for amc_responses that have no systems.
-- It does NOT modify any existing data in amc_responses.

BEGIN;

-- Insert one default system per amc_responses that has no matching amc_systems entry
INSERT INTO public.amc_systems (
    amc_form_id,
    device_name,
    device_type,
    operating_system,
    system_name,
    system_type,
    usage_purpose,
    daily_usage_hours,
    usage_pattern,
    primary_usage_time,
    purchase_date,
    purchase_location,
    warranty_status,
    warranty_expiry_date,
    system_age_months,
    current_performance,
    performance_issues,
    backup_frequency,
    antivirus_installed,
    antivirus_name,
    regular_maintenance,
    network_environment,
    power_backup,
    system_criticality,
    downtime_tolerance
)
SELECT
    ar.amc_form_id,
    'Primary System' AS device_name,
    'unknown' AS device_type,
    NULL AS operating_system,
    'Primary System' AS system_name,
    'unknown' AS system_type,
    ar.system_usage_purpose,
    ar.daily_usage_hours,
    ar.usage_pattern,
    ar.primary_usage_time,
    ar.purchase_date,
    ar.purchase_location,
    ar.warranty_status,
    ar.warranty_expiry_date,
    ar.system_age_months,
    ar.current_performance,
    ar.performance_issues,
    ar.backup_frequency,
    ar.antivirus_installed,
    ar.antivirus_name,
    ar.regular_maintenance,
    ar.network_environment,
    ar.power_backup,
    ar.system_criticality,
    ar.downtime_tolerance
FROM
    public.amc_responses ar
LEFT JOIN
    public.amc_systems s ON ar.amc_form_id = s.amc_form_id
WHERE
    s.id IS NULL;

-- Migrate issues from amc_responses to amc_system_issues for newly created systems
INSERT INTO public.amc_system_issues (
    system_id,
    issue_category,
    issue_description,
    urgency_level
)
SELECT
    s.id,
    ar.issue_category,
    ar.problem_description,
    ar.urgency_level
FROM
    public.amc_responses ar
INNER JOIN
    public.amc_systems s ON ar.amc_form_id = s.amc_form_id
LEFT JOIN
    public.amc_system_issues si ON s.id = si.system_id
WHERE
    si.issue_id IS NULL
    AND (ar.issue_category IS NOT NULL OR ar.problem_description IS NOT NULL);

COMMIT;
