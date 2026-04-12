-- ============================================================
-- 018_backfill_regions.sql
-- Auto-populate region, area and location_tags on existing
-- listings based on the city column.
-- ============================================================

-- ── 1. Set region ─────────────────────────────────────────────────────────────
-- Thassos island cities/areas — everything else defaults to Kefalonia

UPDATE listings
SET region = CASE
  WHEN city ILIKE ANY(ARRAY[
    'Limenas', 'Thassos Town', 'Thassos',
    'Potos', 'Limenaria',
    'Skala Potamias', 'Skala Panagia', 'Chrysi Ammoudia',
    'Skala Prinos', 'Prinos',
    'Skala Kallirachis', 'Kallirachi',
    'Skala Sotiros', 'Sotiros',
    'Skala Maries', 'Maries',
    'Skala Rachoni', 'Rachoni',
    'Panagia',
    'Theologos', 'Potamia',
    'Astris', 'Pefkari',
    'Alyki', 'Makryammos',
    'Mikros Prinos', 'Kastro'
  ])
  THEN 'Thassos'
  ELSE 'Kefalonia'
END
WHERE region IS NULL OR region = '';

-- ── 2. Set area (sub-district within city) ────────────────────────────────────

-- Kefalonia city sub-districts
UPDATE listings SET area = 'Panagia'    WHERE city ILIKE '%Kefalonia%' AND (address ILIKE '%Panagia%' OR address ILIKE '%παναγία%') AND (area IS NULL OR area = '');
UPDATE listings SET area = 'Batis'      WHERE city ILIKE '%Kefalonia%' AND address ILIKE '%Batis%'      AND (area IS NULL OR area = '');
UPDATE listings SET area = 'Kalamitsa'  WHERE city ILIKE '%Kefalonia%' AND address ILIKE '%Kalamitsa%'  AND (area IS NULL OR area = '');
UPDATE listings SET area = 'Perigiali'  WHERE city ILIKE '%Kefalonia%' AND address ILIKE '%Perigiali%'  AND (area IS NULL OR area = '');

-- Thassos beach areas
UPDATE listings SET area = 'Golden Beach' WHERE city ILIKE ANY(ARRAY['Skala Potamias','Skala Panagia','Chrysi Ammoudia']) AND (area IS NULL OR area = '');
UPDATE listings SET area = 'Alyki'        WHERE city ILIKE '%Alyki%'       AND (area IS NULL OR area = '');
UPDATE listings SET area = 'Makryammos'   WHERE city ILIKE '%Makryammos%'  AND (area IS NULL OR area = '');

-- ── 3. Set location_tags based on city + region ───────────────────────────────

-- Beachfront: coastal cities with organized/sandy beaches
UPDATE listings
SET location_tags = array_append(location_tags, 'beachfront')
WHERE city ILIKE ANY(ARRAY[
  'Keramoti','Nea Peramos','Nea Iraklitsa','Ofrinio',
  'Skala Potamias','Skala Panagia','Chrysi Ammoudia',
  'Potos','Limenaria','Pefkari','Astris',
  'Skala Prinos','Skala Kallirachis','Skala Sotiros','Skala Maries','Skala Rachoni',
  'Ammolofoi','Batis','Kalamitsa'
])
AND NOT 'beachfront' = ANY(location_tags);

-- Near ferry: Kefalonia port + Keramoti + Skala Prinos (Thassos)
UPDATE listings
SET location_tags = array_append(location_tags, 'near-ferry')
WHERE city ILIKE ANY(ARRAY['Kefalonia','Keramoti','Skala Prinos'])
  AND NOT 'near-ferry' = ANY(location_tags);

-- Near airport: Chrysoupoli is closest to Kefalonia Airport
UPDATE listings
SET location_tags = array_append(location_tags, 'near-airport')
WHERE city ILIKE 'Chrysoupoli'
  AND NOT 'near-airport' = ANY(location_tags);

-- Island: all Thassos listings
UPDATE listings
SET location_tags = array_append(location_tags, 'island')
WHERE region = 'Thassos'
  AND NOT 'island' = ANY(location_tags);

-- Historic: Kefalonia old town + Philippi + Theologos
UPDATE listings
SET location_tags = array_append(location_tags, 'historic')
WHERE city ILIKE ANY(ARRAY['Kefalonia','Philippi','Theologos'])
  AND NOT 'historic' = ANY(location_tags);

-- Sea view: hillside/upscale areas
UPDATE listings
SET location_tags = array_append(location_tags, 'sea-view')
WHERE city ILIKE ANY(ARRAY['Palio Kefalonia','Paleo Tsifliki','Panagia'])
  AND NOT 'sea-view' = ANY(location_tags);

-- Mountain village: inland Thassos
UPDATE listings
SET location_tags = array_append(location_tags, 'mountain-village')
WHERE city ILIKE ANY(ARRAY['Panagia','Theologos','Potamia','Maries','Kallirachi','Sotiros','Rachoni','Prinos'])
  AND NOT 'mountain-village' = ANY(location_tags);

-- Family-friendly: wide sandy beach destinations
UPDATE listings
SET location_tags = array_append(location_tags, 'family-friendly')
WHERE city ILIKE ANY(ARRAY[
  'Keramoti','Nea Peramos','Skala Potamias','Skala Panagia',
  'Chrysi Ammoudia','Limenaria','Pefkari'
])
AND NOT 'family-friendly' = ANY(location_tags);

-- Golden-beach: properties near the famous beach
UPDATE listings
SET location_tags = array_append(location_tags, 'golden-beach')
WHERE city ILIKE ANY(ARRAY['Skala Potamias','Skala Panagia','Chrysi Ammoudia'])
  AND NOT 'golden-beach' = ANY(location_tags);
