-- Add is_leadership_team column to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_leadership_team BOOLEAN DEFAULT FALSE;

-- Update existing Leadership Teams to have is_leadership_team = true
UPDATE teams 
SET is_leadership_team = TRUE 
WHERE LOWER(name) = 'leadership team' 
   OR id = '00000000-0000-0000-0000-000000000000';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_teams_is_leadership_team ON teams(is_leadership_team);

-- Update any teams that were created with department_id = NULL to be leadership teams
-- (these are likely leadership teams created before departments were added)
UPDATE teams 
SET is_leadership_team = TRUE 
WHERE department_id IS NULL 
  AND organization_id IS NOT NULL
  AND is_leadership_team = FALSE;