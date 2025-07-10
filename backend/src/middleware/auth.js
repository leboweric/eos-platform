import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const result = await query(
      'SELECT id, email, first_name, last_name, role, organization_id, is_eosi FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. User not found.'
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token.'
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Please authenticate.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

export const checkOrganizationAccess = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    // Check if user belongs to the organization
    if (req.user.organization_id !== orgId) {
      // Check if user is EOSI with access to this organization
      if (req.user.is_eosi) {
        const accessCheck = await query(
          'SELECT 1 FROM eosi_organizations WHERE eosi_user_id = $1 AND organization_id = $2',
          [req.user.id, orgId]
        );
        
        if (accessCheck.rows.length > 0) {
          // EOSI has access, allow them through
          next();
          return;
        }
      }
      
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have access to this organization.'
      });
    }

    next();
  } catch (error) {
    console.error('Organization access check error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during authorization check.'
    });
  }
};

export const checkTeamAccess = async (req, res, next) => {
  try {
    const { orgId, teamId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    // Check if user belongs to the organization
    if (req.user.organization_id !== orgId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have access to this organization.'
      });
    }

    // Check if user has access to the team
    const result = await query(
      `SELECT tm.id FROM team_members tm 
       JOIN teams t ON tm.team_id = t.id 
       WHERE tm.user_id = $1 AND t.id = $2 AND t.organization_id = $3`,
      [req.user.id, teamId, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have access to this team.'
      });
    }

    next();
  } catch (error) {
    console.error('Team access check error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during team authorization check.'
    });
  }
};

