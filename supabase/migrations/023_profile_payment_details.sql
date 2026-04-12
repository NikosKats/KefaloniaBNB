-- Store owner bank transfer / payment details on the profile
-- so they can be edited from the admin UI and included in guest emails

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS payment_account_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_revolut      TEXT,
  ADD COLUMN IF NOT EXISTS payment_wise         TEXT,
  ADD COLUMN IF NOT EXISTS payment_iban         TEXT,
  ADD COLUMN IF NOT EXISTS payment_bic          TEXT;
