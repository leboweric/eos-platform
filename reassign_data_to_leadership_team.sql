-- Reassign all Skykit data to Leadership Team

-- 1. Update all Quarterly Priorities to Leadership Team
UPDATE quarterly_priorities
SET team_id = '47d53797-be5f-49c2-883a-326a401a17c1'
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND deleted_at IS NULL
  AND team_id != '47d53797-be5f-49c2-883a-326a401a17c1';

-- 2. Update all Scorecard Metrics to Leadership Team  
UPDATE scorecard_metrics
SET team_id = '47d53797-be5f-49c2-883a-326a401a17c1'
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND team_id != '47d53797-be5f-49c2-883a-326a401a17c1';

-- 3. Update all Issues to Leadership Team (if any)
UPDATE issues
SET team_id = '47d53797-be5f-49c2-883a-326a401a17c1'
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND archived = false
  AND team_id != '47d53797-be5f-49c2-883a-326a401a17c1';

-- 4. Update all ToDos to Leadership Team (if any)
UPDATE todos
SET team_id = '47d53797-be5f-49c2-883a-326a401a17c1'
WHERE user_id IN (
    SELECT id FROM users 
    WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
)
AND team_id != '47d53797-be5f-49c2-883a-326a401a17c1';

-- 5. Verify the data has been reassigned
SELECT 
    'After Update - Data Count' as status,
    COUNT(DISTINCT qp.id) as priorities_count,
    COUNT(DISTINCT sm.id) as metrics_count,
    COUNT(DISTINCT i.id) as issues_count
FROM teams t
LEFT JOIN quarterly_priorities qp ON t.id = qp.team_id AND qp.deleted_at IS NULL
LEFT JOIN scorecard_metrics sm ON t.id = sm.team_id
LEFT JOIN issues i ON t.id = i.team_id AND i.archived = false
WHERE t.id = '47d53797-be5f-49c2-883a-326a401a17c1';