import dotenv from 'dotenv';
import PhantomBusterService from '../services/phantomBusterService.js';
import pkg from 'pg';

dotenv.config();

const { Pool } = pkg;

// IMPORTANT: Replace this with your Railway DATABASE_URL
const RAILWAY_DATABASE_URL = 'YOUR_RAILWAY_DATABASE_URL_HERE';

// Force connection to Railway
process.env.DATABASE_URL = RAILWAY_DATABASE_URL;

// Create Railway pool
const pool = new Pool({
  connectionString: RAILWAY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function importToRailway() {
  console.log('🚀 Importing PhantomBuster data directly to Railway...\n');
  
  try {
    // First, verify connection to Railway
    const dbCheck = await pool.query('SELECT current_database(), current_user');
    console.log('✅ Connected to Railway:', dbCheck.rows[0]);
    
    // Clear existing data
    console.log('\n🧹 Clearing existing data in Railway...');
    await pool.query('DELETE FROM prospect_signals');
    await pool.query('DELETE FROM prospect_contacts');  
    await pool.query('DELETE FROM prospects');
    
    // Fetch and import from PhantomBuster
    console.log('\n📥 Fetching data from PhantomBuster...');
    const phantomBuster = new PhantomBusterService();
    
    // Use the correct phantom ID
    const phantomId = '7483492332629658';
    const data = await phantomBuster.fetchPhantomResults(phantomId, 700);
    
    console.log(`✅ Fetched ${data.length} records from PhantomBuster`);
    
    // Process and import
    console.log('\n💾 Importing to Railway database...');
    const result = await phantomBuster.processPhantomBusterData(data);
    
    console.log('\n✅ Import complete!');
    console.log(`   Imported: ${result.imported} new prospects`);
    console.log(`   Skipped: ${result.skipped} duplicates`);
    
    // Verify the import
    const count = await pool.query('SELECT COUNT(*) FROM prospects');
    const contactCount = await pool.query('SELECT COUNT(*) FROM prospect_contacts');
    const signalCount = await pool.query('SELECT COUNT(*) FROM prospect_signals');
    
    console.log('\n📊 Final counts in Railway:');
    console.log(`   Prospects: ${count.rows[0].count}`);
    console.log(`   Contacts: ${contactCount.rows[0].count}`);
    console.log(`   Signals: ${signalCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the import
importToRailway().catch(console.error);