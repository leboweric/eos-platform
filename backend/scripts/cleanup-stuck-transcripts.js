/**
 * Cleanup script for stuck "processing_ai" transcripts
 * Marks transcripts that have been stuck for more than 2 hours as "failed"
 */

const { getClient } = require('../src/config/database');

async function cleanupStuckTranscripts() {
  const client = await getClient();
  
  try {
    console.log('🔍 Checking for stuck transcripts...');
    
    // Find transcripts stuck in processing_ai for more than 2 hours
    const result = await client.query(`
      UPDATE meeting_transcripts
      SET 
        status = 'failed',
        error_message = 'Transcript stuck in processing_ai for more than 2 hours - marked as failed by cleanup script',
        updated_at = NOW()
      WHERE status = 'processing_ai'
        AND created_at < NOW() - INTERVAL '2 hours'
        AND deleted_at IS NULL
      RETURNING id, meeting_id, created_at
    `);
    
    if (result.rows.length > 0) {
      console.log(`✅ Marked ${result.rows.length} stuck transcripts as failed:`);
      result.rows.forEach(row => {
        console.log(`  - Transcript ${row.id} (meeting: ${row.meeting_id}, created: ${row.created_at})`);
      });
    } else {
      console.log('✅ No stuck transcripts found');
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up stuck transcripts:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  cleanupStuckTranscripts()
    .then(() => {
      console.log('✅ Cleanup complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupStuckTranscripts };
