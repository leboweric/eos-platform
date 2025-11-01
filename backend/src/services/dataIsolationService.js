import { pool } from '../config/database.js';

export class DataIsolationService {
  static instance = null;

  static getInstance() {
    if (!this.instance) {
      this.instance = new DataIsolationService();
    }
    return this.instance;
  }

  // Get list of all multi-tenant tables
  async getMultiTenantTables() {
    const query = `
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'organization_id' 
      AND table_schema = 'public'
      AND table_name NOT IN ('organizations', 'users')
      GROUP BY table_name
      ORDER BY table_name
    `;
    const result = await pool.query(query);
    return result.rows.map(row => row.table_name);
  }

  // Check for orphaned records (records with invalid organization_id)
  async checkOrphanedRecords(tableName = null) {
    const startTime = Date.now();
    const tables = tableName ? [tableName] : await this.getMultiTenantTables();
    
    let totalChecked = 0;
    let totalViolations = 0;
    const violations = [];

    for (const table of tables) {
      try {
        // Check for records with organization_id that doesn't exist in organizations table
        const query = `
          SELECT t.id, t.organization_id
          FROM ${table} t
          LEFT JOIN organizations o ON t.organization_id = o.id
          WHERE t.organization_id IS NOT NULL
          AND o.id IS NULL
          LIMIT 100
        `;

        const result = await pool.query(query);
        totalChecked += 1;

        if (result.rows.length > 0) {
          totalViolations += result.rows.length;
          
          for (const row of result.rows) {
            violations.push({
              table_name: table,
              record_id: row.id,
              organization_id: row.organization_id,
              violation_type: 'orphaned_record',
              severity: 'high',
              description: `Record in ${table} references non-existent organization ${row.organization_id}`
            });

            // Log violation to database
            await this.logViolation({
              violation_type: 'orphaned_record',
              table_name: table,
              record_id: row.id,
              organization_id: row.organization_id,
              severity: 'high',
              description: `Orphaned record: references non-existent organization`
            });
          }
        }
      } catch (error) {
        console.error(`[DataIsolation] Error checking ${table}:`, error.message);
      }
    }

    // Log check to audit trail
    await this.logCheck({
      check_type: 'orphaned_records',
      table_name: tableName,
      records_checked: totalChecked,
      violations_found: totalViolations,
      check_duration_ms: Date.now() - startTime
    });

    return {
      tables_checked: tables.length,
      violations_found: violations.length,
      violations,
      duration_ms: Date.now() - startTime
    };
  }

  // Check for records missing organization_id (should not happen)
  async checkMissingOrgId(tableName = null) {
    const startTime = Date.now();
    const tables = tableName ? [tableName] : await this.getMultiTenantTables();
    
    let totalChecked = 0;
    let totalViolations = 0;
    const violations = [];

    for (const table of tables) {
      try {
        // Check for NULL organization_id
        const query = `
          SELECT id
          FROM ${table}
          WHERE organization_id IS NULL
          LIMIT 100
        `;

        const result = await pool.query(query);
        totalChecked += 1;

        if (result.rows.length > 0) {
          totalViolations += result.rows.length;
          
          for (const row of result.rows) {
            violations.push({
              table_name: table,
              record_id: row.id,
              organization_id: null,
              violation_type: 'missing_org_filter',
              severity: 'critical',
              description: `Record in ${table} has NULL organization_id - data isolation violation`
            });

            // Log violation
            await this.logViolation({
              violation_type: 'missing_org_filter',
              table_name: table,
              record_id: row.id,
              organization_id: null,
              severity: 'critical',
              description: `Missing organization_id - critical isolation breach`
            });
          }
        }
      } catch (error) {
        console.error(`[DataIsolation] Error checking ${table}:`, error.message);
      }
    }

    // Log check
    await this.logCheck({
      check_type: 'missing_filters',
      table_name: tableName,
      records_checked: totalChecked,
      violations_found: totalViolations,
      check_duration_ms: Date.now() - startTime
    });

    return {
      tables_checked: tables.length,
      violations_found: violations.length,
      violations,
      duration_ms: Date.now() - startTime
    };
  }

  // Check data distribution across organizations (detect imbalances)
  async checkDataDistribution() {
    const tables = await this.getMultiTenantTables();
    const distribution = [];

    for (const table of tables) {
      try {
        const query = `
          SELECT 
            COALESCE(o.name, 'ORPHANED') as organization_name,
            t.organization_id,
            COUNT(*) as record_count
          FROM ${table} t
          LEFT JOIN organizations o ON t.organization_id = o.id
          GROUP BY t.organization_id, o.name
          ORDER BY record_count DESC
        `;

        const result = await pool.query(query);
        
        if (result.rows.length > 0) {
          distribution.push({
            table_name: table,
            organizations: result.rows
          });
        }
      } catch (error) {
        console.error(`[DataIsolation] Error checking distribution for ${table}:`, error.message);
      }
    }

    return distribution;
  }

  // Get isolation health overview
  async getIsolationHealth() {
    const query = `
      SELECT 
        COUNT(*) as total_violations,
        COUNT(*) FILTER (WHERE resolved = false) as unresolved_violations,
        COUNT(*) FILTER (WHERE severity = 'critical' AND resolved = false) as critical_violations,
        COUNT(*) FILTER (WHERE severity = 'high' AND resolved = false) as high_violations,
        COUNT(*) FILTER (WHERE severity = 'medium' AND resolved = false) as medium_violations,
        COUNT(*) FILTER (WHERE severity = 'low' AND resolved = false) as low_violations,
        COUNT(*) FILTER (WHERE detected_at >= NOW() - INTERVAL '24 hours') as violations_last_24h,
        COUNT(*) FILTER (WHERE detected_at >= NOW() - INTERVAL '7 days') as violations_last_7d,
        MAX(detected_at) as last_violation_at
      FROM data_isolation_violations
    `;
    const result = await pool.query(query);
    return result.rows[0] || {
      total_violations: 0,
      unresolved_violations: 0,
      critical_violations: 0,
      high_violations: 0,
      medium_violations: 0,
      low_violations: 0,
      violations_last_24h: 0,
      violations_last_7d: 0,
      last_violation_at: null
    };
  }

