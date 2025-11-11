import { getClient } from '../config/database.js';

/**
 * Log AI transcription errors to database for monitoring
 * Auto-cleanup keeps only last 48 hours of errors
 */
export async function logAIError({
  transcriptId = null,
  organizationId = null,
  meetingId = null,
  errorType,
  errorMessage,
  errorStack = null,
  context = {}
}) {
  const client = await getClient();
  
  try {
    await client.query(`
      INSERT INTO ai_transcription_error_logs (
        transcript_id,
        organization_id,
        meeting_id,
        error_type,
        error_message,
        error_stack,
        context,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      transcriptId,
      organizationId,
      meetingId,
      errorType,
      errorMessage,
      errorStack,
      JSON.stringify(context)
    ]);
    
    // Also log to console for Railway logs
    console.error(`[AI-ERROR] ${errorType}:`, errorMessage);
    
  } catch (error) {
    // Don't throw - error logging should never break the main flow
    console.error('Failed to log AI error to database:', error.message);
  } finally {
    client.release();
  }
}

/**
 * Get recent AI errors for monitoring dashboard
 */
export async function getRecentAIErrors(hoursBack = 24, limit = 50) {
  const client = await getClient();
  
  try {
    const result = await client.query(`
      SELECT 
        ael.id,
        ael.transcript_id,
        ael.organization_id,
        ael.meeting_id,
        ael.error_type,
        ael.error_message,
        ael.error_stack,
        ael.context,
        ael.created_at,
        o.name as organization_name,
        m.meeting_type
      FROM ai_transcription_error_logs ael
      LEFT JOIN organizations o ON ael.organization_id = o.id
      LEFT JOIN meetings m ON ael.meeting_id = m.id
      WHERE ael.created_at >= NOW() - INTERVAL '${hoursBack} hours'
      ORDER BY ael.created_at DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  } catch (error) {
    console.error('Failed to fetch AI errors:', error.message);
    return [];
  } finally {
    client.release();
  }
}

/**
 * Get error statistics for monitoring
 */
export async function getAIErrorStats(hoursBack = 24) {
  const client = await getClient();
  
  try {
    const result = await client.query(`
      SELECT 
        error_type,
        COUNT(*) as count,
        MAX(created_at) as last_occurrence
      FROM ai_transcription_error_logs
      WHERE created_at >= NOW() - INTERVAL '${hoursBack} hours'
      GROUP BY error_type
      ORDER BY count DESC
    `);
    
    return result.rows;
  } catch (error) {
    console.error('Failed to fetch AI error stats:', error.message);
    return [];
  } finally {
    client.release();
  }
}

/**
 * Cleanup old errors (called periodically)
 */
export async function cleanupOldAIErrors() {
  const client = await getClient();
  
  try {
    const result = await client.query(`
      DELETE FROM ai_transcription_error_logs
      WHERE created_at < NOW() - INTERVAL '48 hours'
      RETURNING id
    `);
    
    console.log(`[AI-ERROR-CLEANUP] Deleted ${result.rowCount} old error logs`);
    return result.rowCount;
  } catch (error) {
    console.error('Failed to cleanup old AI errors:', error.message);
    return 0;
  } finally {
    client.release();
  }
}

export default {
  logAIError,
  getRecentAIErrors,
  getAIErrorStats,
  cleanupOldAIErrors
};
