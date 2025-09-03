-- Identify which client organization has the malformed team UUID
-- Run this first to understand the scope and impact

-- 1. Get the organization details for the malformed team
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.is_leadership_team,
    o.id as organization_id,
    o.name as organization_name,
    LENGTH(t.id::text) as team_id_length,
    'MALFORMED UUID - Missing 1 character' as issue
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE t.id::text = '559822f8-c442-48dd-91dc-d23dff10959f';

-- 2. Get all users in this organization to understand who's affected
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    'User in affected organization' as note
FROM users u
WHERE u.organization_id = (
    SELECT organization_id 
    FROM teams 
    WHERE id::text = '559822f8-c442-48dd-91dc-d23dff10959f'
);

-- 3. Get summary of data volume by type
SELECT 
    'Data Impact Summary' as info,
    (SELECT COUNT(*) FROM issues WHERE team_id::text = '559822f8-c442-48dd-91dc-d23dff10959f') as issues_count,
    (SELECT COUNT(*) FROM todos WHERE team_id::text = '559822f8-c442-48dd-91dc-d23dff10959f') as todos_count,
    (SELECT COUNT(*) FROM quarterly_priorities WHERE team_id::text = '559822f8-c442-48dd-91dc-d23dff10959f') as priorities_count,
    (SELECT COUNT(*) FROM scorecard_metrics WHERE team_id::text = '559822f8-c442-48dd-91dc-d23dff10959f') as metrics_count,
    (SELECT COUNT(*) FROM team_members WHERE team_id::text = '559822f8-c442-48dd-91dc-d23dff10959f') as team_members_count;

-- 4. Check if this organization has other teams (to understand if it's their only team)
SELECT 
    COUNT(*) as total_teams_in_org,
    COUNT(CASE WHEN LENGTH(id::text) = 36 THEN 1 END) as valid_uuid_teams,
    COUNT(CASE WHEN LENGTH(id::text) != 36 THEN 1 END) as invalid_uuid_teams,
    organization_id
FROM teams 
WHERE organization_id = (
    SELECT organization_id 
    FROM teams 
    WHERE id::text = '559822f8-c442-48dd-91dc-d23dff10959f'
)
GROUP BY organization_id;

-- 5. Check when this team was created (to understand timeline)
SELECT 
    id,
    name,
    created_at,
    updated_at,
    'Team creation timeline' as info
FROM teams 
WHERE id::text = '559822f8-c442-48dd-91dc-d23dff10959f';

-- 6. Get recent activity to understand if this is actively used
SELECT 
    'Recent Activity Check' as info,
    (SELECT MAX(created_at) FROM issues WHERE team_id::text = '559822f8-c442-48dd-91dc-d23dff10959f') as latest_issue,
    (SELECT MAX(created_at) FROM todos WHERE team_id::text = '559822f8-c442-48dd-91dc-d23dff10959f') as latest_todo,
    (SELECT MAX(created_at) FROM quarterly_priorities WHERE team_id::text = '559822f8-c442-48dd-91dc-d23dff10959f') as latest_priority,
    (SELECT MAX(updated_at) FROM scorecard_metrics WHERE team_id::text = '559822f8-c442-48dd-91dc-d23dff10959f') as latest_metric_update;