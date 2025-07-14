-- Migration: Redesign for Ninety.io model
-- Remove publishing concept and simplify to team-based data

-- 1. Remove publishing columns from quarterly_priorities
ALTER TABLE quarterly_priorities DROP COLUMN IF EXISTS is_published_to_departments;
ALTER TABLE quarterly_priorities DROP COLUMN IF EXISTS published_at;
ALTER TABLE quarterly_priorities DROP COLUMN IF EXISTS published_by;

-- 2. Remove company priority concept (priorities just belong to teams)
ALTER TABLE quarterly_priorities DROP COLUMN IF EXISTS is_company_priority;

-- 3. Remove publishing columns from issues
ALTER TABLE issues DROP COLUMN IF EXISTS is_published_to_departments;
ALTER TABLE issues DROP COLUMN IF EXISTS published_at;
ALTER TABLE issues DROP COLUMN IF EXISTS published_by;

-- 4. Remove publishing columns from todos
ALTER TABLE todos DROP COLUMN IF EXISTS is_published_to_departments;
ALTER TABLE todos DROP COLUMN IF EXISTS published_at;
ALTER TABLE todos DROP COLUMN IF EXISTS published_by;

-- 5. Ensure teams table has leadership designation
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_leadership_team BOOLEAN DEFAULT FALSE;

-- 6. Set Leadership Team flag
UPDATE teams SET is_leadership_team = TRUE 
WHERE id = '00000000-0000-0000-0000-000000000000';

-- 7. Set all other teams as non-leadership
UPDATE teams SET is_leadership_team = FALSE 
WHERE id != '00000000-0000-0000-0000-000000000000';

-- Add comments for clarity
COMMENT ON TABLE quarterly_priorities IS 'Ninety.io model: Team-based priorities with cross-visibility';
COMMENT ON TABLE issues IS 'Ninety.io model: Team-based issues with cross-visibility';
COMMENT ON TABLE todos IS 'Ninety.io model: Team-based todos with cross-visibility';