-- Debug Field Outdoor Spaces 3-year picture issue

-- 1. Check current state after you tried to add something
SELECT 
    tp.id,
    tp.vto_id,
    tp.what_does_it_look_like,
    tp.what_does_it_look_like_completions,
    tp.future_date,
    tp.updated_at,
    bb.id as blueprint_id,
    bb.team_id,
    o.name as org_name
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
JOIN organizations o ON o.id = bb.organization_id
WHERE o.name = 'Field Outdoor Spaces';

-- 2. Check if the VTO ID matches what we expect
SELECT 
    'Expected VTO:' as check,
    bb.id as vto_id,
    bb.team_id,
    'This should be the VTO used' as note
FROM business_blueprints bb
JOIN organizations o ON o.id = bb.organization_id
WHERE o.name = 'Field Outdoor Spaces'
  AND bb.team_id IS NULL;

-- 3. Let's make sure the three_year_picture is attached to the RIGHT VTO
-- Get the correct VTO ID
WITH correct_vto AS (
    SELECT bb.id 
    FROM business_blueprints bb
    JOIN organizations o ON o.id = bb.organization_id
    WHERE o.name = 'Field Outdoor Spaces'
      AND bb.team_id IS NULL
)
SELECT 
    'Three year picture VTO check:' as status,
    tp.vto_id as current_vto_id,
    cv.id as correct_vto_id,
    tp.vto_id = cv.id as is_correct
FROM three_year_pictures tp
CROSS JOIN correct_vto cv
WHERE tp.id = '62caa73a-a55e-4bad-b7e5-39cb374013a9';

-- 4. If the VTO ID is wrong, fix it (uncomment to run)
/*
UPDATE three_year_pictures 
SET vto_id = (
    SELECT bb.id 
    FROM business_blueprints bb
    JOIN organizations o ON o.id = bb.organization_id
    WHERE o.name = 'Field Outdoor Spaces'
      AND bb.team_id IS NULL
)
WHERE id = '62caa73a-a55e-4bad-b7e5-39cb374013a9';
*/

-- 5. Nuclear option - recreate from scratch (uncomment if needed)
/*
BEGIN;

-- Delete all three_year_pictures for Field Outdoor Spaces
DELETE FROM three_year_pictures 
WHERE vto_id IN (
    SELECT bb.id 
    FROM business_blueprints bb
    JOIN organizations o ON o.id = bb.organization_id
    WHERE o.name = 'Field Outdoor Spaces'
);

-- Create a fresh one
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
    '2027-12-31'::DATE,
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