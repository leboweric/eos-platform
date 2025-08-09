-- Fix business blueprint to match what the API expects

-- 1. Check current state
SELECT 
    id,
    organization_id,
    team_id,
    name
FROM business_blueprints
WHERE organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e';

-- 2. Update the blueprint to have NULL team_id (organization-level)
UPDATE business_blueprints
SET team_id = NULL
WHERE id = '28d6f66d-f8de-4860-9875-a360ea4e355e'
AND organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e';

-- 3. Verify the update
SELECT 
    bb.id,
    bb.team_id,
    bb.name,
    COUNT(cv.id) as core_values_count
FROM business_blueprints bb
LEFT JOIN core_values cv ON cv.vto_id = bb.id
WHERE bb.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
GROUP BY bb.id, bb.team_id, bb.name;