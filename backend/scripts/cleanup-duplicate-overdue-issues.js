/**
 * One-time cleanup script to archive duplicate overdue issues
 *
 * This script finds issues with titles starting with "Overdue:" that have
 * the same title within the same team. For each duplicate group, it keeps
 * the oldest issue (first created) and archives the rest.
 *
 * Usage:
 *   node scripts/cleanup-duplicate-overdue-issues.js [--dry-run]
 *
 * Options:
 *   --dry-run    Preview what would be archived without making changes
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const isDryRun = process.argv.includes('--dry-run');

async function findDuplicateOverdueIssues() {
  console.log('🔍 Finding duplicate overdue issues...\n');

  // Find all issues with "Overdue:" prefix, grouped by title and team
  const result = await pool.query(`
    SELECT
      title,
      team_id,
      organization_id,
      COUNT(*) as duplicate_count,
      ARRAY_AGG(id ORDER BY created_at ASC) as issue_ids,
      ARRAY_AGG(owner_id ORDER BY created_at ASC) as owner_ids,
      ARRAY_AGG(status ORDER BY created_at ASC) as statuses,
      ARRAY_AGG(created_at ORDER BY created_at ASC) as created_dates
    FROM issues
    WHERE title LIKE 'Overdue:%'
      AND deleted_at IS NULL
      AND archived = false
    GROUP BY title, team_id, organization_id
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, title
  `);

  return result.rows;
}

async function getOwnerNames(ownerIds) {
  if (!ownerIds || ownerIds.length === 0) return {};

  const result = await pool.query(`
    SELECT id, first_name || ' ' || last_name as name
    FROM users
    WHERE id = ANY($1)
  `, [ownerIds.filter(id => id !== null)]);

  const nameMap = {};
  result.rows.forEach(row => {
    nameMap[row.id] = row.name;
  });
  return nameMap;
}

async function archiveIssues(issueIds) {
  if (isDryRun) {
    console.log(`   [DRY RUN] Would archive ${issueIds.length} issue(s)`);
    return issueIds.length;
  }

  const result = await pool.query(`
    UPDATE issues
    SET archived = true,
        updated_at = NOW()
    WHERE id = ANY($1)
    RETURNING id
  `, [issueIds]);

  return result.rowCount;
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Duplicate Overdue Issues Cleanup Script');
  console.log('='.repeat(60));

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  } else {
    console.log('\n🚀 LIVE MODE - Issues will be archived\n');
  }

  try {
    const duplicateGroups = await findDuplicateOverdueIssues();

    if (duplicateGroups.length === 0) {
      console.log('✅ No duplicate overdue issues found. Database is clean!');
      return;
    }

    console.log(`Found ${duplicateGroups.length} group(s) of duplicate issues:\n`);

    let totalArchived = 0;
    let totalKept = 0;

    for (const group of duplicateGroups) {
      const { title, team_id, duplicate_count, issue_ids, owner_ids, statuses, created_dates } = group;

      // Get owner names for display
      const ownerNames = await getOwnerNames(owner_ids);

      console.log(`📋 "${title}"`);
      console.log(`   Team ID: ${team_id}`);
      console.log(`   ${duplicate_count} duplicates found:\n`);

      // First issue (oldest) will be kept
      const keepId = issue_ids[0];
      const archiveIds = issue_ids.slice(1);

      // Display all issues in the group
      issue_ids.forEach((id, index) => {
        const ownerId = owner_ids[index];
        const ownerName = ownerId ? ownerNames[ownerId] || 'Unknown' : 'Unassigned';
        const status = statuses[index];
        const createdAt = new Date(created_dates[index]).toLocaleDateString();
        const action = index === 0 ? '✅ KEEP' : '🗑️  ARCHIVE';

        console.log(`   ${action} - ID: ${id.substring(0, 8)}... | Owner: ${ownerName} | Status: ${status} | Created: ${createdAt}`);
      });

      // Archive the duplicates
      const archivedCount = await archiveIssues(archiveIds);
      totalArchived += archivedCount;
      totalKept += 1;

      console.log('');
    }

    console.log('='.repeat(60));
    console.log('  Summary');
    console.log('='.repeat(60));
    console.log(`  Issues kept:     ${totalKept}`);
    console.log(`  Issues archived: ${totalArchived}`);
    console.log('='.repeat(60));

    if (isDryRun) {
      console.log('\n💡 Run without --dry-run to apply these changes.');
    } else {
      console.log('\n✅ Cleanup complete!');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
