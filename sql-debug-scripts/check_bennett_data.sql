-- =====================================================
-- Check Bennett Material Handling's current data status
-- =====================================================

-- 1. Check what blueprint data exists
SELECT 
    o.name as org_name,
    o.slug,
    bb.id as blueprint_id,
    bb.team_id,
    (SELECT COUNT(*) FROM core_values WHERE vto_id = bb.id) as core_values_count,
    (SELECT COUNT(*) FROM core_focus WHERE vto_id = bb.id) as core_focus_count,
    (SELECT COUNT(*) FROM three_year_pictures WHERE vto_id = bb.id) as three_year_count
FROM organizations o
LEFT JOIN business_blueprints bb ON bb.organization_id = o.id
WHERE o.slug = 'bennett-material-handling';

-- 2. Check if we can find their data in other tables or with wrong blueprint ID
SELECT 
    'core_values' as table_name,
    cv.*
FROM core_values cv
JOIN business_blueprints bb ON cv.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'bennett-material-handling'

UNION ALL

SELECT 
    'core_focus' as table_name,
    cf.*
FROM core_focus cf
JOIN business_blueprints bb ON cf.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'bennett-material-handling'

UNION ALL

SELECT 
    'three_year_pictures' as table_name,
    typ.*
FROM three_year_pictures typ
JOIN business_blueprints bb ON typ.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'bennett-material-handling';