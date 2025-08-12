-- =====================================================
-- Add Becky to Leadership Team (if needed)
-- =====================================================

BEGIN;

-- Add Becky to Leadership Team
INSERT INTO team_members (user_id, team_id)
SELECT 
    '7bb086b7-fcea-4eff-8a56-24e2ef72a0ad'::uuid,  -- Becky's ID
    id  -- Leadership Team ID
FROM teams 
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND name = 'Leadership Team'
ON CONFLICT (user_id, team_id) DO NOTHING;  -- Avoid duplicate if already exists

COMMIT;

-- Verify Becky is on the team
SELECT 
    u.first_name || ' ' || u.last_name as name,
    t.name as team_name,
    'Member' as status
FROM team_members tm
JOIN users u ON tm.user_id = u.id
JOIN teams t ON tm.team_id = t.id
WHERE u.id = '7bb086b7-fcea-4eff-8a56-24e2ef72a0ad';