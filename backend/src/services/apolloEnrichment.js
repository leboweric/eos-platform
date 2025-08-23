import axios from 'axios';
import pool from '../config/database.js';

class ApolloEnrichmentService {
  constructor() {
    this.apiKey = process.env.APOLLO_API_KEY;
    this.baseUrl = 'https://api.apollo.io/v1';
    
    // Technologies that indicate EOS/BOS usage
    this.competitorTechnologies = [
      'Ninety.io',
      'Bloom Growth',
      'Traction Tools',
      'EOS One',
      'Align'
    ];
    
    // Job titles that indicate EOS roles
    this.eosJobTitles = [
      'integrator',
      'visionary',
      'eos implementer',
      'traction',
      'chief operating officer',
      'coo',
      'operations director',
      'chief executive officer',
      'ceo',
      'president'
    ];
  }

  // Enrich company data
  async enrichCompany(companyName, website) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/organizations/enrich`,
        {
          domain: website,
          organization_name: companyName
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const company = response.data.organization;
      
      if (!company) {
        console.log(`No company data found for ${companyName}`);
        return null;
      }
      
      // Extract relevant data
      const enrichedData = {
        company_name: company.name,
        website: company.website_url,
        employee_count: company.estimated_num_employees,
        revenue_estimate: company.annual_revenue,
        industry: company.industry,
        description: company.short_description,
        linkedin_url: company.linkedin_url,
        technologies_used: company.technologies || [],
        keywords: company.keywords || [],
        
        // Growth indicators
        employee_growth_rate: company.employee_growth_rate,
        funding_total: company.total_funding,
        last_funding_date: company.last_funding_date,
        
        // Location
        city: company.city,
        state: company.state,
        country: company.country,
        
        // Additional context
        alexa_ranking: company.alexa_ranking,
        phone: company.phone,
        founded_year: company.founded_year
      };
      
      // Check if using competitor technology
      const usingCompetitor = this.checkCompetitorUsage(enrichedData.technologies_used);
      if (usingCompetitor) {
        enrichedData.using_competitor = usingCompetitor;
      }
      
      // Check for EOS-related keywords
      const eosSignals = this.extractEOSSignals(company);
      enrichedData.eos_signals = eosSignals;
      
      return enrichedData;
    } catch (error) {
      console.error(`Error enriching company ${companyName}:`, error.message);
      return null;
    }
  }

  // Find people at company
  async findPeople(companyName, domain) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/mixed_people/search`,
        {
          organization_domains: [domain],
          per_page: 25,
          page: 1,
          
          // Focus on decision makers
          person_titles: [
            'CEO',
            'Chief Executive Officer',
            'COO',
            'Chief Operating Officer',
            'President',
            'Founder',
            'VP Operations',
            'Director of Operations',
            'Integrator',
            'Visionary'
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const people = response.data.people || [];
      const contacts = [];
      
      for (const person of people) {
        const contact = {
          first_name: person.first_name,
          last_name: person.last_name,
          title: person.title,
          email: person.email,
          phone: person.phone_numbers?.[0]?.sanitized_number,
          linkedin_url: person.linkedin_url,
          
          // Determine if key role
          is_decision_maker: this.isDecisionMaker(person.title),
          is_eos_role: this.isEOSRole(person.title),
          
          // Additional context
          seniority: person.seniority,
          departments: person.departments || [],
          
          // Email status
          email_verified: person.email_status === 'verified'
        };
        
        contacts.push(contact);
      }
      
      return contacts;
    } catch (error) {
      console.error(`Error finding people for ${companyName}:`, error.message);
      return [];
    }
  }

  // Check if company uses competitor technology
  checkCompetitorUsage(technologies) {
    if (!technologies || !Array.isArray(technologies)) return null;
    
    for (const tech of technologies) {
      const techName = typeof tech === 'string' ? tech : tech.name;
      for (const competitor of this.competitorTechnologies) {
        if (techName?.toLowerCase().includes(competitor.toLowerCase())) {
          return competitor.toLowerCase().replace(/\s+/g, '_');
        }
      }
    }
    
    return null;
  }

  // Extract EOS-related signals from company data
  extractEOSSignals(company) {
    const signals = [];
    
    // Check keywords
    const eosKeywords = ['eos', 'traction', 'entrepreneurial operating system', 'rocks', 'l10'];
    const allText = `${company.keywords?.join(' ')} ${company.short_description}`.toLowerCase();
    
    for (const keyword of eosKeywords) {
      if (allText.includes(keyword)) {
        signals.push(`Contains keyword: ${keyword}`);
      }
    }
    
    // Check if in typical EOS industries
    const eosIndustries = ['manufacturing', 'construction', 'professional services', 'healthcare'];
    if (company.industry && eosIndustries.some(ind => 
      company.industry.toLowerCase().includes(ind))) {
      signals.push(`EOS-friendly industry: ${company.industry}`);
    }
    
    // Check company size (EOS sweet spot)
    if (company.estimated_num_employees >= 10 && company.estimated_num_employees <= 250) {
      signals.push('Ideal EOS company size (10-250 employees)');
    }
    
    return signals;
  }

