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

// Health check endpoint (no auth required for monitoring)
router.get('/health', healthCheck);

// All other routes require authentication
router.use(authenticate);

// Start AI transcription for a meeting
router.post('/start', startTranscription);

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