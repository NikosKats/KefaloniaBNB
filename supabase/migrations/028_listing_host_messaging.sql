-- Host messaging channels: phone + toggles for WhatsApp/Viber/Telegram
-- and a master toggle to show/hide the widget on the public listing page.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS host_phone TEXT,
  ADD COLUMN IF NOT EXISTS host_whatsapp BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS host_viber BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS host_telegram BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS host_messaging_visible BOOLEAN NOT NULL DEFAULT false;
