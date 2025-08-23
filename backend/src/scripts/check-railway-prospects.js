import pkg from 'pg';
const { Pool } = pkg;

// IMPORTANT: Replace this with your actual Railway DATABASE_URL
// You can find it in Railway dashboard -> Variables -> DATABASE_URL
const RAILWAY_DATABASE_URL = 'YOUR_RAILWAY_DATABASE_URL_HERE';

async function checkRailwayProspects() {
  if (RAILWAY_DATABASE_URL === 'YOUR_RAILWAY_DATABASE_URL_HERE') {
    console.log('⚠️  Please update this script with your Railway DATABASE_URL');
    console.log('You can find it in Railway dashboard -> Variables -> DATABASE_URL');
    console.log('\nTo get your DATABASE_URL:');
    console.log('1. Go to https://railway.app/dashboard');
    console.log('2. Click on your eos-platform project');
    console.log('3. Click on the Postgres service');
    console.log('4. Go to Variables tab');
    console.log('5. Copy the DATABASE_URL value');
    console.log('6. Replace YOUR_RAILWAY_DATABASE_URL_HERE in this script');
    return;
  }
  
  const pool = new Pool({
    connectionString: RAILWAY_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await pool.connect();
    
    console.log('🔍 Checking Railway database for prospects...\n');
    
    // Check prospects count
    const result = await client.query('SELECT COUNT(*) as count FROM prospects');
    const count = parseInt(result.rows[0].count);
    
    console.log(`📊 Found ${count} prospects in Railway database\n`);
    
    if (count > 0) {
      // Show sample data
      const samples = await client.query(`
        SELECT company_name, has_eos_titles, created_at 
        FROM prospects 
        ORDER BY created_at DESC 
        LIMIT 10
      `);
      
      console.log('📋 Latest 10 prospects:');
      samples.rows.forEach((row, i) => {
        const date = new Date(row.created_at).toLocaleDateString();
        console.log(`   ${i + 1}. ${row.company_name} (EOS: ${row.has_eos_titles ? 'Yes' : 'No'}) - Added: ${date}`);
      });
      
      // Check contacts
      const contactCount = await client.query('SELECT COUNT(*) as count FROM prospect_contacts');
      console.log(`\n👥 Found ${contactCount.rows[0].count} contacts`);
      
      // Check signals
      const signalCount = await client.query('SELECT COUNT(*) as count FROM prospect_signals');
      console.log(`📡 Found ${signalCount.rows[0].count} signals`);
    } else {
      console.log('⚠️  No prospects found in Railway database');
      console.log('\nThis means the data needs to be re-imported.');
      console.log('The data you saw in the UI was likely cached or from a local database.');
      console.log('\nTo re-import:');
      console.log('1. Wait for Railway to finish deploying the fix');
      console.log('2. Go to https://axplatform.app/sales-intelligence');
      console.log('3. Enter password: axp-prospects-2024');
      console.log('4. Click "Import from PhantomBuster"');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error connecting to Railway:', error.message);
    console.log('\nMake sure you have the correct DATABASE_URL from Railway');
  } finally {
    await pool.end();
  }
}

checkRailwayProspects();