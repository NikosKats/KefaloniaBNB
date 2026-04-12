-- 038_booking_guest_telegram.sql
-- Store the guest's Telegram chat_id so the bot can push them booking updates.
-- Set when the guest taps "Connect on Telegram" on the success page.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_telegram_chat_id text;
