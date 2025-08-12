-- Delete the FINAL duplicate three_year_picture for Field Outdoor Spaces

-- This duplicate is attached to a wrong VTO and has the Leadership Team ID
DELETE FROM three_year_pictures 
WHERE id = '1d5d228d-4f97-46ed-a9d1-161b5c5a8198';

-- Also check if that VTO even exists or should be deleted
SELECT 
    'Check if VTO 1eb011f2-6464-4e90-9f33-5477a6168e9d exists:' as check,
    id,
    organization_id,
    team_id
FROM business_blueprints 
WHERE id = '1eb011f2-6464-4e90-9f33-5477a6168e9d';

-- If it exists, delete it too (it's a wrong blueprint)
DELETE FROM business_blueprints 
WHERE id = '1eb011f2-6464-4e90-9f33-5477a6168e9d'
  AND organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492';

-- Verify only ONE three_year_picture remains for Field Outdoor Spaces
SELECT 
    'Final state:' as status,
    tp.id,
    tp.vto_id,
    tp.what_does_it_look_like,
    bb.team_id as blueprint_team_id,
    tp.vto_id = bb.id as correct_association
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
JOIN organizations o ON o.id = bb.organization_id
WHERE o.name = 'Field Outdoor Spaces';

-- The manual update already set good test data
SELECT 
    'Your 3-year picture should now show:' as status,
    jsonb_array_elements_text(tp.what_does_it_look_like::jsonb) as items
FROM three_year_pictures tp
WHERE tp.vto_id = '6a07f0ab-c4bd-4d93-a1b3-9440ca1e5a3f';