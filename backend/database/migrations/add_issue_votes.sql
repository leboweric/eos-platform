-- Add voting functionality to issues
-- This allows team members to vote on issues during Weekly Accountability Meetings

-- Create issue_votes table
CREATE TABLE IF NOT EXISTS issue_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Ensure a user can only vote once per issue
    UNIQUE(issue_id, user_id)
);

-- Add index for performance
CREATE INDEX idx_issue_votes_issue_id ON issue_votes(issue_id);
CREATE INDEX idx_issue_votes_user_id ON issue_votes(user_id);

-- Add vote_count to issues table for performance (denormalized)
ALTER TABLE issues ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0;

-- Function to update vote count
CREATE OR REPLACE FUNCTION update_issue_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE issues SET vote_count = vote_count + 1 WHERE id = NEW.issue_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE issues SET vote_count = vote_count - 1 WHERE id = OLD.issue_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to maintain vote count
DROP TRIGGER IF EXISTS update_issue_vote_count_trigger ON issue_votes;
CREATE TRIGGER update_issue_vote_count_trigger
AFTER INSERT OR DELETE ON issue_votes
FOR EACH ROW
EXECUTE FUNCTION update_issue_vote_count();

-- Update existing issues with current vote count
UPDATE issues 
SET vote_count = (
    SELECT COUNT(*) 
    FROM issue_votes 
    WHERE issue_votes.issue_id = issues.id
);