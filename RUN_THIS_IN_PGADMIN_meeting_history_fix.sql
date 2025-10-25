-- =====================================================
-- MEETING HISTORY FIX - RUN THIS IN PGADMIN
-- Date: 2025-10-25
-- Purpose: Create missing meeting_snapshots table and backfill data
-- =====================================================

-- STEP 1: Create the missing meeting_snapshots table
CREATE TABLE IF NOT EXISTS meeting_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    meeting_type VARCHAR(50),
    meeting_date TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    average_rating NUMERIC(3,1),
    facilitator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    snapshot_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_snapshots_org ON meeting_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_meeting_snapshots_team ON meeting_snapshots(team_id);
CREATE INDEX IF NOT EXISTS idx_meeting_snapshots_date ON meeting_snapshots(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_snapshots_type ON meeting_snapshots(meeting_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_snapshots_meeting_unique ON meeting_snapshots(meeting_id) WHERE meeting_id IS NOT NULL;

-- Add documentation
COMMENT ON TABLE meeting_snapshots IS 'Archived meeting history with full snapshot data';
COMMENT ON COLUMN meeting_snapshots.snapshot_data IS 'JSONB containing: issues, todos, headlines, notes, attendees, etc.';

-- STEP 2: Fix any stuck meetings (optional - only if you have stuck meetings)
UPDATE meetings 
SET status = 'completed',
    actual_end_time = COALESCE(actual_end_time, actual_start_time + INTERVAL '90 minutes'),
    updated_at = NOW()
WHERE status = 'in-progress' 
  AND actual_start_time < NOW() - INTERVAL '24 hours'
  AND actual_end_time IS NULL;

-- STEP 3: Backfill snapshots for existing completed meetings
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

-- STEP 4: Verify the fix worked
SELECT 
  'Table created successfully!' as status,
  COUNT(*) as total_snapshots,
  COUNT(DISTINCT organization_id) as organizations_with_history,
  COUNT(DISTINCT team_id) as teams_with_history
FROM meeting_snapshots;

-- Show recent snapshots
SELECT 
  ms.id,
  ms.meeting_type,
  ms.meeting_date,
  ms.duration_minutes,
  ms.average_rating,
  t.name as team_name,
  ms.created_at
FROM meeting_snapshots ms
LEFT JOIN teams t ON ms.team_id = t.id
ORDER BY ms.created_at DESC
LIMIT 10;

-- =====================================================
-- DONE! The Meeting History page should now work.
-- Navigate to the Meeting History page to verify.
-- =====================================================