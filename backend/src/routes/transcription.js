import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  healthCheck,
  startTranscription,
  stopTranscription,
  getTranscript,
  getTranscriptStatus,
  createTodosFromAI,
  createIssuesFromAI,
  getAISummary
} from '../controllers/transcriptionController.js';

const router = express.Router();

console.log('🔍 [TranscriptionRoutes] Transcription routes file loaded');

// Simple ping endpoint for testing route accessibility (no auth required)
router.get('/ping', (req, res) => {
  console.log('🏓 PING endpoint hit!');
  res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

// Health check endpoint (no auth required for monitoring)
router.get('/health', healthCheck);

// All other routes require authentication
router.use(authenticate);

// Start AI transcription for a meeting
router.post('/start', (req, res, next) => {
  // Only log in debug mode to reduce Railway rate limiting
  if (process.env.LOG_LEVEL === 'debug') {
    console.log('🎙️ [TranscriptionRoutes] POST /start route hit');
    console.log('🔍 [TranscriptionRoutes] Request body preview:', { 
      meetingId: req.body?.meetingId, 
      organizationId: req.body?.organizationId 
    });
  }
  startTranscription(req, res, next);
});

// Stop AI transcription and trigger AI processing
router.post('/stop', stopTranscription);

// Get transcript status for a meeting
router.get('/:meetingId/status', getTranscriptStatus);

// Get full transcript and AI summary for a meeting
router.get('/:meetingId', getTranscript);

// Get AI summary for a transcript
router.get('/:transcriptId/ai-summary', getAISummary);

// Create todos from AI-detected action items
router.post('/:transcriptId/create-todos', createTodosFromAI);

// Create issues from AI-detected issues
router.post('/:transcriptId/create-issues', createIssuesFromAI);

// Emergency cleanup endpoint (protected - authenticated users only)
router.post('/cleanup', async (req, res) => {
  try {
    const { forceAll, minutesThreshold = 10, action = 'stuck' } = req.body;
    
    console.log('🧹 [Cleanup] Admin cleanup endpoint called:', { 
      action, 
      forceAll, 
      minutesThreshold,
      user: req.user?.email 
    });
    
    // Import cleanup utility dynamically
    const cleanup = await import('../utils/transcriptionCleanup.js');
    
    let result;
    
    switch (action) {
      case 'force':
      case 'all':
        // Nuclear option - clear all active sessions
        result = await cleanup.forceCleanupAllSessions();
        break;
        
      case 'old':
        // Clean up old completed sessions (default 30 days)
        const daysOld = req.body.daysOld || 30;
        result = await cleanup.cleanupOldSessions(daysOld);
        break;
        
      case 'stats':
        // Just get statistics
        result = await cleanup.getSessionStats();
        break;
        
      case 'stuck':
      default:
        // Clean up sessions stuck longer than threshold
        result = await cleanup.cleanupStuckSessions(minutesThreshold);
        break;
    }
    
    console.log('✅ [Cleanup] Cleanup completed:', result);
    
    res.json({
      success: true,
      action,
      timestamp: new Date().toISOString(),
      ...result
    });
    
  } catch (error) {
    console.error('❌ [Cleanup] Cleanup error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      action: req.body.action || 'stuck'
    });
  }
});

// Get cleanup statistics (read-only)
router.get('/cleanup/stats', async (req, res) => {
  try {
    const cleanup = await import('../utils/transcriptionCleanup.js');
    const stats = await cleanup.getSessionStats();
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('❌ [Cleanup] Stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;