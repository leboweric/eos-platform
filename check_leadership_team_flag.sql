-- Check if Leadership Team has special flags or settings

-- 1. Check all team properties
SELECT * FROM teams WHERE id = '47d53797-be5f-49c2-883a-326a401a17c1';

-- 2. Check if there's an is_leadership_team flag
SELECT 
    column_name,
    data_type 
FROM information_schema.columns 
WHERE table_name = 'teams' 
ORDER BY ordinal_position;

-- 3. Compare Leadership Team with any other teams
SELECT 
    id,
    name,
    organization_id,
    department_id,
    CASE 
        WHEN name LIKE '%Leadership%' THEN 'Yes'
        ELSE 'No'
    END as appears_to_be_leadership
FROM teams
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit');

-- 4. POTENTIAL FIX: Create a regular team for all users
-- This would be a non-leadership team where the Dashboard might work normally
/*
INSERT INTO teams (id, organization_id, department_id, name)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM organizations WHERE name = 'Skykit'),
    '0a45c91c-4511-4525-b62a-4a4b7e19a03d',  -- Same department
    'Skykit Team'  -- Regular team name
);
*/