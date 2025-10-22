import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    // Debug logging for troubleshooting
    logger.debug('Auth header received:', authHeader ? 'Bearer token present' : 'No auth header');
    logger.debug('Request URL:', req.url);
    if (token) {
      logger.debug('Token preview:', token.substring(0, 20) + '...');
      logger.debug('Token length:', token.length);
    }

    if (!token) {
      logger.debug('Authentication failed: No token provided');
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    let decoded;
    try {
      if (!process.env.JWT_SECRET) {
        logger.error('JWT_SECRET is not defined in environment variables!');
        return res.status(500).json({
          success: false,
          error: 'Server configuration error.'
        });
      }
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      // OAuth tokens use 'id' field, not 'userId'
      const userId = decoded.id || decoded.userId;
      logger.debug('Token verified successfully for user:', userId);
      logger.debug('Decoded token fields:', Object.keys(decoded));
    } catch (jwtError) {
      logger.error('JWT verification error:', jwtError.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid token.'
      });
    }
    
    // Get user from database (use 'id' field from OAuth tokens or 'userId' from regular tokens)
    const userId = decoded.id || decoded.userId;
    const result = await query(
      'SELECT id, email, first_name, last_name, role, organization_id, is_consultant FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. User not found.'
      });
    }

    req.user = result.rows[0];
    
    // Set user's organization ID (impersonation feature removed)
    req.user.organizationId = req.user.organization_id;
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
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
      // Check if user is Consultant with access to this organization
      if (req.user.is_consultant) {
        const accessCheck = await query(
          'SELECT 1 FROM consultant_organizations WHERE consultant_user_id = $1 AND organization_id = $2',
          [req.user.id, orgId]
        );
        
        if (accessCheck.rows.length > 0) {
          // Consultant has access, allow them through
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
    logger.error('Organization access check error:', error);
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
    logger.error('Team access check error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during team authorization check.'
    });
  }
};

