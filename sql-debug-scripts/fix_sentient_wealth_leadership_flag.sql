-- Fix the is_leadership_team flag for Sentient Wealth Leadership Team
-- Organization ID: 98b2f3ef-2e46-4120-aa05-851ca73ef755
-- Leadership Team ID: 73bb1c88-7541-4380-b96b-a4efbaa933d2

-- 1. Check current status before update
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.department_id,
    d.name as department_name,
    t.is_leadership_team,
    t.organization_id
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
WHERE t.id = '73bb1c88-7541-4380-b96b-a4efbaa933d2';

-- 2. Update the is_leadership_team flag to true
UPDATE teams
SET is_leadership_team = true,
    updated_at = NOW()
WHERE id = '73bb1c88-7541-4380-b96b-a4efbaa933d2'
  AND organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755';

-- 3. Verify the update was successful
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.department_id,
    d.name as department_name,
    t.is_leadership_team,
    t.updated_at
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
WHERE t.id = '73bb1c88-7541-4380-b96b-a4efbaa933d2';

-- 4. Show all teams in Sentient Wealth to confirm only one has is_leadership_team = true
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.department_id,
    d.name as department_name,
    t.is_leadership_team
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
WHERE t.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
ORDER BY t.is_leadership_team DESC, t.name;