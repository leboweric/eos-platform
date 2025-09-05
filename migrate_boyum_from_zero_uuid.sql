-- =====================================================
-- MIGRATE BOYUM AWAY FROM ZERO UUID
-- Purpose: Move Boyum's data from the problematic shared zero UUID
--          to a proper unique Leadership Team UUID
-- =====================================================

-- STEP 1: Check current state (run this first to see what needs migration)
-- =====================================================
SELECT 
    'Current Boyum Leadership Team' as description,
    t.id as team_id,
    t.name,
    t.is_leadership_team,
    (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as team_members_count,
    (SELECT COUNT(*) FROM quarterly_priorities WHERE team_id = t.id) as priorities_count,
    (SELECT COUNT(*) FROM issues WHERE team_id = t.id) as issues_count,
    (SELECT COUNT(*) FROM todos WHERE team_id = t.id) as todos_count,
    (SELECT COUNT(*) FROM scorecard_metrics WHERE team_id = t.id) as metrics_count
FROM teams t
WHERE t.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
AND (t.id = '00000000-0000-0000-0000-000000000000' OR t.is_leadership_team = true);

-- STEP 2: Create new Leadership Team for Boyum (if not exists)
-- =====================================================
-- Check if Boyum already has a proper Leadership Team (not zero UUID)
-- If this returns a row, SKIP step 3
SELECT * FROM teams 
WHERE organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
AND is_leadership_team = true
AND id != '00000000-0000-0000-0000-000000000000';

-- STEP 3: Create new Leadership Team (only if step 2 returned no rows)
-- =====================================================
/*
INSERT INTO teams (id, name, organization_id, is_leadership_team, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Leadership Team',
    'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e',
    true,
    NOW(),
    NOW()
)
RETURNING id as new_leadership_team_id;
*/

-- STEP 4: Run the migration (TRANSACTION - all or nothing)
-- =====================================================
-- IMPORTANT: Replace 'YOUR_NEW_TEAM_ID_HERE' with the ID from step 3
-- This ensures all data moves atomically

BEGIN;

DO $$
DECLARE
    boyum_org_id UUID := 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e';
    zero_uuid UUID := '00000000-0000-0000-0000-000000000000';
    new_leadership_id UUID := 'YOUR_NEW_TEAM_ID_HERE'; -- REPLACE THIS!
    moved_count INTEGER;
    total_moved INTEGER := 0;
BEGIN
    -- Verify the new team exists and is marked as leadership
    IF NOT EXISTS (
        SELECT 1 FROM teams 
        WHERE id = new_leadership_id 
        AND organization_id = boyum_org_id 
        AND is_leadership_team = true
    ) THEN
        RAISE EXCEPTION 'New Leadership Team % not found or not marked as leadership!', new_leadership_id;
    END IF;
    
    RAISE NOTICE 'Starting Boyum migration from zero UUID to %', new_leadership_id;
    RAISE NOTICE '========================================';
    
    -- 1. Move team members
    UPDATE team_members
    SET team_id = new_leadership_id,
        updated_at = NOW()
    WHERE team_id = zero_uuid
    AND user_id IN (
        SELECT id FROM users WHERE organization_id = boyum_org_id
    );
    GET DIAGNOSTICS moved_count = ROW_COUNT;
    RAISE NOTICE 'Moved % team members', moved_count;
    total_moved := total_moved + moved_count;
    
    -- 2. Move quarterly priorities (Rocks)
    UPDATE quarterly_priorities
    SET team_id = new_leadership_id
    WHERE organization_id = boyum_org_id
    AND team_id = zero_uuid;
    GET DIAGNOSTICS moved_count = ROW_COUNT;
    RAISE NOTICE 'Moved % quarterly priorities', moved_count;
    total_moved := total_moved + moved_count;
    
    -- 3. Move issues
    UPDATE issues
    SET team_id = new_leadership_id
    WHERE organization_id = boyum_org_id
    AND team_id = zero_uuid;
    GET DIAGNOSTICS moved_count = ROW_COUNT;
    RAISE NOTICE 'Moved % issues', moved_count;
    total_moved := total_moved + moved_count;
    
    -- 4. Move todos
    UPDATE todos
    SET team_id = new_leadership_id
    WHERE organization_id = boyum_org_id
    AND team_id = zero_uuid;
    GET DIAGNOSTICS moved_count = ROW_COUNT;
    RAISE NOTICE 'Moved % todos', moved_count;
    total_moved := total_moved + moved_count;
    
    -- 5. Move scorecard metrics
    UPDATE scorecard_metrics
    SET team_id = new_leadership_id
    WHERE organization_id = boyum_org_id
    AND team_id = zero_uuid;
    GET DIAGNOSTICS moved_count = ROW_COUNT;
    RAISE NOTICE 'Moved % scorecard metrics', moved_count;
    total_moved := total_moved + moved_count;
    
    -- 6. Move scorecard groups
    UPDATE scorecard_groups
    SET team_id = new_leadership_id
    WHERE organization_id = boyum_org_id
    AND team_id = zero_uuid;
    GET DIAGNOSTICS moved_count = ROW_COUNT;
    RAISE NOTICE 'Moved % scorecard groups', moved_count;
    total_moved := total_moved + moved_count;
    
    -- 7. Move cascading messages (if they exist)
    UPDATE cascading_messages
    SET from_team_id = new_leadership_id
    WHERE organization_id = boyum_org_id
    AND from_team_id = zero_uuid;
    GET DIAGNOSTICS moved_count = ROW_COUNT;
    IF moved_count > 0 THEN
        RAISE NOTICE 'Moved % cascading messages (from)', moved_count;
        total_moved := total_moved + moved_count;
    END IF;
    
    UPDATE cascading_message_recipients
    SET to_team_id = new_leadership_id
    WHERE to_team_id = zero_uuid
    AND message_id IN (
        SELECT id FROM cascading_messages WHERE organization_id = boyum_org_id
    );
    GET DIAGNOSTICS moved_count = ROW_COUNT;
    IF moved_count > 0 THEN
        RAISE NOTICE 'Moved % cascading message recipients', moved_count;
        total_moved := total_moved + moved_count;
    END IF;
    
    -- 8. Remove the zero UUID from Boyum's teams (optional - keeps it for backwards compatibility)
    -- Uncomment if you want to completely remove it:
    /*
    DELETE FROM teams
    WHERE id = zero_uuid
    AND organization_id = boyum_org_id;
    GET DIAGNOSTICS moved_count = ROW_COUNT;
    IF moved_count > 0 THEN
        RAISE NOTICE 'Removed zero UUID team record', moved_count;
    END IF;
    */
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION COMPLETE!';
    RAISE NOTICE 'Total records migrated: %', total_moved;
    RAISE NOTICE '========================================';
    
    -- Show summary of new state
    RAISE NOTICE 'New Leadership Team ID: %', new_leadership_id;
    RAISE NOTICE 'Verifying data...';
    
END $$;

-- IMPORTANT: Review the migration results before committing!
-- If everything looks good, run: COMMIT;
-- If something went wrong, run: ROLLBACK;

-- STEP 5: Verify the migration
-- =====================================================
SELECT 
    'After Migration' as status,
    t.id as team_id,
    t.name,
    t.is_leadership_team,
    (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as team_members,
    (SELECT COUNT(*) FROM quarterly_priorities WHERE team_id = t.id) as priorities,
    (SELECT COUNT(*) FROM issues WHERE team_id = t.id) as issues,
    (SELECT COUNT(*) FROM todos WHERE team_id = t.id) as todos,
    (SELECT COUNT(*) FROM scorecard_metrics WHERE team_id = t.id) as metrics
FROM teams t
WHERE t.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
AND (t.is_leadership_team = true OR t.id = '00000000-0000-0000-0000-000000000000');

-- Check if any data still references zero UUID
SELECT 
    'Remaining zero UUID references' as check_type,
    'team_members' as table_name,
    COUNT(*) as count
FROM team_members
WHERE team_id = '00000000-0000-0000-0000-000000000000'
AND user_id IN (SELECT id FROM users WHERE organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e')
UNION ALL
SELECT 
    'Remaining zero UUID references',
    'quarterly_priorities',
    COUNT(*)
FROM quarterly_priorities
WHERE team_id = '00000000-0000-0000-0000-000000000000'
AND organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
UNION ALL
SELECT 
    'Remaining zero UUID references',
    'issues',
    COUNT(*)
FROM issues
WHERE team_id = '00000000-0000-0000-0000-000000000000'
AND organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e';

-- If all counts are 0, the migration was successful!

-- COMMIT;  -- Uncomment and run this when ready to finalize
-- ROLLBACK; -- Or run this if something went wrong