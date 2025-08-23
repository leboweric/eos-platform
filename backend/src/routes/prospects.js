import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import PhantomBusterService from '../services/phantomBusterService.js';

const router = express.Router();

// Get all prospects with filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const { tier, status, competitor, limit = 50, offset = 0 } = req.query;
    
    // Ensure we're using public schema
    await pool.query('SET search_path TO public');
    
    // First check if the prospects table exists in public schema
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'prospects'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Prospects table not found in public schema');
      // Return empty array if table doesn't exist
      return res.json([]);
    }
    
    let query = `
      WITH prospect_stats AS (
        SELECT 
          p.*,
          COALESCE(pc.contact_count, 0) as contact_count,
          COALESCE(ps.signal_count, 0) as signal_count,
          COALESCE(pc.email_count, 0) as email_count
        FROM public.prospects p
        LEFT JOIN (
          SELECT prospect_id, 
                 COUNT(*) as contact_count,
                 COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as email_count
          FROM public.prospect_contacts
          GROUP BY prospect_id
        ) pc ON p.id = pc.prospect_id
        LEFT JOIN (
          SELECT prospect_id, COUNT(*) as signal_count
          FROM public.prospect_signals
          GROUP BY prospect_id
        ) ps ON p.id = ps.prospect_id
      )
      SELECT * FROM prospect_stats
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
      ORDER BY prospect_score DESC, created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    params.push(limit, offset);
    
    console.log(`Fetching prospects with limit=${limit}, offset=${offset}`);
    const result = await pool.query(query, params);
    console.log(`Found ${result.rows.length} prospects`);
    
    // Also log total count for debugging
    const countResult = await pool.query('SELECT COUNT(*) FROM public.prospects');
    console.log(`Total prospects in database: ${countResult.rows[0].count}`);
    
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
    
    // First check if tables exist
    const tablesExist = await pool.query(`
      SELECT 
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'prospects') as prospects_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'prospect_contacts') as contacts_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'prospect_signals') as signals_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'competitor_reviews') as reviews_exists
    `);
    
    const tables = tablesExist.rows[0];
    
    if (!tables.prospects_exists) {
      return res.status(404).json({ error: 'Prospects table not found' });
    }
    
    // Get prospect
    const prospectResult = await pool.query(
      'SELECT * FROM prospects WHERE id = $1',
      [id]
    );
    
    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found' });
    }
    
    const prospect = prospectResult.rows[0];
    
    // Get contacts if table exists
    const contacts = tables.contacts_exists 
      ? (await pool.query('SELECT * FROM prospect_contacts WHERE prospect_id = $1', [id])).rows
      : [];
    
    // Get signals if table exists
    const signals = tables.signals_exists
      ? (await pool.query('SELECT * FROM prospect_signals WHERE prospect_id = $1 ORDER BY detected_at DESC', [id])).rows
      : [];
    
    // Get reviews if table exists
    const reviews = tables.reviews_exists
      ? (await pool.query('SELECT * FROM competitor_reviews WHERE prospect_id = $1', [id])).rows
      : [];
    
    res.json({
      ...prospect,
      contacts,
      signals,
      reviews
    });
  } catch (error) {
    console.error('Error fetching prospect details:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch prospect details',
      details: error.message 
    });
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
    
    console.log(`📥 API request to fetch PhantomBuster phantom ${phantomId}`);
    
    const phantomBuster = new PhantomBusterService();
    
    // Check if API key is configured
    if (!process.env.PHANTOMBUSTER_API_KEY) {
      console.error('❌ PHANTOMBUSTER_API_KEY not configured');
      return res.status(500).json({ 
        error: 'PhantomBuster API key not configured',
        details: 'Please add PHANTOMBUSTER_API_KEY to environment variables'
      });
    }
    
    // Fetch results from PhantomBuster
    console.log(`🔍 Fetching results from PhantomBuster phantom ${phantomId}...`);
    const data = await phantomBuster.fetchPhantomResults(phantomId, limit);
    
    console.log(`📊 Processing ${data.length} records...`);
    
    // Process and save to database
    const result = await phantomBuster.processPhantomBusterData(data);
    
    console.log(`✅ Import complete: ${result.imported} imported, ${result.skipped} skipped`);
    
    res.json({
      success: true,
      ...result,
      message: `Imported ${result.imported} new prospects, skipped ${result.skipped} existing`
    });
  } catch (error) {
    console.error('❌ Error fetching from PhantomBuster:', error.message);
    console.error('Stack trace:', error.stack);
    
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

// Enrich prospects with Apollo data
router.post('/enrich', authenticate, async (req, res) => {
  try {
    const { limit = 5 } = req.body;
    
    // Dynamically import Apollo service only when needed
    const { default: ApolloEnrichmentService } = await import('../services/apolloEnrichment.js');
    const apollo = new ApolloEnrichmentService();
    
    // Check if API key is configured
    if (!process.env.APOLLO_API_KEY) {
      return res.status(400).json({ 
        error: 'Apollo API key not configured',
        details: 'Please add APOLLO_API_KEY to environment variables'
      });
    }
    
    console.log(`🚀 Starting enrichment for up to ${limit} prospects...`);
    
    // Get prospects that need enrichment
    const needsEnrichment = await pool.query(`
      SELECT id, company_name, website 
      FROM prospects 
      WHERE (technologies_used IS NULL 
        OR employee_count IS NULL
        OR revenue_estimate IS NULL)
        AND website IS NOT NULL
      ORDER BY has_eos_titles DESC, prospect_score DESC NULLS LAST
      LIMIT $1
    `, [limit]);
    
    if (needsEnrichment.rows.length === 0) {
      return res.json({
        success: true,
        enriched: 0,
        message: 'No prospects need enrichment'
      });
    }
    
    const results = [];
    
    for (const prospect of needsEnrichment.rows) {
      try {
        console.log(`Enriching ${prospect.company_name}...`);
        const enrichResult = await apollo.enrichProspect(prospect.id);
        results.push({
          prospect_id: prospect.id,
          company_name: prospect.company_name,
          success: true,
          contacts_found: enrichResult.contactsFound
        });
        
        // Rate limiting - Apollo has strict limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to enrich ${prospect.company_name}:`, error.message);
        results.push({
          prospect_id: prospect.id,
          company_name: prospect.company_name,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      enriched: successCount,
      total: results.length,
      results: results,
      message: `Enriched ${successCount} out of ${results.length} prospects`
    });
  } catch (error) {
    console.error('Error during enrichment:', error);
    res.status(500).json({ 
      error: 'Failed to enrich prospects',
      details: error.message 
    });
  }
});

export default router;