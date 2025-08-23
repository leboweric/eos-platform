import axios from 'axios';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function apolloBulkEnrich() {
  const apiKey = process.env.APOLLO_API_KEY;
  
  console.log('🚀 Apollo Bulk Enrichment - Mimicking web upload strategy\n');
  
  if (!apiKey) {
    console.error('❌ APOLLO_API_KEY not found');
    return;
  }
  
  const client = await pool.connect();
  
  try {
    // Get prospects in batches like the web upload
    const prospects = await client.query(`
      SELECT 
        pc.id as contact_id,
        pc.prospect_id,
        pc.first_name,
        pc.last_name,
        pc.title,
        p.company_name,
        p.website,
        p.linkedin_url,
        pc.linkedin_url as contact_linkedin
      FROM prospect_contacts pc
      JOIN prospects p ON pc.prospect_id = p.id
      WHERE p.has_eos_titles = true
        AND pc.email IS NULL
        AND p.prospect_tier IN ('hot', 'warm')
      ORDER BY p.prospect_score DESC
      LIMIT 200
    `);
    
    console.log(`📊 Processing ${prospects.rows.length} EOS Integrators\n`);
    
    let found = 0;
    let processed = 0;
    
    // Process in batches like the web upload
    const batchSize = 10;
    for (let i = 0; i < prospects.rows.length; i += batchSize) {
      const batch = prospects.rows.slice(i, i + batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1} (${batch.length} contacts)`);
      
      // Prepare bulk search
      const searchNames = [];
      const searchCompanies = [];
      const searchDomains = [];
      
      for (const contact of batch) {
        searchNames.push(`${contact.first_name} ${contact.last_name}`);
        searchCompanies.push(contact.company_name);
        
        // Extract domain from website
        if (contact.website) {
          const domain = contact.website
            .replace(/^(https?:\/\/)?(www\.)?/, '')
            .replace(/\/$/, '');
          if (domain && domain !== '.com' && domain.includes('.')) {
            searchDomains.push(domain);
          }
        }
      }
      
      try {
        // Search for all people in batch at once
        const response = await axios.post(
          'https://api.apollo.io/v1/mixed_people/search',
          {
            per_page: 50,
            person_names: searchNames,
            organization_names: searchCompanies,
            organization_domains: searchDomains.length > 0 ? searchDomains : undefined,
            email_status: ['verified', 'guessed', 'unknown'] // Accept any email status
          },
          {
            headers: {
              'X-Api-Key': apiKey,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.data.people && response.data.people.length > 0) {
          console.log(`   ✅ Found ${response.data.people.length} people in Apollo`);
          
          // Match results back to our contacts
          for (const person of response.data.people) {
            if (!person.email) continue;
            
            // Find matching contact by name
            for (const contact of batch) {
              const nameMatch = 
                (person.first_name?.toLowerCase() === contact.first_name?.toLowerCase() &&
                 person.last_name?.toLowerCase() === contact.last_name?.toLowerCase()) ||
                (person.name?.toLowerCase().includes(contact.first_name?.toLowerCase()) &&
                 person.name?.toLowerCase().includes(contact.last_name?.toLowerCase()));
              
              const companyMatch = 
                person.organization?.name?.toLowerCase().includes(contact.company_name?.toLowerCase().split(' ')[0]) ||
                contact.company_name?.toLowerCase().includes(person.organization?.name?.toLowerCase().split(' ')[0]);
              
              if (nameMatch || companyMatch) {
                console.log(`   📧 Matched: ${contact.first_name} ${contact.last_name} -> ${person.email}`);
                
                // Update contact with email
                await client.query(`
                  UPDATE prospect_contacts
                  SET 
                    email = $1,
                    phone = $2,
                    last_updated = NOW()
                  WHERE id = $3
                `, [
                  person.email,
                  person.phone_numbers?.[0]?.sanitized_number,
                  contact.contact_id
                ]);
                
                // Update company data if available
                if (person.organization) {
                  await client.query(`
                    UPDATE prospects
                    SET 
                      website = COALESCE(NULLIF($1, ''), website),
                      employee_count = COALESCE($2, employee_count),
                      industry = COALESCE(NULLIF($3, ''), industry),
                      location = COALESCE(NULLIF($4, ''), location),
                      last_updated = NOW()
                    WHERE id = $5
                  `, [
                    person.organization.website_url,
                    person.organization.estimated_num_employees,
                    person.organization.industry,
                    person.organization.city && person.organization.state ? 
                      `${person.organization.city}, ${person.organization.state}` : null,
                    contact.prospect_id
                  ]);
                }
                
                found++;
                break; // Move to next person
              }
            }
          }
        } else {
          console.log(`   ❌ No results for this batch`);
        }
        
        processed += batch.length;
        console.log(`   Progress: ${processed}/${prospects.rows.length} processed, ${found} emails found`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ Batch error: ${error.response?.data?.error || error.message}`);
        // Continue with next batch even if this one fails
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`\n✅ ENRICHMENT COMPLETE:`);
    console.log(`   Processed: ${processed} contacts`);
    console.log(`   Emails found: ${found}`);
    console.log(`   Success rate: ${Math.round(found/processed*100)}%`);
    
    // Final stats
    const summary = await client.query(`
      SELECT 
        COUNT(*) as total_contacts,
        COUNT(email) as with_email,
        COUNT(phone) as with_phone
      FROM prospect_contacts pc
      JOIN prospects p ON pc.prospect_id = p.id
      WHERE p.has_eos_titles = true
    `);
    
    const stats = summary.rows[0];
    console.log(`\n📈 OVERALL DATABASE STATS:`);
    console.log(`   Total EOS Integrator contacts: ${stats.total_contacts}`);
    console.log(`   With emails: ${stats.with_email} (${Math.round(stats.with_email/stats.total_contacts*100)}%)`);
    console.log(`   With phones: ${stats.with_phone} (${Math.round(stats.with_phone/stats.total_contacts*100)}%)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

apolloBulkEnrich();