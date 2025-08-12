-- Move all data from zero UUID to Leadership Team in Sentient Wealth
-- Organization ID: 98b2f3ef-2e46-4120-aa05-851ca73ef755
-- Leadership Team ID: 73bb1c88-7541-4380-b96b-a4efbaa933d2

-- Move 4 Scorecard Metrics
UPDATE scorecard_metrics
SET team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2',
    updated_at = NOW()
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id = '00000000-0000-0000-0000-000000000000';

-- Move 29 Quarterly Priorities
UPDATE quarterly_priorities
SET team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2',
    updated_at = NOW()
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id = '00000000-0000-0000-0000-000000000000';

-- Move 7 Issues
UPDATE issues
SET team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2',
    updated_at = NOW()
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id = '00000000-0000-0000-0000-000000000000';

-- Verify the updates
SELECT 
    'Leadership Team Scorecards' as data_type,
    COUNT(*) as count
FROM scorecard_metrics 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2'

UNION ALL

SELECT 
    'Leadership Team Priorities' as data_type,
    COUNT(*) as count
FROM quarterly_priorities 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2'

UNION ALL

SELECT 
    'Leadership Team Issues' as data_type,
    COUNT(*) as count
FROM issues 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id = '73bb1c88-7541-4380-b96b-a4efbaa933d2';

-- Confirm no more data with zero UUID
SELECT 
    'Remaining zero UUID data' as check_type,
    COUNT(*) as scorecard_count,
    (SELECT COUNT(*) FROM quarterly_priorities WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755' AND team_id = '00000000-0000-0000-0000-000000000000') as priority_count,
    (SELECT COUNT(*) FROM issues WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755' AND team_id = '00000000-0000-0000-0000-000000000000') as issue_count
FROM scorecard_metrics 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND team_id = '00000000-0000-0000-0000-000000000000';