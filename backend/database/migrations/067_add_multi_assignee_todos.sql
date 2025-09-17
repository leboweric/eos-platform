-- Migration: Add multi-person assignment support for todos
-- Purpose: Allow todos to be assigned to multiple people
-- Author: AXP Development Team  
-- Date: 2024-12-17

-- Create junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS todo_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  
  -- Ensure no duplicate assignments
  UNIQUE(todo_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_todo_assignees_todo_id ON todo_assignees(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_assignees_user_id ON todo_assignees(user_id);

-- Migrate existing single assignments to the new table
-- This preserves all existing assignments
INSERT INTO todo_assignees (todo_id, user_id, assigned_by)
SELECT 
  id as todo_id,
  assigned_to_id as user_id,
  owner_id as assigned_by
FROM todos
WHERE assigned_to_id IS NOT NULL
ON CONFLICT (todo_id, user_id) DO NOTHING;

-- Add is_multi_assignee flag to todos table to track which todos use multi-assignment
ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS is_multi_assignee BOOLEAN DEFAULT FALSE;

-- Mark todos as multi-assignee if they already have assignments in the new table
UPDATE todos 
SET is_multi_assignee = TRUE
WHERE id IN (SELECT DISTINCT todo_id FROM todo_assignees);

COMMENT ON TABLE todo_assignees IS 'Junction table for multi-person todo assignments';
COMMENT ON COLUMN todo_assignees.todo_id IS 'The todo being assigned';
COMMENT ON COLUMN todo_assignees.user_id IS 'The user the todo is assigned to';
COMMENT ON COLUMN todo_assignees.assigned_at IS 'When this assignment was made';
COMMENT ON COLUMN todo_assignees.assigned_by IS 'Who made this assignment';
COMMENT ON COLUMN todos.is_multi_assignee IS 'Whether this todo uses multi-person assignment';

-- Note: We're keeping the original assigned_to_id column for backward compatibility
-- New multi-assignee todos will have assigned_to_id = NULL and use the junction table instead