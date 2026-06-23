import { query } from '../config/database.js';

export const ACTIVE_ORG_HEADER = 'X-Active-Organization-Id';
export const LEGACY_IMPERSONATION_HEADER = 'X-Impersonated-Org-Id';

export const getUserMemberships = async (userId) => {
  const result = await query(
    `SELECT uo.organization_id, uo.role, uo.membership_type, uo.is_active,
            o.name, o.slug
     FROM user_organizations uo
     JOIN organizations o ON o.id = uo.organization_id
     WHERE uo.user_id = $1 AND COALESCE(uo.is_active, true) = true
     ORDER BY CASE WHEN uo.membership_type = 'home' THEN 0 ELSE 1 END, o.name`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.organization_id,
    name: row.name,
    slug: row.slug,
    role: row.role,
    membershipType: row.membership_type
  }));
};

export const getMembership = async (userId, organizationId) => {
  const result = await query(
    `SELECT role, membership_type, is_active
     FROM user_organizations
     WHERE user_id = $1 AND organization_id = $2`,
    [userId, organizationId]
  );

  return result.rows[0] || null;
};

export const hasConsultantAccess = async (userId, organizationId) => {
  const result = await query(
    `SELECT 1 FROM consultant_organizations
     WHERE consultant_user_id = $1 AND organization_id = $2`,
    [userId, organizationId]
  );

  return result.rows.length > 0;
};

export const addUserMembership = async ({
  userId,
  organizationId,
  role = 'member',
  membershipType = 'home',
  client = null
}) => {
  const executor = client?.query ? client.query.bind(client) : query;

  await executor(
    `INSERT INTO user_organizations (user_id, organization_id, role, membership_type)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, organization_id)
     DO UPDATE SET
       role = EXCLUDED.role,
       membership_type = CASE
         WHEN user_organizations.membership_type = 'home' THEN 'home'
         ELSE EXCLUDED.membership_type
       END,
       is_active = true,
       updated_at = NOW()`,
    [userId, organizationId, role, membershipType]
  );
};

export const removeUserMembership = async (userId, organizationId) => {
  await query(
    `DELETE FROM user_organizations
     WHERE user_id = $1 AND organization_id = $2`,
    [userId, organizationId]
  );
};

export const removeTeamMembershipsForOrg = async (userId, organizationId) => {
  await query(
    `DELETE FROM team_members tm
     USING teams t
     WHERE tm.team_id = t.id
       AND tm.user_id = $1
       AND t.organization_id = $2`,
    [userId, organizationId]
  );
};

export const countOrganizationMembers = async (organizationId) => {
  const result = await query(
    `SELECT COUNT(*)::int AS count
     FROM user_organizations
     WHERE organization_id = $1 AND COALESCE(is_active, true) = true`,
    [organizationId]
  );

  return result.rows[0]?.count || 0;
};

export const resolveActiveOrganizationContext = async (req, user) => {
  const requestedOrgId =
    req.header(ACTIVE_ORG_HEADER) ||
    req.header(LEGACY_IMPERSONATION_HEADER) ||
    user.organization_id;

  const membership = await getMembership(user.id, requestedOrgId);
  if (membership && membership.is_active !== false) {
    const orgResult = await query(
      'SELECT name, slug FROM organizations WHERE id = $1',
      [requestedOrgId]
    );

    return {
      organizationId: requestedOrgId,
      role: membership.role,
      membershipType: membership.membership_type,
      organizationName: orgResult.rows[0]?.name,
      organizationSlug: orgResult.rows[0]?.slug
    };
  }

  if (user.is_consultant && (await hasConsultantAccess(user.id, requestedOrgId))) {
    const orgResult = await query(
      'SELECT name, slug FROM organizations WHERE id = $1',
      [requestedOrgId]
    );

    return {
      organizationId: requestedOrgId,
      role: 'admin',
      membershipType: 'consultant',
      organizationName: orgResult.rows[0]?.name,
      organizationSlug: orgResult.rows[0]?.slug
    };
  }

  const homeMembership = await getMembership(user.id, user.organization_id);
  const homeOrgResult = await query(
    'SELECT name, slug FROM organizations WHERE id = $1',
    [user.organization_id]
  );

  return {
    organizationId: user.organization_id,
    role: homeMembership?.role || user.role,
    membershipType: homeMembership?.membership_type || 'home',
    organizationName: homeOrgResult.rows[0]?.name,
    organizationSlug: homeOrgResult.rows[0]?.slug
  };
};

export const userBelongsToOrganization = async (userId, organizationId, { isConsultant = false } = {}) => {
  const membership = await getMembership(userId, organizationId);
  if (membership && membership.is_active !== false) {
    return true;
  }

  if (isConsultant) {
    return hasConsultantAccess(userId, organizationId);
  }

  return false;
};