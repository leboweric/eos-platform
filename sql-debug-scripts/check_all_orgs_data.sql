-- =====================================================
-- Check ALL organizations to see who's missing data
-- =====================================================

SELECT 
    o.name as org_name,
    o.slug,
    bb.id as blueprint_id,
    bb.team_id,
    CASE 
        WHEN bb.team_id IS NULL THEN 'ORG-LEVEL'
        ELSE 'TEAM-LEVEL'
    END as blueprint_type,
    (SELECT COUNT(*) FROM core_values WHERE vto_id = bb.id) as core_values,
    (SELECT COUNT(*) FROM core_focus WHERE vto_id = bb.id) as core_focus,
    (SELECT COUNT(*) FROM three_year_pictures WHERE vto_id = bb.id) as three_year_pic
FROM organizations o
LEFT JOIN business_blueprints bb ON bb.organization_id = o.id
WHERE bb.team_id IS NULL  -- Only org-level blueprints
ORDER BY o.name;

-- Check if Boyum has multiple blueprints
SELECT 
    'Boyum Blueprint Check' as check_type,
    bb.*
FROM business_blueprints bb
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer';