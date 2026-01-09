-- ============================================================================
-- DELETE TICKET MESSAGES WHEN TICKET IS CLOSED
-- Date: January 8, 2026
-- ============================================================================

BEGIN;

-- Create function to delete messages when ticket is closed
CREATE OR REPLACE FUNCTION delete_ticket_messages_on_close()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when status changes TO 'closed'
    IF NEW.status = 'closed' AND (OLD.status IS NULL OR OLD.status != 'closed') THEN
        DELETE FROM public.ticket_messages WHERE ticket_id = NEW.id;
        RAISE NOTICE 'Deleted all messages for ticket %', NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_delete_ticket_messages_on_close ON public.support_tickets;

-- Create trigger
CREATE TRIGGER trigger_delete_ticket_messages_on_close
    AFTER UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION delete_ticket_messages_on_close();

-- Ensure realtime is enabled for ticket_messages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'ticket_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
    END IF;
END $$;

-- Ensure realtime is enabled for support_tickets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'support_tickets'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
    END IF;
END $$;

COMMIT;
