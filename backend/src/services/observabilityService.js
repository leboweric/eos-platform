import os from 'os';

class ObservabilityService {
  constructor() {
    // Circular buffer for last 1000 requests
    this.requestMetrics = [];
    this.maxRequests = 1000;
    
    // Store slow queries from last hour
    this.slowQueries = [];
    this.slowQueryThreshold = 500; // ms
    
    // External service health tracking
    this.externalServices = {
      sendgrid: { status: 'unknown', lastCheck: null, lastError: null },
      stripe: { status: 'unknown', lastCheck: null, lastWebhook: null },
      oauth: { status: 'unknown', lastCheck: null },
      openai: { status: 'unknown', lastCheck: null }
    };
    
    // WebSocket metrics
    this.websocketMetrics = {
      totalConnections: 0,
      connectionsByOrg: new Map(),
      activeMeetings: 0
    };
    
    // Start cleanup interval (every 5 minutes)
    setInterval(() => this.cleanOldData(), 5 * 60 * 1000);
  }

  // Track API request
  trackRequest(method, endpoint, duration, statusCode, organizationId = null, errorMessage = null) {
    // Skip tracking for common 404s that aren't real errors
    const ignoredPaths = [
      '/favicon.ico',
      '/robots.txt',
      '/sitemap.xml',
      '/.well-known',
      '/apple-touch-icon',
      '/browserconfig.xml',
      '/manifest.json',
      '/service-worker.js',
      '/workbox-',
      '/_next/',
      '/static/'
    ];
    
    // Check if this is an ignorable 404
    if (statusCode === 404 && ignoredPaths.some(path => endpoint.includes(path))) {
      return; // Skip tracking this request
    }
    
    const metric = {
      method,
      endpoint,
      duration,
      statusCode,
      timestamp: new Date(),
      organizationId,
      errorMessage: statusCode >= 400 ? errorMessage : null
    };
    
    // Add to circular buffer
    this.requestMetrics.push(metric);
    if (this.requestMetrics.length > this.maxRequests) {
      this.requestMetrics.shift(); // Remove oldest
    }
  }

  // Track database query
  trackQuery(queryText, duration, endpoint, organizationId = null) {
    if (duration > this.slowQueryThreshold) {
      const slowQuery = {
        query: this.sanitizeQuery(queryText),
        duration,
        endpoint,
        organizationId,
        timestamp: new Date()
      };
      
      this.slowQueries.push(slowQuery);
    }
  }

  // Update WebSocket metrics
  updateWebSocketMetrics(totalConnections, connectionsByOrg, activeMeetings) {
    this.websocketMetrics = {
      totalConnections,
      connectionsByOrg,
      activeMeetings,
      lastUpdated: new Date()
    };
  }

  // Update external service status
  updateExternalServiceStatus(service, status, details = {}) {
    if (this.externalServices[service]) {
      this.externalServices[service] = {
        ...this.externalServices[service],
        status,
        lastCheck: new Date(),
        ...details
      };
    }
  }

  // Get comprehensive system health
  async getSystemHealth(db = null) {
    const [apiMetrics, dbMetrics, wsMetrics, extServices, sysResources, failedOps] = await Promise.all([
      this.getApiMetrics(),
      this.getDatabaseMetrics(db),
      this.getWebSocketMetrics(),
      this.getExternalServiceHealth(),
      this.getSystemResources(),
      this.getFailedOperationsStats(db)
    ]);
    
    // Calculate overall health status
    const overallHealth = this.calculateOverallHealth(apiMetrics, dbMetrics, extServices);
    
    return {
      status: overallHealth,
      timestamp: new Date(),
      api: apiMetrics,
      database: dbMetrics,
      websockets: wsMetrics,
      externalServices: extServices,
      system: sysResources,
      failedOperations: failedOps
    };
  }

