-- Delete the empty duplicate blueprint

-- 1. Verify one more time that it's empty
SELECT 
    bb.id,
    bb.name,
    bb.team_id,
    (SELECT COUNT(*) FROM core_values WHERE vto_id = bb.id) as core_values_count
FROM business_blueprints bb
WHERE bb.id = '0cf35109-6538-4dec-847c-4ad7f8c78f3f';

-- 2. Delete the empty blueprint
DELETE FROM business_blueprints 
WHERE id = '0cf35109-6538-4dec-847c-4ad7f8c78f3f'
AND organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e';

-- 3. Verify only one blueprint remains
SELECT 
    bb.id,
    bb.name,
    bb.team_id,
    COUNT(cv.id) as core_values_count,
    t.name as team_name
FROM business_blueprints bb
LEFT JOIN core_values cv ON cv.vto_id = bb.id
LEFT JOIN teams t ON bb.team_id = t.id
WHERE bb.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
GROUP BY bb.id, bb.name, bb.team_id, t.name;