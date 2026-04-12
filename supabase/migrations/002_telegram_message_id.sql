-- Add telegram_message_id to bookings so we can edit the alert message
-- when admin approves/rejects from the web dashboard.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS telegram_message_id INTEGER DEFAULT NULL;

COMMENT ON COLUMN bookings.telegram_message_id
  IS 'Telegram message_id of the booking alert sent to the admin channel. Used to edit/remove inline buttons after status change.';
