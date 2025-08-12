-- =====================================================
-- Audit ALL Organizations and Their Leadership Teams
-- =====================================================

-- 1. Check which org owns the special UUID
SELECT 
    'SPECIAL UUID OWNER' as check_type,
    o.name as org_name,
    o.slug,
    t.id as team_id
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE t.id = '00000000-0000-0000-0000-000000000000';

-- 2. List ALL organizations and their Leadership Teams
SELECT 
    'ORG LEADERSHIP TEAMS' as check_type,
    o.id as org_id,
    o.name as org_name,
    o.slug,
    t.id as leadership_team_id,
    t.name as team_name,
    t.is_leadership_team,
    CASE 
        WHEN t.id = '00000000-0000-0000-0000-000000000000' THEN '⚠️ USING SPECIAL UUID'
        WHEN t.id IS NULL THEN '❌ NO LEADERSHIP TEAM'
        ELSE '✅ UNIQUE UUID'
    END as status
FROM organizations o
LEFT JOIN teams t ON t.organization_id = o.id AND t.is_leadership_team = true
ORDER BY o.created_at;

-- 3. Count how many orgs have proper setup
SELECT 
    'SUMMARY' as check_type,
    COUNT(*) FILTER (WHERE t.id IS NOT NULL AND t.id != '00000000-0000-0000-0000-000000000000') as orgs_with_unique_leadership,
    COUNT(*) FILTER (WHERE t.id = '00000000-0000-0000-0000-000000000000') as orgs_using_special_uuid,
    COUNT(*) FILTER (WHERE t.id IS NULL) as orgs_without_leadership,
    COUNT(*) as total_orgs
FROM organizations o
LEFT JOIN teams t ON t.organization_id = o.id AND t.is_leadership_team = true;

-- 4. Check for multiple leadership teams per org (should never happen)
SELECT 
    'MULTIPLE LEADERSHIP TEAMS' as issue,
    o.name as org_name,
    COUNT(t.id) as leadership_team_count
FROM organizations o
JOIN teams t ON t.organization_id = o.id
WHERE t.is_leadership_team = true
GROUP BY o.id, o.name
HAVING COUNT(t.id) > 1;