  // Get recent violations
  async getRecentViolations(limit = 50, filters = {}) {
    let query = `
      SELECT 
        v.*,
        o.name as organization_name
      FROM data_isolation_violations v
      LEFT JOIN organizations o ON v.organization_id = o.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (filters.violation_type) {
      query += ` AND v.violation_type = $${paramCount}`;
      params.push(filters.violation_type);
      paramCount++;
    }

    if (filters.severity) {
      query += ` AND v.severity = $${paramCount}`;
      params.push(filters.severity);
      paramCount++;
    }

    if (filters.resolved !== undefined) {
      query += ` AND v.resolved = $${paramCount}`;
      params.push(filters.resolved);
      paramCount++;
    }

    if (filters.table_name) {
      query += ` AND v.table_name = $${paramCount}`;
      params.push(filters.table_name);
      paramCount++;
    }

    query += ` ORDER BY v.detected_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get violations by table
  async getViolationsByTable() {
    const query = `
      SELECT 
        table_name,
        COUNT(*) as total_violations,
        COUNT(*) FILTER (WHERE resolved = false) as unresolved,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE severity = 'high') as high,
        MAX(detected_at) as last_violation
      FROM data_isolation_violations
      GROUP BY table_name
      ORDER BY total_violations DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  // Get violations by organization
  async getViolationsByOrganization() {
    const query = `
      SELECT 
        v.organization_id,
        o.name as organization_name,
        COUNT(*) as total_violations,
        COUNT(*) FILTER (WHERE v.resolved = false) as unresolved,
        COUNT(*) FILTER (WHERE v.severity = 'critical') as critical,
        MAX(v.detected_at) as last_violation
      FROM data_isolation_violations v
      LEFT JOIN organizations o ON v.organization_id = o.id
      GROUP BY v.organization_id, o.name
      ORDER BY total_violations DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  // Get check history
  async getCheckHistory(limit = 20) {
    const query = `
      SELECT 
        cl.*,
        u.first_name || ' ' || u.last_name as performed_by_name
      FROM isolation_check_log cl
      LEFT JOIN users u ON cl.performed_by = u.id
      ORDER BY cl.performed_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  // Run all checks
  async runAllChecks(userId = null) {
    console.log('[DataIsolation] Running comprehensive isolation checks...');
    
    const results = {
      started_at: new Date(),
      checks: []
    };

    // Check 1: Orphaned records
    try {
      const orphanedResult = await this.checkOrphanedRecords();
      results.checks.push({
        name: 'Orphaned Records',
        ...orphanedResult
      });
    } catch (error) {
      console.error('[DataIsolation] Orphaned records check failed:', error);
      results.checks.push({
        name: 'Orphaned Records',
        error: error.message
      });
    }

    // Check 2: Missing organization_id
    try {
      const missingOrgResult = await this.checkMissingOrgId();
      results.checks.push({
        name: 'Missing Organization ID',
        ...missingOrgResult
      });
    } catch (error) {
      console.error('[DataIsolation] Missing org ID check failed:', error);
      results.checks.push({
        name: 'Missing Organization ID',
        error: error.message
      });
    }

    results.completed_at = new Date();
    results.duration_ms = results.completed_at - results.started_at;
    results.total_violations = results.checks.reduce((sum, check) => 
      sum + (check.violations_found || 0), 0
    );

    console.log(`[DataIsolation] Checks complete. Found ${results.total_violations} violations.`);

    return results;
  }

  // Mark violation as resolved
  async resolveViolation(violationId, userId, notes) {
    const query = `
      UPDATE data_isolation_violations
      SET resolved = true,
          resolved_at = NOW(),
          resolved_by = $2,
          resolution_notes = $3
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [violationId, userId, notes]);
    return result.rows[0];
  }

  // Log violation to database
  async logViolation(violation) {
    try {
      const query = `
        INSERT INTO data_isolation_violations (
          violation_type, table_name, record_id, organization_id,
          severity, description, query_info
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (table_name, record_id, violation_type) 
        DO UPDATE SET 
          detected_at = NOW(),
          description = EXCLUDED.description
        RETURNING id
      `;

      const result = await pool.query(query, [
        violation.violation_type,
        violation.table_name,
        violation.record_id,
        violation.organization_id,
        violation.severity,
        violation.description,
        JSON.stringify(violation.query_info || {})
      ]);

      return result.rows[0].id;
    } catch (error) {
      console.error('[DataIsolation] Error logging violation:', error);
      return null;
    }
  }

  // Log check to audit trail
  async logCheck(checkInfo) {
    try {
      const query = `
        INSERT INTO isolation_check_log (
          check_type, table_name, records_checked, violations_found,
          check_duration_ms, performed_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

      const result = await pool.query(query, [
        checkInfo.check_type,
        checkInfo.table_name,
        checkInfo.records_checked,
        checkInfo.violations_found,
        checkInfo.check_duration_ms,
        checkInfo.performed_by || null
      ]);

      return result.rows[0].id;
    } catch (error) {
      console.error('[DataIsolation] Error logging check:', error);
      return null;
    }
  }
}

export default DataIsolationService;