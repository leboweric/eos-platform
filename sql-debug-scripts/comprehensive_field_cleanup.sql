-- Comprehensive cleanup for Field Outdoor Spaces

-- 1. Show ALL blueprints for Field Outdoor Spaces
SELECT 
    'All blueprints:' as check,
    bb.id,
    bb.team_id,
    bb.created_at,
    t.name as team_name,
    t.is_leadership_team
FROM business_blueprints bb
LEFT JOIN teams t ON t.id = bb.team_id
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
ORDER BY bb.created_at;

-- 2. Show ALL three_year_pictures
SELECT 
    'All three_year_pictures:' as check,
    tp.id,
    tp.vto_id,
    tp.what_does_it_look_like,
    bb.team_id as blueprint_team_id
FROM three_year_pictures tp
LEFT JOIN business_blueprints bb ON bb.id = tp.vto_id
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
   OR tp.id IN ('62caa73a-a55e-4bad-b7e5-39cb374013a9', '1d5d228d-4f97-46ed-a9d1-161b5c5a8198');

-- 3. NUCLEAR OPTION - Keep ONLY the org-level blueprint and its three_year_picture
BEGIN;

-- Delete ALL three_year_pictures except the one attached to org-level blueprint
DELETE FROM three_year_pictures 
WHERE id != '62caa73a-a55e-4bad-b7e5-39cb374013a9'
  AND vto_id IN (
      SELECT id FROM business_blueprints 
      WHERE organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
  );

-- Delete ALL team-level blueprints (keep only team_id IS NULL)
DELETE FROM business_blueprints 
WHERE organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
  AND team_id IS NOT NULL;

COMMIT;

-- 4. Final verification
SELECT 
    'After nuclear cleanup:' as status,
    o.name,
    (SELECT COUNT(*) FROM business_blueprints WHERE organization_id = o.id) as blueprints,
    (SELECT COUNT(*) FROM business_blueprints WHERE organization_id = o.id AND team_id IS NULL) as org_level,
    (SELECT COUNT(*) FROM business_blueprints WHERE organization_id = o.id AND team_id IS NOT NULL) as team_level,
    (SELECT COUNT(*) FROM three_year_pictures tp 
     JOIN business_blueprints bb ON bb.id = tp.vto_id 
     WHERE bb.organization_id = o.id) as three_year_pictures
FROM organizations o
WHERE o.name = 'Field Outdoor Spaces';