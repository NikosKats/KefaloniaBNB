-- Update: notify ALL members (not just friends) when a new community post is published

CREATE OR REPLACE FUNCTION notify_new_community_post() RETURNS TRIGGER AS $$
DECLARE
  v_actor RECORD;
  v_member_id UUID;
BEGIN
  SELECT full_name, avatar_url INTO v_actor FROM profiles WHERE id = NEW.author_id;

  -- Notify every member/admin except the author
  FOR v_member_id IN
    SELECT id FROM profiles
    WHERE id <> NEW.author_id
      AND role IN ('member', 'admin', 'super_admin', 'property_owner', 'restaurant_owner')
  LOOP
    INSERT INTO user_notifications (user_id, type, actor_id, actor_name, actor_avatar, post_id, message)
    VALUES (
      v_member_id,
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
