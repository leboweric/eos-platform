import axios from 'axios';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function enrichByPerson() {
  const apiKey = process.env.APOLLO_API_KEY;
  
  console.log('🚀 Apollo Enrichment - Searching for people directly\n');
  
  if (!apiKey) {
    console.error('❌ APOLLO_API_KEY not found');
    return;
  }
  
  try {
    // Get top EOS Integrators without emails
    const contacts = await pool.query(`
      SELECT 
        pc.id as contact_id,
        pc.prospect_id,
        pc.first_name,
        pc.last_name,
        pc.title,
        p.company_name,
        p.website,
        p.prospect_score
      FROM prospect_contacts pc
      JOIN prospects p ON pc.prospect_id = p.id
      WHERE p.has_eos_titles = true
        AND pc.email IS NULL
        AND pc.first_name IS NOT NULL
        AND pc.last_name IS NOT NULL
        AND p.company_name NOT IN ('Self-employed', 'Freelance', 'Independent')
      ORDER BY p.prospect_score DESC
      LIMIT 10
    `);
    
    console.log(`📊 Searching for ${contacts.rows.length} EOS Integrators\n`);
    
    let found = 0;
    
    for (const contact of contacts.rows) {
      console.log(`\n🔍 Searching: ${contact.first_name} ${contact.last_name}`);
      console.log(`   Title: ${contact.title}`);
      console.log(`   Company: ${contact.company_name}`);
      
      try {
        // Search for the person by name and company
        const response = await axios.post(
          'https://api.apollo.io/v1/mixed_people/search',
          {
            per_page: 3,
            person_names: [`${contact.first_name} ${contact.last_name}`],
            organization_names: [contact.company_name],
            person_titles: contact.title ? [contact.title] : undefined
          },
          {
            headers: {
              'X-Api-Key': apiKey,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.data.people && response.data.people.length > 0) {
          // Find best match
          let bestMatch = response.data.people[0];
          
          // Try to find exact name match
          for (const person of response.data.people) {
            if (person.first_name?.toLowerCase() === contact.first_name.toLowerCase() &&
                person.last_name?.toLowerCase() === contact.last_name.toLowerCase()) {
              bestMatch = person;
              break;
            }
          }
          
          if (bestMatch.email) {
            console.log(`   ✅ FOUND: ${bestMatch.email}`);
            if (bestMatch.phone_numbers?.[0]) {
              console.log(`   📞 Phone: ${bestMatch.phone_numbers[0].sanitized_number}`);
            }
            console.log(`   🏢 Company: ${bestMatch.organization?.name || 'Unknown'}`);
            console.log(`   💼 Title: ${bestMatch.title || 'Unknown'}`);
            
            // Update contact with email
            await pool.query(`
              UPDATE prospect_contacts
              SET 
                email = $1,
                phone = $2,
                last_updated = NOW()
              WHERE id = $3
            `, [
              bestMatch.email,
              bestMatch.phone_numbers?.[0]?.sanitized_number,
              contact.contact_id
            ]);
            
            // Update company data if we got it
            if (bestMatch.organization) {
              await pool.query(`
                UPDATE prospects
                SET 
                  website = COALESCE($1, website),
                  employee_count = COALESCE($2, employee_count),
                  industry = COALESCE($3, industry),
                  last_updated = NOW()
                WHERE id = $4
              `, [
                bestMatch.organization.website_url,
                bestMatch.organization.estimated_num_employees,
                bestMatch.organization.industry,
                contact.prospect_id
              ]);
            }
            
            found++;
          } else {
            console.log(`   ⚠️  Found person but no email available`);
          }
        } else {
          console.log(`   ❌ Not found in Apollo`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.response?.data?.error || error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`\n✅ Found emails for ${found} out of ${contacts.rows.length} contacts`);
    
    // Check total progress
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_contacts,
        COUNT(email) as with_email
      FROM prospect_contacts pc
      JOIN prospects p ON pc.prospect_id = p.id
      WHERE p.has_eos_titles = true
    `);
    
    const stats = summary.rows[0];
    console.log(`\n📈 OVERALL PROGRESS:`);
    console.log(`Total EOS Integrator contacts: ${stats.total_contacts}`);
    console.log(`With emails: ${stats.with_email} (${Math.round(stats.with_email/stats.total_contacts*100)}%)`);
    
    if (stats.with_email < 50) {
      console.log('\n💡 ALTERNATIVE SOLUTIONS:');
      console.log('1. Export your list and upload to Apollo.io web interface');
      console.log('2. Use Hunter.io or Clearbit for email finding');
      console.log('3. Use LinkedIn Sales Navigator for direct outreach');
      console.log('4. Manual research for top 50 hot prospects');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

enrichByPerson();