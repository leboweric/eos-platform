import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load test environment
dotenv.config({ path: '.env.test' });

// Use TEST_DATABASE_URL for the test database
const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  console.error('❌ TEST_DATABASE_URL not found in .env.test');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function setupTestDatabase() {
  try {
    console.log('🔗 Connecting to test database...');
    await client.connect();
    console.log('✅ Connected to test database');

    // Read and execute the schema file
    const schemaPath = join(__dirname, 'setup-test-schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    
    console.log('📝 Running test schema setup...');
    await client.query(schema);
    console.log('✅ Test schema created successfully!');

    // Verify critical tables exist
    console.log('\n🔍 Verifying tables...');
    
    const tables = [
      'users',
      'organizations', 
      'user_organizations',
      'teams',
      'quarterly_priorities',
      'todos',
      'issues',
      'scorecard_metrics',
      'business_blueprints'
    ];

    for (const table of tables) {
      const result = await client.query(
        `SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_name = $1`,
        [table]
      );
      
      if (result.rows[0].count === '1') {
        console.log(`✅ Table exists: ${table}`);
      } else {
        console.log(`❌ Table missing: ${table}`);
      }
    }

    console.log('\n✨ Test database setup complete!');
    console.log('You can now run: npm test');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Disconnected from database');
  }
}

// Run the setup
setupTestDatabase();