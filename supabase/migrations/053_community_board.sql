-- ============================================================================
-- 053: Community Board (Facebook-style group)
-- ============================================================================

-- ── Posts ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT,
  body TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}'::TEXT[],
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  report_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts (created_at DESC) WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON community_posts (category, created_at DESC) WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts (author_id);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read visible posts
DROP POLICY IF EXISTS cp_public_read ON community_posts;
CREATE POLICY cp_public_read ON community_posts
  FOR SELECT TO anon USING (is_hidden = false);
DROP POLICY IF EXISTS cp_auth_read ON community_posts;
CREATE POLICY cp_auth_read ON community_posts
  FOR SELECT TO authenticated USING (true);
-- Authenticated users can create
DROP POLICY IF EXISTS cp_auth_insert ON community_posts;
CREATE POLICY cp_auth_insert ON community_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
-- Authors can update their own
DROP POLICY IF EXISTS cp_auth_update ON community_posts;
CREATE POLICY cp_auth_update ON community_posts
  FOR UPDATE TO authenticated USING (auth.uid() = author_id);

-- ── Comments ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  body TEXT NOT NULL,
  photo_url TEXT,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  like_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_community_comments_parent ON community_comments (parent_id);

ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cc_public_read ON community_comments;
CREATE POLICY cc_public_read ON community_comments
  FOR SELECT TO anon USING (is_hidden = false);
DROP POLICY IF EXISTS cc_auth_read ON community_comments;
CREATE POLICY cc_auth_read ON community_comments
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS cc_auth_insert ON community_comments;
CREATE POLICY cc_auth_insert ON community_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

-- Trigger: update comment_count on posts
CREATE OR REPLACE FUNCTION update_post_comment_count() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  pid UUID;
BEGIN
  pid := COALESCE(NEW.post_id, OLD.post_id);
  UPDATE community_posts SET comment_count = (
    SELECT COUNT(*) FROM community_comments WHERE post_id = pid AND is_hidden = false
  ) WHERE id = pid;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_comment_count ON community_comments;
CREATE TRIGGER trg_community_comment_count
  AFTER INSERT OR UPDATE OR DELETE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- ── Likes ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT like_one_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_likes_post ON community_likes (user_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_likes_comment ON community_likes (user_id, comment_id) WHERE comment_id IS NOT NULL;

ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cl_auth_read ON community_likes;
CREATE POLICY cl_auth_read ON community_likes
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS cl_auth_insert ON community_likes;
CREATE POLICY cl_auth_insert ON community_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS cl_auth_delete ON community_likes;
CREATE POLICY cl_auth_delete ON community_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger: update like_count on posts
CREATE OR REPLACE FUNCTION update_post_like_count() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  pid UUID;
BEGIN
  pid := COALESCE(NEW.post_id, OLD.post_id);
  IF pid IS NOT NULL THEN
    UPDATE community_posts SET like_count = (
      SELECT COUNT(*) FROM community_likes WHERE post_id = pid
    ) WHERE id = pid;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_post_like_count ON community_likes;
CREATE TRIGGER trg_community_post_like_count
  AFTER INSERT OR DELETE ON community_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- Trigger: update like_count on comments
CREATE OR REPLACE FUNCTION update_comment_like_count() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  cid UUID;
BEGIN
  cid := COALESCE(NEW.comment_id, OLD.comment_id);
  IF cid IS NOT NULL THEN
    UPDATE community_comments SET like_count = (
      SELECT COUNT(*) FROM community_likes WHERE comment_id = cid
    ) WHERE id = cid;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_comment_like_count ON community_likes;
CREATE TRIGGER trg_community_comment_like_count
  AFTER INSERT OR DELETE ON community_likes
  FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

-- ── Reports ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT report_one_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_community_reports_pending ON community_reports (status, created_at DESC);

ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cr_auth_insert ON community_reports;
CREATE POLICY cr_auth_insert ON community_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS cr_auth_read ON community_reports;
CREATE POLICY cr_auth_read ON community_reports
  FOR SELECT TO authenticated USING (true);

-- Trigger: update report_count on posts
CREATE OR REPLACE FUNCTION update_post_report_count() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  pid UUID;
BEGIN
  pid := COALESCE(NEW.post_id, OLD.post_id);
  IF pid IS NOT NULL THEN
    UPDATE community_posts SET report_count = (
      SELECT COUNT(*) FROM community_reports WHERE post_id = pid AND status = 'pending'
    ) WHERE id = pid;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_report_count ON community_reports;
CREATE TRIGGER trg_community_report_count
  AFTER INSERT OR UPDATE OR DELETE ON community_reports
  FOR EACH ROW EXECUTE FUNCTION update_post_report_count();
