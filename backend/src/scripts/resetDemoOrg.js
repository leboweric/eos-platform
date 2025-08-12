#!/usr/bin/env node

/**
 * Demo Organization Reset Script
 * Resets the demo organization to its original state
 * Can be run manually or via cron job
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetDemoOrg() {
  console.log('🔄 Starting demo organization reset...');
  
  try {
    // Begin transaction
    await db.query('BEGIN');
    
    // 1. Delete existing demo org (cascades to all related data)
    console.log('🗑️  Removing existing demo organization...');
    const deleteResult = await db.query(
      "DELETE FROM organizations WHERE slug = 'demo-acme-industries'"
    );
    console.log(`   Deleted ${deleteResult.rowCount} organization(s)`);
    
    // 2. Read and execute the create script
    console.log('📝 Creating fresh demo organization...');
    const createScript = fs.readFileSync(
      path.join(__dirname, '../../../create_demo_org.sql'),
      'utf8'
    );
    
    // Split by semicolons but be careful with functions
    const statements = createScript
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim())
      .map(stmt => stmt.trim() + ';');
    
    for (const statement of statements) {
      // Skip comments and empty statements
      if (statement.startsWith('--') || !statement.trim()) continue;
      
      try {
        await db.query(statement);
      } catch (error) {
        console.error('Error executing statement:', statement.substring(0, 100) + '...');
        throw error;
      }
    }
    
    // 3. Set company rock flags
    console.log('🎯 Setting company rock flags...');
    await db.query(`
      ALTER TABLE quarterly_priorities 
      ADD COLUMN IF NOT EXISTS is_company_priority BOOLEAN DEFAULT false
    `);
    
    await db.query(`
      UPDATE quarterly_priorities
      SET is_company_priority = true
      WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'demo-acme-industries')
        AND title IN ('Launch Version 3.0 Platform', 'Achieve $20M Q1 Revenue')
    `);
    
    // 4. Update to current quarter
    const currentDate = new Date();
    const currentQuarter = Math.ceil((currentDate.getMonth() + 1) / 3);
    const currentYear = currentDate.getFullYear();
    const quarterStr = `Q${currentQuarter}`;
    
    console.log(`📅 Updating rocks to current quarter (${quarterStr} ${currentYear})...`);
    await db.query(`
      UPDATE quarterly_priorities
      SET quarter = $1, year = $2
      WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'demo-acme-industries')
    `, [quarterStr, currentYear]);
    
    // 5. Add logo
    console.log('🎨 Adding ACME logo...');
    const logoSVG = `<svg width="200" height="60" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="5" width="190" height="50" rx="8" ry="8" fill="#FB923C"/>
      <rect x="7" y="7" width="186" height="46" rx="6" ry="6" fill="#FED7AA" opacity="0.3"/>
      <text x="100" y="38" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">ACME</text>
      <text x="100" y="48" font-family="Arial, sans-serif" font-size="10" fill="white" text-anchor="middle" opacity="0.9">INDUSTRIES</text>
      <circle cx="20" cy="30" r="3" fill="white" opacity="0.7"/>
      <circle cx="180" cy="30" r="3" fill="white" opacity="0.7"/>
    </svg>`;
    
    await db.query(`
      UPDATE organizations 
      SET logo_data = $1, logo_mime_type = 'image/svg+xml', logo_updated_at = NOW()
      WHERE slug = 'demo-acme-industries'
    `, [Buffer.from(logoSVG)]);
    
    // Commit transaction
    await db.query('COMMIT');
    
    console.log('✅ Demo organization reset complete!');
    console.log('📧 Login: demo@acme.com / Demo123!');
    
    // Log reset timestamp
    console.log(`🕐 Reset completed at: ${new Date().toISOString()}`);
    
    return { success: true, message: 'Demo organization reset successfully' };
    
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('❌ Error resetting demo organization:', error);
    
    // Only exit if called directly, not when imported
    if (import.meta.url === `file://${process.argv[1]}`) {
      process.exit(1);
    }
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  resetDemoOrg().then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
}

export default resetDemoOrg;