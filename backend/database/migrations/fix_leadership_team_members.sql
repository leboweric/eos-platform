-- Fix Leadership Teams to have explicit members
-- This prevents meeting summaries from going to ALL organization employees

-- ===============================================
-- 1. Check which Leadership Teams have no members
-- ===============================================

SELECT 
    t.id as team_id,
    t.name as team_name,
    o.id as org_id,
    o.name as org_name,
    (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
    (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as total_org_users
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE t.is_leadership_team = true
ORDER BY o.name;

-- ===============================================
-- 2. For each Leadership Team with 0 members, 
--    add specific leadership members
-- ===============================================

-- IMPORTANT: You need to manually determine WHO should be on each Leadership Team
-- Do NOT automatically add all users!

-- Example for adding specific users to a Leadership Team:
-- Replace the team_id and user_ids with actual values

/*
-- Add specific leadership members (e.g., C-suite, owners, directors)
INSERT INTO team_members (team_id, user_id, role, joined_at)
SELECT 
    '[LEADERSHIP_TEAM_ID]' as team_id,
    u.id as user_id,
    'member' as role,
    NOW() as joined_at
FROM users u
WHERE u.organization_id = '[ORGANIZATION_ID]'
  AND u.role IN ('owner', 'admin', 'leader')  -- Adjust based on your role structure
  AND NOT EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.team_id = '[LEADERSHIP_TEAM_ID]' 
    AND tm.user_id = u.id
  );
*/

-- ===============================================
-- 3. Alternative: Add only specific users by email
-- ===============================================

-- This is SAFER - explicitly list who should be on Leadership Team
/*
INSERT INTO team_members (team_id, user_id, role, joined_at)
SELECT 
    '[LEADERSHIP_TEAM_ID]' as team_id,
    u.id as user_id,
    'member' as role,
    NOW() as joined_at
FROM users u
WHERE u.email IN (
    'ceo@company.com',
    'coo@company.com',
    'cfo@company.com',
    'vp@company.com'
    -- Add specific email addresses
)
AND u.organization_id = '[ORGANIZATION_ID]'
AND NOT EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.team_id = '[LEADERSHIP_TEAM_ID]' 
    AND tm.user_id = u.id
);
*/

-- ===============================================
-- 4. Verify after adding members
-- ===============================================

-- Check that all Leadership Teams now have members
SELECT 
    t.id as team_id,
    t.name as team_name,
    o.name as org_name,
    COUNT(tm.user_id) as member_count,
    STRING_AGG(u.email, ', ' ORDER BY u.email) as member_emails
FROM teams t
JOIN organizations o ON t.organization_id = o.id
LEFT JOIN team_members tm ON tm.team_id = t.id
LEFT JOIN users u ON tm.user_id = u.id
WHERE t.is_leadership_team = true
GROUP BY t.id, t.name, o.name
ORDER BY o.name;

-- ===============================================
-- 5. CRITICAL: Set a reasonable default
-- ===============================================

-- For any Leadership Team still without members,
-- add ONLY the organization owner/admin as a safety measure

INSERT INTO team_members (team_id, user_id, role, joined_at)
SELECT DISTINCT
    t.id as team_id,
    u.id as user_id,
    'member' as role,
    NOW() as joined_at
FROM teams t
JOIN organizations o ON t.organization_id = o.id
JOIN users u ON u.organization_id = o.id
WHERE t.is_leadership_team = true
  AND u.role IN ('owner', 'admin')  -- Only owners/admins
  AND NOT EXISTS (
    SELECT 1 FROM team_members WHERE team_id = t.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.team_id = t.id AND tm.user_id = u.id
  )
LIMIT 1;  -- Only add ONE user as a safety measure

-- ===============================================
-- END - Leadership Teams should now have explicit members
-- ===============================================