  // Determine if title is decision maker
  isDecisionMaker(title) {
    if (!title) return false;
    
    const decisionMakerTitles = [
      'ceo', 'chief executive',
      'coo', 'chief operating',
      'president', 'founder',
      'owner', 'managing director',
      'general manager', 'vp', 'vice president',
      'director'
    ];
    
    const lowerTitle = title.toLowerCase();
    return decisionMakerTitles.some(t => lowerTitle.includes(t));
  }

  // Check if title is EOS-specific role
  isEOSRole(title) {
    if (!title) return false;
    
    const lowerTitle = title.toLowerCase();
    return this.eosJobTitles.some(t => lowerTitle.includes(t));
  }

  // Main enrichment function for a prospect
  async enrichProspect(prospectId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get prospect data
      const prospectResult = await client.query(
        'SELECT * FROM prospects WHERE id = $1',
        [prospectId]
      );
      
      if (prospectResult.rows.length === 0) {
        throw new Error('Prospect not found');
      }
      
      const prospect = prospectResult.rows[0];
      
      // Enrich company data
      const enrichedCompany = await this.enrichCompany(
        prospect.company_name,
        prospect.website
      );
      
      if (enrichedCompany) {
        // Update prospect with enriched data
        await client.query(
          `UPDATE prospects SET
            employee_count = COALESCE($1, employee_count),
            revenue_estimate = COALESCE($2, revenue_estimate),
            industry = COALESCE($3, industry),
            linkedin_url = COALESCE($4, linkedin_url),
            technologies_used = $5,
            growth_rate = $6,
            recent_funding = $7,
            using_competitor = COALESCE($8, using_competitor),
            eos_keywords_found = $9,
            last_updated = NOW()
          WHERE id = $10`,
          [
            enrichedCompany.employee_count,
            enrichedCompany.revenue_estimate,
            enrichedCompany.industry,
            enrichedCompany.linkedin_url,
            JSON.stringify(enrichedCompany.technologies_used),
            enrichedCompany.employee_growth_rate,
            enrichedCompany.funding_total ? JSON.stringify({
              total: enrichedCompany.funding_total,
              last_date: enrichedCompany.last_funding_date
            }) : null,
            enrichedCompany.using_competitor,
            enrichedCompany.eos_signals,
            prospectId
          ]
        );
        
        // Add enrichment signal
        await client.query(
          `INSERT INTO prospect_signals (
            prospect_id, signal_type, signal_strength, signal_data, source
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            prospectId,
            'apollo_enrichment',
            enrichedCompany.using_competitor ? 8 : 5,
            JSON.stringify(enrichedCompany),
            'apollo'
          ]
        );
      }
      
      // Find and save contacts
      const contacts = await this.findPeople(
        prospect.company_name,
        prospect.website || enrichedCompany?.website
      );
      
      for (const contact of contacts) {
        // Check if contact already exists
        const existingContact = await client.query(
          'SELECT id FROM prospect_contacts WHERE email = $1',
          [contact.email]
        );
        
        if (existingContact.rows.length === 0 && contact.email) {
          await client.query(
            `INSERT INTO prospect_contacts (
              prospect_id, first_name, last_name, title, email,
              phone, linkedin_url, is_decision_maker, is_eos_role
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              prospectId,
              contact.first_name,
              contact.last_name,
              contact.title,
              contact.email,
              contact.phone,
              contact.linkedin_url,
              contact.is_decision_maker,
              contact.is_eos_role
            ]
          );
        }
      }
      
      // Recalculate prospect score
      await client.query('SELECT calculate_prospect_score($1)', [prospectId]);
      
      await client.query('COMMIT');
      
      return {
        success: true,
        enrichedData: enrichedCompany,
        contactsFound: contacts.length
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Bulk enrich multiple prospects
  async bulkEnrichProspects(limit = 10) {
    // Get prospects that need enrichment
    const result = await pool.query(
      `SELECT id, company_name, website 
       FROM prospects 
       WHERE technologies_used IS NULL 
         OR employee_count IS NULL
         OR revenue_estimate IS NULL
       ORDER BY prospect_score DESC NULLS LAST
       LIMIT $1`,
      [limit]
    );
    
    const results = [];
    
    for (const prospect of result.rows) {
      try {
        console.log(`Enriching ${prospect.company_name}...`);
        const enrichResult = await this.enrichProspect(prospect.id);
        results.push({
          prospect_id: prospect.id,
          company_name: prospect.company_name,
          ...enrichResult
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
    
    return results;
  }
}

// Export for use in routes and scheduled jobs
export default ApolloEnrichmentService;