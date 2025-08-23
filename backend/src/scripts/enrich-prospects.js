import ApolloEnrichmentService from '../services/apolloEnrichment.js';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function enrichProspects() {
  console.log('🚀 Starting Apollo.io Enrichment Process\n');
  
  // Check if API key is configured
  if (!process.env.APOLLO_API_KEY) {
    console.error('❌ APOLLO_API_KEY not found in environment variables');
    console.log('Please add APOLLO_API_KEY to your .env file or Railway environment');
    return;
  }
  
  const apollo = new ApolloEnrichmentService();
  
  try {
    // Get count of prospects needing enrichment
    const needsEnrichment = await pool.query(`
      SELECT COUNT(*) as count 
      FROM prospects 
      WHERE (technologies_used IS NULL 
        OR employee_count IS NULL
        OR revenue_estimate IS NULL)
        AND website IS NOT NULL
    `);
    
    console.log(`📊 Found ${needsEnrichment.rows[0].count} prospects needing enrichment\n`);
    
    // Get prospects with EOS signals to prioritize
    const eosProspects = await pool.query(`
      SELECT id, company_name, website 
      FROM prospects 
      WHERE has_eos_titles = true
        AND website IS NOT NULL
        AND (technologies_used IS NULL OR employee_count IS NULL)
      ORDER BY prospect_score DESC
      LIMIT 10
    `);
    
    if (eosProspects.rows.length > 0) {
      console.log(`🎯 Prioritizing ${eosProspects.rows.length} prospects with EOS titles:\n`);
      
      for (const prospect of eosProspects.rows) {
        console.log(`\n📍 Enriching: ${prospect.company_name}`);
        console.log(`   Website: ${prospect.website || 'No website'}`);
        
        try {
          const result = await apollo.enrichProspect(prospect.id);
          
          if (result.success) {
            console.log(`   ✅ Success!`);
            console.log(`   - Contacts found: ${result.contactsFound}`);
            if (result.enrichedData) {
              console.log(`   - Employee count: ${result.enrichedData.employee_count || 'Unknown'}`);
              console.log(`   - Industry: ${result.enrichedData.industry || 'Unknown'}`);
              console.log(`   - Revenue: ${result.enrichedData.revenue_estimate ? '$' + result.enrichedData.revenue_estimate.toLocaleString() : 'Unknown'}`);
              if (result.enrichedData.using_competitor) {
                console.log(`   ⚠️  Using competitor: ${result.enrichedData.using_competitor}`);
              }
            }
          } else {
            console.log(`   ❌ Failed to enrich`);
          }
          
          // Rate limiting - Apollo has strict limits
          console.log('   ⏳ Waiting 2 seconds (API rate limit)...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`   ❌ Error: ${error.message}`);
        }
      }
      
      console.log('\n' + '='.repeat(50));
    }
    
    // Show enrichment summary
    const enrichedCount = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(technologies_used) as with_tech,
        COUNT(employee_count) as with_employees,
        COUNT(revenue_estimate) as with_revenue,
        COUNT(using_competitor) as using_competitor
      FROM prospects
    `);
    
    const stats = enrichedCount.rows[0];
    console.log('\n📈 Enrichment Summary:');
    console.log(`   Total prospects: ${stats.total}`);
    console.log(`   With technologies: ${stats.with_tech} (${Math.round(stats.with_tech/stats.total*100)}%)`);
    console.log(`   With employee count: ${stats.with_employees} (${Math.round(stats.with_employees/stats.total*100)}%)`);
    console.log(`   With revenue: ${stats.with_revenue} (${Math.round(stats.with_revenue/stats.total*100)}%)`);
    console.log(`   Using competitor: ${stats.using_competitor}`);
    
    // Show contacts found
    const contactCount = await pool.query(`
      SELECT 
        COUNT(DISTINCT prospect_id) as companies_with_contacts,
        COUNT(*) as total_contacts,
        COUNT(CASE WHEN is_eos_role = true THEN 1 END) as eos_roles,
        COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email
      FROM prospect_contacts
    `);
    
    const contactStats = contactCount.rows[0];
    console.log('\n👥 Contact Summary:');
    console.log(`   Companies with contacts: ${contactStats.companies_with_contacts}`);
    console.log(`   Total contacts: ${contactStats.total_contacts}`);
    console.log(`   EOS role contacts: ${contactStats.eos_roles}`);
    console.log(`   Contacts with email: ${contactStats.with_email}`);
    
  } catch (error) {
    console.error('❌ Error during enrichment:', error.message);
  } finally {
    await pool.end();
  }
}

enrichProspects();