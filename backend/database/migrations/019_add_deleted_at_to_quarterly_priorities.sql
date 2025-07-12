-- Add deleted_at column to quarterly_priorities table for soft deletes
ALTER TABLE quarterly_priorities
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance when querying non-deleted records
CREATE INDEX IF NOT EXISTS idx_quarterly_priorities_deleted_at 
ON quarterly_priorities(deleted_at) 
WHERE deleted_at IS NULL;