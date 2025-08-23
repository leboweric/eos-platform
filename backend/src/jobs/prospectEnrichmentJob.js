import cron from 'node-cron';
import pool from '../config/database.js';
import ApolloEnrichmentService from '../services/apolloEnrichment.js';
import CompetitorReviewScraper from '../services/competitorReviewScraper.js';

// Daily enrichment job - runs at 2 AM
export function initializeProspectJobs() {
  // Daily enrichment of new prospects
  cron.schedule('0 2 * * *', async () => {
    console.log('🚀 Starting daily prospect enrichment job...');
    
    try {
      // Enrich prospects that need data
      await enrichUnenrichedProspects();
      
      // Scrape competitor reviews
      await scrapeCompetitorReviews();
      
      // Generate daily summary
      await generateDailySummary();
      
      console.log('✅ Daily prospect jobs completed');
    } catch (error) {
      console.error('❌ Daily prospect job error:', error);
    }
  });
  
  // Hourly check for hot prospects needing immediate enrichment
  cron.schedule('0 * * * *', async () => {
    console.log('🔍 Checking for hot prospects to enrich...');
    
    try {
      await enrichHotProspects();
    } catch (error) {
      console.error('Error in hourly enrichment:', error);
    }
  });
  
  console.log('📅 Prospect enrichment jobs initialized');
}

// Enrich prospects missing key data
async function enrichUnenrichedProspects() {
  try {
    // Find prospects needing enrichment
    const result = await pool.query(`
      SELECT id, company_name 
      FROM prospects 
      WHERE (
        technologies_used IS NULL 
        OR employee_count IS NULL 
        OR revenue_estimate IS NULL
      )
      AND created_at > NOW() - INTERVAL '7 days'
      ORDER BY prospect_score DESC NULLS LAST
      LIMIT 20
    `);
    
    if (result.rows.length === 0) {
      console.log('No prospects need enrichment');
      return;
    }
    
    const apollo = new ApolloEnrichmentService();
    let enrichedCount = 0;
    
    for (const prospect of result.rows) {
      try {
        console.log(`Enriching ${prospect.company_name}...`);
        await apollo.enrichProspect(prospect.id);
        enrichedCount++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to enrich ${prospect.company_name}:`, error.message);
      }
    }
    
    console.log(`✅ Enriched ${enrichedCount} prospects`);
  } catch (error) {
    console.error('Enrichment job error:', error);
  }
}

// Priority enrichment for hot prospects
async function enrichHotProspects() {
  try {
    const result = await pool.query(`
      SELECT id, company_name 
      FROM prospects 
      WHERE prospect_tier = 'hot'
      AND technologies_used IS NULL
      AND created_at > NOW() - INTERVAL '1 hour'
      LIMIT 5
    `);
    
    if (result.rows.length === 0) {
      return;
    }
    
    console.log(`Found ${result.rows.length} hot prospects needing immediate enrichment`);
    
    const apollo = new ApolloEnrichmentService();
    
    for (const prospect of result.rows) {
      try {
        await apollo.enrichProspect(prospect.id);
        console.log(`✅ Enriched hot prospect: ${prospect.company_name}`);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to enrich hot prospect ${prospect.company_name}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Hot prospect enrichment error:', error);
  }
}

// Scrape competitor review sites
async function scrapeCompetitorReviews() {
  try {
    console.log('🔍 Scraping competitor reviews...');
    const scraper = new CompetitorReviewScraper();
    const result = await scraper.scrapeAllCompetitors();
    
    console.log(`Found ${result.newProspects} new prospects from reviews`);
    
    // Enrich any new hot prospects immediately
    if (result.newProspects > 0) {
      const hotProspects = await scraper.getHotProspectsFromReviews(1);
      
      if (hotProspects.length > 0) {
        console.log(`Enriching ${hotProspects.length} hot prospects from reviews...`);
        const apollo = new ApolloEnrichmentService();
        
        for (const prospect of hotProspects) {
          try {
            await apollo.enrichProspect(prospect.id);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Failed to enrich ${prospect.company_name}:`, error.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Review scraping error:', error);
  }
}

// Generate and store daily summary
async function generateDailySummary() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if summary already exists
    const existing = await pool.query(
      'SELECT id FROM prospect_daily_summary WHERE summary_date = $1',
      [today]
    );
    
    if (existing.rows.length > 0) {
      console.log('Daily summary already exists');
      return;
    }
    
    // Calculate stats
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_prospects,
        COUNT(CASE WHEN DATE(created_at) = $1 THEN 1 END) as new_prospects_today,
        COUNT(CASE WHEN prospect_tier = 'hot' THEN 1 END) as hot_prospects,
        COUNT(CASE WHEN prospect_tier = 'warm' THEN 1 END) as warm_prospects,
        COUNT(CASE WHEN using_competitor IS NOT NULL THEN 1 END) as competitor_users_found
      FROM prospects
    `, [today]);
    
    const reviewStats = await pool.query(
      'SELECT COUNT(*) as reviews_scraped FROM competitor_reviews WHERE DATE(scraped_at) = $1',
      [today]
    );
    
    const outreachStats = await pool.query(
      'SELECT COUNT(*) as outreach_sent FROM prospect_outreach WHERE DATE(outreach_date) = $1',
      [today]
    );
    
    // Insert summary
    await pool.query(`
      INSERT INTO prospect_daily_summary (
        summary_date, total_prospects, new_prospects_today,
        hot_prospects, warm_prospects, competitor_users_found, 
        reviews_scraped, outreach_sent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      today,
      stats.rows[0].total_prospects,
      stats.rows[0].new_prospects_today,
      stats.rows[0].hot_prospects,
      stats.rows[0].warm_prospects,
      stats.rows[0].competitor_users_found,
      reviewStats.rows[0].reviews_scraped,
      outreachStats.rows[0].outreach_sent || 0
    ]);
    
    console.log(`📊 Daily summary generated:
      Total: ${stats.rows[0].total_prospects}
      New Today: ${stats.rows[0].new_prospects_today}
      Hot: ${stats.rows[0].hot_prospects}
      Competitor Users: ${stats.rows[0].competitor_users_found}`);
      
  } catch (error) {
    console.error('Daily summary generation error:', error);
  }
}

// Manual trigger functions for testing
export async function triggerEnrichment() {
  console.log('Manual enrichment triggered');
  await enrichUnenrichedProspects();
}

export async function triggerReviewScraping() {
  console.log('Manual review scraping triggered');
  await scrapeCompetitorReviews();
}