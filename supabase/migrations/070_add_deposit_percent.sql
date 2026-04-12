-- Fix: deposit_percent was referenced by migration 045 but never created.
-- Added retroactively so fresh environments can run all migrations cleanly.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS deposit_percent numeric NOT NULL DEFAULT 0;
