-- Add allow_telegram_direct flag to listings
-- Enables the "Direct via Telegram" booking method on a per-listing basis
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS allow_telegram_direct boolean NOT NULL DEFAULT false;
