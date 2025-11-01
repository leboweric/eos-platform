// observabilityService import removed to avoid circular dependency

// Middleware to track API request metrics
export const requestMetrics = (req, res, next) => {
  // Skip health check endpoint to avoid recursion
  if (req.path === '/api/v1/admin/system-health') {
    return next();
  }
  
  // Skip static assets and non-API routes
  if (req.path.startsWith('/static') || req.path.startsWith('/uploads')) {
    return next();
  }
  
  const startTime = Date.now();
  
  // Capture original end function
  const originalEnd = res.end;
  
  // Override end function to capture metrics
  res.end = function(...args) {
    // Calculate duration
    const duration = Date.now() - startTime;
    
    // Get organization ID from user context if available
    const organizationId = req.user?.organization_id || null;
    
    // Capture error message if status is error
    let errorMessage = null;
    if (res.statusCode >= 400) {
      // Try to get error message from response locals or body
      errorMessage = res.locals?.errorMessage || res.statusMessage || null;
    }
    
    // Track the request
    try {
      import('../services/observabilityService.js').then(({ default: observabilityService }) => {
        observabilityService.trackRequest(
          req.method,
          req.path,
          duration,
          res.statusCode,
          organizationId,
          errorMessage
        );
      }).catch(() => {
        // Silently fail if observability service is not available
      });
    } catch (error) {
      // Don't let observability errors break the app
      console.error('Error tracking request metrics:', error);
    }
    
    // Call original end
    originalEnd.apply(res, args);
  };
  
  next();
};

export default requestMetrics;