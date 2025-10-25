-- Migration: Backfill meeting snapshots for existing completed meetings
-- Date: 2025-10-25
-- Purpose: Create snapshots for meetings that were completed before snapshot feature was added

-- Only run if meeting_snapshots table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meeting_snapshots') THEN
    
    -- Create snapshots for completed meetings that don't have snapshots yet
    INSERT INTO meeting_snapshots 
      (meeting_id, organization_id, team_id, meeting_type, meeting_date, 
       duration_minutes, average_rating, facilitator_id, snapshot_data)
    SELECT 
      m.id,
      m.organization_id,
      m.team_id,
      CASE 
        WHEN m.title ILIKE '%quarterly%' THEN 'Quarterly Planning'
        WHEN m.title ILIKE '%annual%' THEN 'Annual Planning'
        ELSE 'Weekly Accountability'
      END as meeting_type,
      m.scheduled_date,
      CASE 
        WHEN m.actual_end_time IS NOT NULL AND m.actual_start_time IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (m.actual_end_time - m.actual_start_time)) / 60
        ELSE 90 -- Default duration
      END as duration_minutes,
      m.rating,
      m.facilitator_id,
      jsonb_build_object(
        'notes', COALESCE(m.notes, ''),
        'title', m.title,
        'status', m.status,
        'backfilled', true,
        'backfill_date', NOW()::text,
        'issues', '[]'::jsonb,
        'todos', '[]'::jsonb,
        'attendees', '[]'::jsonb
      ) as snapshot_data
    FROM meetings m
    WHERE m.status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM meeting_snapshots ms 
        WHERE ms.meeting_id = m.id
      )
      AND m.organization_id IS NOT NULL
      AND m.team_id IS NOT NULL;

    -- Log the number of backfilled records
    RAISE NOTICE 'Backfilled % meeting snapshots', ROW_COUNT();
    
  ELSE
    RAISE NOTICE 'meeting_snapshots table does not exist. Run 073_create_meeting_snapshots_table.sql first.';
  END IF;
END $$;

-- Update any meetings that are stuck in 'in-progress' status from old test data
UPDATE meetings 
SET status = 'completed',
    actual_end_time = COALESCE(actual_end_time, actual_start_time + INTERVAL '90 minutes'),
    updated_at = NOW()
WHERE status = 'in-progress' 
  AND actual_start_time < NOW() - INTERVAL '24 hours'
  AND actual_end_time IS NULL;

-- Add comment about backfilled data
COMMENT ON COLUMN meeting_snapshots.snapshot_data IS 'JSONB containing: issues, todos, headlines, notes, attendees, etc. Records with backfilled=true were created retroactively.';