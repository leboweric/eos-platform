-- Migration: Add manual_sort flag to issues table
-- Purpose: Distinguish between user-dragged issues and auto-sorted issues
-- Date: 2025-01-08

-- Add manual_sort column (default false for all existing issues)
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS manual_sort BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_issues_manual_sort ON issues(manual_sort);

-- Add comment for documentation
COMMENT ON COLUMN issues.manual_sort IS 'True if user has manually dragged/reordered this issue, false for auto-sorted issues';

