-- ============================================================================
-- TEST Migration Script - Single To-Do
-- ============================================================================
-- Purpose: Test migration on ONE specific To-Do before running full migration
-- Target: "Nov. 5: Copilot available for all users" in Boyum and Barenscheer
-- ============================================================================

-- ============================================================================
-- STEP 1: FIND THE TARGET TO-DO
-- ============================================================================
DO $$
DECLARE
    target_todo RECORD;
    assignee_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FINDING TARGET TO-DO';
    RAISE NOTICE '========================================';
    
    -- Find the To-Do
    SELECT t.*, o.name as org_name
    INTO target_todo
    FROM todos t
    JOIN organizations o ON t.organization_id = o.id
    WHERE t.title LIKE '%Copilot available for all users%'
      AND o.name LIKE '%Boyum%Barenscheer%'
      AND t.is_multi_assignee = true
      AND t.deleted_at IS NULL
    LIMIT 1;
    
    IF target_todo.id IS NULL THEN
        RAISE NOTICE '❌ To-Do not found!';
        RAISE NOTICE 'Searching for similar...';
        
        -- Show similar To-Dos
        FOR target_todo IN 
            SELECT t.id, t.title, o.name as org_name, t.is_multi_assignee
            FROM todos t
            JOIN organizations o ON t.organization_id = o.id
            WHERE (t.title ILIKE '%copilot%' OR o.name ILIKE '%boyum%')
              AND t.deleted_at IS NULL
            LIMIT 5
        LOOP
            RAISE NOTICE 'Found: % (Org: %, Multi: %)', 
                target_todo.title, target_todo.org_name, target_todo.is_multi_assignee;
        END LOOP;
        RETURN;
    END IF;
    
    -- Count assignees
    SELECT COUNT(*) INTO assignee_count
    FROM todo_assignees
    WHERE todo_id = target_todo.id;
    
    RAISE NOTICE '✓ Found To-Do:';
    RAISE NOTICE '  ID: %', target_todo.id;
    RAISE NOTICE '  Title: %', target_todo.title;
    RAISE NOTICE '  Organization: %', target_todo.org_name;
    RAISE NOTICE '  Due Date: %', target_todo.due_date;
    RAISE NOTICE '  Assignees: %', assignee_count;
    RAISE NOTICE '  Created: %', target_todo.created_at;
    RAISE NOTICE '========================================';
    
    -- Show assignees
    RAISE NOTICE 'Assignees:';
    FOR target_todo IN
        SELECT 
            u.first_name || ' ' || u.last_name as user_name,
            ta.completed,
            ta.completed_at
        FROM todo_assignees ta
        JOIN users u ON ta.user_id = u.id
        WHERE ta.todo_id IN (
            SELECT t.id FROM todos t
            JOIN organizations o ON t.organization_id = o.id
            WHERE t.title LIKE '%Copilot available for all users%'
              AND o.name LIKE '%Boyum%Barenscheer%'
              AND t.is_multi_assignee = true
              AND t.deleted_at IS NULL
            LIMIT 1
        )
    LOOP
        RAISE NOTICE '  - % (Completed: %)', target_todo.user_name, target_todo.completed;
    END LOOP;
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 2: CREATE BACKUP
-- ============================================================================
DROP TABLE IF EXISTS test_todo_backup;
CREATE TABLE test_todo_backup AS 
SELECT t.* 
FROM todos t
JOIN organizations o ON t.organization_id = o.id
WHERE t.title LIKE '%Copilot available for all users%'
  AND o.name LIKE '%Boyum%Barenscheer%'
  AND t.is_multi_assignee = true
  AND t.deleted_at IS NULL;

