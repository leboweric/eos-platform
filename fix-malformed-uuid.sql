-- CRITICAL: Fix malformed team UUID
-- This team has 331 records across 4 tables that need to be updated
-- BACKUP YOUR DATABASE BEFORE RUNNING THIS

-- Step 1: Verify the current situation
SELECT 
    'Current malformed team' as info,
    id,
    name,
    is_leadership_team,
    organization_id,
    LENGTH(id::text) as id_length
FROM teams 
WHERE id::text = '559822f8-c442-48dd-91dc-d23dff10959f';

-- Step 2: Generate a new proper UUID for this team
-- We'll use the malformed UUID as a seed to create a consistent proper UUID
DO $$
DECLARE
    old_team_id UUID := '559822f8-c442-48dd-91dc-d23dff10959f'::UUID;
    new_team_id UUID;
    team_name TEXT;
    org_id UUID;
    is_leadership BOOLEAN;
BEGIN
    -- Get team details first
    SELECT name, organization_id, is_leadership_team 
    INTO team_name, org_id, is_leadership
    FROM teams 
    WHERE id = old_team_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Team not found with malformed UUID';
    END IF;
    
    -- Generate new UUID (deterministic based on org + name for consistency)
    new_team_id := uuid_generate_v4();
    
    RAISE NOTICE 'Migrating team: % from % to %', team_name, old_team_id, new_team_id;
    
    -- Step 3: Create new team record with proper UUID
    INSERT INTO teams (id, name, organization_id, is_leadership_team, created_at, updated_at)
    SELECT 
        new_team_id,
        name,
        organization_id,
        is_leadership_team,
        created_at,
        updated_at
    FROM teams 
    WHERE id = old_team_id;
    
    RAISE NOTICE 'Created new team record';
    
    -- Step 4: Update all foreign key references
    
    -- Update issues
    UPDATE issues SET team_id = new_team_id WHERE team_id = old_team_id;
    RAISE NOTICE 'Updated % issues', (SELECT COUNT(*) FROM issues WHERE team_id = new_team_id);
    
    -- Update todos  
    UPDATE todos SET team_id = new_team_id WHERE team_id = old_team_id;
    RAISE NOTICE 'Updated % todos', (SELECT COUNT(*) FROM todos WHERE team_id = new_team_id);
    
    -- Update quarterly_priorities
    UPDATE quarterly_priorities SET team_id = new_team_id WHERE team_id = old_team_id;
    RAISE NOTICE 'Updated % quarterly_priorities', (SELECT COUNT(*) FROM quarterly_priorities WHERE team_id = new_team_id);
    
    -- Update scorecard_metrics
    UPDATE scorecard_metrics SET team_id = new_team_id WHERE team_id = old_team_id;
    RAISE NOTICE 'Updated % scorecard_metrics', (SELECT COUNT(*) FROM scorecard_metrics WHERE team_id = new_team_id);
    
    -- Update team_members if any exist
    UPDATE team_members SET team_id = new_team_id WHERE team_id = old_team_id;
    RAISE NOTICE 'Updated % team_members', (SELECT COUNT(*) FROM team_members WHERE team_id = new_team_id);
    
    -- Update any other tables that might reference teams
    -- Add more UPDATE statements here if other tables reference team_id
    
    -- Step 5: Verify migration
    RAISE NOTICE 'Verification:';
    RAISE NOTICE 'New team exists: %', (SELECT EXISTS(SELECT 1 FROM teams WHERE id = new_team_id));
    RAISE NOTICE 'Old team still exists: %', (SELECT EXISTS(SELECT 1 FROM teams WHERE id = old_team_id));
    RAISE NOTICE 'Issues with new team: %', (SELECT COUNT(*) FROM issues WHERE team_id = new_team_id);
    RAISE NOTICE 'Issues with old team: %', (SELECT COUNT(*) FROM issues WHERE team_id = old_team_id);
    
    -- Step 6: Only delete old team if migration successful
    IF (SELECT COUNT(*) FROM issues WHERE team_id = old_team_id) = 0 AND
       (SELECT COUNT(*) FROM todos WHERE team_id = old_team_id) = 0 AND
       (SELECT COUNT(*) FROM quarterly_priorities WHERE team_id = old_team_id) = 0 AND
       (SELECT COUNT(*) FROM scorecard_metrics WHERE team_id = old_team_id) = 0 THEN
        
        DELETE FROM teams WHERE id = old_team_id;
        RAISE NOTICE 'Deleted old team record';
        RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY';
        RAISE NOTICE 'New team ID: %', new_team_id;
    ELSE
        RAISE EXCEPTION 'Migration verification failed - old team still has references';
    END IF;
    
END $$;

-- Step 7: Final verification
SELECT 
    'FINAL VERIFICATION' as status,
    id,
    name,
    LENGTH(id::text) as id_length,
    CASE WHEN LENGTH(id::text) = 36 THEN 'FIXED' ELSE 'STILL BROKEN' END as uuid_status
FROM teams 
WHERE name = (SELECT name FROM teams WHERE id::text LIKE '%d23dff10959f%' LIMIT 1)
   OR id::text LIKE '%d23dff10959f%';