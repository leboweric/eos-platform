# Multi-Assignee To-Do Migration Plan

## Goal
Convert existing multi-assignee To-Dos (using `is_multi_assignee` flag and `todo_assignees` junction table) to the new separate-records approach (using `todo_group_id`).

## Current State

### Old Approach (What We're Migrating From):
```
todos table:
| id    | title             | is_multi_assignee | assigned_to_id |
|-------|-------------------|-------------------|----------------|
| todo1 | Review Q4 budget  | true              | NULL           |

todo_assignees table:
| todo_id | user_id | completed | completed_at |
|---------|---------|-----------|--------------|
| todo1   | user1   | true      | 2025-11-08   |
| todo1   | user2   | false     | NULL         |
| todo1   | user3   | false     | NULL         |
```

### New Approach (What We're Migrating To):
```
todos table:
| id     | title             | assigned_to_id | todo_group_id | status   |
|--------|-------------------|----------------|---------------|----------|
| new1   | Review Q4 budget  | user1          | group-123     | complete |
| new2   | Review Q4 budget  | user2          | group-123     | incomplete |
| new3   | Review Q4 budget  | user3          | group-123     | incomplete |
```

## Data Preservation Requirements

### ✅ Must Preserve:
1. **Title, description, due_date, priority** - Copy to each new record
2. **Individual completion status** - From `todo_assignees.completed`
3. **Completion timestamp** - From `todo_assignees.completed_at`
4. **Owner** - Original creator (`owner_id`)
5. **Team/Department** - `team_id`
6. **Related Priority** - `related_priority_id` (if linked to a Rock)
7. **Meeting session** - `meeting_id` (if created in a meeting)
8. **Archived status** - `archived`
9. **Created/Updated timestamps** - `created_at`, `updated_at`

### 🔗 Must Create:
1. **New `todo_group_id`** - Same UUID for all records from one original To-Do
2. **Individual `assigned_to_id`** - From `todo_assignees.user_id`
3. **Individual `status`** - Based on `todo_assignees.completed`

## Migration Strategy

### Phase 1: Identify
```sql
SELECT COUNT(*) FROM todos WHERE is_multi_assignee = true AND deleted_at IS NULL;
```

### Phase 2: Backup
```sql
-- Create backup table
CREATE TABLE todos_backup_pre_migration AS SELECT * FROM todos WHERE is_multi_assignee = true;
CREATE TABLE todo_assignees_backup AS SELECT * FROM todo_assignees;
```

### Phase 3: Migrate
For each multi-assignee To-Do:
1. Generate new `todo_group_id`
2. For each assignee in `todo_assignees`:
   - Create new To-Do record
   - Copy all fields from original
   - Set `assigned_to_id` = assignee's `user_id`
   - Set `status` = 'complete' if `completed = true`, else 'incomplete'
   - Set `todo_group_id` = generated group ID
   - Set `is_multi_assignee` = false

### Phase 4: Verify
```sql
-- Count should match
SELECT COUNT(*) FROM todo_assignees WHERE todo_id IN (SELECT id FROM todos WHERE is_multi_assignee = true);
-- Should equal
SELECT COUNT(*) FROM todos WHERE todo_group_id IS NOT NULL;
```

### Phase 5: Cleanup (After Verification)
```sql
-- Soft delete original multi-assignee To-Dos
UPDATE todos SET deleted_at = NOW() WHERE is_multi_assignee = true;

-- Optional: Drop old tables (ONLY after confirming migration success)
-- DROP TABLE todo_assignees;
-- ALTER TABLE todos DROP COLUMN is_multi_assignee;
```

## Rollback Plan

If migration fails:
```sql
-- Restore from backup
DELETE FROM todos WHERE todo_group_id IS NOT NULL;
INSERT INTO todos SELECT * FROM todos_backup_pre_migration;
```

## Safety Checks

1. ✅ Backup created before migration
2. ✅ Original records soft-deleted (not hard-deleted)
3. ✅ Verification queries before cleanup
4. ✅ Rollback plan documented
5. ✅ Test on sample data first

## Execution Checklist

- [ ] Run analysis query to count affected To-Dos
- [ ] Create backup tables
- [ ] Run migration script
- [ ] Verify record counts match
- [ ] Verify completion status preserved
- [ ] Test frontend display
- [ ] Soft delete originals
- [ ] Monitor for 24-48 hours
- [ ] Drop backup tables (after confirmation)
