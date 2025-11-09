-- ============================================================================
-- Multi-Assignee To-Do Migration Script
-- ============================================================================
-- Purpose: Convert multi-assignee To-Dos to separate independent records
-- Safety: Creates backups, soft deletes originals, includes rollback plan
-- ============================================================================

-- ============================================================================
-- STEP 1: ANALYSIS - Count affected records
-- ============================================================================
DO $$
DECLARE
    multi_assignee_count INTEGER;
    assignee_count INTEGER;
BEGIN
    -- Count multi-assignee To-Dos that need migration (exclude those already migrated)
    SELECT COUNT(*) INTO multi_assignee_count 
    FROM todos t
    WHERE t.is_multi_assignee = true 
      AND t.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM todos t2 
          WHERE t2.title = t.title 
            AND t2.todo_group_id IS NOT NULL
            AND t2.created_at >= t.created_at - INTERVAL '1 day'
            AND t2.created_at <= t.created_at + INTERVAL '1 day'
      );
    
    SELECT COUNT(*) INTO assignee_count 
    FROM todo_assignees ta
    JOIN todos t ON ta.todo_id = t.id
    WHERE t.is_multi_assignee = true AND t.deleted_at IS NULL;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION ANALYSIS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Multi-assignee To-Dos to migrate: %', multi_assignee_count;
    RAISE NOTICE 'Total assignee records: %', assignee_count;
    RAISE NOTICE 'New To-Dos to be created: %', assignee_count;
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 2: BACKUP - Create safety backups
-- ============================================================================
-- Backup multi-assignee To-Dos
DROP TABLE IF EXISTS todos_backup_pre_migration;
CREATE TABLE todos_backup_pre_migration AS 
SELECT * FROM todos WHERE is_multi_assignee = true AND deleted_at IS NULL;

-- Backup todo_assignees
DROP TABLE IF EXISTS todo_assignees_backup;
CREATE TABLE todo_assignees_backup AS 
SELECT * FROM todo_assignees;

-- Verify backups
DO $$
DECLARE
    backup_todos_count INTEGER;
    backup_assignees_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_todos_count FROM todos_backup_pre_migration;
    SELECT COUNT(*) INTO backup_assignees_count FROM todo_assignees_backup;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'BACKUP VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Backed up To-Dos: %', backup_todos_count;
    RAISE NOTICE 'Backed up assignees: %', backup_assignees_count;
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 3: MIGRATION - Convert to separate records
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
    RAISE NOTICE 'STARTING MIGRATION';
    RAISE NOTICE '========================================';
    
    -- Loop through each multi-assignee To-Do
    -- IMPORTANT: Only migrate if no separate records already exist (prevent duplicates)
    FOR todo_record IN 
        SELECT t.* FROM todos t
        WHERE t.is_multi_assignee = true 
          AND t.deleted_at IS NULL
          -- Skip if separate records already created (todo_group_id would exist)
          AND NOT EXISTS (
              SELECT 1 FROM todos t2 
              WHERE t2.title = t.title 
                AND t2.todo_group_id IS NOT NULL
                AND t2.created_at >= t.created_at - INTERVAL '1 day'
                AND t2.created_at <= t.created_at + INTERVAL '1 day'
          )
        ORDER BY created_at
    LOOP
        -- Generate new group ID for this To-Do
        new_group_id := gen_random_uuid();
        
        RAISE NOTICE 'Migrating To-Do: % (ID: %)', todo_record.title, todo_record.id;
        RAISE NOTICE '  New group ID: %', new_group_id;
        
        -- Loop through each assignee
        FOR assignee_record IN 
            SELECT * FROM todo_assignees 
            WHERE todo_id = todo_record.id
        LOOP
            -- Generate new ID for this individual To-Do
            new_todo_id := gen_random_uuid();
            
            -- Create new To-Do record for this assignee
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
                assignee_record.user_id,  -- Individual assignee
                todo_record.owner_id,
                todo_record.team_id,
                todo_record.organization_id,
                todo_record.department_id,
                todo_record.related_priority_id,
                todo_record.meeting_id,
                todo_record.archived,
                new_group_id,  -- Link all together
                false,  -- No longer multi-assignee
                todo_record.created_at,
                COALESCE(assignee_record.updated_at, todo_record.updated_at, NOW()),
                assignee_record.completed_at
            );
            
            migrated_count := migrated_count + 1;
            
            RAISE NOTICE '  Created To-Do for user % (completed: %)', 
                assignee_record.user_id, assignee_record.completed;
        END LOOP;
        
        RAISE NOTICE '  Completed migration for: %', todo_record.title;
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total new To-Dos created: %', migrated_count;
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 4: VERIFICATION - Ensure data integrity
-- ============================================================================
DO $$
DECLARE
    original_assignee_count INTEGER;
    new_todos_count INTEGER;
    completed_match BOOLEAN;
