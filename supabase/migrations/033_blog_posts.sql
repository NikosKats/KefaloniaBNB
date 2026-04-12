CREATE TABLE IF NOT EXISTS blog_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  title         text NOT NULL,
  excerpt       text,
  content       text,
  cover_image   text,
  author        text NOT NULL DEFAULT 'KefaloniaBNB',
  published_at  timestamptz,
  is_published  boolean NOT NULL DEFAULT false,
  tags          text[] NOT NULL DEFAULT '{}',
  meta_title    text,
  meta_description text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON blog_posts(is_published, published_at DESC);
