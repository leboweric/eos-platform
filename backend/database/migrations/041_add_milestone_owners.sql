-- Add owner_id field to priority_milestones to allow assigning milestones to different users
-- This allows milestones to be owned by someone other than the Rock owner

-- Add the owner_id column
ALTER TABLE priority_milestones 
ADD COLUMN owner_id UUID REFERENCES users(id);

-- Add display_order for milestone ordering
ALTER TABLE priority_milestones
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Add status field for better tracking
ALTER TABLE priority_milestones
ADD COLUMN status VARCHAR(50) DEFAULT 'not_started' 
CHECK (status IN ('not_started', 'in_progress', 'completed', 'at_risk'));

-- Add completed_at timestamp
ALTER TABLE priority_milestones
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance
CREATE INDEX idx_priority_milestones_owner 
ON priority_milestones(owner_id);

-- Update existing milestones to set owner_id to the Rock owner
UPDATE priority_milestones pm
SET owner_id = qp.owner_id
FROM quarterly_priorities qp
WHERE pm.priority_id = qp.id
  AND pm.owner_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN priority_milestones.owner_id IS 'The user responsible for this milestone. Can be different from the Rock owner.';
COMMENT ON COLUMN priority_milestones.status IS 'Current status of the milestone: not_started, in_progress, completed, or at_risk';
COMMENT ON COLUMN priority_milestones.display_order IS 'Order in which milestones should be displayed';
COMMENT ON COLUMN priority_milestones.completed_at IS 'Timestamp when the milestone was marked as completed';