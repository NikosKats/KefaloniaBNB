-- ============================================================================
-- 065: Full Notification System
-- Adds triggers for: friend_request, friend_accepted, new_message,
-- new_community_post (to friends), new_member_signup (to admins)
-- ============================================================================

-- ── Expand allowed notification types ──────────────────────────────────────
ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_type_check;
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_type_check
  CHECK (type IN (
    'post_liked', 'post_commented', 'comment_liked',
    'friend_request', 'friend_accepted',
    'new_message',
    'new_community_post',
    'new_member_signup'
  ));

-- ── Trigger: friend request notification ───────────────────────────────────
-- Fires when a new friend request is inserted (status = 'pending')
-- Notifies the addressee (the person receiving the request)
CREATE OR REPLACE FUNCTION notify_friend_request() RETURNS TRIGGER AS $$
DECLARE
  v_actor RECORD;
BEGIN
  -- Only for new pending requests
  IF NEW.status <> 'pending' THEN RETURN NULL; END IF;

  SELECT full_name, avatar_url INTO v_actor FROM profiles WHERE id = NEW.requester_id;

  INSERT INTO user_notifications (user_id, type, actor_id, actor_name, actor_avatar, message)
  VALUES (
    NEW.addressee_id,
    'friend_request',
    NEW.requester_id,
    COALESCE(v_actor.full_name, 'Someone'),
    v_actor.avatar_url,
    'wants to be your friend'
  )
  ON CONFLICT (user_id, type, actor_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'), COALESCE(comment_id, '00000000-0000-0000-0000-000000000000')) DO NOTHING;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_friend_request ON friends;
CREATE TRIGGER trg_notify_friend_request
  AFTER INSERT ON friends
  FOR EACH ROW EXECUTE FUNCTION notify_friend_request();


-- ── Trigger: friend accepted notification ──────────────────────────────────
-- Fires when friend status changes from pending to accepted
-- Notifies the requester (the person who sent the original request)
CREATE OR REPLACE FUNCTION notify_friend_accepted() RETURNS TRIGGER AS $$
DECLARE
  v_actor RECORD;
BEGIN
  IF OLD.status <> 'pending' OR NEW.status <> 'accepted' THEN RETURN NULL; END IF;

  SELECT full_name, avatar_url INTO v_actor FROM profiles WHERE id = NEW.addressee_id;

  INSERT INTO user_notifications (user_id, type, actor_id, actor_name, actor_avatar, message)
  VALUES (
    NEW.requester_id,
    'friend_accepted',
    NEW.addressee_id,
    COALESCE(v_actor.full_name, 'Someone'),
    v_actor.avatar_url,
    'accepted your friend request'
  )
  ON CONFLICT (user_id, type, actor_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'), COALESCE(comment_id, '00000000-0000-0000-0000-000000000000')) DO NOTHING;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_friend_accepted ON friends;
CREATE TRIGGER trg_notify_friend_accepted
  AFTER UPDATE ON friends
  FOR EACH ROW EXECUTE FUNCTION notify_friend_accepted();


-- ── Trigger: new message notification ──────────────────────────────────────
-- Fires when a message is inserted
-- Notifies the recipient (not the sender)
CREATE OR REPLACE FUNCTION notify_new_message() RETURNS TRIGGER AS $$
DECLARE
  v_recipient UUID;
  v_actor RECORD;
BEGIN
  -- Find the recipient (the other participant in the conversation)
  SELECT CASE
    WHEN c.participant_1 = NEW.sender_id THEN c.participant_2
    ELSE c.participant_1
  END INTO v_recipient
  FROM conversations c WHERE c.id = NEW.conversation_id;

  IF v_recipient IS NULL THEN RETURN NULL; END IF;

  SELECT full_name, avatar_url INTO v_actor FROM profiles WHERE id = NEW.sender_id;

  -- Use UPSERT: if there's already a message notification from this sender,
  -- update it with the latest message instead of creating duplicates
  INSERT INTO user_notifications (user_id, type, actor_id, actor_name, actor_avatar, message)
  VALUES (
    v_recipient,
    'new_message',
    NEW.sender_id,
    COALESCE(v_actor.full_name, 'Someone'),
    v_actor.avatar_url,
    LEFT(NEW.body, 80)
  )
  ON CONFLICT (user_id, type, actor_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'), COALESCE(comment_id, '00000000-0000-0000-0000-000000000000'))
  DO UPDATE SET
    message = LEFT(NEW.body, 80),
    is_read = false,
    created_at = now(),
    actor_name = COALESCE(v_actor.full_name, 'Someone'),
    actor_avatar = v_actor.avatar_url;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_message ON messages;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();


-- ── Trigger: new community post notification ───────────────────────────────
-- Fires when a new community post is created
-- Notifies all accepted friends of the author
CREATE OR REPLACE FUNCTION notify_new_community_post() RETURNS TRIGGER AS $$
DECLARE
  v_actor RECORD;
  v_friend_id UUID;
BEGIN
  SELECT full_name, avatar_url INTO v_actor FROM profiles WHERE id = NEW.author_id;

  -- Notify each accepted friend
  FOR v_friend_id IN
    SELECT CASE
      WHEN requester_id = NEW.author_id THEN addressee_id
      ELSE requester_id
    END
    FROM friends
    WHERE (requester_id = NEW.author_id OR addressee_id = NEW.author_id)
      AND status = 'accepted'
  LOOP
    INSERT INTO user_notifications (user_id, type, actor_id, actor_name, actor_avatar, post_id, message)
    VALUES (
      v_friend_id,
      'new_community_post',
      NEW.author_id,
      COALESCE(v_actor.full_name, 'Someone'),
      v_actor.avatar_url,
      NEW.id,
      LEFT(COALESCE(NEW.title, NEW.body), 80)
    )
    ON CONFLICT (user_id, type, actor_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'), COALESCE(comment_id, '00000000-0000-0000-0000-000000000000')) DO NOTHING;
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_community_post ON community_posts;
CREATE TRIGGER trg_notify_new_community_post
  AFTER INSERT ON community_posts
  FOR EACH ROW EXECUTE FUNCTION notify_new_community_post();


-- ── Trigger: new member signup notification to admins ──────────────────────
-- Fires when a new member profile is created
-- Notifies all admin and super_admin users
CREATE OR REPLACE FUNCTION notify_new_member_signup() RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Only for member role
  IF NEW.role <> 'member' THEN RETURN NULL; END IF;

  FOR v_admin_id IN
    SELECT id FROM profiles WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO user_notifications (user_id, type, actor_id, actor_name, actor_avatar, message)
    VALUES (
      v_admin_id,
      'new_member_signup',
      NEW.id,
      COALESCE(NEW.full_name, NEW.email, 'New member'),
      NEW.avatar_url,
      COALESCE(NEW.email, 'just joined the community')
    )
    ON CONFLICT (user_id, type, actor_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'), COALESCE(comment_id, '00000000-0000-0000-0000-000000000000')) DO NOTHING;
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_member_signup ON profiles;
CREATE TRIGGER trg_notify_new_member_signup
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION notify_new_member_signup();
