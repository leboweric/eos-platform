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
  console.log('🎙️ [TranscriptionRoutes] POST /start route hit');
  console.log('🔍 [TranscriptionRoutes] Request method:', req.method);
  console.log('🔍 [TranscriptionRoutes] Request path:', req.path);
  console.log('🔍 [TranscriptionRoutes] Request body preview:', { 
    meetingId: req.body?.meetingId, 
    organizationId: req.body?.organizationId 
  });
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

export default router;