  // Get API metrics
  getApiMetrics() {
    const now = new Date();
    const oneMinuteAgo = new Date(now - 60 * 1000);
    
    // Filter recent requests
    const recentRequests = this.requestMetrics.filter(r => r.timestamp > oneMinuteAgo);
    
    // Calculate metrics
    const totalRequests = recentRequests.length;
    const errorRequests = recentRequests.filter(r => r.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
    
    // Response times
    const durations = this.requestMetrics.map(r => r.duration).filter(d => d !== undefined);
    const avgResponseTime = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0;
    
    const p50 = this.calculatePercentile(durations, 50);
    const p95 = this.calculatePercentile(durations, 95);
    const p99 = this.calculatePercentile(durations, 99);
    
    // Endpoint breakdown
    const endpointStats = {};
    this.requestMetrics.forEach(r => {
      if (!endpointStats[r.endpoint]) {
        endpointStats[r.endpoint] = { count: 0, totalDuration: 0, errors: 0 };
      }
      endpointStats[r.endpoint].count++;
      endpointStats[r.endpoint].totalDuration += r.duration || 0;
      if (r.statusCode >= 400) endpointStats[r.endpoint].errors++;
    });
    
    // Find slowest endpoints
    const slowestEndpoints = Object.entries(endpointStats)
      .map(([endpoint, stats]) => ({
        endpoint,
        avgDuration: stats.totalDuration / stats.count,
        count: stats.count,
        errorRate: (stats.errors / stats.count) * 100
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);
    
    // Determine health status
    let status = 'healthy';
    if (errorRate > 5 || p95 > 1000) status = 'degraded';
    if (errorRate > 10 || p95 > 3000) status = 'critical';
    
    return {
      status,
      requestsPerMinute: totalRequests,
      errorRate: errorRate.toFixed(2),
      avgResponseTime: Math.round(avgResponseTime),
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      totalTracked: this.requestMetrics.length,
      slowestEndpoints,
      recentErrors: this.requestMetrics
        .filter(r => r.statusCode >= 400)
        .slice(-10)
        .reverse() // Most recent first
        .map(r => ({
          method: r.method,
          endpoint: r.endpoint,
          statusCode: r.statusCode,
          timestamp: r.timestamp,
          duration: r.duration,
          errorMessage: r.errorMessage,
          organizationId: r.organizationId
        }))
    };
  }

  // Get database metrics
  async getDatabaseMetrics(db = null) {
    let dbStats = {};
    let connectionInfo = {};
    
    // If no database connection provided, return minimal stats
    if (!db) {
      return {
        status: 'unavailable',
        error: 'Database connection not provided'
      };
    }
    
    try {
      // Get connection pool stats
      const poolStats = db.pool ? {
        total: db.pool.totalCount || 0,
        idle: db.pool.idleCount || 0,
        waiting: db.pool.waitingCount || 0
      } : { total: 0, idle: 0, waiting: 0 };
      
      // Get database size
      const sizeResult = await db.query(`
        SELECT pg_database_size(current_database()) as size
      `);
      const dbSize = parseInt(sizeResult.rows[0].size);
      
      // Get connection info
      const connResult = await db.query(`
        SELECT count(*) as active_connections,
               max_connections
        FROM pg_stat_activity
        CROSS JOIN (SELECT setting::int as max_connections FROM pg_settings WHERE name = 'max_connections') s
        WHERE state = 'active'
        GROUP BY max_connections
      `);
      
      connectionInfo = connResult.rows[0] || { active_connections: 0, max_connections: 100 };
      
      // Get slow queries from last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentSlowQueries = this.slowQueries.filter(q => q.timestamp > oneHourAgo);
      
      // Find slowest query
      const slowestQuery = recentSlowQueries.length > 0
        ? recentSlowQueries.reduce((max, q) => q.duration > max.duration ? q : max)
        : null;
      
      // Determine health status
      const connectionUsage = (connectionInfo.active_connections / connectionInfo.max_connections) * 100;
      let status = 'healthy';
      if (connectionUsage > 70 || recentSlowQueries.length > 10) status = 'degraded';
      if (connectionUsage > 90 || recentSlowQueries.length > 50) status = 'critical';
      
      dbStats = {
        status,
        connections: {
          active: connectionInfo.active_connections || 0,
          max: connectionInfo.max_connections || 100,
          percentage: connectionUsage.toFixed(1)
        },
        pool: poolStats,
        slowQueries: {
          count: recentSlowQueries.length,
          threshold: this.slowQueryThreshold,
          slowest: slowestQuery ? {
            query: slowestQuery.query.substring(0, 100),
            duration: slowestQuery.duration,
            endpoint: slowestQuery.endpoint,
            age: Math.round((Date.now() - slowestQuery.timestamp) / 1000 / 60) // minutes
          } : null
        },
        size: {
          bytes: dbSize,
          formatted: this.formatBytes(dbSize)
        }
      };
    } catch (error) {
      console.error('Error getting database metrics:', error);
      dbStats = {
        status: 'error',
        error: error.message
      };
    }
    
    return dbStats;
  }

  // Get WebSocket metrics
  getWebSocketMetrics() {
    const { totalConnections, connectionsByOrg, activeMeetings } = this.websocketMetrics;
    
    // Get top organizations by connections
    const topOrgs = Array.from(connectionsByOrg.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([orgId, count]) => ({ orgId, count }));
    
    // Determine health status
    let status = 'healthy';
    if (totalConnections > 100) status = 'degraded';
    if (totalConnections > 500) status = 'critical';
    
    return {
      status,
      totalConnections,
      activeMeetings,
      topOrganizations: topOrgs,
      lastUpdated: this.websocketMetrics.lastUpdated
    };
  }

  // Check SendGrid health
  async checkSendGridHealth() {
    try {
      const apiKey = process.env.SENDGRID_API_KEY;
      
      if (!apiKey) {
        return { status: 'unavailable', message: 'API key not configured' };
      }
      
      if (!apiKey.startsWith('SG.')) {
        return { status: 'down', message: 'API key invalid format' };
      }
      
      // Check if we've sent emails recently
      if (global.lastEmailSend && Date.now() - global.lastEmailSend < 3600000) {
        return { status: 'healthy', message: 'Recently sent emails successfully' };
      }
      
      return { status: 'healthy', message: 'API key configured' };
    } catch (error) {
      return { status: 'down', message: error.message };
    }
  }

  // Check Stripe health
  async checkStripeHealth() {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return { status: 'unavailable', message: 'API key not configured' };
      }
      
      // Check if we've received webhooks recently
      if (global.lastStripeWebhook && Date.now() - global.lastStripeWebhook < 86400000) {
        return { status: 'healthy', message: 'Recently received webhooks' };
      }
      
      // If we wanted to actually test (costs API calls):
      // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      // const balance = await stripe.balance.retrieve();
      
      return { status: 'healthy', message: 'API key configured' };
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return { status: 'down', message: 'Cannot reach Stripe API' };
      }
      return { status: 'down', message: 'API key invalid or expired' };
    }
  }

