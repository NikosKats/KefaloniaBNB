-- User notifications system (like/comment/friend notifications)

-- Add unread count to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unread_notifications_count INT NOT NULL DEFAULT 0;

-- Notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('post_liked', 'post_commented', 'comment_liked', 'friend_request', 'friend_accepted')),
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_name TEXT NOT NULL DEFAULT '',
  actor_avatar TEXT,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON user_notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user_created ON user_notifications (user_id, created_at DESC);

-- Prevent duplicate notifications (same actor + same target within short window)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_unique ON user_notifications (user_id, type, actor_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'), COALESCE(comment_id, '00000000-0000-0000-0000-000000000000'));

-- RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger: update unread count on profiles
CREATE OR REPLACE FUNCTION update_unread_notifications_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET unread_notifications_count = (
      SELECT COUNT(*) FROM user_notifications WHERE user_id = NEW.user_id AND is_read = false
    ) WHERE id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE profiles SET unread_notifications_count = (
      SELECT COUNT(*) FROM user_notifications WHERE user_id = NEW.user_id AND is_read = false
    ) WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET unread_notifications_count = (
      SELECT COUNT(*) FROM user_notifications WHERE user_id = OLD.user_id AND is_read = false
    ) WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notif_count
  AFTER INSERT OR UPDATE OR DELETE ON user_notifications
  FOR EACH ROW EXECUTE FUNCTION update_unread_notifications_count();

-- Trigger: create notification when someone likes a post
CREATE OR REPLACE FUNCTION notify_post_liked() RETURNS TRIGGER AS $$
DECLARE
  v_post RECORD;
  v_actor RECORD;
BEGIN
  -- Only for post likes (not comment likes)
  IF NEW.post_id IS NULL THEN RETURN NULL; END IF;

  SELECT author_id, body INTO v_post FROM community_posts WHERE id = NEW.post_id;
  IF v_post IS NULL OR v_post.author_id = NEW.user_id THEN RETURN NULL; END IF;

  SELECT full_name, avatar_url INTO v_actor FROM profiles WHERE id = NEW.user_id;

  INSERT INTO user_notifications (user_id, type, actor_id, actor_name, actor_avatar, post_id, message)
  VALUES (
    v_post.author_id,
    'post_liked',
    NEW.user_id,
    COALESCE(v_actor.full_name, 'Someone'),
    v_actor.avatar_url,
    NEW.post_id,
    LEFT(v_post.body, 80)
  )
  ON CONFLICT (user_id, type, actor_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'), COALESCE(comment_id, '00000000-0000-0000-0000-000000000000')) DO NOTHING;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_post_liked
  AFTER INSERT ON community_likes
  FOR EACH ROW EXECUTE FUNCTION notify_post_liked();

-- Trigger: create notification when someone likes a comment
CREATE OR REPLACE FUNCTION notify_comment_liked() RETURNS TRIGGER AS $$
DECLARE
  v_comment RECORD;
  v_actor RECORD;
BEGIN
  IF NEW.comment_id IS NULL THEN RETURN NULL; END IF;

  SELECT author_id, body, post_id INTO v_comment FROM community_comments WHERE id = NEW.comment_id;
  IF v_comment IS NULL OR v_comment.author_id = NEW.user_id THEN RETURN NULL; END IF;

  SELECT full_name, avatar_url INTO v_actor FROM profiles WHERE id = NEW.user_id;

  INSERT INTO user_notifications (user_id, type, actor_id, actor_name, actor_avatar, post_id, comment_id, message)
  VALUES (
    v_comment.author_id,
    'comment_liked',
    NEW.user_id,
    COALESCE(v_actor.full_name, 'Someone'),
    v_actor.avatar_url,
    v_comment.post_id,
    NEW.comment_id,
    LEFT(v_comment.body, 80)
  )
  ON CONFLICT (user_id, type, actor_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'), COALESCE(comment_id, '00000000-0000-0000-0000-000000000000')) DO NOTHING;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_comment_liked
  AFTER INSERT ON community_likes
  FOR EACH ROW EXECUTE FUNCTION notify_comment_liked();

-- Trigger: create notification when someone comments on a post
CREATE OR REPLACE FUNCTION notify_post_commented() RETURNS TRIGGER AS $$
DECLARE
  v_post RECORD;
  v_actor RECORD;
BEGIN
  SELECT author_id INTO v_post FROM community_posts WHERE id = NEW.post_id;
  IF v_post IS NULL OR v_post.author_id = NEW.author_id THEN RETURN NULL; END IF;

  SELECT full_name, avatar_url INTO v_actor FROM profiles WHERE id = NEW.author_id;

  INSERT INTO user_notifications (user_id, type, actor_id, actor_name, actor_avatar, post_id, comment_id, message)
  VALUES (
    v_post.author_id,
    'post_commented',
    NEW.author_id,
    COALESCE(v_actor.full_name, 'Someone'),
    v_actor.avatar_url,
    NEW.post_id,
    NEW.id,
    LEFT(NEW.body, 80)
  )
  ON CONFLICT (user_id, type, actor_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'), COALESCE(comment_id, '00000000-0000-0000-0000-000000000000')) DO NOTHING;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_post_commented
  AFTER INSERT ON community_comments
  FOR EACH ROW EXECUTE FUNCTION notify_post_commented();

-- Enable realtime for live notifications
ALTER TABLE user_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
