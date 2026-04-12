-- Enable realtime for the bookings table so the admin dashboard
-- receives live INSERT/UPDATE events via Supabase Realtime channels.

ALTER TABLE bookings REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;
END $$;
