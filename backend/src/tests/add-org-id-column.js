import pg from 'pg';
import dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: '.env.test' });

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  console.error('❌ TEST_DATABASE_URL not found in .env.test');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function addOrganizationIdColumn() {
  try {
    await client.connect();
    console.log('✅ Connected to test database');

    // Check if column exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'organization_id'
    `);

    if (checkResult.rows.length === 0) {
      console.log('Adding organization_id column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
      `);
      console.log('✅ Added organization_id column');
    } else {
      console.log('✓ organization_id column already exists');
    }

  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addOrganizationIdColumn();