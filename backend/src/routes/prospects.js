import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import PhantomBusterService from '../services/phantomBusterService.js';

const router = express.Router();

// Get all prospects with filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const { tier, status, competitor, limit = 50, offset = 0 } = req.query;
    
    // First check if the prospects table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'prospects'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      // Return empty array if table doesn't exist
      return res.json([]);
    }
    
    let query = `
      SELECT 
        p.*,
        COUNT(DISTINCT pc.id) as contact_count,
        COUNT(DISTINCT ps.id) as signal_count
      FROM prospects p
      LEFT JOIN prospect_contacts pc ON p.id = pc.prospect_id
      LEFT JOIN prospect_signals ps ON p.id = ps.prospect_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (tier) {
      paramCount++;
      query += ` AND p.prospect_tier = $${paramCount}`;
      params.push(tier);
    }
    
    if (status) {
      paramCount++;
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
    }
    
    if (competitor) {
      paramCount++;
      query += ` AND p.using_competitor = $${paramCount}`;
      params.push(competitor);
    }
    
    query += `
      GROUP BY p.id
      ORDER BY p.prospect_score DESC, p.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching prospects:', error);
    res.status(500).json({ error: 'Failed to fetch prospects' });
  }
});

// Get single prospect with all details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get prospect
    const prospectResult = await pool.query(
      'SELECT * FROM prospects WHERE id = $1',
      [id]
    );
    
    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found' });
    }
    
    const prospect = prospectResult.rows[0];
    
    // Get contacts
    const contactsResult = await pool.query(
      'SELECT * FROM prospect_contacts WHERE prospect_id = $1',
      [id]
    );
    
    // Get signals
    const signalsResult = await pool.query(
      'SELECT * FROM prospect_signals WHERE prospect_id = $1 ORDER BY detected_at DESC',
      [id]
    );
    
    // Get reviews if any
    const reviewsResult = await pool.query(
      'SELECT * FROM competitor_reviews WHERE prospect_id = $1',
      [id]
    );
    
    res.json({
      ...prospect,
      contacts: contactsResult.rows,
      signals: signalsResult.rows,
      reviews: reviewsResult.rows
    });
  } catch (error) {
    console.error('Error fetching prospect:', error);
    res.status(500).json({ error: 'Failed to fetch prospect' });
  }
});

// Create new prospect
router.post('/', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      company_name,
      website,
      linkedin_url,
      employee_count,
      revenue_estimate,
      industry,
      using_competitor,
      source,
      contacts = []
    } = req.body;
    
    // Insert prospect
    const prospectResult = await client.query(`
      INSERT INTO prospects (
        company_name, website, linkedin_url, employee_count,
        revenue_estimate, industry, using_competitor, source, source_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `, [
      company_name, website, linkedin_url, employee_count,
      revenue_estimate, industry, using_competitor, source
    ]);
    
    const prospect = prospectResult.rows[0];
    
    // Insert contacts if provided
    for (const contact of contacts) {
      await client.query(`
        INSERT INTO prospect_contacts (
          prospect_id, first_name, last_name, title, email,
          phone, linkedin_url, is_decision_maker, is_eos_role
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        prospect.id,
        contact.first_name,
        contact.last_name,
        contact.title,
        contact.email,
        contact.phone,
        contact.linkedin_url,
        contact.is_decision_maker || false,
        contact.is_eos_role || false
      ]);
    }
    
    await client.query('COMMIT');
    res.status(201).json(prospect);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating prospect:', error);
    res.status(500).json({ error: 'Failed to create prospect' });
  } finally {
    client.release();
  }
});

// Update prospect
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic UPDATE query
    const setClause = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        setClause.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }
    
    values.push(id);
    
    const query = `
      UPDATE prospects 
      SET ${setClause.join(', ')}, last_updated = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating prospect:', error);
    res.status(500).json({ error: 'Failed to update prospect' });
  }
});

