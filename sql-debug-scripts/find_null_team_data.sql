-- Find data with NULL or special team_ids in Sentient Wealth
-- Organization ID: 98b2f3ef-2e46-4120-aa05-851ca73ef755

-- 1. Find all data with NULL team_id
SELECT 
    'Scorecard Metrics with NULL team' as data_type,
    COUNT(*) as count
FROM scorecard_metrics 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id IS NULL

UNION ALL

SELECT 
    'Priorities with NULL team' as data_type,
    COUNT(*) as count
FROM quarterly_priorities 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id IS NULL

UNION ALL

SELECT 
    'Issues with NULL team' as data_type,
    COUNT(*) as count
FROM issues 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id IS NULL

UNION ALL

SELECT 
    'Todos with NULL team' as data_type,
    COUNT(*) as count
FROM todos 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id IS NULL;

-- 2. Check for the special "no team" UUID (00000000-0000-0000-0000-000000000000)
SELECT 
    'Scorecard Metrics with zero UUID' as data_type,
    COUNT(*) as count
FROM scorecard_metrics 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id = '00000000-0000-0000-0000-000000000000'

UNION ALL

SELECT 
    'Priorities with zero UUID' as data_type,
    COUNT(*) as count
FROM quarterly_priorities 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id = '00000000-0000-0000-0000-000000000000'

UNION ALL

SELECT 
    'Issues with zero UUID' as data_type,
    COUNT(*) as count
FROM issues 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id = '00000000-0000-0000-0000-000000000000'

UNION ALL

SELECT 
    'Todos with zero UUID' as data_type,
    COUNT(*) as count
FROM todos 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id = '00000000-0000-0000-0000-000000000000';

-- 3. Show sample data to confirm
SELECT 
    'Sample Scorecard' as type,
    id,
    name,
    team_id,
    goal,
    owner
FROM scorecard_metrics 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND (team_id IS NULL OR team_id = '00000000-0000-0000-0000-000000000000')
LIMIT 5;

-- 4. Update statements to move data to Leadership Team
-- IMPORTANT: Review the counts above before running these updates!

-- Move NULL team_id data to Leadership Team
/*
UPDATE scorecard_metrics
SET team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2',
    updated_at = NOW()
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id IS NULL;

UPDATE quarterly_priorities
SET team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2',
    updated_at = NOW()
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id IS NULL;

UPDATE issues
SET team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2',
    updated_at = NOW()
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id IS NULL;

UPDATE todos
SET team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2',
    updated_at = NOW()
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id IS NULL;
*/

-- Move zero UUID team_id data to Leadership Team
/*
UPDATE scorecard_metrics
SET team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2',
    updated_at = NOW()
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id = '00000000-0000-0000-0000-000000000000';

UPDATE quarterly_priorities
SET team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2',
    updated_at = NOW()
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id = '00000000-0000-0000-0000-000000000000';

UPDATE issues
SET team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2',
    updated_at = NOW()
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id = '00000000-0000-0000-0000-000000000000';

UPDATE todos
SET team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2',
    updated_at = NOW()
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id = '00000000-0000-0000-0000-000000000000';
*/