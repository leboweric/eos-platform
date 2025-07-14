import { query } from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { updateSubscriptionUserCount } from './subscriptionController.js';
import { sendEmail } from '../services/emailService.js';
import { v4 as uuidv4 } from 'uuid';
import { getUserTeamContext } from '../utils/teamUtils.js';

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
    
    const result = await query(
      `SELECT id, email, first_name, last_name, role, created_at, last_login_at
       FROM users 
       WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [organizationId]
    );

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
    const { email, firstName, lastName, role = 'member', sendWelcomeEmail = true } = req.body;
    const organizationId = req.user.organizationId || req.user.organization_id;
    const createdBy = req.user.id;

    // Check if user can create users (must be consultant)
    if (!req.user.is_consultant) {
      return res.status(403).json({ error: 'Only consultants can create users directly' });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Generate temporary password - using fixed password for testing
    // TODO: Change this back to crypto.randomBytes(8).toString('hex') for production
    const temporaryPassword = 'abc123';
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
    
    res.json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        invitation_link: invitationLink
      }
    });
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

// Get user's available departments based on their permissions
export const getUserDepartments = async (req, res) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.organizationId || req.user.organization_id;
    
    console.log('Getting departments for user:', { userId, organizationId });
    
    // Get user's team context to determine if they're on leadership team
    const userTeam = await getUserTeamContext(userId, organizationId);
    const isLeadershipMember = userTeam && userTeam.is_leadership_team;
    
    console.log('User team context:', userTeam);
    console.log('Is leadership member:', isLeadershipMember);
    
    let availableDepartments;
    
    if (isLeadershipMember) {
      // Leadership members can see ALL departments
      const result = await query(
        `SELECT id, name, is_leadership_team
         FROM teams 
         WHERE organization_id = $1
         ORDER BY is_leadership_team DESC, name ASC`,
        [organizationId]
      );
      availableDepartments = result.rows;
    } else {
      // Regular users only see their own departments
      const result = await query(
        `SELECT DISTINCT t.id, t.name, t.is_leadership_team
         FROM teams t
         JOIN team_members tm ON t.id = tm.team_id
         WHERE tm.user_id = $1 AND t.organization_id = $2
         ORDER BY t.name ASC`,
        [userId, organizationId]
      );
      availableDepartments = result.rows;
    }
    
    const departments = availableDepartments.map(team => ({
      id: team.id,
      name: team.name,
      is_leadership_team: team.is_leadership_team
    }));
    
    console.log('Available departments:', departments);
    
    // If no departments found, provide default Leadership Team
    if (departments.length === 0) {
      console.log('No departments found, providing default Leadership Team');
      departments.push({
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Leadership Team',
        is_leadership_team: true
      });
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