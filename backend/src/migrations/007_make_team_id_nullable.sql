-- Make team_id nullable in business_blueprints table
-- This allows organization-level blueprints without requiring teams

BEGIN;

-- Make team_id nullable in business_blueprints (formerly vtos)
ALTER TABLE business_blueprints 
ALTER COLUMN team_id DROP NOT NULL;

-- Add a check constraint to ensure either team_id or department_id is set, but not both
-- and allow both to be null for organization-level blueprints
ALTER TABLE business_blueprints
DROP CONSTRAINT IF EXISTS check_team_or_department;

ALTER TABLE business_blueprints
ADD CONSTRAINT check_team_or_department 
CHECK (
    (team_id IS NULL AND department_id IS NULL) OR  -- Organization level
    (team_id IS NOT NULL AND department_id IS NULL) OR  -- Team level
    (team_id IS NULL AND department_id IS NOT NULL)  -- Department level
);

COMMIT;