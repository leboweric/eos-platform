-- Check Leadership Team setup for Boyum Barenscheer

-- 1. Check if Leadership Team has the correct flag
SELECT 
    t.id,
    t.name,
    t.organization_id,
    t.is_leadership_team,
    o.name as org_name
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
AND (t.id = '00000000-0000-0000-0000-000000000000' OR t.name = 'Leadership Team');

-- 2. Update Leadership Team flag if needed
UPDATE teams 
SET is_leadership_team = true
WHERE id = '00000000-0000-0000-0000-000000000000'
AND organization_id IN (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer');

-- 3. Verify the update
SELECT 
    t.id,
    t.name,
    t.is_leadership_team
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
AND t.id = '00000000-0000-0000-0000-000000000000';