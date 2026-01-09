-- Create amc_payments table for tracking Razorpay payments
CREATE TABLE IF NOT EXISTS amc_payments (
  id SERIAL PRIMARY KEY,
  amc_form_id TEXT REFERENCES amc_responses(amc_form_id) ON DELETE CASCADE,
  razorpay_order_id TEXT UNIQUE NOT NULL,
  razorpay_payment_id TEXT,
  amount INTEGER NOT NULL CHECK (amount > 0 AND amount % 999 = 0), -- Must be multiple of 999
  system_count INTEGER NOT NULL CHECK (system_count > 0),
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'attempted', 'captured', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  UNIQUE(amc_form_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_amc_payments_form_id ON amc_payments(amc_form_id);
CREATE INDEX IF NOT EXISTS idx_amc_payments_order_id ON amc_payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_amc_payments_status ON amc_payments(status);

-- Enable RLS
ALTER TABLE amc_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can read/write payments (for security)
CREATE POLICY "Service role can manage payments"
  ON amc_payments
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Allow authenticated users to read their own payment status
CREATE POLICY "Users can read own payment status"
  ON amc_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM amc_responses 
      WHERE amc_responses.amc_form_id = amc_payments.amc_form_id 
      AND amc_responses.user_id = auth.uid()
    )
  );

-- Add comment for documentation
COMMENT ON TABLE amc_payments IS 'Stores Razorpay payment records for AMC subscriptions. Amount must always be a multiple of 999 (price per system).';
COMMENT ON COLUMN amc_payments.amount IS 'Total amount in INR. Must be system_count × 999.';
COMMENT ON COLUMN amc_payments.system_count IS 'Number of systems covered by this payment.';
