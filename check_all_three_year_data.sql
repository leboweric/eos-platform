-- Check ALL three_year_pictures for Field Outdoor Spaces to see if the data exists anywhere

-- 1. Show ALL three_year_pictures for this organization
SELECT 
    tp.id,
    tp.vto_id,
    tp.future_date,
    tp.what_does_it_look_like,
    tp.what_does_it_look_like_completions,
    bb.team_id,
    CASE 
        WHEN bb.team_id IS NULL THEN 'ORG-LEVEL'
        WHEN bb.team_id = 'c7b489a1-5bf4-48a5-a51d-6e5e76f8f626' THEN 'LEADERSHIP TEAM'
        ELSE 'OTHER TEAM'
    END as vto_type,
    tp.created_at,
    tp.updated_at
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492';

-- 2. Check the specific record that had the original data
SELECT 
    'Original record (2e89f229-009a-4318-9604-af65b7df25ae):' as check,
    id,
    vto_id,
    what_does_it_look_like
FROM three_year_pictures
WHERE id = '2e89f229-009a-4318-9604-af65b7df25ae';

-- 3. Search for any three_year_picture containing "Uplift" (from the original data)
SELECT 
    'Records containing "Uplift":' as check,
    tp.id,
    tp.vto_id,
    bb.team_id,
    tp.what_does_it_look_like
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
WHERE tp.what_does_it_look_like::text LIKE '%Uplift%';

-- 4. Check if the data might be in the audit log or backup tables (if they exist)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%three_year%'
  OR table_name LIKE '%backup%'
  OR table_name LIKE '%audit%';

-- 5. Check the team-level VTO (430d2fd7-e6d7-4e5c-a83c-1b49c41c9fa8)
SELECT 
    'Team-level VTO data:' as check,
    *
FROM three_year_pictures
WHERE vto_id = '430d2fd7-e6d7-4e5c-a83c-1b49c41c9fa8';

-- 6. Check the org-level VTO (6a07f0ab-c4bd-4d93-a1b3-9440ca1e5a3f)
SELECT 
    'Org-level VTO data:' as check,
    *
FROM three_year_pictures
WHERE vto_id = '6a07f0ab-c4bd-4d93-a1b3-9440ca1e5a3f';