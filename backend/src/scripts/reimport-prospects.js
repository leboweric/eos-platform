import PhantomBusterService from '../services/phantomBusterService.js';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkAndReimportProspects() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking Railway database for prospects...\n');
    
    // Check if we have prospects in Railway
    const result = await client.query('SELECT COUNT(*) as count FROM prospects');
    const count = parseInt(result.rows[0].count);
    
    console.log(`📊 Found ${count} prospects in Railway database\n`);
    
    if (count === 0) {
      console.log('⚠️  No prospects found in Railway database');
      console.log('🔄 Re-importing from PhantomBuster...\n');
      
      const phantomBuster = new PhantomBusterService();
      
      // Fetch data from PhantomBuster
      const phantomId = '7483492332629658'; // Correct Phantom ID
      console.log(`📥 Fetching data from Phantom ${phantomId}...`);
      
      const data = await phantomBuster.fetchPhantomResults(phantomId);
      console.log(`✅ Fetched ${data.length} records from PhantomBuster\n`);
      
      if (data.length > 0) {
        // Process and save the data
        console.log('💾 Importing prospects to Railway database...');
        const result = await phantomBuster.processPhantomBusterData(data);
        
        console.log('\n✅ Import complete:');
        console.log(`   - Imported: ${result.imported} prospects`);
        console.log(`   - Skipped: ${result.skipped} duplicates`);
      }
    } else {
      console.log('✅ Prospects already exist in Railway database');
      
      // Show sample data
      const samples = await client.query('SELECT company_name, has_eos_titles FROM prospects LIMIT 5');
      console.log('\n📋 Sample prospects:');
      samples.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.company_name} (EOS: ${row.has_eos_titles ? 'Yes' : 'No'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndReimportProspects();