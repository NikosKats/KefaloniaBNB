-- ============================================================================
-- 062: Member Experience (Friends, Messages, Favorites)
-- ============================================================================

-- ── Denormalized counts on profiles ─────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS friends_count INT NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorites_count INT NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unread_messages_count INT NOT NULL DEFAULT 0;

-- ── Friends ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT friends_no_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friends_unique_pair UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_addressee ON friends (addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_friends_requester ON friends (requester_id, status);

ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY friends_read ON friends
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY friends_insert ON friends
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND status = 'pending');
CREATE POLICY friends_update ON friends
  FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id OR auth.uid() = requester_id);
CREATE POLICY friends_delete ON friends
  FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Trigger: update friends_count on both profiles
CREATE OR REPLACE FUNCTION update_friends_count() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  uid1 UUID;
  uid2 UUID;
BEGIN
  uid1 := COALESCE(NEW.requester_id, OLD.requester_id);
  uid2 := COALESCE(NEW.addressee_id, OLD.addressee_id);
  UPDATE profiles SET friends_count = (
    SELECT COUNT(*) FROM friends
    WHERE (requester_id = uid1 OR addressee_id = uid1) AND status = 'accepted'
  ) WHERE id = uid1;
  UPDATE profiles SET friends_count = (
    SELECT COUNT(*) FROM friends
    WHERE (requester_id = uid2 OR addressee_id = uid2) AND status = 'accepted'
  ) WHERE id = uid2;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_friends_count ON friends;
CREATE TRIGGER trg_friends_count
  AFTER INSERT OR UPDATE OR DELETE ON friends
  FOR EACH ROW EXECUTE FUNCTION update_friends_count();

-- ── Conversations ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conv_no_self CHECK (participant_1 <> participant_2)
);

-- Unique index using LEAST/GREATEST to prevent duplicate conversations
CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_unique_pair
  ON conversations (LEAST(participant_1, participant_2), GREATEST(participant_1, participant_2));

CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON conversations (participant_1, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON conversations (participant_2, last_message_at DESC);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conv_read ON conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY conv_insert ON conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY conv_update ON conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- ── Messages ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages (conversation_id, is_read) WHERE is_read = false;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY msg_read ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );
CREATE POLICY msg_insert ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );
CREATE POLICY msg_update ON messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

-- Trigger: update conversation preview + recipient unread count on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  recipient UUID;
BEGIN
  UPDATE conversations SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.body, 100)
  WHERE id = NEW.conversation_id;

  -- Find the recipient (the other participant)
  SELECT CASE
    WHEN c.participant_1 = NEW.sender_id THEN c.participant_2
    ELSE c.participant_1
  END INTO recipient
  FROM conversations c WHERE c.id = NEW.conversation_id;

  -- Update unread count for recipient
  UPDATE profiles SET unread_messages_count = (
    SELECT COUNT(*) FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.is_read = false AND m.sender_id <> recipient
      AND (c.participant_1 = recipient OR c.participant_2 = recipient)
  ) WHERE id = recipient;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversation_on_message ON messages;
CREATE TRIGGER trg_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- ── Favorites ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT favorites_unique UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_listing ON favorites (listing_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY fav_read ON favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY fav_insert ON favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY fav_delete ON favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger: update favorites_count on profiles
CREATE OR REPLACE FUNCTION update_favorites_count() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  uid UUID;
BEGIN
  uid := COALESCE(NEW.user_id, OLD.user_id);
  UPDATE profiles SET favorites_count = (
    SELECT COUNT(*) FROM favorites WHERE user_id = uid
  ) WHERE id = uid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_favorites_count ON favorites;
CREATE TRIGGER trg_favorites_count
  AFTER INSERT OR DELETE ON favorites
  FOR EACH ROW EXECUTE FUNCTION update_favorites_count();

-- Enable Supabase Realtime on messages table for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
