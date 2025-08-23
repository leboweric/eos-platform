import express from 'express';
import pool from '../config/database.js';
import ApolloEnrichmentService from '../services/apolloEnrichment.js';

const router = express.Router();

// Simple webhook authentication
const validateWebhookToken = (req, res, next) => {
  const webhookToken = process.env.PROSPECT_WEBHOOK_TOKEN || 'axp-webhook-secret-2024';
  const providedToken = req.headers['x-webhook-token'] || req.query.token;
  
  if (providedToken !== webhookToken) {
    console.warn('Invalid webhook token attempted');
    return res.status(401).json({ error: 'Invalid webhook token' });
  }
  
  next();
};

// PhantomBuster webhook endpoint
router.post('/phantombuster', validateWebhookToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    // PhantomBuster sends data in this format
    const { data, phantom, runId } = req.body;
    
    console.log(`📥 PhantomBuster webhook received: ${data?.length || 0} prospects from phantom ${phantom}`);
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    await client.query('BEGIN');
    
    const imported = [];
    const skipped = [];
    const enrichQueue = [];
    
    for (const item of data) {
      // Parse PhantomBuster LinkedIn data
      const prospect = parsePhantomBusterData(item);
      
      if (!prospect.company_name) {
        console.log('Skipping item without company name:', item);
        continue;
      }
      
      // Check if prospect already exists
      const existing = await client.query(
        'SELECT id FROM prospects WHERE company_name = $1 OR website = $2',
        [prospect.company_name, prospect.website]
      );
      
      if (existing.rows.length > 0) {
        // Update existing prospect with new signals
        const prospectId = existing.rows[0].id;
        
        await client.query(`
          UPDATE prospects 
          SET 
            has_eos_titles = COALESCE($1, has_eos_titles),
            eos_keywords_found = COALESCE($2, eos_keywords_found),
            linkedin_url = COALESCE($3, linkedin_url),
            last_updated = NOW()
          WHERE id = $4
        `, [
          prospect.has_eos_titles,
          prospect.eos_keywords_found,
          prospect.linkedin_url,
          prospectId
        ]);
        
        // Add new signal
        await client.query(`
          INSERT INTO prospect_signals (
            prospect_id, signal_type, signal_strength, signal_data, source
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          prospectId,
          'linkedin_update',
          prospect.signal_strength || 5,
          JSON.stringify(item),
          'phantombuster'
        ]);
        
        skipped.push(prospect.company_name);
      } else {
        // Insert new prospect
        const result = await client.query(`
          INSERT INTO prospects (
            company_name, website, linkedin_url, employee_count,
            industry, has_eos_titles, eos_keywords_found,
            source, source_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING id, company_name
        `, [
          prospect.company_name,
          prospect.website,
          prospect.linkedin_url,
          prospect.employee_count,
          prospect.industry,
          prospect.has_eos_titles,
          prospect.eos_keywords_found,
          'phantombuster'
        ]);
        
        const newProspectId = result.rows[0].id;
        imported.push(result.rows[0]);
        enrichQueue.push(newProspectId);
        
        // Add initial signal
        await client.query(`
          INSERT INTO prospect_signals (
            prospect_id, signal_type, signal_strength, signal_data, source
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          newProspectId,
          prospect.signal_type || 'linkedin_profile',
          prospect.signal_strength || 5,
          JSON.stringify(item),
          'phantombuster'
        ]);
      }
    }
    
    await client.query('COMMIT');
    
    // Trigger Apollo enrichment for new prospects (async, don't wait)
    if (enrichQueue.length > 0) {
      enrichProspectsAsync(enrichQueue);
    }
    
    res.json({
      success: true,
      imported: imported.length,
      skipped: skipped.length,
      details: { imported, skipped },
      message: `Imported ${imported.length} new prospects, skipped ${skipped.length} existing`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('PhantomBuster webhook error:', error);
    res.status(500).json({ error: 'Failed to process webhook data' });
  } finally {
    client.release();
  }
});

// Parse PhantomBuster data into our format
function parsePhantomBusterData(item) {
  // Detect EOS signals in the data
  const eosKeywords = ['eos', 'traction', 'integrator', 'visionary', 'l10', 'rocks', 'accountability chart'];
  const textToSearch = `${item.name} ${item.description} ${item.headline} ${item.jobTitle} ${item.summary}`.toLowerCase();
  
  const foundKeywords = eosKeywords.filter(keyword => textToSearch.includes(keyword));
  const hasEOSTitles = /integrator|visionary/i.test(item.jobTitle || '');
  
  // Calculate signal strength
  let signalStrength = 0;
  if (foundKeywords.length > 0) signalStrength += 3;
  if (hasEOSTitles) signalStrength += 5;
  if (item.employeeCount >= 10 && item.employeeCount <= 250) signalStrength += 2;
  
  return {
    company_name: item.companyName || item.company || item.name,
    website: item.website || item.companyWebsite || extractWebsiteFromLinkedIn(item.companyUrl),
    linkedin_url: item.companyUrl || item.linkedinUrl || item.url,
    employee_count: parseEmployeeCount(item.employeeCount || item.companySize),
    industry: item.industry || item.companyIndustry,
    has_eos_titles: hasEOSTitles,
    eos_keywords_found: foundKeywords.length > 0 ? foundKeywords : null,
    signal_type: hasEOSTitles ? 'eos_title_found' : 'linkedin_company',
    signal_strength: signalStrength
  };
}

// Extract website from LinkedIn URL
function extractWebsiteFromLinkedIn(linkedinUrl) {
  if (!linkedinUrl) return null;
  // Extract company name from LinkedIn URL and guess website
  const match = linkedinUrl.match(/company\/([^/]+)/);
  if (match) {
    const companySlug = match[1].replace(/-/g, '');
    return `${companySlug}.com`; // Best guess, Apollo will correct it
  }
  return null;
}

// Parse employee count from various formats
function parseEmployeeCount(employeeStr) {
  if (!employeeStr) return null;
  if (typeof employeeStr === 'number') return employeeStr;
  
  // Parse ranges like "51-200 employees"
  const match = employeeStr.match(/(\d+)[-–](\d+)/);
  if (match) {
    return Math.floor((parseInt(match[1]) + parseInt(match[2])) / 2);
  }
  
  // Parse single numbers
  const singleMatch = employeeStr.match(/(\d+)/);
  if (singleMatch) {
    return parseInt(singleMatch[1]);
  }
  
  return null;
}

// Async function to enrich prospects with Apollo
async function enrichProspectsAsync(prospectIds) {
  try {
    const apollo = new ApolloEnrichmentService();
    
    for (const prospectId of prospectIds) {
      try {
        await apollo.enrichProspect(prospectId);
        console.log(`✅ Enriched prospect ${prospectId}`);
        
        // Rate limiting - Apollo allows ~10 requests per second
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to enrich prospect ${prospectId}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Enrichment queue error:', error);
  }
}

// Manual CSV upload endpoint
router.post('/csv-import', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { csvData } = req.body;
    
    if (!csvData || !Array.isArray(csvData)) {
      return res.status(400).json({ error: 'Invalid CSV data' });
    }
    
    await client.query('BEGIN');
    
    const imported = [];
    const skipped = [];
    
    for (const row of csvData) {
      // Map CSV columns to our schema
      const prospect = {
        company_name: row['Company'] || row['Company Name'] || row['company_name'],
        website: row['Website'] || row['website'] || row['Company Website'],
        linkedin_url: row['LinkedIn URL'] || row['linkedin_url'] || row['Company LinkedIn'],
        employee_count: parseInt(row['Employees'] || row['Employee Count'] || row['employee_count']) || null,
        industry: row['Industry'] || row['industry'],
        source: 'csv_import'
      };
      
      if (!prospect.company_name) continue;
      
      // Check if exists
      const existing = await client.query(
        'SELECT id FROM prospects WHERE company_name = $1',
        [prospect.company_name]
      );
      
      if (existing.rows.length > 0) {
        skipped.push(prospect.company_name);
        continue;
      }
      
      // Insert new prospect
      const result = await client.query(`
        INSERT INTO prospects (
          company_name, website, linkedin_url, employee_count,
          industry, source, source_date
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, company_name
      `, [
        prospect.company_name,
        prospect.website,
        prospect.linkedin_url,
        prospect.employee_count,
        prospect.industry,
        prospect.source
      ]);
      
      imported.push(result.rows[0]);
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      imported: imported.length,
      skipped: skipped.length,
      message: `Imported ${imported.length} prospects, skipped ${skipped.length} duplicates`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('CSV import error:', error);
    res.status(500).json({ error: 'Failed to import CSV data' });
  } finally {
    client.release();
  }
});

// Health check endpoint for webhook
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'prospect-webhooks' });
});

export default router;