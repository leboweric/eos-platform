-- Script to move all Sentient Wealth items from "No Department" to "Leadership Team Department"
-- Run this script in pgAdmin or your PostgreSQL client

-- 1. First, let's find the Sentient Wealth organization
SELECT id, name FROM organizations WHERE name = 'Sentient Wealth';

-- 2. Find all teams and departments in Sentient Wealth
WITH sentient_org AS (
    SELECT id FROM organizations WHERE name = 'Sentient Wealth'
)
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.department_id,
    d.name as department_name,
    t.is_leadership_team
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
WHERE t.organization_id = (SELECT id FROM sentient_org)
ORDER BY t.is_leadership_team DESC, t.name;

-- 3. Find the Leadership Team in Sentient Wealth
WITH sentient_org AS (
    SELECT id FROM organizations WHERE name = 'Sentient Wealth'
)
SELECT 
    t.id as leadership_team_id,
    t.name,
    t.department_id,
    d.name as department_name
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
WHERE t.organization_id = (SELECT id FROM sentient_org)
    AND t.is_leadership_team = true;

-- 4. Find all items currently in "No Department" (team without department)
-- This will show counts of items that need to be moved

WITH sentient_org AS (
    SELECT id FROM organizations WHERE name = 'Sentient Wealth'
),
no_dept_teams AS (
    SELECT t.id 
    FROM teams t
    WHERE t.organization_id = (SELECT id FROM sentient_org)
        AND (t.department_id IS NULL OR t.name = 'No Department')
)
SELECT 
    'Scorecard Metrics' as item_type,
    COUNT(*) as count
FROM scorecard_metrics sm
WHERE sm.team_id IN (SELECT id FROM no_dept_teams)

UNION ALL

SELECT 
    'Quarterly Priorities' as item_type,
    COUNT(*) as count
FROM quarterly_priorities qp
WHERE qp.team_id IN (SELECT id FROM no_dept_teams)

UNION ALL

SELECT 
    'Issues' as item_type,
    COUNT(*) as count
FROM issues i
WHERE i.team_id IN (SELECT id FROM no_dept_teams)

UNION ALL

SELECT 
    'To-Dos' as item_type,
    COUNT(*) as count
FROM todos td
WHERE td.team_id IN (SELECT id FROM no_dept_teams);

-- 5. Get the Leadership Team ID for Sentient Wealth
-- Save this ID for the update statements below
WITH sentient_org AS (
    SELECT id FROM organizations WHERE name = 'Sentient Wealth'
)
SELECT 
    t.id as leadership_team_id,
    t.name
FROM teams t
WHERE t.organization_id = (SELECT id FROM sentient_org)
    AND t.is_leadership_team = true;

-- ============================================
-- UPDATE STATEMENTS - UNCOMMENT AND RUN THESE AFTER REVIEWING THE ABOVE
-- Replace 'LEADERSHIP_TEAM_ID' with the actual ID from step 5
-- ============================================

/*
-- 6. Move all Scorecard Metrics to Leadership Team
WITH sentient_org AS (
    SELECT id FROM organizations WHERE name = 'Sentient Wealth'
),
no_dept_teams AS (
    SELECT t.id 
    FROM teams t
    WHERE t.organization_id = (SELECT id FROM sentient_org)
        AND (t.department_id IS NULL OR t.name = 'No Department')
)
UPDATE scorecard_metrics
SET team_id = 'LEADERSHIP_TEAM_ID',
    updated_at = NOW()
WHERE team_id IN (SELECT id FROM no_dept_teams);

-- 7. Move all Quarterly Priorities to Leadership Team
WITH sentient_org AS (
    SELECT id FROM organizations WHERE name = 'Sentient Wealth'
),
no_dept_teams AS (
    SELECT t.id 
    FROM teams t
    WHERE t.organization_id = (SELECT id FROM sentient_org)
        AND (t.department_id IS NULL OR t.name = 'No Department')
)
UPDATE quarterly_priorities
SET team_id = 'LEADERSHIP_TEAM_ID',
    updated_at = NOW()
WHERE team_id IN (SELECT id FROM no_dept_teams);

-- 8. Move all Issues to Leadership Team
WITH sentient_org AS (
    SELECT id FROM organizations WHERE name = 'Sentient Wealth'
),
no_dept_teams AS (
    SELECT t.id 
    FROM teams t
    WHERE t.organization_id = (SELECT id FROM sentient_org)
        AND (t.department_id IS NULL OR t.name = 'No Department')
)
UPDATE issues
SET team_id = 'LEADERSHIP_TEAM_ID',
    updated_at = NOW()
WHERE team_id IN (SELECT id FROM no_dept_teams);

-- 9. Move all To-Dos to Leadership Team
WITH sentient_org AS (
    SELECT id FROM organizations WHERE name = 'Sentient Wealth'
),
no_dept_teams AS (
    SELECT t.id 
    FROM teams t
    WHERE t.organization_id = (SELECT id FROM sentient_org)
        AND (t.department_id IS NULL OR t.name = 'No Department')
)
UPDATE todos
SET team_id = 'LEADERSHIP_TEAM_ID',
    updated_at = NOW()
WHERE team_id IN (SELECT id FROM no_dept_teams);

-- 10. Verify the updates
WITH sentient_org AS (
    SELECT id FROM organizations WHERE name = 'Sentient Wealth'
),
leadership_team AS (
    SELECT t.id 
    FROM teams t
    WHERE t.organization_id = (SELECT id FROM sentient_org)
        AND t.is_leadership_team = true
)
SELECT 
    'Scorecard Metrics' as item_type,
    COUNT(*) as count
FROM scorecard_metrics sm
WHERE sm.team_id IN (SELECT id FROM leadership_team)

UNION ALL

SELECT 
    'Quarterly Priorities' as item_type,
    COUNT(*) as count
FROM quarterly_priorities qp
WHERE qp.team_id IN (SELECT id FROM leadership_team)

UNION ALL

SELECT 
    'Issues' as item_type,
    COUNT(*) as count
FROM issues i
WHERE i.team_id IN (SELECT id FROM leadership_team)

UNION ALL

SELECT 
    'To-Dos' as item_type,
    COUNT(*) as count
FROM todos td
WHERE td.team_id IN (SELECT id FROM leadership_team);
*/