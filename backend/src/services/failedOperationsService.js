import database from '../config/database.js';

class FailedOperationsService {
  constructor() {
    // In-memory cache of recent failures for quick access
    this.recentFailures = [];
    this.maxCacheSize = 100;
  }

  /**
   * Log a failed operation to the database
   */
  async logFailure({
    organizationId,
    userId,
    operationType,
    operationName,
    error,
    context = {},
    severity = 'error'
  }) {
    try {
      // Extract error details
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      const errorStack = error?.stack || null;

      // Insert into database
      const query = `
        INSERT INTO failed_operations (
          organization_id,
          user_id,
          operation_type,
          operation_name,
          error_message,
          error_stack,
          context,
          severity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        organizationId,
        userId,
        operationType,
        operationName,
        errorMessage,
        errorStack,
        JSON.stringify(context),
        severity
      ];

      const result = await database.query(query, values);
      const failure = result.rows[0];

      // Add to cache
      this.addToCache(failure);

      // Log critical failures
      if (severity === 'critical') {
        console.error(`🚨 CRITICAL FAILURE: ${operationType}/${operationName}`, {
          organizationId,
          userId,
          error: errorMessage
        });
      }

      return failure;
    } catch (dbError) {
      // If we can't log to database, at least log to console
      console.error('Failed to log operation failure to database:', dbError);
      console.error('Original failure:', {
        operationType,
        operationName,
        error: error?.message,
        context
      });
      return null;
    }
  }

  /**
   * Log an email failure
   */
  async logEmailFailure(recipientEmail, emailType, error, context = {}) {
    return this.logFailure({
      organizationId: context.organizationId,
      userId: context.userId,
      operationType: 'email',
      operationName: emailType || 'send_email',
      error,
      context: {
        ...context,
        recipientEmail,
        emailType
      },
      severity: 'error'
    });
  }

  /**
   * Log a Stripe failure
   */
  async logStripeFailure(webhookType, error, context = {}) {
    return this.logFailure({
      organizationId: context.organizationId,
      userId: context.userId,
      operationType: 'stripe',
      operationName: webhookType || 'webhook_processing',
      error,
      context,
      severity: context.critical ? 'critical' : 'error'
    });
  }

  /**
   * Log an OAuth failure
   */
  async logOAuthFailure(provider, operation, error, context = {}) {
    return this.logFailure({
      organizationId: context.organizationId,
      userId: context.userId,
      operationType: 'oauth',
      operationName: `${provider}_${operation}`,
      error,
      context: {
        ...context,
        provider,
        operation
      },
      severity: operation === 'token_refresh' ? 'critical' : 'error'
    });
  }

  /**
   * Log a file operation failure
   */
  async logFileFailure(operation, fileName, error, context = {}) {
    return this.logFailure({
      organizationId: context.organizationId,
      userId: context.userId,
      operationType: 'file',
      operationName: operation,
      error,
      context: {
        ...context,
        fileName,
        operation
      },
      severity: 'error'
    });
  }

  /**
   * Log a WebSocket failure
   */
  async logSocketFailure(operation, error, context = {}) {
    return this.logFailure({
      organizationId: context.organizationId,
      userId: context.userId,
      operationType: 'socket',
      operationName: operation,
      error,
      context,
      severity: operation === 'connection_failed' ? 'critical' : 'error'
    });
  }

  /**
   * Get recent failures with filters
   */
  async getFailures({
    organizationId,
    operationType,
    severity,
    resolved,
    limit = 50,
    offset = 0,
    startDate,
    endDate
  }) {
    let query = `
      SELECT 
        f.*,
        u.email as user_email,
        u.first_name || ' ' || u.last_name as user_name,
        o.name as organization_name,
        r.first_name || ' ' || r.last_name as resolved_by_name
      FROM failed_operations f
      LEFT JOIN users u ON f.user_id = u.id
      LEFT JOIN organizations o ON f.organization_id = o.id
      LEFT JOIN users r ON f.resolved_by = r.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (organizationId) {
      params.push(organizationId);
      query += ` AND f.organization_id = $${++paramCount}`;
    }

    if (operationType) {
      params.push(operationType);
      query += ` AND f.operation_type = $${++paramCount}`;
    }

    if (severity) {
      params.push(severity);
      query += ` AND f.severity = $${++paramCount}`;
    }

    if (resolved !== undefined) {
      if (resolved) {
        query += ` AND f.resolved_at IS NOT NULL`;
      } else {
        query += ` AND f.resolved_at IS NULL`;
      }
    }

    if (startDate) {
      params.push(startDate);
      query += ` AND f.created_at >= $${++paramCount}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND f.created_at <= $${++paramCount}`;
    }

    // Add ordering and pagination
    query += ` ORDER BY f.created_at DESC`;
    params.push(limit);
    query += ` LIMIT $${++paramCount}`;
    params.push(offset);
    query += ` OFFSET $${++paramCount}`;

    const result = await database.query(query, params);
    return result.rows;
  }

  /**
   * Get failure statistics
   */
  async getStatistics(hours = 24) {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved_count,
        COUNT(*) FILTER (WHERE severity = 'critical' AND resolved_at IS NULL) as critical_count,
        COUNT(*) FILTER (WHERE severity = 'error' AND resolved_at IS NULL) as error_count,
        COUNT(*) FILTER (WHERE severity = 'warning' AND resolved_at IS NULL) as warning_count,
        COUNT(*) FILTER (WHERE operation_type = 'email') as email_failures,
        COUNT(*) FILTER (WHERE operation_type = 'stripe') as stripe_failures,
        COUNT(*) FILTER (WHERE operation_type = 'oauth') as oauth_failures,
        COUNT(*) FILTER (WHERE operation_type = 'file') as file_failures,
        COUNT(*) FILTER (WHERE operation_type = 'socket') as socket_failures,
        COUNT(*) as total_failures
      FROM failed_operations
      WHERE created_at >= NOW() - INTERVAL '${hours} hours'
    `;

    const result = await database.query(query);
    return result.rows[0];
  }

  /**
   * Mark a failure as resolved
   */
  async resolveFailure(failureId, resolvedBy) {
    const query = `
      UPDATE failed_operations
      SET 
        resolved_at = NOW(),
        resolved_by = $2
      WHERE id = $1
      RETURNING *
    `;

    const result = await database.query(query, [failureId, resolvedBy]);
    return result.rows[0];
  }

  /**
   * Bulk resolve failures
   */
  async bulkResolveFailures(failureIds, resolvedBy) {
    const query = `
      UPDATE failed_operations
      SET 
        resolved_at = NOW(),
        resolved_by = $2
      WHERE id = ANY($1::uuid[])
      RETURNING id
    `;

    const result = await database.query(query, [failureIds, resolvedBy]);
    return result.rows;
  }

  /**
   * Get unresolved critical failures
   */
  async getCriticalFailures() {
    const query = `
      SELECT 
        f.*,
        u.email as user_email,
        o.name as organization_name
      FROM failed_operations f
      LEFT JOIN users u ON f.user_id = u.id
      LEFT JOIN organizations o ON f.organization_id = o.id
      WHERE f.severity = 'critical' 
        AND f.resolved_at IS NULL
      ORDER BY f.created_at DESC
      LIMIT 20
    `;

    const result = await database.query(query);
    return result.rows;
  }

  /**
   * Add failure to in-memory cache
   */
  addToCache(failure) {
    this.recentFailures.unshift(failure);
    if (this.recentFailures.length > this.maxCacheSize) {
      this.recentFailures.pop();
    }
  }

  /**
   * Get recent failures from cache
   */
  getRecentFromCache(count = 10) {
    return this.recentFailures.slice(0, count);
  }

  /**
   * Clear resolved failures from cache
   */
  clearResolvedFromCache() {
    this.recentFailures = this.recentFailures.filter(f => !f.resolved_at);
  }

  /**
   * Get failure counts by type for the last N hours
   */
  async getFailureCountsByType(hours = 24) {
    const query = `
      SELECT 
        operation_type,
        COUNT(*) as count
      FROM failed_operations
      WHERE created_at >= NOW() - INTERVAL '${hours} hours'
        AND resolved_at IS NULL
      GROUP BY operation_type
      ORDER BY count DESC
    `;

    const result = await database.query(query);
    return result.rows;
  }

  /**
   * Get failures aggregated by day for the last N days
   */
  async getFailuresByDay(days = 30) {
    const query = `
      SELECT 
        DATE(created_at) as date,
        operation_type,
        severity,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved_count
      FROM failed_operations
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at), operation_type, severity
      ORDER BY date DESC, count DESC
    `;

    const result = await database.query(query);
    return result.rows;
  }

  /**
   * Get daily summary totals for the last N days
   */
  async getDailySummary(days = 30) {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
        COUNT(*) FILTER (WHERE severity = 'error') as error_count,
        COUNT(*) FILTER (WHERE severity = 'warning') as warning_count,
        COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved_count,
        COUNT(*) FILTER (WHERE operation_type = 'email') as email_count,
        COUNT(*) FILTER (WHERE operation_type = 'stripe') as stripe_count,
        COUNT(*) FILTER (WHERE operation_type = 'oauth') as oauth_count,
        COUNT(*) FILTER (WHERE operation_type = 'socket') as socket_count,
        COUNT(*) FILTER (WHERE operation_type = 'file') as file_count
      FROM failed_operations
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const result = await database.query(query);
    return result.rows;
  }

  /**
   * Check if similar failure already exists (deduplication)
   */
  async checkSimilarFailure(operationType, operationName, errorMessage, minutes = 5) {
    const query = `
      SELECT COUNT(*) as count
      FROM failed_operations
      WHERE operation_type = $1
        AND operation_name = $2
        AND error_message = $3
        AND created_at >= NOW() - INTERVAL '${minutes} minutes'
    `;

    const result = await database.query(query, [operationType, operationName, errorMessage]);
    return result.rows[0].count > 0;
  }
}

// Export singleton instance
export default new FailedOperationsService();