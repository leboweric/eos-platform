import NinetyImportService from '../services/ninetyImportService.js';
import { pool } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Preview CSV import without saving
 * DEDUPLICATION: Identifies existing metrics for incremental imports
 */
export const preview = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const { organizationId, teamId } = req.body;
    const userId = req.user.id;

    // Parse CSV
    const parseResults = NinetyImportService.parseCSV(req.file.buffer);
    const transformedData = NinetyImportService.transformNinetyData(parseResults);
    
    // Get existing metrics to check for conflicts
    // DEDUPLICATION: Match by organization_id + team_id + name (case-insensitive)
    const existingMetrics = await pool.query(
      `SELECT id, name, title, external_id, group_id
       FROM scorecard_metrics
       WHERE organization_id = $1 AND team_id = $2 AND deleted_at IS NULL`,
      [organizationId, teamId]
    );

    // Use 'name' field for matching (not title)
    const existingByName = new Map(
      existingMetrics.rows.map(m => [m.name.toLowerCase(), m])
    );

    // Get all users in organization for owner mapping
    const users = await pool.query(
      `SELECT id, first_name, last_name, email
       FROM users
       WHERE organization_id = $1
       ORDER BY first_name, last_name`,
      [organizationId]
    );

    // Analyze metrics for conflicts and owner mapping
    const analysis = {
      totalMetrics: transformedData.metrics.length,
      groups: transformedData.groups,
      dateColumns: transformedData.dateColumns,
      newMetrics: [],
      existingMetrics: [],
      ownerMappings: {},
      unmappedOwners: new Set(),
      users: users.rows.map(u => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        email: u.email
      }))
    };

    // Process each metric
    for (const metric of transformedData.metrics) {
      // DEDUPLICATION: Match by name field
      const existing = existingByName.get(metric.title.toLowerCase());
      
      if (existing) {
        analysis.existingMetrics.push({
          ...metric,
          existingId: existing.id,
          conflict: true
        });
      } else {
        analysis.newMetrics.push(metric);
      }

      // Try to match owner
      if (metric.owner_name) {
        const matchedUserId = await NinetyImportService.matchOwnerToUser(
          metric.owner_name,
          organizationId,
          pool
        );
        
        if (matchedUserId) {
          analysis.ownerMappings[metric.owner_name] = matchedUserId;
        } else {
          analysis.unmappedOwners.add(metric.owner_name);
        }
      }
    }

    res.json({
      success: true,
      preview: {
        summary: {
          totalMetrics: analysis.totalMetrics,
          newMetrics: analysis.newMetrics.length,
          existingMetrics: analysis.existingMetrics.length,
          totalGroups: analysis.groups.length,
          totalScores: transformedData.metrics.reduce((acc, m) => acc + m.scores.length, 0),
          dateRange: {
            columns: analysis.dateColumns,
            count: analysis.dateColumns.length
          }
        },
        groups: analysis.groups,
        newMetrics: analysis.newMetrics,
        conflicts: analysis.existingMetrics,
        ownerMappings: analysis.ownerMappings,
        unmappedOwners: Array.from(analysis.unmappedOwners),
        availableUsers: analysis.users
      }
    });
  } catch (error) {
    console.error('Error previewing scorecard import:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview import: ' + error.message
    });
  }
};

/**
 * Execute the actual import
 * CRITICAL: Supports incremental re-imports with proper deduplication
 */
