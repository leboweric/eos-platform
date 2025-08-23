import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugProspects() {
  console.log('🔍 DATABASE DEBUG SCRIPT\n');
  console.log('=' .repeat(50));
  
  try {
    // 1. Check which database we're connected to
    console.log('\n1️⃣ DATABASE CONNECTION INFO:');
    const dbInfo = await pool.query(`
      SELECT 
        current_database() as database_name,
        current_user as user_name,
        inet_server_addr() as server_address,
        inet_server_port() as server_port,
        version() as postgres_version
    `);
    console.log('Connected to:', dbInfo.rows[0]);
    
    // 2. Check if we're on Railway or local
    const isRailway = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost');
    console.log(`\n2️⃣ ENVIRONMENT:`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`Using Railway: ${isRailway ? 'YES' : 'NO'}`);
    console.log(`DATABASE_URL starts with: ${process.env.DATABASE_URL?.substring(0, 30)}...`);
    
    // 3. Check schema
    console.log(`\n3️⃣ CURRENT SCHEMA:`);
    const schemaResult = await pool.query('SHOW search_path');
    console.log(`Search path: ${schemaResult.rows[0].search_path}`);
    
    // 4. List all tables
    console.log(`\n4️⃣ ALL TABLES IN DATABASE:`);
    const tables = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        tableowner
      FROM pg_tables 
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schemaname, tablename
    `);
    
    console.log(`Found ${tables.rows.length} tables:`);
    tables.rows.forEach(t => {
      console.log(`  - ${t.schemaname}.${t.tablename} (owner: ${t.tableowner})`);
    });
    
    // 5. Check prospects table specifically
    console.log(`\n5️⃣ PROSPECTS TABLE CHECK:`);
    const prospectTableExists = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        tableowner
      FROM pg_tables 
      WHERE tablename = 'prospects'
    `);
    
    if (prospectTableExists.rows.length > 0) {
      console.log('✅ Prospects table found:');
      prospectTableExists.rows.forEach(t => {
        console.log(`  Schema: ${t.schemaname}, Owner: ${t.tableowner}`);
      });
      
      // Count records in each schema's prospects table
      for (const table of prospectTableExists.rows) {
        try {
          const count = await pool.query(`SELECT COUNT(*) FROM ${table.schemaname}.prospects`);
          console.log(`  Records in ${table.schemaname}.prospects: ${count.rows[0].count}`);
        } catch (e) {
          console.log(`  Could not count records in ${table.schemaname}.prospects: ${e.message}`);
        }
      }
    } else {
      console.log('❌ No prospects table found');
    }
    
    // 6. Try different queries
    console.log(`\n6️⃣ QUERY TESTS:`);
    
    // Test 1: Simple count
    try {
      const count1 = await pool.query('SELECT COUNT(*) FROM prospects');
      console.log(`✅ SELECT COUNT(*) FROM prospects: ${count1.rows[0].count}`);
    } catch (e) {
      console.log(`❌ SELECT COUNT(*) FROM prospects: ${e.message}`);
    }
    
    // Test 2: With schema prefix
    try {
      const count2 = await pool.query('SELECT COUNT(*) FROM public.prospects');
      console.log(`✅ SELECT COUNT(*) FROM public.prospects: ${count2.rows[0].count}`);
    } catch (e) {
      console.log(`❌ SELECT COUNT(*) FROM public.prospects: ${e.message}`);
    }
    
    // Test 3: Sample data
    try {
      const sample = await pool.query('SELECT id, company_name, created_at FROM prospects LIMIT 3');
      console.log(`✅ Sample prospects (${sample.rows.length} rows):`);
      sample.rows.forEach(r => {
        console.log(`  - ${r.company_name} (ID: ${r.id}, Created: ${new Date(r.created_at).toLocaleDateString()})`);
      });
    } catch (e) {
      console.log(`❌ Could not fetch sample: ${e.message}`);
    }
    
    // 7. Check for multiple databases
    console.log(`\n7️⃣ ALL DATABASES:`);
    const databases = await pool.query(`
      SELECT datname, datowner 
      FROM pg_database 
      WHERE datistemplate = false
      ORDER BY datname
    `);
    console.log(`Found ${databases.rows.length} databases:`);
    databases.rows.forEach(d => {
      console.log(`  - ${d.datname} (owner: ${d.datowner})`);
    });
    
    // 8. Check connection string
    console.log(`\n8️⃣ CONNECTION ANALYSIS:`);
    if (process.env.DATABASE_URL) {
      try {
        const url = new URL(process.env.DATABASE_URL);
        console.log(`  Host: ${url.hostname}`);
        console.log(`  Port: ${url.port}`);
        console.log(`  Database: ${url.pathname.substring(1)}`);
        console.log(`  User: ${url.username}`);
      } catch (e) {
        console.log('  Could not parse DATABASE_URL');
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Debug complete\n');
    
  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

debugProspects();