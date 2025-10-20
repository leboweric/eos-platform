import NinetyImportService from '../services/ninetyImportService.js';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

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
    const existingMetrics = await db.query(
      `SELECT id, name, external_id, group_id
       FROM scorecard_metrics
       WHERE organization_id = $1 AND team_id = $2 AND deleted_at IS NULL`,
      [organizationId, teamId]
    );

    // Use 'name' field for matching (not title)
    const existingByName = new Map(
      existingMetrics.rows.map(m => [m.name.toLowerCase(), m])
    );

    // Get all users in organization for owner mapping
    const users = await db.query(
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
      const existing = existingByName.get(metric.name.toLowerCase());
      
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
          db
        );
        
        if (matchedUserId) {
          analysis.ownerMappings[metric.owner_name] = matchedUserId;
        } else {
          analysis.unmappedOwners.add(metric.owner_name);
        }
      }
    }

    // Prepare detailed metrics data for display
    const detailedMetrics = transformedData.metrics.map(metric => ({
      name: metric.name,
      description: metric.description,
      owner_name: metric.owner_name,
      owner_id: analysis.ownerMappings[metric.owner_name] || null,
      goal: metric.goal,
      goal_operator: metric.goal_operator,
      goal_direction: metric.goal_direction,
      average: metric.average,
      group_name: metric.group_name,
      status: metric.status,
      format: metric.format,
      // Get most recent 5 scores
      recent_scores: metric.scores
        .sort((a, b) => {
          const dateA = new Date(a.week_ending || a.dateLabel);
          const dateB = new Date(b.week_ending || b.dateLabel);
          return dateB - dateA; // Sort descending
        })
        .slice(0, 5)
        .map(s => ({
          date: s.dateLabel || s.week_ending,
          value: s.value
        }))
    }));

    // Collect any warnings
    const warnings = [];
    if (analysis.unmappedOwners.size > 0) {
      warnings.push(`${analysis.unmappedOwners.size} owners need to be mapped to users`);
    }
    if (analysis.existingMetrics.length > 0) {
      warnings.push(`${analysis.existingMetrics.length} metrics already exist and will be updated based on conflict strategy`);
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
        metrics: detailedMetrics, // Add detailed metrics
        warnings: warnings, // Add warnings
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
 * Map operator symbols to database constraint values
 */
function mapOperatorToDbValue(operator) {
  const operatorMap = {
    '>=': 'greater_equal',
    '>': 'greater',
    '<=': 'less_equal',
    '<': 'less',
    '=': 'equal',
    '==': 'equal'
  };
  
  return operatorMap[operator] || 'greater_equal'; // Default to greater_equal
}

/**
 * Extract just the numeric value from a goal string
 * e.g., ">= 1" → "1", ">= $3" → "3", "100" → "100"
 */
function extractGoalValue(goalStr) {
  if (!goalStr) return null;
  
  const normalized = goalStr.trim();
  let valueStr = normalized;
  
  // Remove operator if present
  if (normalized.startsWith('>=')) {
    valueStr = normalized.substring(2).trim();
  } else if (normalized.startsWith('<=')) {
    valueStr = normalized.substring(2).trim();
  } else if (normalized.startsWith('>')) {
    valueStr = normalized.substring(1).trim();
  } else if (normalized.startsWith('<')) {
    valueStr = normalized.substring(1).trim();
  } else if (normalized.startsWith('=')) {
    valueStr = normalized.substring(1).trim();
  }
  
  // Remove currency symbols and commas but keep the numeric value
  valueStr = valueStr.replace(/[$,]/g, '');
  
  // Remove percentage sign if present
  if (valueStr.endsWith('%')) {
    valueStr = valueStr.slice(0, -1);
  }
  
  // Return the cleaned numeric string
  return valueStr || null;
}

/**
 * Execute the actual import
 * CRITICAL: Supports incremental re-imports with proper deduplication
 */
export const execute = async (req, res) => {
  const client = await db.connect();
  
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

    // Note: Import tracking removed - not essential for core functionality
    // Can be added back later if import history is needed

    // Parse and transform data
    const parseResults = NinetyImportService.parseCSV(req.file.buffer);
    const transformedData = NinetyImportService.transformNinetyData(parseResults);
    
    console.log('Transformed data summary:');
    console.log(`- Metrics found: ${transformedData.metrics.length}`);
    console.log(`- Date columns: ${transformedData.dateColumns?.length || 0}`);

    // Get existing metrics
    // DEDUPLICATION: Fetch by name for proper matching
    const existingMetrics = await client.query(
      `SELECT id, name, external_id
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
          metric.name,
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
          // MERGE STRATEGY: Update goal, owner, description
          // Keep: existing metric_id, created_at
          await client.query(
            `UPDATE scorecard_metrics SET
              group_id = COALESCE($1, group_id),
              goal = $2,
              owner = COALESCE($3, owner),
              description = COALESCE($4, description),
              value_type = $5,
              comparison_operator = $6,
              updated_at = NOW()
            WHERE id = $7`,
            [
              groupId,
              extractGoalValue(metric.goal),  // Extract just the numeric value
              metric.owner_name || ownerId,  // Use owner_name or matched user ID
              metric.description,
              metric.format === 'currency' ? 'currency' : metric.format === 'percentage' ? 'percentage' : 'number',
              mapOperatorToDbValue(metric.goal_operator || '>='),  // Map to database values
              existing.id
            ]
          );
          metricId = existing.id;
          results.metricsUpdated++;
        } else if (!existing) {
          // Create new metric - only use columns that exist in DB
          const newMetric = await client.query(
            `INSERT INTO scorecard_metrics (
              id, organization_id, team_id, group_id,
              name, description, goal, owner,
              type, value_type, comparison_operator,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
              NOW(), NOW()
            ) RETURNING id`,
            [
              uuidv4(),
              organizationId,
              teamId,
              groupId,
              metric.name,  // CSV 'Title' mapped to DB 'name' field
              metric.description,
              extractGoalValue(metric.goal),  // Extract just the numeric value
              metric.owner_name || ownerId,  // Use owner_name or matched user ID
              metric.cadence === 'monthly' ? 'monthly' : 'weekly',  // Map cadence to type
              metric.format === 'currency' ? 'currency' : metric.format === 'percentage' ? 'percentage' : 'number',
              mapOperatorToDbValue(metric.goal_operator || '>=')  // Map to database values
            ]
          );
          metricId = newMetric.rows[0].id;
          results.metricsCreated++;
        }

        // Add scores - CRITICAL for incremental imports
        console.log(`Processing ${metric.scores?.length || 0} scores for metric "${metric.name}"`);
        
        for (const score of metric.scores || []) {
          if (score.value !== null && score.value !== undefined) {
            console.log(`  Checking score: week_date=${score.week_ending}, value=${score.value}`);
            
            // DEDUPLICATION: Check if score already exists for this metric + period
            const scoreExists = await NinetyImportService.scoreExists(
              metricId, 
              score.week_ending, 
              client
            );
            
            if (scoreExists) {
              // MERGE STRATEGY: Skip existing scores (don't overwrite)
              console.log(`    Score already exists, skipping`);
              results.scoresSkipped++;
              continue;
            }

            // Only INSERT new scores
            try {
              const scoreResult = await client.query(
                `INSERT INTO scorecard_scores (
                  id, metric_id, week_date, value, organization_id, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                RETURNING id`,
                [
                  uuidv4(),
                  metricId,
                  score.week_ending,  // Map week_ending to week_date
                  score.value,
                  organizationId  // Add organization_id from parent context
                ]
              );
              console.log(`    Score inserted successfully: ${scoreResult.rows[0].id}`);
              results.scoresImported++;
            } catch (scoreError) {
              console.error(`    Error inserting score:`, scoreError.message);
              throw scoreError;
            }
          }
        }
      } catch (error) {
        console.error(`Error processing metric "${metric.name}":`, error);
        results.errors.push(`Failed to import "${metric.name}": ${error.message}`);
      }
    }

    // Note: Import tracking removed - not essential for core functionality
    // The import stats are already returned in the response

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
    
    const history = await db.query(
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

// ============================================================================
// LEGACY MONTHLY IMPORT FUNCTIONS (for backward compatibility)
// ============================================================================

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Helper function to parse date from month name
function parseMonthDate(monthName, year = new Date().getFullYear()) {
  const monthMap = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3,
    'May': 4, 'June': 5, 'July': 6, 'August': 7,
    'September': 8, 'October': 9, 'November': 10, 'December': 11
  };
  
  const monthIndex = monthMap[monthName];
  if (monthIndex === undefined) return null;
  
  // Return the first day of the month as DATE
  return new Date(year, monthIndex, 1);
}

// Helper function to clean numeric values
function cleanNumericValue(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove currency symbols, commas, parentheses, and percentage signs
    const cleaned = value.replace(/[$,%()]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

// Import Monthly Scorecard from Ninety.io format (legacy)
export const importMonthlyScorecard = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Importing monthly scorecard for org:', orgId, 'team:', teamId);
    
    const results = [];
    const stream = Readable.from(req.file.buffer);
    
    // Parse CSV
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row) => {
          results.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (results.length === 0) {
      return res.status(400).json({ error: 'No data found in CSV file' });
    }

    console.log('Parsed CSV rows:', results.length);
    console.log('Sample row:', results[0]);
    
    const importedMetrics = [];
    const importedScores = [];
    
    // Start transaction
    await db.query('BEGIN');

    try {
      for (const row of results) {
        const title = row.Title?.trim();
        const goalText = row.Goal?.trim();
        
        if (!title || !goalText) {
          console.log('Skipping row with missing title or goal:', row);
          continue;
        }

        // Parse goal value
        const goal = cleanNumericValue(goalText);
        if (goal === null) {
          console.log('Skipping row with invalid goal:', row);
          continue;
        }

        console.log(`Processing metric: ${title}, Goal: ${goal}`);

        // Check if metric already exists
        const existingMetric = await db.query(
          `SELECT id FROM scorecard_metrics 
           WHERE organization_id = $1 AND team_id = $2 AND name = $3 AND type = 'monthly'`,
          [orgId, teamId, title]
        );

        let metricId;
        
        if (existingMetric.rows.length > 0) {
          // Update existing metric
          metricId = existingMetric.rows[0].id;
          await db.query(
            `UPDATE scorecard_metrics 
             SET goal = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [goal, metricId]
          );
          console.log(`Updated existing metric: ${title}`);
        } else {
          // Create new metric
          const newMetric = await db.query(
            `INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner)
             VALUES ($1, $2, $3, $4, 'monthly', 'Imported from Ninety.io')
             RETURNING id`,
            [orgId, teamId, title, goal]
          );
          metricId = newMetric.rows[0].id;
          console.log(`Created new metric: ${title}`);
        }

        importedMetrics.push({ title, goal, metricId });

        // Import scores for each month
        const monthColumns = ['January', 'February', 'March', 'April', 'May', 'June',
                             'July', 'August', 'September', 'October', 'November', 'December'];

        for (const monthName of monthColumns) {
          const scoreText = row[monthName];
          if (!scoreText) continue;

          const scoreValue = cleanNumericValue(scoreText);
          if (scoreValue === null) continue;

          // Use current year for the month date
          const monthDate = parseMonthDate(monthName, 2024);
          if (!monthDate) continue;

          console.log(`  Importing ${monthName}: ${scoreValue}`);

          // Insert or update score
          await db.query(
            `INSERT INTO scorecard_scores (metric_id, week_date, value, organization_id)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (metric_id, week_date)
             DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
            [metricId, monthDate, scoreValue, orgId]
          );

          importedScores.push({
            metric: title,
            month: monthName,
            value: scoreValue,
            date: monthDate
          });
        }
      }

      await db.query('COMMIT');

      console.log(`Import completed: ${importedMetrics.length} metrics, ${importedScores.length} scores`);

      res.json({
        success: true,
        message: `Successfully imported ${importedMetrics.length} metrics with ${importedScores.length} monthly scores`,
        data: {
          metrics: importedMetrics.length,
          scores: importedScores.length,
          details: {
            importedMetrics: importedMetrics.map(m => ({ title: m.title, goal: m.goal })),
            scoresByMetric: importedMetrics.map(m => ({
              metric: m.title,
              scores: importedScores.filter(s => s.metric === m.title).length
            }))
          }
        }
      });

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error importing monthly scorecard:', error);
    res.status(500).json({ 
      error: 'Failed to import scorecard',
      details: error.message
    });
  }
};

// Middleware for file upload
export const uploadMiddleware = upload.single('file');