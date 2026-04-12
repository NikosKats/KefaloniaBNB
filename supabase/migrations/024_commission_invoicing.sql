-- Commission invoice tracking per booking (Option C — platform invoices owner post-stay)

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS commission_invoice_id      TEXT,
  ADD COLUMN IF NOT EXISTS commission_invoice_status  TEXT DEFAULT 'not_sent',
  ADD COLUMN IF NOT EXISTS commission_invoice_url     TEXT,
  ADD COLUMN IF NOT EXISTS commission_invoice_sent_at TIMESTAMPTZ;

-- Stripe Customer ID for each owner (so we can invoice them)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
