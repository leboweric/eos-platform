-- Fix to-dos on Leadership Team that belong on an assignee's departmental team.
-- Run in pgAdmin against the railway database.
-- Replace '%Bennett%' with your org name if different.

-- 1) Preview: leadership to-dos that should move to a departmental team
SELECT
  t.id,
  t.title,
  t.due_date,
  t.status,
  current_team.name AS current_team,
  assignee.first_name || ' ' || assignee.last_name AS assignee_name,
  dest_team.name AS destination_team
FROM todos t
JOIN teams current_team ON current_team.id = t.team_id
JOIN organizations o ON o.id = t.organization_id
LEFT JOIN users assignee ON assignee.id = t.assigned_to_id
LEFT JOIN LATERAL (
  SELECT st.id, st.name
  FROM team_members tm
  JOIN teams st ON st.id = tm.team_id
  WHERE tm.user_id = t.assigned_to_id
    AND st.organization_id = t.organization_id
    AND st.is_leadership_team = false
  ORDER BY st.name ASC
  LIMIT 1
) dest_team ON true
WHERE o.name ILIKE '%Bennett%'
  AND current_team.is_leadership_team = true
  AND t.deleted_at IS NULL
  AND t.assigned_to_id IS NOT NULL
  AND dest_team.id IS NOT NULL
  AND dest_team.id <> t.team_id
ORDER BY assignee_name, t.due_date;

-- 2) Move leadership to-dos to each assignee's departmental team
UPDATE todos t
SET team_id = resolved.new_team_id,
    updated_at = CURRENT_TIMESTAMP
FROM (
  SELECT
    t2.id AS todo_id,
    (
      SELECT tm.team_id
      FROM team_members tm
      JOIN teams st ON st.id = tm.team_id
      WHERE tm.user_id = t2.assigned_to_id
        AND st.organization_id = t2.organization_id
        AND st.is_leadership_team = false
      ORDER BY st.name ASC
      LIMIT 1
    ) AS new_team_id
  FROM todos t2
  JOIN teams current_team ON current_team.id = t2.team_id
  JOIN organizations o ON o.id = t2.organization_id
  WHERE o.name ILIKE '%Bennett%'
    AND current_team.is_leadership_team = true
    AND t2.deleted_at IS NULL
    AND t2.assigned_to_id IS NOT NULL
) resolved
WHERE t.id = resolved.todo_id
  AND resolved.new_team_id IS NOT NULL
  AND resolved.new_team_id <> t.team_id;