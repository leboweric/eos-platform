-- Move all data from "No Department" teams to Leadership Team in Sentient Wealth
-- Organization ID: 98b2f3ef-2e46-4120-aa05-851ca73ef755
-- Leadership Team ID: 73bb1c88-7541-4380-b96b-a4efbaa933d2

-- 1. First, identify teams with no department in Sentient Wealth
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.department_id,
    CASE 
        WHEN t.department_id IS NULL THEN 'NULL department_id'
        ELSE 'Has department'
    END as status
FROM teams t
WHERE t.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND t.department_id IS NULL;

-- 2. Count all items currently assigned to teams with no department
WITH no_dept_teams AS (
    SELECT t.id 
    FROM teams t
    WHERE t.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
      AND t.department_id IS NULL
)
SELECT 
    'Scorecard Metrics' as item_type,
    COUNT(*) as count_to_move
FROM scorecard_metrics sm
WHERE sm.team_id IN (SELECT id FROM no_dept_teams)

UNION ALL

SELECT 
    'Quarterly Priorities' as item_type,
    COUNT(*) as count_to_move
FROM quarterly_priorities qp
WHERE qp.team_id IN (SELECT id FROM no_dept_teams)

UNION ALL

SELECT 
    'Issues' as item_type,
    COUNT(*) as count_to_move
FROM issues i
WHERE i.team_id IN (SELECT id FROM no_dept_teams)

UNION ALL

SELECT 
    'To-Dos' as item_type,
    COUNT(*) as count_to_move
FROM todos td
WHERE td.team_id IN (SELECT id FROM no_dept_teams);

-- 3. Move all Scorecard Metrics to Leadership Team
WITH no_dept_teams AS (
    SELECT t.id 
    FROM teams t
    WHERE t.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
      AND t.department_id IS NULL
)
UPDATE scorecard_metrics
SET team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2',
    updated_at = NOW()
WHERE team_id IN (SELECT id FROM no_dept_teams)
RETURNING id, metric_name, team_id;

-- 4. Move all Quarterly Priorities to Leadership Team
WITH no_dept_teams AS (
    SELECT t.id 
    FROM teams t
    WHERE t.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
      AND t.department_id IS NULL
)
UPDATE quarterly_priorities
SET team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2',
    updated_at = NOW()
WHERE team_id IN (SELECT id FROM no_dept_teams)
RETURNING id, priority_text, team_id;

-- 5. Move all Issues to Leadership Team
WITH no_dept_teams AS (
    SELECT t.id 
    FROM teams t
    WHERE t.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
      AND t.department_id IS NULL
)
UPDATE issues
SET team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2',
    updated_at = NOW()
WHERE team_id IN (SELECT id FROM no_dept_teams)
RETURNING id, issue_name, team_id;

-- 6. Move all To-Dos to Leadership Team
WITH no_dept_teams AS (
    SELECT t.id 
    FROM teams t
    WHERE t.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
      AND t.department_id IS NULL
)
UPDATE todos
SET team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2',
    updated_at = NOW()
WHERE team_id IN (SELECT id FROM no_dept_teams)
RETURNING id, description, team_id;

-- 7. Verify all items are now in Leadership Team
SELECT 
    'Scorecard Metrics' as item_type,
    COUNT(*) as total_count
FROM scorecard_metrics sm
WHERE sm.team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2'

UNION ALL

SELECT 
    'Quarterly Priorities' as item_type,
    COUNT(*) as total_count
FROM quarterly_priorities qp
WHERE qp.team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2'

UNION ALL

SELECT 
    'Issues' as item_type,
    COUNT(*) as total_count
FROM issues i
WHERE i.team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2'

UNION ALL

SELECT 
    'To-Dos' as item_type,
    COUNT(*) as total_count
FROM todos td
WHERE td.team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2';

-- 8. Check if any teams with no department are now empty and can be deleted
WITH no_dept_teams AS (
    SELECT t.id, t.name
    FROM teams t
    WHERE t.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
      AND t.department_id IS NULL
)
SELECT 
    ndt.id,
    ndt.name,
    (SELECT COUNT(*) FROM team_members WHERE team_id = ndt.id) as member_count,
    (SELECT COUNT(*) FROM scorecard_metrics WHERE team_id = ndt.id) as scorecard_count,
    (SELECT COUNT(*) FROM quarterly_priorities WHERE team_id = ndt.id) as priority_count,
    (SELECT COUNT(*) FROM issues WHERE team_id = ndt.id) as issue_count,
    (SELECT COUNT(*) FROM todos WHERE team_id = ndt.id) as todo_count
FROM no_dept_teams ndt;