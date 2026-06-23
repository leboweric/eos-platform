-- =====================================================
-- Risdall: Assign delivery-only member rocks to Delivery Team
-- Organization: Risdall Marketing Group (02bb7b66-1878-408c-be5f-cfc613df66b7)
-- =====================================================
-- Delivery rocks were initially created with leadership_team_id.
-- This updates team_id for owners who are delivery-only members.
-- Dual-team members (Jennifer, Joel) keep leadership team_id on their rocks.
-- =====================================================

BEGIN;

UPDATE quarterly_priorities qp
SET team_id = delivery_team.id,
    updated_at = NOW()
FROM teams delivery_team
WHERE qp.organization_id = '02bb7b66-1878-408c-be5f-cfc613df66b7'
  AND delivery_team.organization_id = qp.organization_id
  AND delivery_team.name = 'Delivery Team'
  AND qp.deleted_at IS NULL
  AND qp.owner_id IN (
    SELECT tm.user_id
    FROM team_members tm
    WHERE tm.team_id = delivery_team.id
  )
  AND qp.owner_id NOT IN (
    SELECT tm.user_id
    FROM team_members tm
    JOIN teams lt ON lt.id = tm.team_id
    WHERE lt.organization_id = qp.organization_id
      AND lt.is_leadership_team = true
  );

COMMIT;

-- Verification
SELECT t.name AS team_name,
       u.first_name || ' ' || u.last_name AS owner,
       qp.title
FROM quarterly_priorities qp
JOIN users u ON u.id = qp.owner_id
LEFT JOIN teams t ON t.id = qp.team_id
WHERE qp.organization_id = '02bb7b66-1878-408c-be5f-cfc613df66b7'
  AND qp.deleted_at IS NULL
ORDER BY t.name, u.last_name, u.first_name;