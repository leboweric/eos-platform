import axios from 'axios';
import pool from '../config/database.js';
import ApolloEnrichmentService from './apolloEnrichment.js';
import { parse } from 'csv-parse/sync';

class PhantomBusterService {
  constructor() {
    this.apiKey = process.env.PHANTOMBUSTER_API_KEY;
    this.baseUrl = 'https://api.phantombuster.com/api/v1';
    
    if (!this.apiKey) {
      console.warn('⚠️ PHANTOMBUSTER_API_KEY not configured');
    }
  }

  // Fetch results from a specific phantom
  async fetchPhantomResults(phantomId, limit = 100) {
    try {
      console.log(`🔍 Fetching results from PhantomBuster phantom: ${phantomId}`);
      console.log(`Using API key: ${this.apiKey ? 'Present' : 'Missing'}`);
      
      if (!this.apiKey) {
        throw new Error('PHANTOMBUSTER_API_KEY not configured. Please add it to Railway environment variables.');
      }
      
      // PhantomBuster v1 API endpoint for fetching output
      const url = `${this.baseUrl}/agent/${phantomId}/output`;
      
      console.log(`Fetching from URL: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'X-Phantombuster-Key': this.apiKey,
          'Accept': 'application/json'
        }
      });

      console.log(`✅ Received response from PhantomBuster`);
      
      // V1 API response structure - check for CSV URL in output
      if (response.data.status === 'success' && response.data.data) {
        const data = response.data.data;
        
        // Try to extract CSV URL from the output logs
        const csvMatch = data.output?.match(/CSV saved at (https:\/\/phantombuster\.s3\.amazonaws\.com[^\s]+\.csv)/);
        
        if (csvMatch) {
          console.log(`📊 Found CSV URL: ${csvMatch[1]}`);
          
          // Download and parse the CSV
          try {
            console.log('📥 Downloading CSV from S3...');
            const csvResponse = await axios.get(csvMatch[1], {
              timeout: 30000, // 30 second timeout
              maxContentLength: 50 * 1024 * 1024, // 50MB max
              headers: {
                'Accept': 'text/csv,*/*'
              }
            });
            
            console.log(`📄 CSV downloaded, size: ${csvResponse.data.length} bytes`);
            const csvData = csvResponse.data;
            
            // Parse CSV using proper CSV parser
            const results = parse(csvData, {
              columns: true,
              skip_empty_lines: true,
              trim: true,
              relax_quotes: true,
              relax_column_count: true
            });
            
            console.log(`✅ Parsed ${results.length} records from CSV`);
            return results;
          } catch (csvError) {
            console.error('Error downloading/parsing CSV:', csvError.message);
            if (csvError.response) {
              console.error('CSV download response:', csvError.response.status, csvError.response.statusText);
            }
            throw new Error(`Failed to download CSV: ${csvError.message}`);
          }
        }
        
        // Fallback to resultObject if no CSV
        if (data.resultObject) {
          try {
            const parsed = JSON.parse(data.resultObject);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.log('Could not parse resultObject');
          }
        }
        
        return [];
      } else {
        console.error('Unexpected response structure:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Error fetching PhantomBuster results:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  // Process and save PhantomBuster data
  async processPhantomBusterData(data) {
    const client = await pool.connect();
    
    try {
      // Ensure we're using the public schema
      await client.query('SET search_path TO public');
      
      // Create tables if they don't exist
      await this.ensureTablesExist(client);
      
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
          try {
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
            
            console.log(`✅ Imported new prospect: ${prospect.company_name} (ID: ${newProspectId})`);
          
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
          
          // Add contact if we have the information
          if (prospect.contact_name) {
            const names = prospect.contact_name.split(' ');
            const firstName = names[0];
            const lastName = names.slice(1).join(' ');
            
            await client.query(`
              INSERT INTO prospect_contacts (
                prospect_id, first_name, last_name, title, 
                linkedin_url, is_decision_maker, is_eos_role
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT DO NOTHING
            `, [
              newProspectId,
              firstName,
              lastName,
              prospect.contact_title,
              prospect.contact_linkedin,
              true, // They're likely decision makers if they have EOS titles
              prospect.has_eos_titles
            ]);
          }
        }
      }
      
      await client.query('COMMIT');
      
      console.log(`✅ Transaction committed: ${imported.length} imported, ${skipped.length} skipped`);
      
      // Trigger Apollo enrichment for new prospects
      if (enrichQueue.length > 0 && process.env.APOLLO_API_KEY) {
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
    // Handle PhantomBuster Sales Navigator Export format
    const companyName = item.companyName || item.company || item.name || item.query;
    const fullName = item.fullName || item.name;
    const jobTitle = item.title || item.jobTitle || item.currentJobTitle;
    
    // Detect EOS signals from the title
    const eosKeywords = ['eos', 'traction', 'integrator', 'visionary', 'l10', 'rocks', 'accountability', 'level 10'];
    const allText = `${companyName || ''} ${item.description || ''} ${item.headline || ''} ${jobTitle || ''} ${item.summary || ''}`.toLowerCase();
    
    const foundKeywords = eosKeywords.filter(keyword => allText.includes(keyword));
    const hasEOSTitles = /integrator|visionary/i.test(jobTitle || '');
    
    // Calculate signal strength
    let signalStrength = 0;
    if (foundKeywords.length > 0) signalStrength += 3 * foundKeywords.length;
    if (hasEOSTitles) signalStrength += 8;
    
    // Extract company LinkedIn URL from regularCompanyUrl or companyUrl
    const companyLinkedIn = item.regularCompanyUrl || item.companyUrl;
    
    return {
      company_name: companyName || `${fullName}'s Company`,
      website: item.website || item.companyWebsite || this.extractWebsiteFromLinkedIn(companyLinkedIn),
      linkedin_url: companyLinkedIn || item.linkedInProfileUrl || item.profileUrl,
      employee_count: this.parseEmployeeCount(item.employeeCount || item.companySize || item.staffCount),
      industry: item.industry || item.companyIndustry || item.field,
      has_eos_titles: hasEOSTitles,
      eos_keywords_found: foundKeywords.length > 0 ? foundKeywords : null,
      signal_type: hasEOSTitles ? 'eos_title_found' : 'linkedin_profile',
      signal_strength: Math.min(signalStrength, 10), // Cap at 10
      contact_name: fullName,
      contact_title: jobTitle,
      contact_linkedin: item.profileUrl || item.linkedInProfileUrl
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

  // Ensure tables exist
  async ensureTablesExist(client) {
    try {
      // Create prospects table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS prospects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_name VARCHAR(255) NOT NULL,
          website VARCHAR(255),
          linkedin_url VARCHAR(500),
          employee_count INTEGER,
          revenue_estimate DECIMAL(12,2),
          industry VARCHAR(100),
          location VARCHAR(255),
          description TEXT,
          using_competitor VARCHAR(50),
          has_eos_titles BOOLEAN DEFAULT false,
          eos_keywords_found TEXT[],
          eos_implementer VARCHAR(255),
          prospect_score INTEGER DEFAULT 0,
          prospect_tier VARCHAR(20) DEFAULT 'cold',
          status VARCHAR(50) DEFAULT 'new',
          source VARCHAR(100),
          source_date TIMESTAMP,
          notes TEXT,
          tags TEXT[],
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_activity_date TIMESTAMP
        )
      `);
      
      // Create prospect_contacts table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS prospect_contacts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          title VARCHAR(200),
          email VARCHAR(255),
          phone VARCHAR(50),
          linkedin_url VARCHAR(500),
          is_decision_maker BOOLEAN DEFAULT false,
          is_eos_role BOOLEAN DEFAULT false,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create prospect_signals table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS prospect_signals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
          signal_type VARCHAR(100),
          signal_strength INTEGER DEFAULT 5,
          signal_data JSONB,
          source VARCHAR(100),
          detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create indexes if they don't exist
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_prospects_company ON prospects(company_name);
        CREATE INDEX IF NOT EXISTS idx_prospects_tier ON prospects(prospect_tier);
        CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
      `);
      
      console.log('✅ Tables verified/created successfully');
    } catch (error) {
      console.error('Error ensuring tables exist:', error.message);
      // Don't throw - tables might already exist
    }
  }
  
  // Get all phantoms
  async listPhantoms() {
    try {
      const response = await axios.get(`${this.baseUrl}/user`, {
        headers: {
          'X-Phantombuster-Key': this.apiKey
        }
      });
      
      // V1 API returns agents under data.data.agents
      if (response.data.status === 'success' && response.data.data && response.data.data.agents) {
        return response.data.data.agents;
      }
      return [];
    } catch (error) {
      console.error('Error listing phantoms:', error);
      throw error;
    }
  }
}

export default PhantomBusterService;