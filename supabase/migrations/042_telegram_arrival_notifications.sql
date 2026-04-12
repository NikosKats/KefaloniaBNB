-- Track whether automatic Telegram check-in/check-out reminders have been sent
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS telegram_checkin_sent_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS telegram_checkout_sent_at TIMESTAMPTZ;
