-- Specific diagnostic for Field Outdoor Spaces 3-year toggle issue

-- The exact IDs from the error
-- orgId: d6ed108e-887d-4b4c-8985-be4a3c706492
-- teamId: c7b489a1-5bf4-48a5-a51d-6e5e76f8f626

-- 1. Verify this is Field Outdoor Spaces
SELECT id, name, slug 
FROM organizations 
WHERE id = 'd6ed108e-887d-4b4c-8985-be4a3c706492';

-- 2. Check the team
SELECT id, name, is_leadership_team, organization_id
FROM teams
WHERE id = 'c7b489a1-5bf4-48a5-a51d-6e5e76f8f626'
  AND organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492';

-- 3. Check ALL business blueprints for this org
SELECT id, organization_id, team_id, created_at, updated_at
FROM business_blueprints
WHERE organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492';

-- 4. Check if there's an org-level VTO (what the code is looking for)
SELECT id, organization_id, team_id, created_at, updated_at
FROM business_blueprints
WHERE organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
  AND team_id IS NULL;

-- 5. Check three_year_pictures for this org
SELECT tp.id, tp.vto_id, tp.what_does_it_look_like, tp.what_does_it_look_like_completions,
       bb.organization_id, bb.team_id
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492';

-- 6. What the toggle function is actually looking for:
-- Step 1: Check if team c7b489a1-5bf4-48a5-a51d-6e5e76f8f626 is leadership team
SELECT 'Step 1: Is Leadership Team?' as check, is_leadership_team
FROM teams
WHERE id = 'c7b489a1-5bf4-48a5-a51d-6e5e76f8f626'
  AND organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492';

-- Step 2: If leadership team, look for VTO with team_id IS NULL
SELECT 'Step 2: Org-level VTO exists?' as check, 
       CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO - THIS IS THE PROBLEM' END as result,
       COUNT(*) as count
FROM business_blueprints
WHERE organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
  AND team_id IS NULL;

-- Step 3: Check if three_year_picture exists for the VTO
SELECT 'Step 3: Three Year Picture exists?' as check,
       CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result,
       COUNT(*) as count
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
  AND bb.team_id IS NULL;