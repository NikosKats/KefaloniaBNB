-- Migration 007: Per-listing translated content fields
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS title_i18n       JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tagline_i18n     JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS description_i18n JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS house_rules_i18n JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN listings.title_i18n       IS 'JSON map of lang → translated title, e.g. {"el":"...","bg":"..."}';
COMMENT ON COLUMN listings.description_i18n IS 'JSON map of lang → translated description';
COMMENT ON COLUMN listings.tagline_i18n     IS 'JSON map of lang → translated tagline';
COMMENT ON COLUMN listings.house_rules_i18n IS 'JSON map of lang → translated house rules';
