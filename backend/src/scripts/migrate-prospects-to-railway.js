import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const { Pool } = pkg;

// IMPORTANT: Update this with your Railway DATABASE_URL
const RAILWAY_DATABASE_URL = process.env.RAILWAY_DATABASE_URL || 'YOUR_RAILWAY_DATABASE_URL_HERE';

// Local database connection
const localPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/forty2_db',
  ssl: false
});

// Railway database connection  
const railwayPool = new Pool({
  connectionString: RAILWAY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateProspects() {
  const localClient = await localPool.connect();
  const railwayClient = await railwayPool.connect();
  
  try {
    console.log('🚀 Starting migration from local to Railway...\n');
    
    // First, clear existing data in Railway (if any)
    console.log('🧹 Clearing existing Railway data...');
    await railwayClient.query('BEGIN');
    await railwayClient.query('DELETE FROM prospect_signals');
    await railwayClient.query('DELETE FROM prospect_contacts');
    await railwayClient.query('DELETE FROM prospects');
    
    // Get all prospects from local
    console.log('📥 Fetching prospects from local database...');
    const prospects = await localClient.query('SELECT * FROM prospects');
    console.log(`Found ${prospects.rows.length} prospects`);
    
    // Insert prospects into Railway
    console.log('📤 Inserting prospects into Railway...');
    for (const prospect of prospects.rows) {
      await railwayClient.query(`
        INSERT INTO prospects (
          id, company_name, website, linkedin_url, employee_count,
          revenue_estimate, industry, location, description,
          using_competitor, has_eos_titles, eos_keywords_found,
          eos_implementer, prospect_score, prospect_tier, status,
          source, source_date, notes, tags, created_at, last_updated
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        )
      `, [
        prospect.id, prospect.company_name, prospect.website, prospect.linkedin_url,
        prospect.employee_count, prospect.revenue_estimate, prospect.industry,
        prospect.location, prospect.description, prospect.using_competitor,
        prospect.has_eos_titles, prospect.eos_keywords_found, prospect.eos_implementer,
        prospect.prospect_score, prospect.prospect_tier, prospect.status,
        prospect.source, prospect.source_date, prospect.notes, prospect.tags,
        prospect.created_at, prospect.last_updated
      ]);
    }
    
    // Get all contacts from local
    console.log('\n📥 Fetching contacts from local database...');
    const contacts = await localClient.query('SELECT * FROM prospect_contacts');
    console.log(`Found ${contacts.rows.length} contacts`);
    
    // Insert contacts into Railway
    console.log('📤 Inserting contacts into Railway...');
    for (const contact of contacts.rows) {
      await railwayClient.query(`
        INSERT INTO prospect_contacts (
          id, prospect_id, first_name, last_name, title, email,
          phone, linkedin_url, is_decision_maker, is_eos_role,
          notes, created_at, last_updated
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        )
      `, [
        contact.id, contact.prospect_id, contact.first_name, contact.last_name,
        contact.title, contact.email, contact.phone, contact.linkedin_url,
        contact.is_decision_maker, contact.is_eos_role, contact.notes,
        contact.created_at, contact.last_updated
      ]);
    }
    
    // Get all signals from local
    console.log('\n📥 Fetching signals from local database...');
    const signals = await localClient.query('SELECT * FROM prospect_signals');
    console.log(`Found ${signals.rows.length} signals`);
    
    // Insert signals into Railway
    console.log('📤 Inserting signals into Railway...');
    for (const signal of signals.rows) {
      await railwayClient.query(`
        INSERT INTO prospect_signals (
          id, prospect_id, signal_type, signal_strength,
          signal_data, source, detected_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )
      `, [
        signal.id, signal.prospect_id, signal.signal_type,
        signal.signal_strength, signal.signal_data, signal.source,
        signal.detected_at
      ]);
    }
    
    await railwayClient.query('COMMIT');
    
    // Verify the migration
    const railwayCount = await railwayClient.query('SELECT COUNT(*) FROM prospects');
    const railwayContactCount = await railwayClient.query('SELECT COUNT(*) FROM prospect_contacts');
    const railwaySignalCount = await railwayClient.query('SELECT COUNT(*) FROM prospect_signals');
    
    console.log('\n✅ Migration complete!');
    console.log(`   Prospects in Railway: ${railwayCount.rows[0].count}`);
    console.log(`   Contacts in Railway: ${railwayContactCount.rows[0].count}`);
    console.log(`   Signals in Railway: ${railwaySignalCount.rows[0].count}`);
    
  } catch (error) {
    await railwayClient.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    localClient.release();
    railwayClient.release();
    await localPool.end();
    await railwayPool.end();
  }
}

// Run the migration
migrateProspects().catch(console.error);