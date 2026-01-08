-- Add amc_number to amc_responses
ALTER TABLE public.amc_responses ADD COLUMN IF NOT EXISTS amc_number TEXT;

-- Update existing records with a default AMC number if needed
UPDATE public.amc_responses 
SET amc_number = 'AMC-' || SUBSTRING(amc_form_id::text, 1, 8)
WHERE amc_number IS NULL;

-- Trigger to set amc_number on insert
CREATE OR REPLACE FUNCTION set_amc_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.amc_number IS NULL THEN
        NEW.amc_number := 'AMC-' || SUBSTRING(NEW.amc_form_id::text, 1, 8);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_amc_number ON public.amc_responses;
CREATE TRIGGER trigger_set_amc_number
BEFORE INSERT ON public.amc_responses
FOR EACH ROW EXECUTE FUNCTION set_amc_number();

-- Function to update worksheet total time
CREATE OR REPLACE FUNCTION update_worksheet_time_from_logs()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE public.worksheets
        SET time_spent_minutes = (
            SELECT COALESCE(SUM(time_spent_minutes), 0)
            FROM public.work_logs
            WHERE worksheet_id = NEW.worksheet_id
        ),
        updated_at = NOW()
        WHERE id = NEW.worksheet_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.worksheets
        SET time_spent_minutes = (
            SELECT COALESCE(SUM(time_spent_minutes), 0)
            FROM public.work_logs
            WHERE worksheet_id = OLD.worksheet_id
        ),
        updated_at = NOW()
        WHERE id = OLD.worksheet_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for work_logs
DROP TRIGGER IF EXISTS trigger_update_worksheet_time ON public.work_logs;
CREATE TRIGGER trigger_update_worksheet_time
AFTER INSERT OR UPDATE OR DELETE ON public.work_logs
FOR EACH ROW EXECUTE FUNCTION update_worksheet_time_from_logs();

-- Sync existing worksheet times
DO $$
DECLARE
    ws_record RECORD;
BEGIN
    FOR ws_record IN SELECT id FROM public.worksheets LOOP
        UPDATE public.worksheets
        SET time_spent_minutes = (
            SELECT COALESCE(SUM(time_spent_minutes), 0)
            FROM public.work_logs
            WHERE worksheet_id = ws_record.id
        )
        WHERE id = ws_record.id;
    END LOOP;
END $$;
