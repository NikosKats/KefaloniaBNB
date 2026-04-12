-- Migration 005: Telegram channels table + per-listing channel FK

CREATE TABLE IF NOT EXISTS telegram_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  chat_id TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notify_booking_new BOOLEAN NOT NULL DEFAULT true,
  notify_booking_confirmed BOOLEAN NOT NULL DEFAULT true,
  notify_booking_cancelled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS telegram_channel_id UUID
  REFERENCES telegram_channels(id) ON DELETE SET NULL;
