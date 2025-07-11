import dotenv from 'dotenv';
import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function ensureMigrationsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (error) {
    console.error('Failed to create migrations table:', error);
    throw error;
  }
}

async function getMigrationsToRun() {
  // Get all migration files
  const migrationsDir = join(__dirname, '..', 'database', 'migrations');
  const allFiles = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  // Get already executed migrations
  const result = await pool.query('SELECT filename FROM migrations ORDER BY filename');
  const executedMigrations = new Set(result.rows.map(row => row.filename));

  // Return only migrations that haven't been executed
  return allFiles.filter(file => !executedMigrations.has(file));
}

async function runMigration(filename) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Read and execute the migration
    const migrationPath = join(__dirname, '..', 'database', 'migrations', filename);
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log(`📝 Running migration: ${filename}`);
    await client.query(migrationSQL);
    
    // Record that this migration has been executed
    await client.query(
      'INSERT INTO migrations (filename) VALUES ($1)',
      [filename]
    );
    
    await client.query('COMMIT');
    console.log(`✅ Migration completed: ${filename}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Migration failed: ${filename}`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function runAllMigrations() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Ensure migrations table exists
    await ensureMigrationsTable();
    
    // Get migrations to run
    const migrationsToRun = await getMigrationsToRun();
    
    if (migrationsToRun.length === 0) {
      console.log('✅ All migrations are up to date!');
      return;
    }
    
    console.log(`📊 Found ${migrationsToRun.length} migrations to run`);
    
    // Run each migration in order
    for (const migration of migrationsToRun) {
      await runMigration(migration);
    }
    
    console.log('\n✅ All migrations completed successfully!');
    
    // Show current tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name != 'migrations'
      ORDER BY table_name;
    `);
    
    console.log('\n📊 Database tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runAllMigrations();