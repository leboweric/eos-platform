import cron from 'node-cron';
import db from '../config/database.js';
import { logMeetingError } from '../services/meetingAlertService.js';

// Cleanup stuck meetings that have been in-progress for more than 8 hours
const STUCK_MEETING_THRESHOLD_HOURS = 8;
const STUCK_SESSION_THRESHOLD_HOURS = 4; // Sessions stuck for more than 4 hours

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

// Schedule the cleanup job to run every 4 hours (more frequent to catch stuck sessions sooner)
cron.schedule('0 */4 * * *', async () => {
  console.log('⏰ [CRON] Running scheduled meeting/session cleanup...');
  try {
    const meetingsResult = await cleanupStuckMeetings();
    const sessionsResult = await cleanupStuckSessions();
    console.log(`⏰ [CRON] Cleanup completed: ${meetingsResult.cleaned} meetings, ${sessionsResult.cleaned} sessions cleaned`);
  } catch (error) {
    console.error('⏰ [CRON] Cleanup failed:', error);
  }
});

console.log('⏰ [CRON] Meeting/session cleanup job scheduled - runs every 4 hours');

/**
 * Cleanup stuck meeting sessions from meeting_sessions table
 * These are the active transcription/recording sessions shown in admin dashboard
 */
async function cleanupStuckSessions() {
  console.log('🧹 [CLEANUP] Starting stuck session cleanup job...');
  
  try {
    // Find all sessions that have been active for more than 4 hours
    const stuckSessions = await db.query(`
      SELECT 
        ms.id,
        ms.organization_id,
        ms.team_id,
        ms.facilitator_id,
        ms.start_time,
        o.name as organization_name,
        t.name as team_name,
        u.email as facilitator_email,
        CONCAT(u.first_name, ' ', u.last_name) as facilitator_name,
        EXTRACT(EPOCH FROM (NOW() - ms.start_time)) / 3600 as hours_stuck
      FROM meeting_sessions ms
      LEFT JOIN organizations o ON ms.organization_id = o.id
      LEFT JOIN teams t ON ms.team_id = t.id
      LEFT JOIN users u ON ms.facilitator_id = u.id
      WHERE ms.is_active = TRUE
        AND ms.start_time < NOW() - INTERVAL '${STUCK_SESSION_THRESHOLD_HOURS} hours'
      ORDER BY ms.start_time ASC
    `);
    
    if (stuckSessions.rows.length === 0) {
      console.log('🧹 [CLEANUP] No stuck sessions found');
      return { cleaned: 0 };
    }
    
    console.log(`🧹 [CLEANUP] Found ${stuckSessions.rows.length} stuck sessions to clean up`);
    
    // Update all stuck sessions to inactive
    const sessionIds = stuckSessions.rows.map(s => s.id);
    
    const updateResult = await db.query(`
      UPDATE meeting_sessions
      SET 
        is_active = FALSE,
        updated_at = NOW()
      WHERE id = ANY($1)
      RETURNING id
    `, [sessionIds]);
    
    console.log(`🧹 [CLEANUP] Marked ${updateResult.rowCount} sessions as inactive`);
    
    // Log each abandoned session for visibility
    for (const session of stuckSessions.rows) {
      console.log(`  📋 ${session.organization_name} / ${session.team_name} - ${Math.round(session.hours_stuck)} hours stuck`);
      
      // Log to meeting errors for tracking
      await logMeetingError({
        sessionId: session.id,
        organizationId: session.organization_id,
        teamId: session.team_id,
        userId: session.facilitator_id,
        userName: session.facilitator_name,
        errorType: 'session_orphaned',
        severity: 'warning',
        errorMessage: `Session auto-ended after ${Math.round(session.hours_stuck)} hours stuck active`,
        context: {
          organizationName: session.organization_name,
          teamName: session.team_name,
          facilitatorEmail: session.facilitator_email,
          startTime: session.start_time,
          hoursStuck: Math.round(session.hours_stuck)
        },
        meetingPhase: 'cleanup'
      }).catch(err => console.error('Failed to log orphaned session:', err));
    }
    
    return { 
      cleaned: updateResult.rowCount,
      sessions: stuckSessions.rows.map(s => ({
        id: s.id,
        organization: s.organization_name,
        team: s.team_name,
        hoursStuck: Math.round(s.hours_stuck)
      }))
    };
    
  } catch (error) {
    console.error('🧹 [CLEANUP] Error cleaning up stuck sessions:', error);
    throw error;
  }
}

/**
 * Run all cleanup tasks
 */
async function runAllCleanup() {
  const meetingsResult = await cleanupStuckMeetings();
  const sessionsResult = await cleanupStuckSessions();
  
  return {
    meetings: meetingsResult,
    sessions: sessionsResult,
    totalCleaned: meetingsResult.cleaned + sessionsResult.cleaned
  };
}

// Export for manual triggering via admin endpoint
export { cleanupStuckMeetings, cleanupStuckSessions, runAllCleanup };
export default { cleanupStuckMeetings, cleanupStuckSessions, runAllCleanup };