  // Check AssemblyAI health
  async checkAssemblyAIHealth() {
    try {
      const apiKey = process.env.ASSEMBLYAI_API_KEY;
      
      if (!apiKey) {
        return { status: 'unavailable', message: 'API key not configured' };
      }
      
      // Simple check - just verify key exists and format
      if (apiKey.length < 20) {
        return { status: 'down', message: 'API key invalid format' };
      }
      
      return { status: 'healthy', message: 'API key configured' };
    } catch (error) {
      return { status: 'down', message: error.message };
    }
  }

  // Check OAuth health
  async checkOAuthHealth() {
    try {
      const hasGoogle = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
      const hasMicrosoft = process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET;
      
      if (!hasGoogle && !hasMicrosoft) {
        return { status: 'unavailable', message: 'No OAuth providers configured' };
      }
      
      // Check recent OAuth activity
      if (global.lastOAuthSuccess && Date.now() - global.lastOAuthSuccess < 3600000) {
        return { status: 'healthy', message: 'Recent successful logins' };
      }
      
      if (global.lastOAuthError && Date.now() - global.lastOAuthError < 3600000) {
        return { status: 'degraded', message: 'Recent login failures' };
      }
      
      const providers = [];
      if (hasGoogle) providers.push('Google');
      if (hasMicrosoft) providers.push('Microsoft');
      
      return { status: 'healthy', message: `${providers.join(', ')} configured` };
    } catch (error) {
      return { status: 'down', message: error.message };
    }
  }

  // Check OpenAI health
  async checkOpenAIHealth() {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        return { status: 'unavailable', message: 'API key not configured' };
      }
      
      if (!apiKey.startsWith('sk-')) {
        return { status: 'down', message: 'API key invalid format' };
      }
      
