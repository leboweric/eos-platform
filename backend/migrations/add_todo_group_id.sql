-- Migration: Add todo_group_id column to todos table
-- Purpose: Support grouped To-Dos where multiple independent records are created for multi-assignee To-Dos
-- Date: 2025-11-09

-- Add todo_group_id column to link related To-Dos created together
ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS todo_group_id UUID;

-- Add index for faster grouping queries
CREATE INDEX IF NOT EXISTS idx_todos_group_id ON todos(todo_group_id);

-- Add index for queries that filter by both group_id and assigned_to
CREATE INDEX IF NOT EXISTS idx_todos_group_assigned ON todos(todo_group_id, assigned_to_id);

-- Note: We are NOT removing is_multi_assignee or todo_assignees table yet
-- This allows for gradual migration and rollback if needed
-- After migration is complete and tested, we can:
-- 1. DROP TABLE todo_assignees;
-- 2. ALTER TABLE todos DROP COLUMN is_multi_assignee;