// Add signal to prospect
router.post('/:id/signals', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { signal_type, signal_strength, signal_data, source } = req.body;
    
    const result = await pool.query(`
      INSERT INTO prospect_signals (
        prospect_id, signal_type, signal_strength, signal_data, source
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, signal_type, signal_strength, signal_data, source]);
    
    // Recalculate score
    await pool.query('SELECT calculate_prospect_score($1)', [id]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding signal:', error);
    res.status(500).json({ error: 'Failed to add signal' });
  }
});

// Get daily summary
router.get('/summary/daily', authenticate, async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    
    // First check if the table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'prospect_daily_summary'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      // Return default summary if table doesn't exist
      return res.json({
        summary_date: date,
        total_prospects: 0,
        new_prospects_today: 0,
        hot_prospects: 0,
        warm_prospects: 0,
        competitor_users_found: 0,
        reviews_scraped: 0
      });
    }
    
    // Get or create summary for the date
    let result = await pool.query(
      'SELECT * FROM prospect_daily_summary WHERE summary_date = $1',
      [date]
    );
    
    if (result.rows.length === 0) {
      // Calculate summary
      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total_prospects,
          COUNT(CASE WHEN DATE(created_at) = $1 THEN 1 END) as new_prospects_today,
          COUNT(CASE WHEN prospect_tier = 'hot' THEN 1 END) as hot_prospects,
          COUNT(CASE WHEN prospect_tier = 'warm' THEN 1 END) as warm_prospects,
          COUNT(CASE WHEN using_competitor IS NOT NULL THEN 1 END) as competitor_users_found
        FROM prospects
      `, [date]);
      
      const reviewStats = await pool.query(
        'SELECT COUNT(*) as reviews_scraped FROM competitor_reviews WHERE DATE(scraped_at) = $1',
        [date]
      );
      
      // Insert summary
      result = await pool.query(`
        INSERT INTO prospect_daily_summary (
          summary_date, total_prospects, new_prospects_today,
          hot_prospects, warm_prospects, competitor_users_found, reviews_scraped
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        date,
        stats.rows[0].total_prospects,
        stats.rows[0].new_prospects_today,
        stats.rows[0].hot_prospects,
        stats.rows[0].warm_prospects,
        stats.rows[0].competitor_users_found,
        reviewStats.rows[0].reviews_scraped
      ]);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Bulk import prospects (for automation webhooks)
router.post('/bulk-import', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { prospects } = req.body;
    const imported = [];
    const skipped = [];
    
    for (const prospect of prospects) {
      // Check if prospect already exists
      const existing = await client.query(
        'SELECT id FROM prospects WHERE company_name = $1 OR website = $2',
        [prospect.company_name, prospect.website]
      );
      
      if (existing.rows.length > 0) {
        skipped.push(prospect.company_name);
        continue;
      }
      
      // Insert new prospect
      const result = await client.query(`
        INSERT INTO prospects (
          company_name, website, linkedin_url, employee_count,
          revenue_estimate, industry, using_competitor, 
          has_eos_titles, eos_keywords_found, source, source_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING id, company_name
      `, [
        prospect.company_name,
        prospect.website,
        prospect.linkedin_url,
        prospect.employee_count,
        prospect.revenue_estimate,
        prospect.industry,
        prospect.using_competitor,
        prospect.has_eos_titles,
        prospect.eos_keywords_found,
        prospect.source
      ]);
      
      imported.push(result.rows[0]);
      
      // Add initial signal if provided
      if (prospect.initial_signal) {
        await client.query(`
          INSERT INTO prospect_signals (
            prospect_id, signal_type, signal_strength, signal_data, source
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          result.rows[0].id,
          prospect.initial_signal.type,
          prospect.initial_signal.strength,
          prospect.initial_signal.data,
          prospect.source
        ]);
      }
    }
    
    await client.query('COMMIT');
    
    res.json({
      imported: imported.length,
      skipped: skipped.length,
      details: { imported, skipped }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error bulk importing:', error);
    res.status(500).json({ error: 'Failed to import prospects' });
  } finally {
    client.release();
  }
});

// Fetch from PhantomBuster API
router.post('/fetch-phantombuster/:phantomId', authenticate, async (req, res) => {
  try {
    const { phantomId } = req.params;
    const { limit = 100 } = req.body;
    
    const phantomBuster = new PhantomBusterService();
    
    // Fetch results from PhantomBuster
    console.log(`Fetching results from PhantomBuster phantom ${phantomId}...`);
    const data = await phantomBuster.fetchPhantomResults(phantomId, limit);
    
    // Process and save to database
    const result = await phantomBuster.processPhantomBusterData(data);
    
    res.json({
      success: true,
      ...result,
      message: `Imported ${result.imported} new prospects, skipped ${result.skipped} existing`
    });
  } catch (error) {
    console.error('Error fetching from PhantomBuster:', error);
    res.status(500).json({ 
      error: 'Failed to fetch from PhantomBuster',
      details: error.message 
    });
  }
});

// List all PhantomBuster phantoms
router.get('/phantombuster/list', authenticate, async (req, res) => {
  try {
    const phantomBuster = new PhantomBusterService();
    const phantoms = await phantomBuster.listPhantoms();
    
    res.json({
      success: true,
      phantoms: phantoms
    });
  } catch (error) {
    console.error('Error listing phantoms:', error);
    res.status(500).json({ 
      error: 'Failed to list phantoms',
      details: error.message 
    });
  }
});

export default router;