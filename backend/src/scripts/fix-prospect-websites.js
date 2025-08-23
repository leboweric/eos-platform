import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixProspectWebsites() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 FIXING PROSPECT WEBSITE URLs\n');
    console.log('=' .repeat(50));
    
    await client.query('BEGIN');
    
    // Get all prospects with broken websites
    const brokenWebsites = await client.query(`
      SELECT 
        id,
        company_name,
        website,
        linkedin_url
      FROM prospects
      WHERE website IS NOT NULL
        AND (
          website ~ '^[0-9]+\\.com$'  -- Just numbers.com
          OR website !~ '\\.'          -- No dot at all
          OR LENGTH(website) < 5       -- Too short
        )
      ORDER BY company_name
    `);
    
    console.log(`\n📊 Found ${brokenWebsites.rows.length} prospects with broken websites\n`);
    
    const fixed = [];
    const needsManual = [];
    
    for (const prospect of brokenWebsites.rows) {
      let newWebsite = null;
      
      // Strategy 1: Extract from LinkedIn URL if available
      if (prospect.linkedin_url && prospect.linkedin_url.includes('company/')) {
        const match = prospect.linkedin_url.match(/company\/([^\/]+)/);
        if (match) {
          const companySlug = match[1];
          // Common patterns for LinkedIn to website
          if (companySlug && companySlug.length > 2) {
            newWebsite = `www.${companySlug.replace(/-/g, '')}.com`;
          }
        }
      }
      
      // Strategy 2: Generate from company name
      if (!newWebsite && prospect.company_name) {
        // Clean company name to create domain
        let cleanName = prospect.company_name.toLowerCase()
          .replace(/\s*(llc|inc|ltd|corporation|corp|company|co\.?|group|services|consulting|solutions)\s*$/gi, '')
          .replace(/[^a-z0-9]/g, '');
        
        if (cleanName.length > 2) {
          // Special cases for known companies
          const knownDomains = {
            'harmaninternational': 'harman.com',
            'timhortons': 'timhortons.com',
            'gallagher': 'ajg.com',
            'colliers': 'colliers.com',
            'raytheon': 'rtx.com',
            'ibmglobal': 'ibm.com',
            'bloomgrowth': 'bloomgrowth.com',
            'ninety': 'ninety.io',
            'highplainsbank': 'hpbank.com'
          };
          
          if (knownDomains[cleanName]) {
            newWebsite = `www.${knownDomains[cleanName]}`;
          } else {
            newWebsite = `www.${cleanName}.com`;
          }
        }
      }
      
      if (newWebsite) {
        // Update the website
        await client.query(
          'UPDATE prospects SET website = $1 WHERE id = $2',
          [newWebsite, prospect.id]
        );
        
        fixed.push({
          company: prospect.company_name,
          old: prospect.website,
          new: newWebsite
        });
        
        console.log(`✅ Fixed: ${prospect.company_name}`);
        console.log(`   Old: ${prospect.website}`);
        console.log(`   New: ${newWebsite}`);
      } else {
        needsManual.push({
          company: prospect.company_name,
          current: prospect.website,
          linkedin: prospect.linkedin_url
        });
        
        console.log(`⚠️  Needs manual review: ${prospect.company_name}`);
        console.log(`   Current: ${prospect.website}`);
      }
    }
    
    // Also fix prospects with NO website but have LinkedIn
    const noWebsite = await client.query(`
      SELECT 
        id,
        company_name,
        linkedin_url
      FROM prospects
      WHERE website IS NULL
        AND linkedin_url IS NOT NULL
        AND linkedin_url LIKE '%linkedin.com/company/%'
    `);
    
    console.log(`\n📊 Found ${noWebsite.rows.length} prospects with LinkedIn but no website\n`);
    
    for (const prospect of noWebsite.rows) {
      const match = prospect.linkedin_url.match(/company\/([^\/]+)/);
      if (match) {
        const companySlug = match[1];
        if (companySlug && companySlug.length > 2) {
          const newWebsite = `www.${companySlug.replace(/-/g, '')}.com`;
          
          await client.query(
            'UPDATE prospects SET website = $1 WHERE id = $2',
            [newWebsite, prospect.id]
          );
          
          fixed.push({
            company: prospect.company_name,
            old: 'NULL',
            new: newWebsite
          });
          
          console.log(`✅ Added website for: ${prospect.company_name} -> ${newWebsite}`);
        }
      }
    }
    
    await client.query('COMMIT');
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📈 WEBSITE FIX SUMMARY:\n');
    console.log(`✅ Fixed: ${fixed.length} websites`);
    console.log(`⚠️  Need manual review: ${needsManual.length} websites`);
    
    // Show updated stats
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(website) as with_website,
        COUNT(CASE WHEN website ~ '^www\\.' OR website ~ '\\.[a-z]{2,}$' THEN 1 END) as valid_website
      FROM prospects
      WHERE has_eos_titles = true
    `);
    
    const s = stats.rows[0];
    console.log(`\n📊 Website Coverage for EOS Integrators:`);
    console.log(`   Total: ${s.total}`);
    console.log(`   With website: ${s.with_website} (${Math.round(s.with_website/s.total*100)}%)`);
    console.log(`   Valid format: ${s.valid_website} (${Math.round(s.valid_website/s.total*100)}%)`);
    
    // Save report
    if (needsManual.length > 0) {
      console.log('\n⚠️  Companies needing manual website lookup:');
      needsManual.slice(0, 10).forEach(p => {
        console.log(`   - ${p.company}`);
      });
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing websites:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixProspectWebsites();