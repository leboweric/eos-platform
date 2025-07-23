-- Fix data assigned to the zero UUID team

-- 1. Update Quarterly Priorities from zero team to actual Leadership Team
UPDATE quarterly_priorities
SET team_id = '47d53797-be5f-49c2-883a-326a401a17c1'  -- Actual Leadership Team ID
WHERE team_id = '00000000-0000-0000-0000-000000000000'
  AND organization_id = (SELECT id FROM organizations WHERE name = 'Skykit');

-- 2. Update Scorecard Metrics from zero team to actual Leadership Team
UPDATE scorecard_metrics
SET team_id = '47d53797-be5f-49c2-883a-326a401a17c1'  -- Actual Leadership Team ID
WHERE team_id = '00000000-0000-0000-0000-000000000000'
  AND organization_id = (SELECT id FROM organizations WHERE name = 'Skykit');

-- 3. Update Issues from zero team to actual Leadership Team
UPDATE issues
SET team_id = '47d53797-be5f-49c2-883a-326a401a17c1'  -- Actual Leadership Team ID
WHERE team_id = '00000000-0000-0000-0000-000000000000'
  AND organization_id = (SELECT id FROM organizations WHERE name = 'Skykit');

-- 4. Update ToDos from zero team to actual Leadership Team
UPDATE todos
SET team_id = '47d53797-be5f-49c2-883a-326a401a17c1'  -- Actual Leadership Team ID
WHERE team_id = '00000000-0000-0000-0000-000000000000';

-- 5. Verify the fix - should show all your data
SELECT 
    'Quarterly Priorities' as data_type,
    COUNT(*) as count
FROM quarterly_priorities
WHERE team_id = '47d53797-be5f-49c2-883a-326a401a17c1'
  AND organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND deleted_at IS NULL
UNION ALL
SELECT 
    'Scorecard Metrics' as data_type,
    COUNT(*) as count
FROM scorecard_metrics
WHERE team_id = '47d53797-be5f-49c2-883a-326a401a17c1'
  AND organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
UNION ALL
SELECT 
    'Issues' as data_type,
    COUNT(*) as count
FROM issues
WHERE team_id = '47d53797-be5f-49c2-883a-326a401a17c1'
  AND organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND archived = false;