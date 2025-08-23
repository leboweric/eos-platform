import pkg from 'pg';
const { Pool } = pkg;

// Local database connection
const localPool = new Pool({
  connectionString: 'postgresql://username:password@localhost:5432/forty2_db',
  ssl: false
});

async function checkLocalDatabase() {
  try {
    const client = await localPool.connect();
    
    console.log('🔍 Checking local database for customer data...\n');
    
    // Check all main tables that might have customer data
    const tables = [
      'users',
      'organizations', 
      'teams',
      'quarterly_priorities',
      'business_blueprints',
      'scorecard_metrics',
      'todos',
      'meetings',
      'issues',
      'prospects',
      'prospect_contacts'
    ];
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        if (result.rows[0].count > 0) {
          console.log(`⚠️  ${table}: ${result.rows[0].count} records`);
          
          // Get sample data to identify if it's customer data
          if (table === 'organizations') {
            const orgs = await client.query(`SELECT id, name, created_at FROM ${table} LIMIT 5`);
            console.log('   Sample organizations:', orgs.rows);
          }
          if (table === 'users') {
            const users = await client.query(`SELECT id, email, created_at FROM ${table} LIMIT 5`);
            console.log('   Sample users:', users.rows.map(u => ({ ...u, email: u.email.substring(0, 3) + '***' })));
          }
        } else {
          console.log(`✅ ${table}: Empty`);
        }
      } catch (err) {
        console.log(`- ${table}: Table doesn't exist`);
      }
    }
    
    // Check for any other tables
    console.log('\n📋 All tables in local database:');
    const allTables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log(allTables.rows.map(r => r.tablename).join(', '));
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error connecting to local database:', error.message);
    console.log('\nThis likely means no local PostgreSQL is running or forty2_db doesn\'t exist.');
    console.log('This is GOOD - it means no customer data is stored locally.');
  } finally {
    await localPool.end();
  }
}

checkLocalDatabase();