import jwt from 'jsonwebtoken';
import ActivityTrackingService from '../services/activityTrackingService.js';

const activityService = ActivityTrackingService.getInstance();

// Helper function to extract feature name from path
function extractFeatureName(path) {
  // Remove /api/v1/ prefix
  const cleanPath = path.replace(/^\/api\/v1\//, '');
  
  // Route mapping to feature names
  const featureMap = {
    // Core features
    'quarterly-priorities': 'priorities',
    'priorities': 'priorities',
    'scorecard': 'scorecard',
    'meetings': 'meetings',
    'issues': 'issues',
    'todos': 'todos',
    'headlines': 'headlines',
    
    // Admin features
    'admin/system-health': 'admin-health',
    'admin/failed-operations': 'admin-operations',
    'admin/user-activity': 'admin-activity',
    'admin/activity': 'admin-activity',
    'activity/top-users': 'admin-activity',
    'activity/recent': 'admin-activity',
    'activity/stats': 'admin-activity',
    
    // Organization features
    'organizations': 'organizations',
    'teams': 'teams',
    'users': 'users',
    'departments': 'teams',
    'auth': 'authentication',
    'profile': 'profile',
    'current': 'organizations',
    
    // Documents & Processes
    'processes': 'processes',
    'documents': 'documents',
    'business-blueprint': 'vision',
    'vto': 'vision',
    'check-agreements': 'legal',
    
    // Meeting types
    'meeting-sessions': 'meetings',
    'weekly-accountability': 'meetings',
    'quarterly-planning': 'meetings',
    'annual-planning': 'meetings',
    
    // Other
    'subscription': 'billing',
    'status': 'billing',
    'terminology': 'settings',
    'daily-active-users': 'analytics',
    'todo-reminders': 'todos',
    'export': 'export',
    'import': 'import'
  };
  
  // Extract the primary segment (first meaningful part of path)
  const segments = cleanPath.split('/').filter(s => s && !s.match(/^[0-9a-f-]{36}$/i));
  
  if (segments.length === 0) {
    return 'dashboard';
  }
  
  // Check if first segment matches our map
  if (featureMap[segments[0]]) {
    return featureMap[segments[0]];
  }
  
  // Check if first two segments combined match (e.g., "admin/system-health")
  if (segments.length >= 2) {
    const combined = `${segments[0]}/${segments[1]}`;
    if (featureMap[combined]) {
      return featureMap[combined];
    }
  }
  
  // Check for nested routes (e.g., organizations/.../quarterly-priorities)
  for (let i = 0; i < segments.length; i++) {
    if (featureMap[segments[i]]) {
      return featureMap[segments[i]];
    }
  }
  
  // Default to first segment
  return segments[0] || 'unknown';
}

// Middleware to automatically track user activity
export const trackUserActivity = (req, res, next) => {
  // Extract user from JWT token if not already set by auth middleware
  if (!req.user) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { 
          id: decoded.userId || decoded.id,
          organization_id: decoded.organizationId || decoded.organization_id
        };
      } catch (error) {
        // Token invalid or expired, skip tracking
      }
    }
  }
  
  // Extract feature name from path
  const featureName = extractFeatureName(req.path);
  
  // Only log activity tracking in development for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[ActivityTracking] ${req.method} ${req.path} - User: ${req.user?.id || 'none'} - Feature: ${featureName}`);
  }
  
  // Skip if no user or if it's a health check
  if (!req.user || req.path === '/api/v1/admin/system-health') {
    return next();
  }

  // Skip static assets
  if (req.path.startsWith('/static') || req.path.startsWith('/uploads')) {
    return next();
  }

  const startTime = Date.now();
  
  // Capture original end function to track when request completes
  const originalEnd = res.end;
  
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    // Only track successful requests and non-GET requests (to reduce noise)
    if (res.statusCode < 400) {
      // Determine action type based on method and feature
      let actionType = 'page_view';
      
      // Create action type based on HTTP method and feature
      switch (req.method) {
        case 'GET':
          actionType = `view_${featureName}`;
          break;
        case 'POST':
          actionType = `create_${featureName}`;
          break;
        case 'PUT':
        case 'PATCH':
          actionType = `update_${featureName}`;
          break;
        case 'DELETE':
          actionType = `delete_${featureName}`;
          break;
        default:
          actionType = `${req.method.toLowerCase()}_${featureName}`;
      }
      
      // Track the activity asynchronously (don't wait for it)
      activityService.trackActivity({
        userId: req.user.id || req.user.userId,
        organizationId: req.user.organization_id || req.user.organizationId,
        actionType,
        featureName,
        pagePath: req.path,
        metadata: {
          method: req.method,
          statusCode: res.statusCode,
          duration
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        durationMs: duration
      }).catch(err => {
        // Log but don't break the app
        console.error('[ActivityTracking] Error tracking activity:', err);
      });
    }
    
    // Call original end
    originalEnd.apply(res, args);
  };
  
  next();
};

export default trackUserActivity;