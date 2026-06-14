import { query } from '../config/database.js';

/**
 * Check whether a user may access data for the given organization.
 * Mirrors the access rules in server.js org validation middleware.
 */
export async function hasOrganizationAccess(user, organizationId) {
  if (!user || !organizationId) return false;

  const userOrgId = user.organization_id || user.organizationId;

  if (!userOrgId) {
    return user.role === 'admin' || user.role === 'super_admin';
  }

  if (userOrgId === organizationId) return true;

  if (user.is_consultant) {
    const accessCheck = await query(
      'SELECT 1 FROM consultant_organizations WHERE consultant_user_id = $1 AND organization_id = $2',
      [user.id, organizationId]
    );
    return accessCheck.rows.length > 0;
  }

  return false;
}

/**
 * Send 403/400 and return false when access is denied; return true when allowed.
 */
export async function denyUnlessOrgAccess(req, res, organizationId) {
  if (!organizationId) {
    res.status(400).json({ success: false, error: 'Organization ID is required' });
    return false;
  }

  const allowed = await hasOrganizationAccess(req.user, organizationId);
  if (!allowed) {
    res.status(403).json({
      success: false,
      error: 'Access denied. You do not have access to this organization.'
    });
    return false;
  }

  return true;
}