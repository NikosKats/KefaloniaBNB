-- Admin event feed for real-time dashboard notifications.
-- Inserted server-side (service role) on key platform events.
-- Read by admin/owner clients via Supabase Realtime.

CREATE TABLE IF NOT EXISTS admin_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL,          -- e.g. booking.created, booking.confirmed, payment.received
  title       TEXT NOT NULL,          -- short display title
  message     TEXT,                   -- optional detail line
  entity_type TEXT,                   -- bookings, listings, profiles
  entity_id   TEXT,                   -- UUID of the related entity
  owner_id    UUID,                   -- if relevant to a specific owner (NULL = platform-wide)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_events_created ON admin_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_events_owner ON admin_events (owner_id, created_at DESC);

-- Realtime: allow admin clients to receive live INSERTs
ALTER TABLE admin_events REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'admin_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE admin_events;
  END IF;
END $$;

-- RLS: no public access. Service role inserts, authenticated admins can read.
ALTER TABLE admin_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_events_read ON admin_events;
CREATE POLICY admin_events_read ON admin_events
  FOR SELECT TO authenticated
  USING (true);

-- Auto-cleanup: delete events older than 30 days (run via cron or on insert trigger)
CREATE OR REPLACE FUNCTION cleanup_old_admin_events() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM admin_events WHERE created_at < now() - interval '30 days';
  RETURN NEW;
END;
$$;

-- Run cleanup every 100th insert (probabilistic to avoid perf hit on every insert)
CREATE OR REPLACE FUNCTION maybe_cleanup_admin_events() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF random() < 0.01 THEN
    DELETE FROM admin_events WHERE created_at < now() - interval '30 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_admin_events ON admin_events;
CREATE TRIGGER trg_cleanup_admin_events
  AFTER INSERT ON admin_events
  FOR EACH ROW EXECUTE FUNCTION maybe_cleanup_admin_events();
