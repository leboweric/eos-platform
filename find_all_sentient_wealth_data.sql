-- Find ALL data related to Sentient Wealth organization
-- Organization ID: 98b2f3ef-2e46-4120-aa05-851ca73ef755

-- 1. Search for ALL scorecard metrics in this organization (ignore team joins)
SELECT 
    'Direct Org Search' as search_type,
    sm.id,
    sm.name as metric_name,
    sm.team_id,
    sm.organization_id
FROM scorecard_metrics sm
WHERE sm.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755';

-- 2. Search for ALL quarterly priorities in this organization
SELECT 
    'Direct Org Search' as search_type,
    qp.id,
    qp.title,
    qp.team_id,
    qp.organization_id
FROM quarterly_priorities qp
WHERE qp.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755';

-- 3. Search for ALL issues in this organization
SELECT 
    'Direct Org Search' as search_type,
    i.id,
    i.title,
    i.team_id,
    i.organization_id
FROM issues i
WHERE i.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755';

-- 4. Search for ALL todos in this organization
SELECT 
    'Direct Org Search' as search_type,
    td.id,
    td.description,
    td.team_id,
    td.organization_id
FROM todos td
WHERE td.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755';

-- 5. Now let's check what team_ids are being used in the data
WITH data_team_ids AS (
    SELECT DISTINCT team_id FROM scorecard_metrics WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
    UNION
    SELECT DISTINCT team_id FROM quarterly_priorities WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
    UNION
    SELECT DISTINCT team_id FROM issues WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
    UNION
    SELECT DISTINCT team_id FROM todos WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
)
SELECT 
    dti.team_id as data_team_id,
    t.name as team_name,
    t.organization_id as team_org_id,
    CASE 
        WHEN t.id IS NULL THEN 'TEAM NOT FOUND'
        WHEN t.organization_id != '98b2f3ef-2e46-4120-aa05-851ca73ef755' THEN 'WRONG ORG'
        ELSE 'Valid'
    END as status
FROM data_team_ids dti
LEFT JOIN teams t ON dti.team_id = t.id
WHERE dti.team_id IS NOT NULL;

-- 6. Count data by team_id (including invalid teams)
SELECT 
    'By Team Summary' as report_type,
    team_id,
    'Scorecard' as data_type,
    COUNT(*) as count
FROM scorecard_metrics 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
GROUP BY team_id

UNION ALL

SELECT 
    'By Team Summary' as report_type,
    team_id,
    'Priorities' as data_type,
    COUNT(*) as count
FROM quarterly_priorities 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
GROUP BY team_id

UNION ALL

SELECT 
    'By Team Summary' as report_type,
    team_id,
    'Issues' as data_type,
    COUNT(*) as count
FROM issues 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
GROUP BY team_id

UNION ALL

SELECT 
    'By Team Summary' as report_type,
    team_id,
    'Todos' as data_type,
    COUNT(*) as count
FROM todos 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
GROUP BY team_id

ORDER BY data_type, team_id;