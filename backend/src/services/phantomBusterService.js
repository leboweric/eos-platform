import axios from 'axios';
import pool from '../config/database.js';
import ApolloEnrichmentService from './apolloEnrichment.js';

class PhantomBusterService {
  constructor() {
    this.apiKey = process.env.PHANTOMBUSTER_API_KEY;
    this.baseUrl = 'https://api.phantombuster.com/api/v2';
  }

  // Fetch results from a specific phantom
  async fetchPhantomResults(phantomId, limit = 100) {
    try {
      console.log(`🔍 Fetching results from PhantomBuster phantom: ${phantomId}`);
      
      const response = await axios.get(`${this.baseUrl}/agents/${phantomId}/output`, {
        headers: {
          'X-Phantombuster-Key': this.apiKey
        },
        params: {
          limit: limit
        }
      });

      console.log(`✅ Fetched ${response.data.length} results from PhantomBuster`);
      return response.data;
    } catch (error) {
      console.error('Error fetching PhantomBuster results:', error.message);
      throw error;
    }
  }

  // Process and save PhantomBuster data
  async processPhantomBusterData(data) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const imported = [];
      const skipped = [];
      const enrichQueue = [];
      
      for (const item of data) {
        // Parse the data based on PhantomBuster format
        const prospect = this.parsePhantomBusterData(item);
        
        if (!prospect.company_name) {
          console.log('Skipping item without company name:', item);
          continue;
        }
        
        // Check if prospect already exists
        const existing = await client.query(
          'SELECT id FROM prospects WHERE company_name = $1 OR (website IS NOT NULL AND website = $2)',
          [prospect.company_name, prospect.website]
        );
        
        if (existing.rows.length > 0) {
          skipped.push(prospect.company_name);
          console.log(`Skipping existing prospect: ${prospect.company_name}`);
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
            'phantombuster_api'
          ]);
          
          const newProspectId = result.rows[0].id;
          imported.push(result.rows[0]);
          enrichQueue.push(newProspectId);
          
          console.log(`✅ Imported new prospect: ${prospect.company_name}`);
          
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
            'phantombuster_api'
          ]);
        }
      }
      
      await client.query('COMMIT');
      
      // Trigger Apollo enrichment for new prospects
      if (enrichQueue.length > 0) {
        console.log(`🚀 Starting enrichment for ${enrichQueue.length} new prospects`);
        this.enrichProspectsAsync(enrichQueue);
      }
      
      return {
        imported: imported.length,
        skipped: skipped.length,
        details: { imported, skipped }
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing PhantomBuster data:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Parse PhantomBuster data into our format
  parsePhantomBusterData(item) {
    // Handle different field names PhantomBuster might use
    const companyName = item.companyName || item.company || item.name || item.query;
    const jobTitle = item.jobTitle || item.title || item.currentJobTitle;
    
    // Detect EOS signals
    const eosKeywords = ['eos', 'traction', 'integrator', 'visionary', 'l10', 'rocks', 'accountability', 'level 10'];
    const allText = `${companyName} ${item.description || ''} ${item.headline || ''} ${jobTitle || ''} ${item.summary || ''}`.toLowerCase();
    
    const foundKeywords = eosKeywords.filter(keyword => allText.includes(keyword));
    const hasEOSTitles = /integrator|visionary/i.test(jobTitle || '');
    
    // Calculate signal strength
    let signalStrength = 0;
    if (foundKeywords.length > 0) signalStrength += 3 * foundKeywords.length;
    if (hasEOSTitles) signalStrength += 8;
    if (item.employeeCount >= 10 && item.employeeCount <= 250) signalStrength += 3;
    
    return {
      company_name: companyName,
      website: item.website || item.companyWebsite || this.extractWebsiteFromLinkedIn(item.companyUrl || item.linkedinUrl),
      linkedin_url: item.companyUrl || item.linkedinUrl || item.profileUrl || item.url,
      employee_count: this.parseEmployeeCount(item.employeeCount || item.companySize || item.staffCount),
      industry: item.industry || item.companyIndustry || item.field,
      has_eos_titles: hasEOSTitles,
      eos_keywords_found: foundKeywords.length > 0 ? foundKeywords : null,
      signal_type: hasEOSTitles ? 'eos_title_found' : 'linkedin_company',
      signal_strength: Math.min(signalStrength, 10) // Cap at 10
    };
  }

  // Extract website from LinkedIn URL
  extractWebsiteFromLinkedIn(linkedinUrl) {
    if (!linkedinUrl) return null;
    const match = linkedinUrl.match(/company\/([^/]+)/);
    if (match) {
      const companySlug = match[1].replace(/-/g, '');
      return `${companySlug}.com`;
    }
    return null;
  }

  // Parse employee count from various formats
  parseEmployeeCount(employeeStr) {
    if (!employeeStr) return null;
    if (typeof employeeStr === 'number') return employeeStr;
    
    const str = employeeStr.toString();
    
    // Parse ranges like "51-200 employees"
    const rangeMatch = str.match(/(\d+)[-–](\d+)/);
    if (rangeMatch) {
      return Math.floor((parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2);
    }
    
    // Parse single numbers
    const singleMatch = str.match(/(\d+)/);
    if (singleMatch) {
      return parseInt(singleMatch[1]);
    }
    
    return null;
  }

  // Async enrichment
  async enrichProspectsAsync(prospectIds) {
    try {
      const apollo = new ApolloEnrichmentService();
      
      for (const prospectId of prospectIds) {
        try {
          await apollo.enrichProspect(prospectId);
          console.log(`✅ Enriched prospect ${prospectId}`);
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to enrich prospect ${prospectId}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Enrichment queue error:', error);
    }
  }

  // Get all phantoms
  async listPhantoms() {
    try {
      const response = await axios.get(`${this.baseUrl}/agents`, {
        headers: {
          'X-Phantombuster-Key': this.apiKey
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error listing phantoms:', error);
      throw error;
    }
  }
}

export default PhantomBusterService;