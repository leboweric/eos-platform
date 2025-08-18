import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { query, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js';
import { sendEmail } from '../services/emailService.js';

// Helper function to generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' } // Increased from 15m to 2h
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

// Helper function to create organization slug
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// @desc    Register a new user and organization
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName, organizationName, legalAgreement } = req.body;

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Check if this is a Consultant user
    // TODO: Replace with proper consultant verification logic
    const isConsultant = email.toLowerCase().endsWith('@eosworldwide.com');

    // Create organization slug
    let slug = createSlug(organizationName);
    
    // Check if slug exists and make it unique
    const existingOrg = await query('SELECT id FROM organizations WHERE slug = $1', [slug]);
    if (existingOrg.rows.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Start transaction
    const client = await beginTransaction();

    try {
      // Create organization
      const orgResult = await client.query(
        'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id',
        [organizationName, slug]
      );
      const organizationId = orgResult.rows[0].id;

      // Create user with legal agreement tracking
      const userResult = await client.query(
        `INSERT INTO users (
          organization_id, email, password_hash, first_name, last_name, role, 
          is_consultant, consultant_email,
          terms_accepted_at, privacy_accepted_at, terms_version, privacy_version,
          agreement_ip_address, agreement_user_agent
        ) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
         RETURNING id, email, first_name, last_name, role, is_consultant`,
        [
          organizationId, email, passwordHash, firstName, lastName, 'admin', 
          isConsultant, isConsultant ? email : null,
          legalAgreement?.termsAccepted ? new Date() : null,
          legalAgreement?.privacyAccepted ? new Date() : null,
          legalAgreement?.version || '1.0',
          legalAgreement?.version || '1.0',
          req.ip || legalAgreement?.ipAddress,
          req.get('user-agent') || legalAgreement?.userAgent
        ]
      );
      const user = userResult.rows[0];
      
      // Log legal agreement acceptance
      if (legalAgreement?.termsAccepted) {
        await client.query(
          `INSERT INTO legal_agreement_log (user_id, agreement_type, version, action, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [user.id, 'terms_of_service', legalAgreement?.version || '1.0', 'accepted', req.ip, req.get('user-agent')]
        );
      }
      
      if (legalAgreement?.privacyAccepted) {
        await client.query(
          `INSERT INTO legal_agreement_log (user_id, agreement_type, version, action, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [user.id, 'privacy_policy', legalAgreement?.version || '1.0', 'accepted', req.ip, req.get('user-agent')]
        );
      }

      // Create default team
      const teamResult = await client.query(
        'INSERT INTO teams (organization_id, name, description, is_leadership_team) VALUES ($1, $2, $3, $4) RETURNING id',
        [organizationId, 'Leadership Team', 'Default leadership team', true]
      );
      const teamId = teamResult.rows[0].id;

      // Add user to team
      await client.query(
        'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
        [teamId, user.id, 'admin']
      );

      await commitTransaction(client);

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            organizationId,
            organizationName,
            isConsultant: user.is_consultant
          },
          accessToken,
          refreshToken
        }
      });

    } catch (error) {
      await rollbackTransaction(client);
      throw error;
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during registration'
    });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Get user with organization info
    const result = await query(
      `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role, u.organization_id,
              u.is_consultant, o.name as organization_name, o.slug as organization_slug
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // If Consultant user, get their client organizations
    let clientOrganizations = [];
    if (user.is_consultant) {
      const clientOrgsResult = await query(
        `SELECT o.id, o.name, o.slug 
         FROM consultant_organizations eo
         JOIN organizations o ON eo.organization_id = o.id
         WHERE eo.consultant_user_id = $1
         ORDER BY o.name`,
        [user.id]
      );
      clientOrganizations = clientOrgsResult.rows;
    }

    // Fetch user's teams - handle missing is_leadership_team column gracefully
    let teamsResult;
    try {
      teamsResult = await query(
        `SELECT t.id, t.name, t.description, t.is_leadership_team, tm.role as member_role
         FROM teams t
         JOIN team_members tm ON tm.team_id = t.id
         WHERE tm.user_id = $1 AND t.organization_id = $2
         ORDER BY t.is_leadership_team DESC, t.name`,
        [user.id, user.organization_id]
      );
    } catch (error) {
      // If column doesn't exist yet, query without it
      if (error.code === '42703') {
        teamsResult = await query(
          `SELECT t.id, t.name, t.description, false as is_leadership_team, tm.role as member_role
           FROM teams t
           JOIN team_members tm ON tm.team_id = t.id
           WHERE tm.user_id = $1 AND t.organization_id = $2
           ORDER BY t.name`,
          [user.id, user.organization_id]
        );
      } else {
        throw error;
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          organizationId: user.organization_id,
          organizationName: user.organization_name,
          organizationSlug: user.organization_slug,
          isConsultant: user.is_consultant,
          clientOrganizations,
          teams: teamsResult.rows
        },
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
};

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh
// @access  Public
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Verify user still exists
    const result = await query(
      'SELECT id, email, first_name, last_name, role, organization_id FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = async (req, res) => {
  // In a production app, you might want to blacklist the token
  // For now, we'll just return success
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    Get user profile
// @route   GET /api/v1/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.avatar_url, u.settings,
              u.organization_id, u.is_consultant, o.name as organization_name, o.slug as organization_slug
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    // Fetch user's teams - handle missing is_leadership_team column gracefully
    let teamsResult;
    try {
      teamsResult = await query(
        `SELECT t.id, t.name, t.description, t.is_leadership_team, tm.role as member_role
         FROM teams t
         JOIN team_members tm ON tm.team_id = t.id
         WHERE tm.user_id = $1 AND t.organization_id = $2
         ORDER BY t.is_leadership_team DESC, t.name`,
        [req.user.id, user.organization_id]
      );
    } catch (error) {
      // If column doesn't exist yet, query without it
      if (error.code === '42703') {
        teamsResult = await query(
          `SELECT t.id, t.name, t.description, false as is_leadership_team, tm.role as member_role
           FROM teams t
           JOIN team_members tm ON tm.team_id = t.id
           WHERE tm.user_id = $1 AND t.organization_id = $2
           ORDER BY t.name`,
          [req.user.id, user.organization_id]
        );
      } else {
        throw error;
      }
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        settings: user.settings,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        organizationSlug: user.organization_slug,
        isConsultant: user.is_consultant,
        teams: teamsResult.rows
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { firstName, lastName, email, avatarUrl, settings } = req.body;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(firstName);
    }

    if (lastName !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(lastName);
    }

    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.user.id]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Email already in use'
        });
      }

      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }

    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramCount++}`);
      values.push(avatarUrl);
    }

    if (settings !== undefined) {
      updates.push(`settings = $${paramCount++}`);
      values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.user.id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} 
       RETURNING id, email, first_name, last_name, role, avatar_url, settings`,
      values
    );

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        settings: user.settings
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    // Get user's current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear temporary password flag
    await query(
      'UPDATE users SET password_hash = $1, is_temporary_password = false, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while changing password'
    });
  }
};

// @desc    Request password reset
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email } = req.body;

    // Find user by email
    const userResult = await query(
      'SELECT id, email, first_name FROM users WHERE email = $1',
      [email]
    );

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Save token to database
    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, hashedToken, expiresAt]
    );

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send email
    try {
      await sendEmail(user.email, 'passwordReset', {
        firstName: user.first_name,
        resetLink: resetUrl
      });
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      // Delete the token if email fails
      await query('DELETE FROM password_reset_tokens WHERE token = $1', [hashedToken]);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to send password reset email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while processing password reset request'
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/v1/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { token, password } = req.body;

    // Hash the token to match what's in the database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid token
    const tokenResult = await query(
      `SELECT pr.*, u.email, u.first_name 
       FROM password_reset_tokens pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token = $1 
       AND pr.expires_at > CURRENT_TIMESTAMP 
       AND pr.used = false`,
      [hashedToken]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired password reset token'
      });
    }

    const resetToken = tokenResult.rows[0];

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Begin transaction
    await beginTransaction();

    try {
      // Update user password
      await query(
        'UPDATE users SET password = $1, needs_password_change = false WHERE id = $2',
        [hashedPassword, resetToken.user_id]
      );

      // Mark token as used
      await query(
        'UPDATE password_reset_tokens SET used = true WHERE id = $1',
        [resetToken.id]
      );

      await commitTransaction();

      res.json({
        success: true,
        message: 'Password has been reset successfully'
      });

    } catch (error) {
      await rollbackTransaction();
      throw error;
    }

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while resetting password'
    });
  }
};

