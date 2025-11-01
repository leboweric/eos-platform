// observabilityService import removed to avoid circular dependency

/**
 * Wraps the PostgreSQL pool.query method to track slow queries
 * IMPORTANT: Must preserve all other pool methods (connect, end, etc.)
 */
export function wrapQueryWithMetrics(pool) {
  
  // Save original methods - CRITICAL to preserve all pool functionality
  const originalQuery = pool.query.bind(pool);
  const originalConnect = pool.connect ? pool.connect.bind(pool) : null;
  const originalEnd = pool.end ? pool.end.bind(pool) : null;
  const originalOn = pool.on ? pool.on.bind(pool) : null;
  
  // Wrap the query method for tracking
  pool.query = async function(...args) {
    const start = Date.now();
    const [queryText] = args;
    
    try {
      const result = await originalQuery(...args);
      const duration = Date.now() - start;
      
      // Only track slow queries (>500ms)
      if (duration > 500) {
        // Sanitize query text to remove sensitive data
        const sanitizedQuery = typeof queryText === 'string' 
          ? queryText.substring(0, 500) 
          : String(queryText).substring(0, 500);
        
        // Observability tracking using dynamic import to avoid circular dependency
        import('../services/observabilityService.js').then(({ default: observabilityService }) => {
          observabilityService.trackQuery(
            sanitizedQuery,
            duration,
            null, // endpoint context not available at this level
            null  // organization context not available at this level
          );
        }).catch(() => {
          // Silently fail if observability service is not available
        });
      }
      
      return result;
    } catch (error) {
      // Re-throw the error after logging
      console.error('[QueryMetrics] Query execution failed:', error.message);
      throw error;
    }
  };
  
  // CRITICAL: Restore all other pool methods that were lost
  if (originalConnect) {
    pool.connect = originalConnect;
  }
  if (originalEnd) {
    pool.end = originalEnd;
  }
  if (originalOn) {
    pool.on = originalOn;
  }
  
  // Only log in debug mode to reduce Railway rate limiting
  if (process.env.LOG_LEVEL === 'debug') {
    console.log('[QueryMetrics] ✅ Query tracking enabled (pool methods preserved)');
  }
}

/**
 * Context manager for adding request context to query tracking
 * This can be enhanced in the future to pass endpoint and org info
 */
export class QueryContext {
  static endpoint = null;
  static organizationId = null;
  
  static setContext(endpoint, organizationId) {
    this.endpoint = endpoint;
    this.organizationId = organizationId;
  }
  
  static clearContext() {
    this.endpoint = null;
    this.organizationId = null;
  }
  
  static getContext() {
    return {
      endpoint: this.endpoint,
      organizationId: this.organizationId
    };
  }
}