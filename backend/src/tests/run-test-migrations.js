import { readFileSync, readdirSync } from 'fs';
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

async function runMigrations() {
  try {
    console.log('🔗 Connecting to test database...');
    await client.connect();
    console.log('✅ Connected to test database');

    // Get all migration files
    const migrationsPath = join(__dirname, '../../database/migrations');
    const files = readdirSync(migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to run in order

    console.log(`📁 Found ${files.length} migration files`);

    // Track results
    const results = {
      success: [],
      skipped: [],
      failed: []
    };

    // Run each migration
    for (const file of files) {
      const filePath = join(migrationsPath, file);
      const sql = readFileSync(filePath, 'utf8');
      
      // Skip if file is empty or only has comments
      if (!sql.trim() || sql.trim().startsWith('--') && !sql.includes(';')) {
        console.log(`⏭️  Skipping empty file: ${file}`);
        results.skipped.push(file);
        continue;
      }

      try {
        console.log(`🔄 Running migration: ${file}`);
        
        // Split by semicolons to handle multiple statements
        const statements = sql
          .split(';')
          .filter(stmt => stmt.trim().length > 0)
          .map(stmt => stmt.trim() + ';');

        for (const statement of statements) {
          // Skip comment-only statements
          if (statement.trim().startsWith('--') || statement.trim() === ';') {
            continue;
          }
          
          // Handle CREATE TABLE IF NOT EXISTS, ALTER TABLE IF EXISTS, etc.
          await client.query(statement);
        }
        
        console.log(`✅ Success: ${file}`);
        results.success.push(file);
      } catch (error) {
        // Handle common errors that are OK to ignore
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('duplicate key')) {
          console.log(`⚠️  Warning (${file}): ${error.message.split('\n')[0]}`);
          results.skipped.push(`${file} (${error.message.split('\n')[0]})`);
        } else {
          console.error(`❌ Failed: ${file}`);
          console.error(`   Error: ${error.message}`);
          results.failed.push(`${file}: ${error.message}`);
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${results.success.length} migrations`);
    console.log(`⚠️  Skipped/Warning: ${results.skipped.length} migrations`);
    console.log(`❌ Failed: ${results.failed.length} migrations`);
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed migrations:');
      results.failed.forEach(f => console.log(`   - ${f}`));
    }

    // Verify critical tables exist
    console.log('\n' + '='.repeat(60));
    console.log('🔍 VERIFYING CRITICAL TABLES');
    console.log('='.repeat(60));
    
    const criticalTables = [
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

    for (const table of criticalTables) {
      try {
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
      } catch (error) {
        console.log(`❌ Error checking table ${table}: ${error.message}`);
      }
    }

    console.log('\n✨ Migration process complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Disconnected from database');
  }
}

// Run the migrations
runMigrations();