-- Fix the Leadership Team flag

-- 1. Set is_leadership_team to true for the Leadership Team
UPDATE teams
SET is_leadership_team = true
WHERE id = '47d53797-be5f-49c2-883a-326a401a17c1';

-- 2. Verify the fix
SELECT 
    id,
    name,
    is_leadership_team,
    department_id
FROM teams
WHERE id = '47d53797-be5f-49c2-883a-326a401a17c1';

-- 3. After running the update, the Dashboard should work again!