import axios from 'axios';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function smartEnrichment() {
  const apiKey = process.env.APOLLO_API_KEY;
  
  console.log('🚀 Smart Apollo Enrichment - Targeting findable companies\n');
  
  if (!apiKey) {
    console.error('❌ APOLLO_API_KEY not found');
    return;
  }
  
  try {
    // Get prospects with clean company names that Apollo can find
    const prospects = await pool.query(`
      SELECT 
        p.id,
        p.company_name,
        p.website,
        pc.first_name,
        pc.last_name,
        pc.title
      FROM prospects p
      JOIN prospect_contacts pc ON p.id = pc.prospect_id
      WHERE p.has_eos_titles = true
        AND pc.email IS NULL
        AND p.company_name NOT IN ('Self-employed', 'Freelance', 'Independent', 'Confidentiel')
        AND p.company_name NOT LIKE '%™%'
        AND p.company_name NOT LIKE '%®%'
        AND LENGTH(p.company_name) < 40
        AND p.website IS NOT NULL
        AND p.website NOT LIKE '%.com.com'
        AND p.website NOT LIKE 'www..com'
      ORDER BY p.prospect_score DESC
      LIMIT 5
    `);
    
    console.log(`📊 Found ${prospects.rows.length} prospects to enrich\n`);
    
    for (const prospect of prospects.rows) {
      console.log(`\n🔍 Enriching: ${prospect.company_name}`);
      console.log(`   Website: ${prospect.website}`);
      console.log(`   Contact: ${prospect.first_name} ${prospect.last_name} (${prospect.title})`);
      
      try {
        // Clean the website for Apollo
        let domain = prospect.website;
        if (domain) {
          domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
        }
        
        console.log(`   Using domain: ${domain}`);
        
        // Search for the company
        const companyResponse = await axios.post(
          'https://api.apollo.io/v1/mixed_companies/search',
          {
            per_page: 1,
            organization_names: [prospect.company_name],
            domains: domain ? [domain] : []
          },
          {
            headers: {
              'X-Api-Key': apiKey,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (companyResponse.data.organizations && companyResponse.data.organizations.length > 0) {
          const company = companyResponse.data.organizations[0];
          console.log(`   ✅ Found company: ${company.name}`);
          console.log(`   - Employees: ${company.estimated_num_employees || 'Unknown'}`);
          console.log(`   - Industry: ${company.industry || 'Unknown'}`);
          console.log(`   - Website: ${company.website_url || 'Unknown'}`);
          
          // Update prospect with company data
          await pool.query(`
            UPDATE prospects
            SET 
              employee_count = $1,
              industry = $2,
              website = COALESCE($3, website),
              revenue_estimate = $4,
              location = $5,
              last_updated = NOW()
            WHERE id = $6
          `, [
            company.estimated_num_employees,
            company.industry,
            company.website_url,
            company.annual_revenue,
            company.city && company.state ? `${company.city}, ${company.state}` : null,
            prospect.id
          ]);
          
          // Now search for people at this company
          const peopleResponse = await axios.post(
            'https://api.apollo.io/v1/mixed_people/search',
            {
              per_page: 5,
              organization_ids: [company.id],
              person_titles: [prospect.title, 'COO', 'CEO', 'Integrator', 'President']
            },
            {
              headers: {
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (peopleResponse.data.people && peopleResponse.data.people.length > 0) {
            console.log(`   📧 Found ${peopleResponse.data.people.length} contacts`);
            
            for (const person of peopleResponse.data.people) {
              if (person.email) {
                console.log(`   - ${person.name}: ${person.email}`);
                
                // Update or insert contact
                await pool.query(`
                  UPDATE prospect_contacts
                  SET 
                    email = COALESCE($1, email),
                    phone = COALESCE($2, phone),
                    last_updated = NOW()
                  WHERE prospect_id = $3 
                    AND first_name = $4 
                    AND last_name = $5
                `, [
                  person.email,
                  person.phone_numbers?.[0]?.sanitized_number,
                  prospect.id,
                  person.first_name || prospect.first_name,
                  person.last_name || prospect.last_name
                ]);
              }
            }
          }
        } else {
          console.log(`   ❌ Company not found in Apollo`);
        }
        
        // Rate limiting
        console.log('   ⏳ Waiting 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    const summary = await pool.query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_prospects,
        COUNT(DISTINCT CASE WHEN pc.email IS NOT NULL THEN p.id END) as with_email,
        COUNT(DISTINCT CASE WHEN p.employee_count IS NOT NULL THEN p.id END) as with_company_data
      FROM prospects p
      JOIN prospect_contacts pc ON p.id = pc.prospect_id
      WHERE p.has_eos_titles = true
    `);
    
    const stats = summary.rows[0];
    console.log('\n📈 ENRICHMENT SUMMARY:');
    console.log(`Total EOS Integrators: ${stats.total_prospects}`);
    console.log(`With email: ${stats.with_email}`);
    console.log(`With company data: ${stats.with_company_data}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

smartEnrichment();