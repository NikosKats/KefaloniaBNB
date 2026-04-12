-- ============================================================================
-- 066: Push Notification Subscriptions
-- Stores browser push subscriptions so we can send native push notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT push_sub_unique UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions (user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Trigger: send push notification on new user_notifications insert ───────
-- This function reads all push subscriptions for the notification recipient
-- and queues them. The actual push sending happens via an API edge function
-- because we can't call external HTTP from a PL/pgSQL trigger directly.
-- Instead, we use pg_notify to signal the edge function via Supabase Realtime.
-- The client-side Realtime subscription in Header.astro already picks this up,
-- and the push is sent by the API endpoint when called by the trigger-notify pattern.

-- We'll use a simpler approach: the notification triggers already create rows
-- in user_notifications, and Supabase Realtime already broadcasts those INSERTs.
-- The push sending will happen in an API endpoint called by a Supabase webhook
-- or by the existing realtime subscription pattern.
