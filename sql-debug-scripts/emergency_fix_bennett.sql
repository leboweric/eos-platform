-- =====================================================
-- EMERGENCY FIX: Restore Bennett Material Handling's Data
-- =====================================================

BEGIN;

DO $$
DECLARE
    bennett_org_id UUID;
    bennett_new_leadership_id UUID;
    boyum_org_id UUID;
    special_uuid UUID := '00000000-0000-0000-0000-000000000000';
    old_hardcoded_uuid UUID := '47d53797-be5f-49c2-883a-326a401a17c1';
BEGIN
    -- Get organization IDs
    SELECT id INTO bennett_org_id FROM organizations WHERE slug = 'bennett-material-handling';
    SELECT id INTO boyum_org_id FROM organizations WHERE slug = 'boyum-barenscheer';
    
    -- Get Bennett's new Leadership Team ID
    SELECT id INTO bennett_new_leadership_id 
    FROM teams 
    WHERE organization_id = bennett_org_id 
    AND is_leadership_team = true
    AND id != special_uuid;
    
    IF bennett_new_leadership_id IS NULL THEN
        RAISE EXCEPTION 'Bennett new Leadership Team not found!';
    END IF;
    
    RAISE NOTICE 'Bennett Org ID: %', bennett_org_id;
    RAISE NOTICE 'Bennett New Leadership Team ID: %', bennett_new_leadership_id;
    RAISE NOTICE 'Moving Bennett data from special UUID to new Leadership Team...';
    
    -- 1. Move Bennett's team members from special UUID to Bennett's new Leadership Team
    -- But ONLY for Bennett users!
    UPDATE team_members
    SET team_id = bennett_new_leadership_id
    WHERE team_id = special_uuid
    AND user_id IN (
        SELECT id FROM users WHERE organization_id = bennett_org_id
    );
    RAISE NOTICE 'Moved % team members', FOUND;
    
    -- 2. Move Bennett's quarterly priorities
    UPDATE quarterly_priorities
    SET team_id = bennett_new_leadership_id
    WHERE organization_id = bennett_org_id
    AND team_id = special_uuid;
    RAISE NOTICE 'Moved % quarterly priorities', FOUND;
    
    -- 3. Move Bennett's issues
    UPDATE issues
    SET team_id = bennett_new_leadership_id
    WHERE organization_id = bennett_org_id
    AND team_id = special_uuid;
    RAISE NOTICE 'Moved % issues', FOUND;
    
    -- 4. Move Bennett's todos
    UPDATE todos
    SET team_id = bennett_new_leadership_id
    WHERE organization_id = bennett_org_id
    AND team_id = special_uuid;
    RAISE NOTICE 'Moved % todos', FOUND;
    
    -- 5. Move Bennett's scorecard metrics
    UPDATE scorecard_metrics
    SET team_id = bennett_new_leadership_id
    WHERE organization_id = bennett_org_id
    AND team_id = special_uuid;
    RAISE NOTICE 'Moved % scorecard metrics', FOUND;
    
    -- 6. Also fix data linked to the old hardcoded UUID
    UPDATE quarterly_priorities
    SET team_id = bennett_new_leadership_id
    WHERE organization_id = bennett_org_id
    AND team_id = old_hardcoded_uuid;
    RAISE NOTICE 'Moved % priorities from old hardcoded UUID', FOUND;
    
    UPDATE issues
    SET team_id = bennett_new_leadership_id
    WHERE organization_id = bennett_org_id
    AND team_id = old_hardcoded_uuid;
    RAISE NOTICE 'Moved % issues from old hardcoded UUID', FOUND;
    
    UPDATE todos
    SET team_id = bennett_new_leadership_id
    WHERE organization_id = bennett_org_id
    AND team_id = old_hardcoded_uuid;
    RAISE NOTICE 'Moved % todos from old hardcoded UUID', FOUND;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Bennett Data Migration Complete!';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify the fix
SELECT 
    'VERIFICATION - Bennett Leadership Team Members' as check,
    COUNT(*) as member_count
FROM team_members tm
JOIN users u ON tm.user_id = u.id
WHERE tm.team_id = (
    SELECT id FROM teams 
    WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
    AND is_leadership_team = true
    AND id != '00000000-0000-0000-0000-000000000000'
);

SELECT 
    'VERIFICATION - Bennett Data Counts' as check,
    'Priorities' as data_type,
    COUNT(*) as count
FROM quarterly_priorities
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
AND team_id = (
    SELECT id FROM teams 
    WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
    AND is_leadership_team = true
    AND id != '00000000-0000-0000-0000-000000000000'
)
UNION ALL
SELECT 
    'VERIFICATION - Bennett Data Counts',
    'Scorecard Metrics',
    COUNT(*)
FROM scorecard_metrics
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
AND team_id = (
    SELECT id FROM teams 
    WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
    AND is_leadership_team = true
    AND id != '00000000-0000-0000-0000-000000000000'
);