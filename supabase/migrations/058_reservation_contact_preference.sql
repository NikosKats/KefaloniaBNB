-- ============================================================================
-- 058: Reservation contact preference (WhatsApp / Viber / Telegram / Email)
-- ============================================================================

ALTER TABLE restaurant_reservations
  ADD COLUMN IF NOT EXISTS contact_preference TEXT NOT NULL DEFAULT 'whatsapp'
    CHECK (contact_preference IN ('whatsapp', 'viber', 'telegram', 'email'));

-- Store WhatsApp config on restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;  -- restaurant's WhatsApp Business number for sending
