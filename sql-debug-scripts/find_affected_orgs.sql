-- Find all organizations affected by the wrong Leadership Team VTO bug

-- List all affected organizations with details
SELECT 
    o.name as org_name,
    o.id as org_id,
    t.name as team_name,
    t.id as team_id,
    bb.id as blueprint_id,
    bb.created_at::date as created_date,
    bb.created_at::time as created_time
FROM business_blueprints bb
JOIN teams t ON t.id = bb.team_id
JOIN organizations o ON o.id = bb.organization_id
WHERE t.is_leadership_team = true
  AND bb.team_id IS NOT NULL  -- This should be NULL for leadership teams
ORDER BY bb.created_at DESC;

-- Count how many organizations are affected
SELECT 
    COUNT(DISTINCT o.id) as affected_org_count,
    COUNT(DISTINCT bb.id) as wrong_blueprint_count,
    MIN(bb.created_at)::date as first_occurrence,
    MAX(bb.created_at)::date as last_occurrence
FROM business_blueprints bb
JOIN teams t ON t.id = bb.team_id
JOIN organizations o ON o.id = bb.organization_id
WHERE t.is_leadership_team = true
  AND bb.team_id IS NOT NULL;

-- The FIX: Clean up the wrong blueprints
-- First, let's see what would be deleted
SELECT 
    'Would delete:' as action,
    o.name as org_name,
    bb.id as blueprint_id_to_delete,
    bb.team_id,
    bb.created_at,
    'Keeping org-level blueprint: ' || bb2.id as keeping_blueprint
FROM business_blueprints bb
JOIN teams t ON t.id = bb.team_id
JOIN organizations o ON o.id = bb.organization_id
LEFT JOIN business_blueprints bb2 ON bb2.organization_id = bb.organization_id AND bb2.team_id IS NULL
WHERE t.is_leadership_team = true
  AND bb.team_id IS NOT NULL
  AND bb2.id IS NOT NULL;  -- Only show ones where we have an org-level blueprint to keep

-- CAREFUL: This will delete the wrong blueprints (uncomment to run)
/*
DELETE FROM three_year_pictures tp
USING business_blueprints bb, teams t
WHERE tp.vto_id = bb.id
  AND bb.team_id = t.id
  AND t.is_leadership_team = true
  AND bb.team_id IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM business_blueprints bb2 
      WHERE bb2.organization_id = bb.organization_id 
      AND bb2.team_id IS NULL
  );

DELETE FROM business_blueprints bb
USING teams t
WHERE bb.team_id = t.id
  AND t.is_leadership_team = true
  AND bb.team_id IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM business_blueprints bb2 
      WHERE bb2.organization_id = bb.organization_id 
      AND bb2.team_id IS NULL
  );
*/