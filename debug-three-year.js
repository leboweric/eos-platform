const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function debug() {
  try {
    // Find the three_year_picture that was just updated
    const result = await pool.query(`
      SELECT 
        tp.id,
        tp.what_does_it_look_like,
        tp.updated_at,
        bb.organization_id,
        o.name as org_name
      FROM three_year_pictures tp
      JOIN business_blueprints bb ON bb.id = tp.vto_id
      JOIN organizations o ON o.id = bb.organization_id
      WHERE tp.id = 'ea74bb04-4526-465c-81fe-1e316e17d91a'
    `);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log('Found three_year_picture:');
      console.log('ID:', row.id);
      console.log('Org:', row.org_name);
      console.log('Updated at:', row.updated_at);
      console.log('what_does_it_look_like:', row.what_does_it_look_like);
      
      if (row.what_does_it_look_like) {
        try {
          const parsed = JSON.parse(row.what_does_it_look_like);
          console.log('Parsed items:', parsed);
          console.log('Number of items:', parsed.length);
        } catch (e) {
          console.log('Could not parse as JSON:', e.message);
        }
      }
    } else {
      console.log('No three_year_picture found with that ID');
      
      // Let's find all three_year_pictures for Field
      const fieldResult = await pool.query(`
        SELECT 
          tp.id,
          tp.what_does_it_look_like,
          tp.updated_at,
          o.name as org_name
        FROM three_year_pictures tp
        JOIN business_blueprints bb ON bb.id = tp.vto_id
        JOIN organizations o ON o.id = bb.organization_id
        WHERE o.name LIKE '%Field%'
        ORDER BY tp.updated_at DESC
      `);
      
      console.log('\nAll Field three_year_pictures:');
      fieldResult.rows.forEach(row => {
        console.log('---');
        console.log('ID:', row.id);
        console.log('Org:', row.org_name);
        console.log('Updated:', row.updated_at);
        console.log('Items:', row.what_does_it_look_like);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

debug();