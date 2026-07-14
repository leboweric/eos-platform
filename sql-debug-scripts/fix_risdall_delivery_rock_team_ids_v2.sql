-- =====================================================
-- Risdall: Move delivery-only member rocks to Delivery Team
-- Organization: Risdall Marketing Group (02bb7b66-1878-408c-be5f-cfc613df66b7)
-- =====================================================
-- Root cause: Delivery Team was created (Jun 2026) but active rocks for
-- Delivery-only members were left on Leadership team_id. Leadership L10
-- therefore showed Brant/Danielle/Gabe/Kristen/Lindsay/Nick/Nicole rocks.
--
-- Dual-team members (Jennifer Risdall, Joel Koenigs) keep Leadership
-- team_id — they run both meetings and their rocks stay company-level.
-- =====================================================

BEGIN;

-- Capture rows that will move (for verification/logging)
CREATE TEMP TABLE risdall_rocks_to_move ON COMMIT DROP AS
SELECT qp.id, qp.title, qp.owner_id, qp.team_id AS old_team_id
FROM quarterly_priorities qp
JOIN teams delivery_team
  ON delivery_team.organization_id = qp.organization_id
 AND delivery_team.name = 'Delivery Team'
WHERE qp.organization_id = '02bb7b66-1878-408c-be5f-cfc613df66b7'
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

UPDATE quarterly_priorities qp
SET team_id = delivery_team.id,
    updated_at = NOW()
FROM teams delivery_team
WHERE qp.organization_id = '02bb7b66-1878-408c-be5f-cfc613df66b7'
  AND delivery_team.organization_id = qp.organization_id
  AND delivery_team.name = 'Delivery Team'
  AND qp.deleted_at IS NULL
  AND qp.id IN (SELECT id FROM risdall_rocks_to_move);

COMMIT;

-- Verification: should show Delivery rocks for delivery-only owners,
-- Leadership rocks for leadership / dual owners.
SELECT t.name AS team_name,
       u.first_name || ' ' || u.last_name AS owner,
       CASE
         WHEN EXISTS (
           SELECT 1 FROM team_members tm
           JOIN teams dt ON dt.id = tm.team_id
           WHERE tm.user_id = qp.owner_id
             AND dt.name = 'Delivery Team'
             AND dt.organization_id = qp.organization_id
         ) AND EXISTS (
           SELECT 1 FROM team_members tm
           JOIN teams lt ON lt.id = tm.team_id
           WHERE tm.user_id = qp.owner_id
             AND lt.is_leadership_team = true
             AND lt.organization_id = qp.organization_id
         ) THEN 'dual'
         WHEN EXISTS (
           SELECT 1 FROM team_members tm
           JOIN teams dt ON dt.id = tm.team_id
           WHERE tm.user_id = qp.owner_id
             AND dt.name = 'Delivery Team'
             AND dt.organization_id = qp.organization_id
         ) THEN 'delivery-only'
         ELSE 'leadership-only'
       END AS owner_membership,
       qp.title
FROM quarterly_priorities qp
JOIN users u ON u.id = qp.owner_id
LEFT JOIN teams t ON t.id = qp.team_id
WHERE qp.organization_id = '02bb7b66-1878-408c-be5f-cfc613df66b7'
  AND qp.deleted_at IS NULL
ORDER BY t.name, u.last_name, u.first_name;
