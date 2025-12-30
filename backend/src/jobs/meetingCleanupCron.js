import cron from 'node-cron';
import db from '../config/database.js';
import { logMeetingError } from '../services/meetingAlertService.js';

// Cleanup stuck meetings that have been in-progress for more than 8 hours
const STUCK_MEETING_THRESHOLD_HOURS = 8;

/**
 * Mark stuck meetings as abandoned
 * Runs daily at 3 AM to clean up orphaned meeting sessions
 */
async function cleanupStuckMeetings() {
  console.log('🧹 [CLEANUP] Starting stuck meeting cleanup job...');
  
  try {
    // Find all meetings that have been in-progress for more than 8 hours
    const stuckMeetings = await db.query(`
      SELECT 
        m.id,
        m.organization_id,
        m.team_id,
        m.facilitator_id,
        m.title,
        m.actual_start_time,
        m.created_at,
        o.name as organization_name,
        t.name as team_name,
        u.email as facilitator_email,
        u.first_name || ' ' || u.last_name as facilitator_name,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(m.actual_start_time, m.created_at))) / 3600 as hours_stuck
      FROM meetings m
      LEFT JOIN organizations o ON m.organization_id = o.id
      LEFT JOIN teams t ON m.team_id = t.id
      LEFT JOIN users u ON m.facilitator_id = u.id
      WHERE m.status = 'in-progress'
        AND COALESCE(m.actual_start_time, m.created_at) < NOW() - INTERVAL '${STUCK_MEETING_THRESHOLD_HOURS} hours'
      ORDER BY m.created_at ASC
    `);
    
    if (stuckMeetings.rows.length === 0) {
      console.log('🧹 [CLEANUP] No stuck meetings found');
      return { cleaned: 0 };
    }
    
    console.log(`🧹 [CLEANUP] Found ${stuckMeetings.rows.length} stuck meetings to clean up`);
    
    // Update all stuck meetings to 'abandoned' status
    const meetingIds = stuckMeetings.rows.map(m => m.id);
    
    const updateResult = await db.query(`
      UPDATE meetings
      SET 
        status = 'abandoned',
        updated_at = NOW(),
        notes = COALESCE(notes, '') || E'\n[Auto-cleanup] Meeting marked as abandoned after being stuck for more than ${STUCK_MEETING_THRESHOLD_HOURS} hours.'
      WHERE id = ANY($1)
      RETURNING id
    `, [meetingIds]);
    
    console.log(`🧹 [CLEANUP] Marked ${updateResult.rowCount} meetings as abandoned`);
    
    // Log each abandoned meeting for visibility
    for (const meeting of stuckMeetings.rows) {
      console.log(`  📋 ${meeting.organization_name} / ${meeting.team_name} - ${Math.round(meeting.hours_stuck)} hours stuck`);
      
      // Log to meeting errors for tracking
      await logMeetingError({
        meetingId: meeting.id,
        organizationId: meeting.organization_id,
        teamId: meeting.team_id,
        userId: meeting.facilitator_id,
        userName: meeting.facilitator_name,
        errorType: 'session_orphaned',
        severity: 'warning',
        errorMessage: `Meeting auto-abandoned after ${Math.round(meeting.hours_stuck)} hours stuck in-progress`,
        context: {
          organizationName: meeting.organization_name,
          teamName: meeting.team_name,
          facilitatorEmail: meeting.facilitator_email,
          startTime: meeting.actual_start_time || meeting.created_at,
          hoursStuck: Math.round(meeting.hours_stuck)
        },
        meetingPhase: 'cleanup'
      }).catch(err => console.error('Failed to log orphaned meeting:', err));
    }
    
    return { 
      cleaned: updateResult.rowCount,
      meetings: stuckMeetings.rows.map(m => ({
        id: m.id,
        organization: m.organization_name,
        team: m.team_name,
        hoursStuck: Math.round(m.hours_stuck)
      }))
    };
    
  } catch (error) {
    console.error('🧹 [CLEANUP] Error cleaning up stuck meetings:', error);
    throw error;
  }
}

// Schedule the cleanup job to run daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  console.log('⏰ [CRON] Running scheduled meeting cleanup...');
  try {
    const result = await cleanupStuckMeetings();
    console.log(`⏰ [CRON] Meeting cleanup completed: ${result.cleaned} meetings cleaned`);
  } catch (error) {
    console.error('⏰ [CRON] Meeting cleanup failed:', error);
  }
});

console.log('⏰ [CRON] Meeting cleanup job scheduled - runs daily at 3 AM');

// Export for manual triggering via admin endpoint
export { cleanupStuckMeetings };
export default { cleanupStuckMeetings };
