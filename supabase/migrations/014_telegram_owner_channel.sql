-- Migration 014: Assign Telegram channels to property owners
--
-- Adds owner_id to telegram_channels so each channel can belong to a
-- specific owner. Existing channels are unaffected (owner_id = NULL)
-- and continue to behave as global channels.
--
-- Routing logic after this migration:
--   1. listings.telegram_channel_id set  → use that channel only (existing override)
--   2. listing has owner_id              → use channels where owner_id = listing.owner_id
--   3. fallback                          → use channels where owner_id IS NULL (global)

ALTER TABLE telegram_channels
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_telegram_channels_owner_id
  ON telegram_channels(owner_id);

COMMENT ON COLUMN telegram_channels.owner_id IS
  'When set, this channel receives notifications only for bookings belonging '
  'to this owner. NULL = global channel (receives notifications for '
  'bookings/listings with no owner-specific channel configured).';
