// This file should be renamed to consultantController.js
import { query, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../services/emailService.js';
import { v4 as uuidv4 } from 'uuid';

// Create a new client organization
export const createClientOrganization = async (req, res) => {
  try {
    const { name, adminEmail, adminFirstName, adminLastName } = req.body;
    const consultantUserId = req.user.id;

    // Verify user is Consultant
    if (!req.user.is_eosi) {
      return res.status(403).json({ error: 'Only Consultant users can create client organizations' });
    }

    // Check if admin email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    // Create organization slug
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingOrg = await query('SELECT id FROM organizations WHERE slug = $1', [slug]);
    if (existingOrg.rows.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const client = await beginTransaction();

    try {
      // Create organization
      const orgResult = await client.query(
        'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id',
        [name, slug]
      );
      const organizationId = orgResult.rows[0].id;

      // Create Consultant-organization relationship
      await client.query(
        'INSERT INTO eosi_organizations (eosi_user_id, organization_id) VALUES ($1, $2)',
        [consultantUserId, organizationId]
      );

      // Generate temporary password
      const tempPassword = uuidv4().slice(0, 12);
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      // Create admin user for the organization
      const userResult = await client.query(
        `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [organizationId, adminEmail, passwordHash, adminFirstName, adminLastName, 'admin']
      );
      const adminUserId = userResult.rows[0].id;

      // Create default team
      const teamResult = await client.query(
        'INSERT INTO teams (organization_id, name, description) VALUES ($1, $2, $3) RETURNING id',
        [organizationId, 'Leadership Team', 'Default leadership team']
      );
      const teamId = teamResult.rows[0].id;

      // Add admin to team
      await client.query(
        'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
        [teamId, adminUserId, 'admin']
      );

      await commitTransaction(client);

      // Send welcome email to admin
      await sendEmail(adminEmail, 'clientWelcome', {
        firstName: adminFirstName,
        organizationName: name,
        email: adminEmail,
        tempPassword,
        consultantName: `${req.user.first_name} ${req.user.last_name}`,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`
      });

      res.status(201).json({
        success: true,
        data: {
          organizationId,
          organizationName: name,
          adminEmail,
          message: 'Client organization created successfully. Admin has been sent login credentials.'
        }
      });

    } catch (error) {
      await rollbackTransaction(client);
      throw error;
    }

  } catch (error) {
    console.error('Create client organization error:', error);
    res.status(500).json({ error: 'Failed to create client organization' });
  }
};

// Get all client organizations for Consultant
export const getClientOrganizations = async (req, res) => {
  try {
    if (!req.user.is_eosi) {
      return res.status(403).json({ error: 'Only Consultant users can access this endpoint' });
    }

    const result = await query(
      `SELECT o.id, o.name, o.slug, o.created_at,
              COUNT(DISTINCT u.id) as user_count,
              COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'on_track') as rocks_on_track,
              COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'off_track') as rocks_off_track,
              COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'at_risk') as rocks_at_risk,
              s.status as subscription_status,
              s.user_count * s.price_per_user as monthly_revenue
       FROM eosi_organizations eo
       JOIN organizations o ON eo.organization_id = o.id
       LEFT JOIN users u ON u.organization_id = o.id
       LEFT JOIN rocks r ON r.organization_id = o.id AND r.quarter = 
         (SELECT MAX(quarter) FROM rocks WHERE organization_id = o.id)
       LEFT JOIN subscriptions s ON s.organization_id = o.id
       WHERE eo.eosi_user_id = $1
       GROUP BY o.id, s.status, s.user_count, s.price_per_user
       ORDER BY o.name`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get client organizations error:', error);
    res.status(500).json({ error: 'Failed to get client organizations' });
  }
};

// Switch to client organization (impersonate)
export const switchToClientOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params;

    if (!req.user.is_eosi) {
      return res.status(403).json({ error: 'Only Consultant users can switch organizations' });
    }

    // Verify Consultant has access to this organization
    const accessCheck = await query(
      'SELECT 1 FROM eosi_organizations WHERE eosi_user_id = $1 AND organization_id = $2',
      [req.user.id, organizationId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have access to this organization' });
    }

    // Get organization details
    const orgResult = await query(
      'SELECT id, name, slug FROM organizations WHERE id = $1',
      [organizationId]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const organization = orgResult.rows[0];

    // Return a special token that includes both Consultant status and current organization
    res.json({
      success: true,
      data: {
        impersonating: true,
        organizationId: organization.id,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        returnToConsultant: true
      }
    });

  } catch (error) {
    console.error('Switch organization error:', error);
    res.status(500).json({ error: 'Failed to switch organization' });
  }
};

// Get client organization dashboard data
export const getClientDashboard = async (req, res) => {
  try {
    const { organizationId } = req.params;

    if (!req.user.is_eosi) {
      return res.status(403).json({ error: 'Only Consultant users can access this endpoint' });
    }

    // Verify Consultant has access to this organization
    const accessCheck = await query(
      'SELECT 1 FROM eosi_organizations WHERE eosi_user_id = $1 AND organization_id = $2',
      [req.user.id, organizationId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have access to this organization' });
    }

    // Get comprehensive dashboard data
    const dashboardData = {};

    // Organization info
    const orgResult = await query(
      'SELECT * FROM organizations WHERE id = $1',
      [organizationId]
    );
    dashboardData.organization = orgResult.rows[0];

    // User count and activity
    const userResult = await query(
      `SELECT COUNT(*) as total_users,
              COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '7 days') as active_users
       FROM users WHERE organization_id = $1`,
      [organizationId]
    );
    dashboardData.users = userResult.rows[0];

    // VTO completion
    const vtoResult = await query(
      `SELECT 
        (CASE WHEN core_values IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN core_focus IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN ten_year_target IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN marketing_strategy IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN three_year_picture IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN one_year_plan IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / 6 as completion_percentage
       FROM vtos WHERE organization_id = $1`,
      [organizationId]
    );
    dashboardData.vtoCompletion = vtoResult.rows[0]?.completion_percentage || 0;

    // Current quarter rocks
    const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`;
    const rocksResult = await query(
      `SELECT status, COUNT(*) as count
       FROM rocks 
       WHERE organization_id = $1 AND quarter = $2
       GROUP BY status`,
      [organizationId, currentQuarter]
    );
    
    dashboardData.rocks = {
      quarter: currentQuarter,
      byStatus: rocksResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, { on_track: 0, off_track: 0, at_risk: 0 })
    };

    // Issues
    const issuesResult = await query(
      `SELECT type, COUNT(*) as count
       FROM issues 
       WHERE organization_id = $1 AND status = 'open'
       GROUP BY type`,
      [organizationId]
    );
    
    dashboardData.issues = issuesResult.rows.reduce((acc, row) => {
      acc[row.type] = parseInt(row.count);
      return acc;
    }, { short_term: 0, long_term: 0 });

    // Meeting attendance (last 90 days)
    const meetingResult = await query(
      `SELECT AVG(attendance_percentage) as avg_attendance
       FROM meetings 
       WHERE organization_id = $1 AND date >= NOW() - INTERVAL '90 days'`,
      [organizationId]
    );
    dashboardData.meetingAttendance = meetingResult.rows[0]?.avg_attendance || 0;

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Get client dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
};

export default {
  createClientOrganization,
  getClientOrganizations,
  switchToClientOrganization,
  getClientDashboard
};