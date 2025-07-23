import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'backend', '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function diagnoseSkykitScorecard() {
  try {
    console.log('=== Diagnosing Skykit Scorecard Data ===\n');
    
    // 1. Find Skykit organization
    console.log('1. Finding Skykit organization...');
    const orgResult = await pool.query(
      `SELECT id, name, revenue_metric_type, revenue_metric_label 
       FROM organizations 
       WHERE name ILIKE '%skykit%'`
    );
    
    if (orgResult.rows.length === 0) {
      console.log('ERROR: No organization found with "Skykit" in the name!');
      return;
    }
    
    const org = orgResult.rows[0];
    console.log(`Found organization: ${org.name} (ID: ${org.id})`);
    console.log(`Revenue metric type: ${org.revenue_metric_type}`);
    console.log(`Revenue metric label: ${org.revenue_metric_label || 'N/A'}\n`);
    
    // 2. Check for scorecard metrics
    console.log('2. Checking scorecard metrics...');
    const metricsResult = await pool.query(
      `SELECT 
        sm.id,
        sm.name,
        sm.team_id,
        sm.goal,
        sm.owner,
        sm.created_at,
        sm.updated_at,
        t.name as team_name
       FROM scorecard_metrics sm
       LEFT JOIN teams t ON sm.team_id = t.id
       WHERE sm.organization_id = $1
       ORDER BY sm.created_at DESC`,
      [org.id]
    );
    
    console.log(`Found ${metricsResult.rows.length} scorecard metrics\n`);
    
    if (metricsResult.rows.length > 0) {
      console.log('Metrics found:');
      metricsResult.rows.forEach(metric => {
        console.log(`- ${metric.name} (Team: ${metric.team_name || metric.team_id})`);
        console.log(`  Goal: ${metric.goal}, Owner: ${metric.owner}`);
        console.log(`  Created: ${metric.created_at}\n`);
      });
      
      // 3. Check for recent scores
      console.log('3. Checking recent scores...');
      const scoresResult = await pool.query(
        `SELECT 
          ss.week_date,
          ss.value,
          sm.name as metric_name,
          ss.created_at,
          ss.updated_at
         FROM scorecard_scores ss
         JOIN scorecard_metrics sm ON ss.metric_id = sm.id
         WHERE sm.organization_id = $1
           AND ss.week_date >= CURRENT_DATE - INTERVAL '30 days'
         ORDER BY ss.week_date DESC, sm.name
         LIMIT 20`,
        [org.id]
      );
      
      console.log(`Found ${scoresResult.rows.length} scores in the last 30 days\n`);
      
      if (scoresResult.rows.length > 0) {
        console.log('Recent scores:');
        scoresResult.rows.forEach(score => {
          console.log(`- ${score.week_date.toISOString().split('T')[0]}: ${score.metric_name} = ${score.value}`);
        });
      }
    }
    
    // 4. Check if there's a potential JOIN issue
    console.log('\n4. Testing JOIN query that might fail...');
    try {
      const joinTest = await pool.query(
        `SELECT 
          sm.*,
          o.name as org_name,
          o.revenue_metric_type,
          o.revenue_metric_label
         FROM scorecard_metrics sm
         JOIN organizations o ON sm.organization_id = o.id
         WHERE o.id = $1
         LIMIT 1`,
        [org.id]
      );
      console.log('JOIN query succeeded - no database issue detected');
    } catch (joinError) {
      console.log('ERROR: JOIN query failed!');
      console.log('Error details:', joinError.message);
    }
    
    // 5. Check for duplicate team IDs
    console.log('\n5. Checking for duplicate team IDs...');
    const teamCheckResult = await pool.query(
      `SELECT 
        team_id,
        COUNT(*) as metric_count,
        STRING_AGG(name, ', ' ORDER BY name) as metric_names
       FROM scorecard_metrics
       WHERE organization_id = $1
       GROUP BY team_id
       HAVING COUNT(DISTINCT team_id) > 0`,
      [org.id]
    );
    
    if (teamCheckResult.rows.length > 1) {
      console.log('WARNING: Multiple team IDs found for scorecard metrics!');
      teamCheckResult.rows.forEach(team => {
        console.log(`- Team ID ${team.team_id}: ${team.metric_count} metrics (${team.metric_names})`);
      });
    } else if (teamCheckResult.rows.length === 1) {
      console.log(`All metrics use the same team ID: ${teamCheckResult.rows[0].team_id}`);
    }
    
  } catch (error) {
    console.error('Error during diagnosis:', error);
  } finally {
    await pool.end();
  }
}

diagnoseSkykitScorecard();