DROP TABLE IF EXISTS test_assignees_backup;
CREATE TABLE test_assignees_backup AS
SELECT ta.*
FROM todo_assignees ta
WHERE ta.todo_id IN (SELECT id FROM test_todo_backup);

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'BACKUP CREATED';
    RAISE NOTICE '  To-Dos backed up: %', (SELECT COUNT(*) FROM test_todo_backup);
    RAISE NOTICE '  Assignees backed up: %', (SELECT COUNT(*) FROM test_assignees_backup);
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 3: MIGRATE THE TO-DO
-- ============================================================================
DO $$
DECLARE
    todo_record RECORD;
    assignee_record RECORD;
    new_group_id UUID;
    new_todo_id UUID;
    migrated_count INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STARTING TEST MIGRATION';
    RAISE NOTICE '========================================';
    
    -- Get the target To-Do
    SELECT t.* INTO todo_record
    FROM todos t
    JOIN organizations o ON t.organization_id = o.id
    WHERE t.title LIKE '%Copilot available for all users%'
      AND o.name LIKE '%Boyum%Barenscheer%'
      AND t.is_multi_assignee = true
      AND t.deleted_at IS NULL
    LIMIT 1;
    
    IF todo_record.id IS NULL THEN
        RAISE NOTICE '❌ To-Do not found for migration!';
        RETURN;
    END IF;
    
    -- Generate new group ID
    new_group_id := gen_random_uuid();
    
    RAISE NOTICE 'Migrating: %', todo_record.title;
    RAISE NOTICE 'New group ID: %', new_group_id;
    RAISE NOTICE '';
    
    -- Loop through each assignee
    FOR assignee_record IN 
        SELECT ta.*, u.first_name || ' ' || u.last_name as user_name
        FROM todo_assignees ta
        JOIN users u ON ta.user_id = u.id
        WHERE ta.todo_id = todo_record.id
    LOOP
        -- Generate new ID
        new_todo_id := gen_random_uuid();
        
        -- Create new To-Do record
        INSERT INTO todos (
            id,
            title,
            description,
            status,
            priority,
            due_date,
            assigned_to_id,
            owner_id,
            team_id,
            organization_id,
            department_id,
            related_priority_id,
            meeting_id,
            archived,
            todo_group_id,
            is_multi_assignee,
            created_at,
            updated_at,
            completed_at
        ) VALUES (
            new_todo_id,
            todo_record.title,
            todo_record.description,
            CASE 
                WHEN assignee_record.completed THEN 'complete'
                ELSE COALESCE(todo_record.status, 'incomplete')
            END,
            todo_record.priority,
            todo_record.due_date,
            assignee_record.user_id,
            todo_record.owner_id,
            todo_record.team_id,
            todo_record.organization_id,
            todo_record.department_id,
            todo_record.related_priority_id,
            todo_record.meeting_id,
            todo_record.archived,
            new_group_id,
            false,
            todo_record.created_at,
            COALESCE(assignee_record.updated_at, todo_record.updated_at, NOW()),
            assignee_record.completed_at
        );
        
        migrated_count := migrated_count + 1;
        
        RAISE NOTICE '✓ Created To-Do for: %', assignee_record.user_name;
        RAISE NOTICE '  New ID: %', new_todo_id;
        RAISE NOTICE '  Status: %', CASE WHEN assignee_record.completed THEN 'complete' ELSE 'incomplete' END;
        RAISE NOTICE '  Completed at: %', assignee_record.completed_at;
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST MIGRATION COMPLETE';
    RAISE NOTICE '  Total new To-Dos created: %', migrated_count;
    RAISE NOTICE '  Group ID: %', new_group_id;
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 4: VERIFICATION
-- ============================================================================
DO $$
DECLARE
    original_count INTEGER;
    new_count INTEGER;
    group_id UUID;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION';
    RAISE NOTICE '========================================';
    
    -- Get the group ID
    SELECT todo_group_id INTO group_id
    FROM todos
    WHERE todo_group_id IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Count originals
    SELECT COUNT(*) INTO original_count
    FROM test_assignees_backup;
    
    -- Count new
    SELECT COUNT(*) INTO new_count
    FROM todos
    WHERE todo_group_id = group_id;
    
    RAISE NOTICE 'Original assignees: %', original_count;
    RAISE NOTICE 'New To-Dos created: %', new_count;
    
    IF original_count = new_count THEN
        RAISE NOTICE '✓ COUNT MATCH';
    ELSE
        RAISE WARNING '✗ COUNT MISMATCH';
    END IF;
    
    -- Show new To-Dos
    RAISE NOTICE '';
    RAISE NOTICE 'New To-Dos created:';
    FOR group_id IN
        SELECT 
            t.id,
            u.first_name || ' ' || u.last_name as assigned_to,
            t.status,
            t.completed_at
        FROM todos t
        JOIN users u ON t.assigned_to_id = u.id
        WHERE t.todo_group_id = (
            SELECT todo_group_id FROM todos 
            WHERE todo_group_id IS NOT NULL 
            ORDER BY created_at DESC 
            LIMIT 1
        )
    LOOP
        RAISE NOTICE '  - %: % (completed: %)', 
            group_id.assigned_to, 
            group_id.status,
            group_id.completed_at;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Check the UI - verify To-Dos appear correctly';
    RAISE NOTICE '2. Check completion status matches';
    RAISE NOTICE '3. If good, run the soft delete (below)';
    RAISE NOTICE '4. If bad, run the rollback (below)';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 5: SOFT DELETE ORIGINAL (Run after UI verification)
-- ============================================================================
-- UNCOMMENT AFTER VERIFYING IN UI
/*
UPDATE todos 
SET deleted_at = NOW()
WHERE id IN (SELECT id FROM test_todo_backup);

SELECT 'Original To-Do soft-deleted' as status;
*/

-- ============================================================================
-- ROLLBACK (If something went wrong)
-- ============================================================================
-- UNCOMMENT TO ROLLBACK
/*
-- Delete new To-Dos
DELETE FROM todos 
WHERE todo_group_id IN (
    SELECT DISTINCT todo_group_id 
    FROM todos 
    WHERE title LIKE '%Copilot available for all users%'
      AND todo_group_id IS NOT NULL
);

-- Restore original
UPDATE todos
SET deleted_at = NULL
WHERE id IN (SELECT id FROM test_todo_backup);

SELECT 'Migration rolled back' as status;
*/

-- ============================================================================
-- CLEANUP (After confirming everything works)
-- ============================================================================
-- UNCOMMENT AFTER 24-48 HOURS
/*
DROP TABLE IF EXISTS test_todo_backup;
DROP TABLE IF EXISTS test_assignees_backup;

SELECT 'Test backup tables dropped' as status;
*/
