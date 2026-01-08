-- Migration: Add 'cancelled' status to quarterly_priorities
-- This allows users to mark Rocks/Priorities as cancelled instead of just complete/on-track/off-track

-- First, drop the existing check constraint
-- The constraint may be named differently in production (rocks_status_check)
-- so we try both possible names

DO $$ 
BEGIN
    -- Try to drop constraint with name 'rocks_status_check' (production name)
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'quarterly_priorities' 
        AND constraint_name = 'rocks_status_check'
    ) THEN
        ALTER TABLE quarterly_priorities DROP CONSTRAINT rocks_status_check;
        RAISE NOTICE 'Dropped constraint rocks_status_check';
    END IF;
    
    -- Try to drop constraint with auto-generated name pattern
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'quarterly_priorities' 
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE 'quarterly_priorities_status_check%'
    ) THEN
        EXECUTE (
            SELECT 'ALTER TABLE quarterly_priorities DROP CONSTRAINT ' || constraint_name
            FROM information_schema.table_constraints 
            WHERE table_name = 'quarterly_priorities' 
            AND constraint_type = 'CHECK'
            AND constraint_name LIKE 'quarterly_priorities_status_check%'
            LIMIT 1
        );
        RAISE NOTICE 'Dropped auto-generated status check constraint';
    END IF;
END $$;

-- Add the new constraint with 'cancelled' included
ALTER TABLE quarterly_priorities 
ADD CONSTRAINT quarterly_priorities_status_check 
CHECK (status IN ('on-track', 'off-track', 'at-risk', 'complete', 'cancelled', 'not_done'));

-- Also update priority_updates table to allow cancelled status change
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'priority_updates' 
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%status_change%'
    ) THEN
        EXECUTE (
            SELECT 'ALTER TABLE priority_updates DROP CONSTRAINT ' || constraint_name
            FROM information_schema.table_constraints 
            WHERE table_name = 'priority_updates' 
            AND constraint_type = 'CHECK'
            AND constraint_name LIKE '%status_change%'
            LIMIT 1
        );
    END IF;
END $$;

-- Add updated constraint for priority_updates
ALTER TABLE priority_updates 
DROP CONSTRAINT IF EXISTS priority_updates_status_change_check;

ALTER TABLE priority_updates 
ADD CONSTRAINT priority_updates_status_change_check 
CHECK (status_change IN ('on-track', 'off-track', 'at-risk', 'complete', 'cancelled', 'not_done'));

COMMENT ON COLUMN quarterly_priorities.status IS 'Status of the priority: on-track, off-track, at-risk, complete, cancelled, not_done';