BEGIN
    -- Count original assignees
    SELECT COUNT(*) INTO original_assignee_count 
    FROM todo_assignees ta
    JOIN todos_backup_pre_migration t ON ta.todo_id = t.id;
    
    -- Count new To-Dos created
    SELECT COUNT(*) INTO new_todos_count 
    FROM todos 
    WHERE todo_group_id IS NOT NULL;
    
    -- Verify counts match
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Original assignees: %', original_assignee_count;
    RAISE NOTICE 'New To-Dos created: %', new_todos_count;
    
    IF original_assignee_count = new_todos_count THEN
        RAISE NOTICE '✓ COUNT MATCH - Migration successful!';
    ELSE
        RAISE WARNING '✗ COUNT MISMATCH - Review migration!';
        RAISE WARNING 'Difference: %', ABS(original_assignee_count - new_todos_count);
    END IF;
    
    -- Verify completion status preserved
    SELECT 
        COUNT(*) = 0 INTO completed_match
    FROM (
        SELECT 
            ta.user_id,
            ta.todo_id,
            ta.completed as original_completed,
            t_new.status as new_status
        FROM todo_assignees ta
        JOIN todos_backup_pre_migration t_old ON ta.todo_id = t_old.id
        JOIN todos t_new ON t_new.assigned_to_id = ta.user_id 
            AND t_new.title = t_old.title 
            AND t_new.todo_group_id IS NOT NULL
        WHERE 
            (ta.completed = true AND t_new.status != 'complete')
            OR (ta.completed = false AND t_new.status = 'complete')
    ) mismatches;
    
    IF completed_match THEN
        RAISE NOTICE '✓ COMPLETION STATUS PRESERVED';
    ELSE
        RAISE WARNING '✗ COMPLETION STATUS MISMATCH - Review data!';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 5: SOFT DELETE ORIGINALS (After verification passes)
-- ============================================================================
-- UNCOMMENT AFTER VERIFYING MIGRATION SUCCESS
/*
UPDATE todos 
SET deleted_at = NOW(), 
    updated_at = NOW()
WHERE is_multi_assignee = true 
  AND deleted_at IS NULL;

RAISE NOTICE 'Original multi-assignee To-Dos soft-deleted';
*/

-- ============================================================================
-- ROLLBACK PLAN (In case of issues)
-- ============================================================================
-- ONLY RUN IF MIGRATION FAILS
/*
-- Delete migrated records
DELETE FROM todos WHERE todo_group_id IS NOT NULL;

-- Restore original To-Dos
INSERT INTO todos 
SELECT * FROM todos_backup_pre_migration;

-- Restore assignees
DELETE FROM todo_assignees;
INSERT INTO todo_assignees 
SELECT * FROM todo_assignees_backup;

RAISE NOTICE 'Migration rolled back successfully';
*/

-- ============================================================================
-- CLEANUP (Run after 24-48 hours of successful operation)
-- ============================================================================
-- ONLY RUN AFTER CONFIRMING EVERYTHING WORKS
/*
DROP TABLE IF EXISTS todos_backup_pre_migration;
DROP TABLE IF EXISTS todo_assignees_backup;

RAISE NOTICE 'Backup tables dropped';
*/
