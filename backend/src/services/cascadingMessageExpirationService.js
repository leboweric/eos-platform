import { query } from '../config/database.js';

/**
 * Archive cascading messages older than 7 days
 * This runs as a daily cron job to automatically clean up old messages
 */
export const archiveExpiredCascadingMessages = async () => {
  try {
    console.log('🗑️ [Cascading Messages] Starting auto-expiration check...');
    
    // Check if cascading_messages table exists
    const tableCheck = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'cascading_messages'
      )`
    );
    
    if (!tableCheck.rows[0].exists) {
      console.log('⚠️ [Cascading Messages] Table does not exist yet - skipping expiration');
      return { success: true, archivedCount: 0, message: 'Table not yet created' };
    }
    
    // Calculate the date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    console.log(`🔍 [Cascading Messages] Archiving messages older than: ${sevenDaysAgo.toISOString()}`);
    
    // Soft delete all message recipients where the message is older than 7 days
    // and hasn't already been deleted
    const result = await query(
      `UPDATE cascading_message_recipients cmr
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE cmr.deleted_at IS NULL
         AND cmr.message_id IN (
           SELECT cm.id 
           FROM cascading_messages cm
           WHERE cm.created_at < $1
         )
       RETURNING *`,
      [sevenDaysAgo]
    );
    
    const archivedCount = result.rowCount;
    
    if (archivedCount > 0) {
      console.log(`✅ [Cascading Messages] Auto-archived ${archivedCount} expired message(s)`);
    } else {
      console.log('✅ [Cascading Messages] No expired messages to archive');
    }
    
    return {
      success: true,
      archivedCount,
      expirationDate: sevenDaysAgo.toISOString(),
      message: `Archived ${archivedCount} cascading message(s) older than 7 days`
    };
    
  } catch (error) {
    console.error('❌ [Cascading Messages] Error during auto-expiration:', error);
    throw error;
  }
};

export default {
  archiveExpiredCascadingMessages
};
