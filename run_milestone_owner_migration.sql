-- Migration to add milestone owner functionality
-- Run this in pgAdmin to allow milestones to have different owners than the Rock

-- 1. Add the owner_id column to priority_milestones
ALTER TABLE priority_milestones 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);

-- 2. Add display_order for milestone ordering
ALTER TABLE priority_milestones
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 3. Add status field for better tracking
ALTER TABLE priority_milestones
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'not_started';

-- Add constraint for status values
ALTER TABLE priority_milestones
DROP CONSTRAINT IF EXISTS priority_milestones_status_check;

ALTER TABLE priority_milestones
ADD CONSTRAINT priority_milestones_status_check 
CHECK (status IN ('not_started', 'in_progress', 'completed', 'at_risk'));

-- 4. Add completed_at timestamp
ALTER TABLE priority_milestones
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_priority_milestones_owner 
ON priority_milestones(owner_id);

-- 6. Update existing milestones to set owner_id to the Rock owner (one-time update)
UPDATE priority_milestones pm
SET owner_id = qp.owner_id
FROM quarterly_priorities qp
WHERE pm.priority_id = qp.id
  AND pm.owner_id IS NULL;

-- 7. Add helpful comments
COMMENT ON COLUMN priority_milestones.owner_id IS 'The user responsible for this milestone. Can be different from the Rock owner.';
COMMENT ON COLUMN priority_milestones.status IS 'Current status of the milestone: not_started, in_progress, completed, or at_risk';
COMMENT ON COLUMN priority_milestones.display_order IS 'Order in which milestones should be displayed';
COMMENT ON COLUMN priority_milestones.completed_at IS 'Timestamp when the milestone was marked as completed';

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'priority_milestones'
ORDER BY ordinal_position;

-- Show sample data with new columns
SELECT 
    pm.id,
    pm.title,
    pm.owner_id,
    u.first_name || ' ' || u.last_name as owner_name,
    pm.status,
    pm.completed,
    pm.completed_at,
    pm.display_order
FROM priority_milestones pm
LEFT JOIN users u ON pm.owner_id = u.id
LIMIT 5;