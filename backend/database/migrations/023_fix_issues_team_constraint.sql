-- Make team_id nullable for issues table
-- This allows issues to be created without a specific team
ALTER TABLE issues 
DROP CONSTRAINT IF EXISTS issues_team_id_fkey;

-- Make team_id nullable
ALTER TABLE issues 
ALTER COLUMN team_id DROP NOT NULL;

-- Add the foreign key back but allow NULL values
ALTER TABLE issues
ADD CONSTRAINT issues_team_id_fkey 
FOREIGN KEY (team_id) 
REFERENCES teams(id) 
ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN issues.team_id IS 'Optional team association for the issue. NULL means organization-wide issue.';