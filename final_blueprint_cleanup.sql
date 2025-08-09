-- Final cleanup - remove the auto-created empty blueprint

-- 1. Verify which one has the core values
SELECT 
    bb.id,
    bb.name,
    bb.created_at,
    COUNT(cv.id) as core_values_count
FROM business_blueprints bb
LEFT JOIN core_values cv ON cv.vto_id = bb.id
WHERE bb.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
GROUP BY bb.id, bb.name, bb.created_at
ORDER BY bb.created_at;

-- 2. Delete the empty V/TO blueprint (auto-created by API)
DELETE FROM business_blueprints 
WHERE id = '11caf0fd-5484-4018-b47a-56b08d164d5e'
AND organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e';

-- 3. Final check - should only have one blueprint with 3 core values
SELECT 
    bb.id,
    bb.name,
    bb.team_id,
    COUNT(cv.id) as core_values_count
FROM business_blueprints bb
LEFT JOIN core_values cv ON cv.vto_id = bb.id
WHERE bb.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
GROUP BY bb.id, bb.name, bb.team_id;