export const execute = async (req, res) => {
  const client = await pool.connect();
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const { 
      organizationId, 
      teamId, 
      conflictStrategy = 'merge', // DEFAULT: Use 'merge' for incremental imports
      ownerMappings = {} 
    } = req.body;
    const userId = req.user.id;

    // Parse ownerMappings if it's a string
    const mappings = typeof ownerMappings === 'string' 
      ? JSON.parse(ownerMappings) 
      : ownerMappings;

    await client.query('BEGIN');

    // Create import record
    const importRecord = await client.query(
      `INSERT INTO scorecard_imports (
        id, organization_id, team_id, imported_by, import_source,
        file_name, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id`,
      [
        uuidv4(),
        organizationId,
        teamId,
        userId,
        'ninety.io',
        req.file.originalname,
        'processing'
      ]
    );
    const importId = importRecord.rows[0].id;

    // Parse and transform data
    const parseResults = NinetyImportService.parseCSV(req.file.buffer);
    const transformedData = NinetyImportService.transformNinetyData(parseResults);

    // Get existing metrics
    // DEDUPLICATION: Fetch by name for proper matching
    const existingMetrics = await client.query(
      `SELECT id, name, title, external_id
       FROM scorecard_metrics
       WHERE organization_id = $1 AND team_id = $2 AND deleted_at IS NULL`,
      [organizationId, teamId]
    );

    // DEDUPLICATION: Match by 'name' field (case-insensitive)
    const existingByName = new Map(
      existingMetrics.rows.map(m => [m.name.toLowerCase(), m])
    );

    const results = {
      metricsCreated: 0,      // Brand new metrics
      metricsUpdated: 0,      // Existing metrics refreshed
      metricsSkipped: 0,      // Unchanged metrics
      scoresImported: 0,      // Only NEW scores added
      scoresSkipped: 0,       // Existing scores not overwritten
      groupsCreated: 0,
      errors: []
    };

    // Process each group's metrics
    const groupMap = new Map();
    
    for (const metric of transformedData.metrics) {
      try {
        // DEDUPLICATION: Use helper method for consistent matching
        const existing = await NinetyImportService.findExistingMetric(
          metric.title,
          teamId,
          organizationId,
          client
        );
        
        // MERGE STRATEGY BEHAVIOR for incremental imports
        if (existing) {
          if (conflictStrategy === 'skip') {
            results.metricsSkipped++;
            continue;
          } else if (conflictStrategy === 'update') {
            // Delete old scores to fully replace
            await client.query(
              `DELETE FROM scorecard_scores WHERE metric_id = $1`,
              [existing.id]
            );
          }
          // For 'merge' strategy: Keep existing scores, only add new ones
        }

        // Get or create group
        let groupId = null;
        if (metric.group_name) {
          if (!groupMap.has(metric.group_name)) {
            groupId = await NinetyImportService.getOrCreateGroup(
              metric.group_name,
              teamId,
              organizationId,
              client
            );
            groupMap.set(metric.group_name, groupId);
            // Track if this was a new group creation
            const groupExists = await client.query(
              `SELECT id FROM scorecard_groups WHERE id = $1 AND created_at > NOW() - INTERVAL '1 minute'`,
              [groupId]
            );
            if (groupExists.rows.length > 0) {
              results.groupsCreated++;
            }
          } else {
            groupId = groupMap.get(metric.group_name);
          }
        }

        // Determine owner
        let ownerId = null;
        if (metric.owner_name && mappings[metric.owner_name]) {
          ownerId = mappings[metric.owner_name];
        }

        let metricId;
        
        if (existing && conflictStrategy !== 'skip') {
          // MERGE STRATEGY: Update goal, operator, direction, owner, description
          // Keep: existing metric_id, created_at
          await client.query(
            `UPDATE scorecard_metrics SET
              group_id = COALESCE($1, group_id),
              goal = $2,
              goal_operator = $3,
              goal_direction = $4,
              format = $5,
              owner_id = COALESCE($6, owner_id),
              description = COALESCE($7, description),
              import_source = $8,
              external_id = $9,
              updated_at = NOW()
            WHERE id = $10`,
            [
              groupId,
              metric.goal,
              metric.goal_operator,
              metric.goal_direction,
              metric.format,
              ownerId,
              metric.description,
              metric.import_source,
              metric.external_id,
              existing.id
            ]
          );
          metricId = existing.id;
          results.metricsUpdated++;
        } else if (!existing) {
          // Create new metric with both 'name' and 'title' fields
          const newMetric = await client.query(
            `INSERT INTO scorecard_metrics (
              id, organization_id, team_id, group_id,
              name, title, description, goal, goal_operator, goal_direction,
              format, cadence, owner_id, import_source, external_id,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              NOW(), NOW()
            ) RETURNING id`,
            [
              uuidv4(),
              organizationId,
              teamId,
              groupId,
              metric.title,  // Use title for 'name' field
              metric.title,  // Also use for 'title' field
              metric.description,
              metric.goal,
              metric.goal_operator,
              metric.goal_direction,
              metric.format,
              metric.cadence,
              ownerId,
              metric.import_source,
              metric.external_id
            ]
          );
          metricId = newMetric.rows[0].id;
          results.metricsCreated++;
        }

        // Add scores - CRITICAL for incremental imports
        for (const score of metric.scores) {
          if (score.value !== null) {
            // DEDUPLICATION: Check if score already exists for this metric + period
            const scoreExists = await NinetyImportService.scoreExists(
              metricId, 
              score.week_ending, 
              client
            );
            
            if (scoreExists) {
              // MERGE STRATEGY: Skip existing scores (don't overwrite)
              results.scoresSkipped++;
              continue;
            }

            // Only INSERT new scores
            await client.query(
              `INSERT INTO scorecard_scores (
                id, metric_id, week_ending, period_start, value, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
              [
                uuidv4(),
                metricId,
                score.week_ending,
                score.week_ending, // Use week_ending as period_start
                score.value
              ]
            );
            results.scoresImported++;
          }
        }
      } catch (error) {
        console.error(`Error processing metric "${metric.title}":`, error);
        results.errors.push(`Failed to import "${metric.title}": ${error.message}`);
      }
    }

    // LOGGING: Track detailed results in scorecard_imports
    await client.query(
      `UPDATE scorecard_imports SET
        status = 'completed',
        metrics_imported = $1,
        metrics_created = $2,
        metrics_updated = $3,
        metrics_skipped = $4,
        scores_imported = $5,
        completed_at = NOW()
      WHERE id = $6`,
      [
        results.metricsCreated + results.metricsUpdated,
        results.metricsCreated,
        results.metricsUpdated,
        results.metricsSkipped,
        results.scoresImported,
        importId
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      results
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error executing scorecard import:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import scorecard: ' + error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get import history
 */
export const getHistory = async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    const history = await pool.query(
      `SELECT 
        si.*,
        u.first_name || ' ' || u.last_name as imported_by_name,
        t.name as team_name
      FROM scorecard_imports si
      LEFT JOIN users u ON si.imported_by = u.id
      LEFT JOIN teams t ON si.team_id = t.id
      WHERE si.organization_id = $1
      ORDER BY si.created_at DESC
      LIMIT 50`,
      [organizationId]
    );

    res.json({
      success: true,
      imports: history.rows
    });
  } catch (error) {
    console.error('Error fetching import history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch import history'
    });
  }
};