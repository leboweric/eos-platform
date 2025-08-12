-- Fix the VTO mismatch for Field Outdoor Spaces

-- Update the three_year_picture to point to the correct VTO
UPDATE three_year_pictures 
SET vto_id = '6a07f0ab-c4bd-4d93-a1b3-9440ca1e5a3f',
    updated_at = NOW()
WHERE id = '62caa73a-a55e-4bad-b7e5-39cb374013a9';

-- Verify the fix
SELECT 
    'After fix:' as status,
    tp.id,
    tp.vto_id,
    tp.what_does_it_look_like,
    bb.id as blueprint_id,
    bb.team_id as blueprint_team_id,
    tp.vto_id = bb.id as vto_matches
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
WHERE tp.id = '62caa73a-a55e-4bad-b7e5-39cb374013a9'
  AND bb.team_id IS NULL;