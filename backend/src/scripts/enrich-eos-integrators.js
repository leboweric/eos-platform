import ApolloEnrichmentService from '../services/apolloEnrichment.js';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function enrichEOSIntegrators() {
  console.log('🚀 Starting Apollo Enrichment for EOS Integrators\n');
  
  if (!process.env.APOLLO_API_KEY) {
    console.error('❌ APOLLO_API_KEY not found in environment variables');
    return;
  }
  
  const apollo = new ApolloEnrichmentService();
  
  try {
    // Get EOS Integrators that need enrichment (no email)
    const needsEnrichment = await pool.query(`
      SELECT DISTINCT
        p.id,
        p.company_name,
        p.website,
        pc.first_name,
        pc.last_name,
        pc.title
      FROM prospects p
      JOIN prospect_contacts pc ON p.id = pc.prospect_id
      WHERE p.has_eos_titles = true
        AND (pc.email IS NULL OR p.employee_count IS NULL)
      ORDER BY 
        CASE 
          WHEN pc.title ILIKE '%ceo%' OR pc.title ILIKE '%chief executive%' THEN 1
          WHEN pc.title ILIKE '%coo%' OR pc.title ILIKE '%chief operating%' THEN 2
          WHEN pc.title ILIKE '%integrator%' THEN 3
          WHEN pc.title ILIKE '%visionary%' THEN 4
          ELSE 5
        END
      LIMIT 10
    `);
    
    console.log(`📊 Found ${needsEnrichment.rows.length} EOS Integrators to enrich\n`);
    
    for (const prospect of needsEnrichment.rows) {
      console.log(`\n🔍 Enriching: ${prospect.company_name}`);
      console.log(`   Contact: ${prospect.first_name} ${prospect.last_name}`);
      console.log(`   Title: ${prospect.title}`);
      console.log(`   Current website: ${prospect.website || 'None'}`);
      
      try {
        // Try to fix the website if it's broken
        let website = prospect.website;
        if (website && !website.includes('.')) {
          // Website is probably broken, try to construct it
          const companySlug = prospect.company_name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 20);
          website = `${companySlug}.com`;
          console.log(`   Trying website: ${website}`);
        }
        
        // Enrich with Apollo
        const result = await apollo.enrichProspect(prospect.id);
        
        if (result.success) {
          console.log(`   ✅ Success!`);
          console.log(`   - Contacts found: ${result.contactsFound}`);
          
          // Check if we got the email
          const updatedContact = await pool.query(`
            SELECT email, phone 
            FROM prospect_contacts 
            WHERE prospect_id = $1 
              AND first_name = $2 
              AND last_name = $3
            LIMIT 1
          `, [prospect.id, prospect.first_name, prospect.last_name]);
          
          if (updatedContact.rows.length > 0 && updatedContact.rows[0].email) {
            console.log(`   📧 Email found: ${updatedContact.rows[0].email}`);
            if (updatedContact.rows[0].phone) {
              console.log(`   📞 Phone found: ${updatedContact.rows[0].phone}`);
            }
          }
        } else {
          console.log(`   ❌ Enrichment failed`);
        }
        
        // Rate limiting - Apollo has strict limits
        console.log('   ⏳ Waiting 2 seconds (API rate limit)...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
      }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('📈 ENRICHMENT SUMMARY:\n');
    
    const summary = await pool.query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_eos_integrators,
        COUNT(DISTINCT CASE WHEN pc.email IS NOT NULL THEN p.id END) as with_email,
        COUNT(DISTINCT CASE WHEN pc.phone IS NOT NULL THEN p.id END) as with_phone,
        COUNT(DISTINCT CASE WHEN p.employee_count IS NOT NULL THEN p.id END) as with_company_size
      FROM prospects p
      JOIN prospect_contacts pc ON p.id = pc.prospect_id
      WHERE p.has_eos_titles = true
    `);
    
    const stats = summary.rows[0];
    console.log(`Total EOS Integrators: ${stats.total_eos_integrators}`);
    console.log(`With email: ${stats.with_email} (${Math.round(stats.with_email/stats.total_eos_integrators*100)}%)`);
    console.log(`With phone: ${stats.with_phone} (${Math.round(stats.with_phone/stats.total_eos_integrators*100)}%)`);
    console.log(`With company size: ${stats.with_company_size} (${Math.round(stats.with_company_size/stats.total_eos_integrators*100)}%)`);
    
  } catch (error) {
    console.error('❌ Error during enrichment:', error.message);
  } finally {
    await pool.end();
  }
}

enrichEOSIntegrators();