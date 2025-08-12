-- Check Field Outdoor Spaces' current 3-year picture data

-- 1. Find their org-level blueprint and 3-year picture
SELECT 
    bb.id as blueprint_id,
    bb.team_id,
    tp.id as three_year_picture_id,
    tp.what_does_it_look_like,
    tp.what_does_it_look_like_completions,
    tp.future_date,
    tp.created_at,
    tp.updated_at
FROM business_blueprints bb
LEFT JOIN three_year_pictures tp ON tp.vto_id = bb.id
JOIN organizations o ON o.id = bb.organization_id
WHERE o.name = 'Field Outdoor Spaces'
  AND bb.team_id IS NULL;

-- 2. Check if there are multiple three_year_pictures for the same VTO (data corruption)
SELECT 
    'Duplicate three_year_pictures check:' as check,
    vto_id,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as three_year_picture_ids
FROM three_year_pictures tp
WHERE vto_id IN (
    SELECT bb.id 
    FROM business_blueprints bb
    JOIN organizations o ON o.id = bb.organization_id
    WHERE o.name = 'Field Outdoor Spaces'
)
GROUP BY vto_id
HAVING COUNT(*) > 1;

-- 3. If stuck with "test", let's recreate it properly
-- First, get the VTO ID
SELECT 'Field Outdoor Spaces VTO ID:' as info, bb.id
FROM business_blueprints bb
JOIN organizations o ON o.id = bb.organization_id
WHERE o.name = 'Field Outdoor Spaces'
  AND bb.team_id IS NULL;

-- 4. Fix: Delete and recreate the three_year_picture (uncomment to run)
/*
BEGIN;

-- Delete the existing three_year_picture
DELETE FROM three_year_pictures 
WHERE vto_id IN (
    SELECT bb.id 
    FROM business_blueprints bb
    JOIN organizations o ON o.id = bb.organization_id
    WHERE o.name = 'Field Outdoor Spaces'
    AND bb.team_id IS NULL
);

-- Recreate with empty data
INSERT INTO three_year_pictures (
    id,
    vto_id,
    future_date,
    what_does_it_look_like,
    what_does_it_look_like_completions,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    bb.id,
    (CURRENT_DATE + INTERVAL '3 years')::DATE,
    '[]'::jsonb,
    '{}'::jsonb,
    NOW(),
    NOW()
FROM business_blueprints bb
JOIN organizations o ON o.id = bb.organization_id
WHERE o.name = 'Field Outdoor Spaces'
  AND bb.team_id IS NULL;

COMMIT;
*/

-- 5. Verify after fix
SELECT 
    'After fix:' as status,
    tp.id,
    tp.what_does_it_look_like,
    jsonb_array_length(tp.what_does_it_look_like::jsonb) as item_count
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
JOIN organizations o ON o.id = bb.organization_id
WHERE o.name = 'Field Outdoor Spaces';