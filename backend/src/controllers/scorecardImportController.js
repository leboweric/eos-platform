import db from '../config/database.js';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

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

// Import Monthly Scorecard from Ninety.io format
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

    // Expected format based on the image:
    // Title | Goal | August | July | June | May | April | March | February | January | December | November | October | September | August
    
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
          const monthDate = parseMonthDate(monthName, 2024); // Assuming 2024 based on your data
          if (!monthDate) continue;

          console.log(`  Importing ${monthName}: ${scoreValue}`);

          // Insert or update score
          await db.query(
            `INSERT INTO scorecard_scores (metric_id, week_date, value)
             VALUES ($1, $2, $3)
             ON CONFLICT (metric_id, week_date)
             DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
            [metricId, monthDate, scoreValue]
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