      return { status: 'healthy', message: 'API key configured' };
    } catch (error) {
      return { status: 'down', message: error.message };
    }
  }

  // Get external service health
  async getExternalServiceHealth() {
    // Run all checks in parallel with timeout protection
    const checks = await Promise.allSettled([
      Promise.race([
        this.checkSendGridHealth(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]),
      Promise.race([
        this.checkStripeHealth(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]),
      Promise.race([
        this.checkAssemblyAIHealth(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]),
      Promise.race([
        this.checkOAuthHealth(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]),
      Promise.race([
        this.checkOpenAIHealth(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ])
    ]);

    const services = {
      sendgrid: checks[0].status === 'fulfilled' && checks[0].value ? 
        checks[0].value : { status: 'unknown', message: 'Check failed' },
      stripe: checks[1].status === 'fulfilled' && checks[1].value ? 
        checks[1].value : { status: 'unknown', message: 'Check failed' },
      assemblyai: checks[2].status === 'fulfilled' && checks[2].value ? 
        checks[2].value : { status: 'unknown', message: 'Check failed' },
      oauth: checks[3].status === 'fulfilled' && checks[3].value ? 
        checks[3].value : { status: 'unknown', message: 'Check failed' },
      openai: checks[4].status === 'fulfilled' && checks[4].value ? 
        checks[4].value : { status: 'unknown', message: 'Check failed' }
    };

    // Calculate overall status
    let overallStatus = 'healthy';
    Object.values(services).forEach(service => {
      if (service.status === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
      if (service.status === 'down' || service.status === 'error') {
        overallStatus = 'critical';
      }
    });
    
    return {
      status: overallStatus,
      services
    };
  }

  // Get system resources
  getSystemResources() {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      memory: {
        node: {
          rss: this.formatBytes(memUsage.rss),
          heapUsed: this.formatBytes(memUsage.heapUsed),
          heapTotal: this.formatBytes(memUsage.heapTotal),
          external: this.formatBytes(memUsage.external),
          percentage: ((memUsage.rss / totalMem) * 100).toFixed(2)
        },
        system: {
          total: this.formatBytes(totalMem),
          free: this.formatBytes(freeMem),
          used: this.formatBytes(usedMem),
          percentage: ((usedMem / totalMem) * 100).toFixed(2)
        }
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model,
        loadAverage: os.loadavg()
      },
      uptime: {
        process: this.formatUptime(process.uptime()),
        system: this.formatUptime(os.uptime())
      },
      environment: {
        node: process.version,
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        env: process.env.NODE_ENV || 'development'
      }
    };
  }

  // Helper: Calculate percentile
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  // Helper: Clean old data
  cleanOldData() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Remove old slow queries
    this.slowQueries = this.slowQueries.filter(q => q.timestamp > oneHourAgo);
    
    // Keep only last 1000 requests (already handled in trackRequest)
  }

  // Helper: Sanitize query text
  sanitizeQuery(query) {
    // Remove sensitive data patterns
    let sanitized = query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/api_key\s*=\s*'[^']*'/gi, "api_key='***'")
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***')
      .replace(/Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, 'Bearer ***');
    
    // Truncate if too long
    if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 500) + '...';
    }
    
    return sanitized;
  }

  // Helper: Format bytes
  formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  // Helper: Format uptime
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '0m';
  }

  // Get failed operations statistics
  async getFailedOperationsStats(db = null) {
    // If no database connection provided, return zeros
    if (!db) {
      return {
        total: 0,
        unresolved: 0,
        critical: 0,
        last24h: 0
      };
    }
    
    try {
      // Get counts from database
      const totalResult = await db.query(
        'SELECT COUNT(*) as count FROM failed_operations'
      );
      const total = parseInt(totalResult.rows[0].count);

      const unresolvedResult = await db.query(
        'SELECT COUNT(*) as count FROM failed_operations WHERE resolved_at IS NULL'
      );
      const unresolved = parseInt(unresolvedResult.rows[0].count);

      const criticalResult = await db.query(
        `SELECT COUNT(*) as count FROM failed_operations 
         WHERE severity = 'critical' AND resolved_at IS NULL`
      );
      const critical = parseInt(criticalResult.rows[0].count);

      const last24hResult = await db.query(
        `SELECT COUNT(*) as count FROM failed_operations 
         WHERE created_at >= NOW() - INTERVAL '24 hours'`
      );
      const last24h = parseInt(last24hResult.rows[0].count);

      return {
        total,
        unresolved,
        critical,
        last24h
      };
    } catch (error) {
      console.error('Error getting failed operations stats:', error);
      return {
        total: 0,
        unresolved: 0,
        critical: 0,
        last24h: 0
      };
    }
  }

  // Helper: Calculate overall health
  calculateOverallHealth(apiMetrics, dbMetrics, extServices) {
    const statuses = [
      apiMetrics.status,
      dbMetrics.status,
      extServices.status
    ];
    
    if (statuses.includes('critical') || statuses.includes('error')) return 'critical';
    if (statuses.includes('degraded')) return 'degraded';
    return 'healthy';
  }
}

// Export singleton instance
export default new ObservabilityService();