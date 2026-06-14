-- Fix to-dos assigned to users who are not members of the to-do's team.
-- Common case: Leadership Team creates a to-do for a Finance team member;
-- the to-do stays on Leadership but should live on the assignee's team.
--
-- Run in pgAdmin against the railway database.
-- Replace 'Bennett Material Handling' with your org name if different.

-- 1) Preview mismatched to-dos
SELECT
  t.id,
  t.title,
  t.due_date,
  t.status,
  tm.name AS current_team,
  assignee.first_name || ' ' || assignee.last_name AS assignee_name,
  (
    SELECT STRING_AGG(st.name, ', ' ORDER BY st.name)
    FROM team_members sm
    JOIN teams st ON st.id = sm.team_id
    WHERE sm.user_id = t.assigned_to_id
      AND st.organization_id = t.organization_id
  ) AS assignee_teams
FROM todos t
JOIN teams tm ON tm.id = t.team_id
JOIN organizations o ON o.id = t.organization_id
LEFT JOIN users assignee ON assignee.id = t.assigned_to_id
WHERE o.name ILIKE '%Bennett%'
  AND t.deleted_at IS NULL
  AND t.assigned_to_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM team_members mem
    WHERE mem.user_id = t.assigned_to_id
      AND mem.team_id = t.team_id
  )
ORDER BY assignee_name, t.due_date;

-- 2) Move each mismatched to-do to the assignee's primary non-leadership team
--    (falls back to any team the assignee belongs to)
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
      ORDER BY st.is_leadership_team ASC NULLS LAST, st.name ASC
      LIMIT 1
    ) AS new_team_id
  FROM todos t2
  JOIN organizations o ON o.id = t2.organization_id
  WHERE o.name ILIKE '%Bennett%'
    AND t2.deleted_at IS NULL
    AND t2.assigned_to_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM team_members mem
      WHERE mem.user_id = t2.assigned_to_id
        AND mem.team_id = t2.team_id
    )
) resolved
WHERE t.id = resolved.todo_id
  AND resolved.new_team_id IS NOT NULL;