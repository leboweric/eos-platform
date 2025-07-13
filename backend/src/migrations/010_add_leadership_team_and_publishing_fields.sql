-- Add leadership team flag and publishing fields
-- This migration adds:
-- 1. is_leadership_team boolean to teams table
-- 2. Publishing fields to quarterly_priorities, scorecard_metrics, issues, and todos tables

BEGIN;

-- 1. Add is_leadership_team to teams table
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS is_leadership_team BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN teams.is_leadership_team IS 'Indicates if this team is a leadership team';

-- 2. Add publishing fields to quarterly_priorities
ALTER TABLE quarterly_priorities
ADD COLUMN IF NOT EXISTS is_published_to_departments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id);

-- Add comments for documentation
COMMENT ON COLUMN quarterly_priorities.is_published_to_departments IS 'Whether this priority is visible to department teams';
COMMENT ON COLUMN quarterly_priorities.published_at IS 'Timestamp when the priority was published';
COMMENT ON COLUMN quarterly_priorities.published_by IS 'User who published the priority';

-- 3. Add publishing fields to scorecard_metrics
ALTER TABLE scorecard_metrics
ADD COLUMN IF NOT EXISTS is_published_to_departments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id);

-- Add comments for documentation
COMMENT ON COLUMN scorecard_metrics.is_published_to_departments IS 'Whether this metric is visible to department teams';
COMMENT ON COLUMN scorecard_metrics.published_at IS 'Timestamp when the metric was published';
COMMENT ON COLUMN scorecard_metrics.published_by IS 'User who published the metric';

-- 4. Add publishing fields to issues
ALTER TABLE issues
ADD COLUMN IF NOT EXISTS is_published_to_departments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id);

-- Add comments for documentation
COMMENT ON COLUMN issues.is_published_to_departments IS 'Whether this issue is visible to department teams';
COMMENT ON COLUMN issues.published_at IS 'Timestamp when the issue was published';
COMMENT ON COLUMN issues.published_by IS 'User who published the issue';

-- 5. Add publishing fields to todos
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS is_published_to_departments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id);

-- Add comments for documentation
COMMENT ON COLUMN todos.is_published_to_departments IS 'Whether this todo is visible to department teams';
COMMENT ON COLUMN todos.published_at IS 'Timestamp when the todo was published';
COMMENT ON COLUMN todos.published_by IS 'User who published the todo';

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_teams_is_leadership_team ON teams(is_leadership_team) WHERE is_leadership_team = true;
CREATE INDEX IF NOT EXISTS idx_quarterly_priorities_published ON quarterly_priorities(is_published_to_departments, published_at);
CREATE INDEX IF NOT EXISTS idx_scorecard_metrics_published ON scorecard_metrics(is_published_to_departments, published_at);
CREATE INDEX IF NOT EXISTS idx_issues_published ON issues(is_published_to_departments, published_at);
CREATE INDEX IF NOT EXISTS idx_todos_published ON todos(is_published_to_departments, published_at);

-- Set published_at for existing records that have is_published_to_departments = true
-- This ensures backward compatibility
UPDATE quarterly_priorities 
SET published_at = created_at 
WHERE is_published_to_departments = true AND published_at IS NULL;

UPDATE scorecard_metrics 
SET published_at = created_at 
WHERE is_published_to_departments = true AND published_at IS NULL;

UPDATE issues 
SET published_at = created_at 
WHERE is_published_to_departments = true AND published_at IS NULL;

UPDATE todos 
SET published_at = created_at 
WHERE is_published_to_departments = true AND published_at IS NULL;

COMMIT;