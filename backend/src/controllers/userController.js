import { query } from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { updateSubscriptionUserCount } from './subscriptionController.js';
import { sendEmail } from '../services/emailService.js';
import { v4 as uuidv4 } from 'uuid';
import { getUserTeamContext } from '../utils/teamUtils.js';
import { checkUserLimit } from '../utils/planLimits.js';

// Get all users in organization
export const getOrganizationUsers = async (req, res) => {
  try {
    // Use orgId from URL params if available (for organization-scoped routes)
    // Otherwise fall back to user's organization
    const organizationId = req.params.orgId || req.user.organizationId || req.user.organization_id;
    
    console.log('Getting users for organization:', {
      organizationId,
      paramOrgId: req.params.orgId,
      allParams: req.params,
      isImpersonating: req.user.isImpersonating,
      userOrgId: req.user.organization_id,
      impersonatedOrgId: req.user.organizationId
    });
    
    // Try to query with is_active first, fall back if column doesn't exist
    let result;
    try {
      result = await query(
        `SELECT 
          u.id, 
          u.email, 
          u.first_name, 
          u.last_name, 
          u.role, 
          u.created_at, 
          u.last_login_at,
          u.is_active,
          STRING_AGG(t.name, ', ' ORDER BY t.name) as departments,
          -- Get all team_ids as an array for multi-select support
          ARRAY_AGG(tm.team_id) FILTER (WHERE tm.team_id IS NOT NULL) as team_ids,
          -- Keep single team_id for backward compatibility
          (SELECT tm2.team_id FROM team_members tm2 WHERE tm2.user_id = u.id LIMIT 1) as team_id
         FROM users u
         LEFT JOIN team_members tm ON u.id = tm.user_id
         LEFT JOIN teams t ON tm.team_id = t.id
         WHERE u.organization_id = $1
         GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.created_at, u.last_login_at, u.is_active
         ORDER BY u.created_at DESC`,
        [organizationId]
      );
    } catch (error) {
      // If is_active column doesn't exist, query without it
      console.log('is_active column not found, querying without it');
      result = await query(
        `SELECT 
          u.id, 
          u.email, 
          u.first_name, 
          u.last_name, 
          u.role, 
          u.created_at, 
          u.last_login_at,
          true as is_active,
          STRING_AGG(t.name, ', ' ORDER BY t.name) as departments,
          -- Get all team_ids as an array for multi-select support
          ARRAY_AGG(tm.team_id) FILTER (WHERE tm.team_id IS NOT NULL) as team_ids,
          -- Keep single team_id for backward compatibility
          (SELECT tm2.team_id FROM team_members tm2 WHERE tm2.user_id = u.id LIMIT 1) as team_id
         FROM users u
         LEFT JOIN team_members tm ON u.id = tm.user_id
         LEFT JOIN teams t ON tm.team_id = t.id
         WHERE u.organization_id = $1
         GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.created_at, u.last_login_at
         ORDER BY u.created_at DESC`,
        [organizationId]
      );
    }

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get organization users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Create user directly (for consultants)
export const createUser = async (req, res) => {
  try {
    const { email, firstName, lastName, role = 'member', sendWelcomeEmail = true, teamId, teamIds } = req.body;
    const organizationId = req.user.organizationId || req.user.organization_id;
    const createdBy = req.user.id;

    // Check if user can create users (must be consultant or admin)
    if (!req.user.is_consultant && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only consultants and admins can create users directly' });
    }

    // Check plan limits before creating user
    const limitCheck = await checkUserLimit(organizationId);
    if (!limitCheck.canAddUsers) {
      return res.status(403).json({
        error: 'User limit reached',
        message: limitCheck.message,
        upgradeRequired: true,
        recommendedPlan: limitCheck.recommendedPlan,
        currentCount: limitCheck.currentCount,
        maxUsers: limitCheck.maxUsers,
        upgradeUrl: '/billing'
      });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Generate secure temporary password
    const temporaryPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    // Create user
    const userId = uuidv4();
    const userResult = await query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, is_temporary_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id, email, first_name, last_name, role, created_at`,
      [userId, email, passwordHash, firstName, lastName, role, organizationId]
    );

    const newUser = userResult.rows[0];

    // Add user to teams - support both single teamId and multiple teamIds
    if (teamIds && Array.isArray(teamIds)) {
      // Handle multiple team assignments
      for (const tid of teamIds) {
        if (tid && tid !== '' && tid !== 'none') {
          await query(
            `INSERT INTO team_members (id, team_id, user_id, role)
             VALUES ($1, $2, $3, $4)`,
            [uuidv4(), tid, userId, 'member']
          );
        }
      }
    } else if (teamId && teamId !== '' && teamId !== 'none') {
      // Handle single team assignment (backward compatibility)
      await query(
        `INSERT INTO team_members (id, team_id, user_id, role)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), teamId, userId, 'member']
      );
    }

    // Get organization details for email
    const orgResult = await query(
      `SELECT o.name as organization_name, 
              u.first_name || ' ' || u.last_name as created_by_name
       FROM organizations o
       JOIN users u ON u.id = $1
       WHERE o.id = $2`,
      [createdBy, organizationId]
    );

    const { organization_name, created_by_name } = orgResult.rows[0];
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

    // Send welcome email with temporary password
    if (sendWelcomeEmail) {
      try {
        await sendEmail(email, 'user-created', {
          firstName,
          organizationName: organization_name,
          createdByName: created_by_name,
          email,
          temporaryPassword,
          loginUrl
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Continue even if email fails
      }
    }

    // Update subscription user count
    await updateSubscriptionUserCount(organizationId);
    
    res.json({
      success: true,
      data: {
        ...newUser,
        temporaryPassword: sendWelcomeEmail ? null : temporaryPassword // Only return password if email wasn't sent
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Send invitation
export const inviteUser = async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    const organizationId = req.user.organizationId || req.user.organization_id;
    const invitedBy = req.user.id;

    // Check if user can invite (must be admin or EOSI)
    if (req.user.role !== 'admin' && !req.user.is_consultant) {
      return res.status(403).json({ error: 'Only administrators can invite users' });
    }

    // Check plan limits before inviting
    const limitCheck = await checkUserLimit(organizationId);
    if (!limitCheck.canAddUsers) {
      return res.status(403).json({
        error: 'User limit reached',
        message: limitCheck.message,
        upgradeRequired: true,
        recommendedPlan: limitCheck.recommendedPlan,
        currentCount: limitCheck.currentCount,
        maxUsers: limitCheck.maxUsers,
        upgradeUrl: '/billing'
      });
    }

    // Check if user already exists in organization
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 AND organization_id = $2',
      [email, organizationId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists in this organization' });
    }

    // Check for pending invitation
    const existingInvite = await query(
      'SELECT id FROM invitations WHERE email = $1 AND organization_id = $2 AND expires_at > NOW() AND accepted_at IS NULL',
      [email, organizationId]
    );

    if (existingInvite.rows.length > 0) {
      return res.status(400).json({ error: 'An invitation has already been sent to this email' });
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const inviteResult = await query(
      `INSERT INTO invitations (organization_id, email, role, invited_by, token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [organizationId, email, role, invitedBy, token, expiresAt]
    );

    const invitation = inviteResult.rows[0];

    // Get organization and inviter details for email
    const orgResult = await query(
      `SELECT o.name as organization_name, 
              u.first_name || ' ' || u.last_name as invited_by_name
       FROM organizations o
       JOIN users u ON u.id = $1
       WHERE o.id = $2`,
      [invitedBy, organizationId]
    );

    const { organization_name, invited_by_name } = orgResult.rows[0];
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-invitation?token=${token}`;

    // Send invitation email
    try {
      await sendEmail(email, 'invitation', {
        organizationName: organization_name,
        invitedByName: invited_by_name,
        role,
        invitationLink
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Continue even if email fails - they can still share the link manually
    }
    
    // Include plan limit warning if approaching limit
    const response = {
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        invitation_link: invitationLink
      }
    };

    // Add warning if approaching limit
    if (limitCheck.remainingSlots && limitCheck.remainingSlots <= 5) {
      response.warning = limitCheck.message;
      response.remainingSlots = limitCheck.remainingSlots;
    }

    res.json(response);
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
};

// Accept invitation
export const acceptInvitation = async (req, res) => {
  try {
    const { token, password, firstName, lastName } = req.body;

    // Find valid invitation
    const inviteResult = await query(
      `SELECT i.*, o.name as organization_name 
       FROM invitations i
       JOIN organizations o ON i.organization_id = o.id
       WHERE i.token = $1 AND i.expires_at > NOW() AND i.accepted_at IS NULL`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }

    const invitation = inviteResult.rows[0];

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [invitation.email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Check plan limits before accepting invitation
    const limitCheck = await checkUserLimit(invitation.organization_id);
    if (!limitCheck.canAddUsers) {
      return res.status(403).json({
        error: 'User limit reached',
        message: `Cannot accept invitation. ${limitCheck.message}`,
        upgradeRequired: true,
        recommendedPlan: limitCheck.recommendedPlan,
        currentCount: limitCheck.currentCount,
        maxUsers: limitCheck.maxUsers,
        contactAdmin: true,
        adminMessage: 'Please contact your organization administrator to upgrade the plan.'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const userResult = await query(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, role`,
      [invitation.organization_id, invitation.email, passwordHash, firstName, lastName, invitation.role]
    );

    const user = userResult.rows[0];

    // Mark invitation as accepted
    await query(
      'UPDATE invitations SET accepted_at = NOW() WHERE id = $1',
      [invitation.id]
    );

    // Update subscription user count
    await updateSubscriptionUserCount(invitation.organization_id);

    res.json({
      success: true,
      data: {
        user,
        organization_name: invitation.organization_name
      }
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
};

// Remove user from organization
export const removeUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const organizationId = req.user.organizationId || req.user.organization_id;

    // Check if user can remove (must be admin or EOSI)
    if (req.user.role !== 'admin' && !req.user.is_consultant) {
      return res.status(403).json({ error: 'Only administrators can remove users' });
    }

    // Prevent removing yourself
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove yourself' });
    }

    // Check if user exists in organization
    const userResult = await query(
      'SELECT id, role FROM users WHERE id = $1 AND organization_id = $2',
      [userId, organizationId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in organization' });
    }

    const targetUser = userResult.rows[0];

    // Prevent removing the last admin
    if (targetUser.role === 'admin') {
      const adminCount = await query(
        'SELECT COUNT(*) as count FROM users WHERE organization_id = $1 AND role = $2',
        [organizationId, 'admin']
      );

      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last administrator' });
      }
    }

    // Remove user
    await query(
      'DELETE FROM users WHERE id = $1 AND organization_id = $2',
      [userId, organizationId]
    );

    // Update subscription user count
    await updateSubscriptionUserCount(organizationId);

    res.json({
      success: true,
      message: 'User removed successfully'
    });
  } catch (error) {
    console.error('Remove user error:', error);
    res.status(500).json({ error: 'Failed to remove user' });
  }
};

// Get pending invitations
export const getPendingInvitations = async (req, res) => {
  try {
    const organizationId = req.user.organizationId || req.user.organization_id;

    const result = await query(
      `SELECT i.id, i.email, i.role, i.expires_at, i.created_at,
              u.first_name || ' ' || u.last_name as invited_by_name
       FROM invitations i
       JOIN users u ON i.invited_by = u.id
       WHERE i.organization_id = $1 AND i.accepted_at IS NULL AND i.expires_at > NOW()
       ORDER BY i.created_at DESC`,
      [organizationId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get pending invitations error:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
};

// Cancel invitation
export const cancelInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const organizationId = req.user.organizationId || req.user.organization_id;

    // Check if user can cancel (must be admin or EOSI)
    if (req.user.role !== 'admin' && !req.user.is_consultant) {
      return res.status(403).json({ error: 'Only administrators can cancel invitations' });
    }

    const result = await query(
      'DELETE FROM invitations WHERE id = $1 AND organization_id = $2 AND accepted_at IS NULL',
      [invitationId, organizationId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Invitation not found or already accepted' });
    }

    res.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
};

// Update user information
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, role, teamId, teamIds, is_active } = req.body; // Support both single teamId and multiple teamIds
    const organizationId = req.params.orgId || req.user.organizationId || req.user.organization_id;

    // Check if user can update (must be admin or consultant)
    if (req.user.role !== 'admin' && !req.user.is_consultant) {
      return res.status(403).json({ error: 'Only administrators can update users' });
    }

    // Check if user exists in organization
    const userResult = await query(
      'SELECT id FROM users WHERE id = $1 AND organization_id = $2',
      [userId, organizationId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in organization' });
    }

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    // Only update fields that were provided
    if (firstName !== undefined) {
      updateFields.push(`first_name = $${paramCount}`);
      updateValues.push(firstName);
      paramCount++;
    }
    if (lastName !== undefined) {
      updateFields.push(`last_name = $${paramCount}`);
      updateValues.push(lastName);
      paramCount++;
    }
    if (role !== undefined) {
      updateFields.push(`role = $${paramCount}`);
      updateValues.push(role);
      paramCount++;
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount}`);
      updateValues.push(is_active);
      paramCount++;
    }
    
    // If no fields to update (except updated_at), at least update the timestamp
    if (updateFields.length === 0 && is_active === undefined) {
      return res.json({
        success: true,
        message: 'No changes to update'
      });
    }
    
    // Always update the updated_at timestamp
    updateFields.push('updated_at = NOW()');
    
    // Add userId and organizationId as the last parameters
    updateValues.push(userId, organizationId);

    // Update user information
    await query(
      `UPDATE users 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount} AND organization_id = $${paramCount + 1}`,
      updateValues
    );

    // Handle team assignment - support both single teamId and multiple teamIds
    if (teamIds && Array.isArray(teamIds)) {
      // Handle multiple team assignments
      // First, remove all existing team memberships for this user
      await query(
        'DELETE FROM team_members WHERE user_id = $1',
        [userId]
      );

      // Then add new team memberships for each selected team
      for (const teamId of teamIds) {
        if (teamId && teamId !== '' && teamId !== 'none') {
          await query(
            `INSERT INTO team_members (id, team_id, user_id, role)
             VALUES ($1, $2, $3, $4)`,
            [uuidv4(), teamId, userId, 'member']
          );
        }
      }
    } else if (teamId !== undefined) {
      // Handle single team assignment (backward compatibility)
      // First, remove all existing team memberships for this user
      await query(
        'DELETE FROM team_members WHERE user_id = $1',
        [userId]
      );

      // Then add new team membership if teamId is a valid UUID
      if (teamId && teamId !== '' && teamId !== 'none') {
        await query(
          `INSERT INTO team_members (id, team_id, user_id, role)
           VALUES ($1, $2, $3, $4)`,
          [uuidv4(), teamId, userId, 'member']
        );
      }
    }
    // If teamId is undefined, null, or 'none', we don't touch the existing team assignments

    // Fetch updated user information with all team memberships
    const updatedUserResult = await query(
      `SELECT 
        u.id, 
        u.email, 
        u.first_name, 
        u.last_name, 
        u.role,
        u.updated_at,
        ARRAY_AGG(tm.team_id) FILTER (WHERE tm.team_id IS NOT NULL) as team_ids,
        STRING_AGG(t.name, ', ' ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL) as departments
       FROM users u
       LEFT JOIN team_members tm ON u.id = tm.user_id
       LEFT JOIN teams t ON tm.team_id = t.id
       WHERE u.id = $1
       GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.updated_at`,
      [userId]
    );

    res.json({
      success: true,
      data: updatedUserResult.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Get user's available departments based on their permissions
export const getUserDepartments = async (req, res) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.organizationId || req.user.organization_id;
    
    console.log('Getting departments for user:', { userId, organizationId });
    
    // All users (including Leadership members) only see departments they're members of
    const result = await query(
      `SELECT DISTINCT t.id, t.name, t.is_leadership_team
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = $1 AND t.organization_id = $2
       ORDER BY t.is_leadership_team DESC, t.name ASC`,
      [userId, organizationId]
    );
    const availableDepartments = result.rows;
    
    // Check if user is on leadership team (for frontend display purposes)
    const isLeadershipMember = availableDepartments.some(dept => dept.is_leadership_team);
    
    const departments = availableDepartments.map(team => ({
      id: team.id,
      name: team.name,
      is_leadership_team: team.is_leadership_team
    }));
    
    console.log('Available departments:', departments);
    
    // Don't add a fake Leadership Team - let frontend handle empty state
    // This was causing duplicate "Leadership Team" entries in dropdowns
    if (departments.length === 0) {
      console.log('No departments found for user');
    }
    
    res.json({
      success: true,
      data: {
        departments,
        is_leadership_member: isLeadershipMember || departments.length === 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching user departments:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch user departments' 
    });
  }
};

// Change user password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    // Get user's current password hash
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};