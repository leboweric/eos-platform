-- =====================================================
-- Diagnose why Bennett's data isn't showing
-- =====================================================

-- 1. What Leadership Teams does Bennett have now?
SELECT 
    'Bennett Teams' as check_type,
    t.id,
    t.name,
    t.is_leadership_team,
    CASE 
        WHEN t.id = '00000000-0000-0000-0000-000000000000' THEN 'SPECIAL UUID'
        ELSE 'REGULAR UUID'
    END as uuid_type
FROM teams t
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
AND (t.is_leadership_team = true OR t.name = 'Leadership Team');

-- 2. What blueprints exist for Bennett?
SELECT 
    'Bennett Blueprints' as check_type,
    bb.id as blueprint_id,
    bb.team_id,
    bb.name,
    CASE 
        WHEN bb.team_id IS NULL THEN 'ORG-LEVEL'
        WHEN bb.team_id = '00000000-0000-0000-0000-000000000000' THEN 'SPECIAL TEAM'
        ELSE 'REGULAR TEAM'
    END as blueprint_type,
    (SELECT COUNT(*) FROM core_values WHERE vto_id = bb.id) as core_values,
    (SELECT COUNT(*) FROM core_focus WHERE vto_id = bb.id) as core_focus,
    (SELECT COUNT(*) FROM three_year_pictures WHERE vto_id = bb.id) as three_year
FROM business_blueprints bb
WHERE bb.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling');

-- 3. Check the actual data still exists
SELECT 
    'Core Values Check' as data_type,
    cv.value_text,
    cv.description
FROM core_values cv
JOIN business_blueprints bb ON cv.vto_id = bb.id
WHERE bb.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling');

-- 4. Who currently owns the special UUID?
SELECT 
    'Special UUID Owner' as check_type,
    t.id,
    o.name as org_name,
    o.slug
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE t.id = '00000000-0000-0000-0000-000000000000';