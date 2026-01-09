-- This trigger calls the 'generate-invoice-contract' edge function
-- whenever a new row is inserted into the 'invoices' table or an existing row is updated.
-- 
-- IMPORTANT: This uses the pg_net extension to make HTTP calls from the database.
-- Make sure pg_net is enabled in your Supabase project.

-- Enable the pg_net extension if not already enabled
create extension if not exists pg_net with schema extensions;

-- 1. Create the trigger function
create or replace function trigger_generate_invoice_contract()
returns trigger
language plpgsql
security definer
as $$
declare
  supabase_url text;
  service_role_key text;
begin
  -- Get configuration from vault or use environment
  -- These should be stored as secrets in your Supabase project
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings are not available, use the known project URL
  if supabase_url is null then
    supabase_url := 'https://iwhjesbvvcihspqpfsei.supabase.co';
  end if;
  
  -- Call the edge function with the amc_form_id from the invoice
  -- Note: new.amc_order_id contains the amc_form_id
  perform net.http_post(
    url := supabase_url || '/functions/v1/generate-invoice-contract',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(service_role_key, '')
    ),
    body := jsonb_build_object('amc_form_id', new.amc_order_id)
  );
  
  return new;
end;
$$;

-- 2. Drop existing trigger if exists
drop trigger if exists on_invoice_change on public.invoices;

-- 3. Create the trigger (only on INSERT to avoid infinite loops from updates)
create trigger on_invoice_change
  after insert on public.invoices
  for each row
  execute function trigger_generate_invoice_contract();

-- Add a comment explaining the trigger
comment on trigger on_invoice_change on public.invoices is 
  'Triggers PDF generation for invoice and contract documents when a new invoice is created';
