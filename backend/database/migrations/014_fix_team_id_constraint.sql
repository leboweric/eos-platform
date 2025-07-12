-- Fix team_id constraint issue
-- Option 1: Make team_id nullable (recommended)
ALTER TABLE quarterly_priorities 
ALTER COLUMN team_id DROP NOT NULL;

-- Option 2: Create a default team for each organization (if you prefer to keep team_id required)
-- INSERT INTO teams (id, organization_id, name, description)
-- SELECT 
--     '00000000-0000-0000-0000-000000000000',
--     o.id,
--     'Default Team',
--     'Default team for organization'
-- FROM organizations o
-- WHERE NOT EXISTS (
--     SELECT 1 FROM teams t 
--     WHERE t.id = '00000000-0000-0000-0000-000000000000' 
--     AND t.organization_id = o.id
-- );