-- Migration: Add individual completion tracking to todo_assignees
-- Purpose: Allow each assignee to independently mark their copy of a todo as complete
-- Author: AXP Development Team
-- Date: 2025-11-04

-- Add completion tracking fields to todo_assignees table
ALTER TABLE todo_assignees
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for querying completed assignments
CREATE INDEX IF NOT EXISTS idx_todo_assignees_completed ON todo_assignees(completed);

COMMENT ON COLUMN todo_assignees.completed IS 'Whether this specific assignee has completed their copy of the todo';
COMMENT ON COLUMN todo_assignees.completed_at IS 'When this assignee marked the todo as complete';

-- Note: The main todos.status field will now represent the overall status:
-- - 'incomplete' if ANY assignee has not completed
-- - 'complete' only when ALL assignees have completed
-- - 'cancelled' if the todo is cancelled (affects all assignees)

