-- Migration: Add archived field to todo_assignees
-- Purpose: Allow each assignee's copy to be archived independently
-- Author: AXP Development Team
-- Date: 2025-11-04

-- Add archived field to todo_assignees table
ALTER TABLE todo_assignees
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Create index for querying archived assignments
CREATE INDEX IF NOT EXISTS idx_todo_assignees_archived ON todo_assignees(archived);

COMMENT ON COLUMN todo_assignees.archived IS 'Whether this specific assignee has archived their copy of the todo';
COMMENT ON COLUMN todo_assignees.archived_at IS 'When this assignee archived the todo';

-- Note: For multi-assignee todos, each assignee can archive their own copy independently
-- This allows Ann to archive her completed copy while Jason's copy remains visible to him

