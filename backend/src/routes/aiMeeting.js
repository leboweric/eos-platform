import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  startTranscription,
  stopTranscription,
  getTranscript,
  getAISummary,
  createTodosFromAI,
  createIssuesFromAI,
  searchTranscripts,
  downloadTranscript,
  deleteTranscript,
  getTranscriptStatus
} from '../controllers/aiMeetingController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Start AI transcription for a meeting
router.post('/organizations/:orgId/meetings/:meetingId/transcription/start', startTranscription);

// Stop AI transcription and trigger AI processing
router.post('/organizations/:orgId/meetings/:meetingId/transcription/stop', stopTranscription);

// Get transcription status
router.get('/organizations/:orgId/meetings/:meetingId/transcription/status', getTranscriptStatus);

// Get full transcript
router.get('/organizations/:orgId/meetings/:meetingId/transcript', getTranscript);

// Get AI-generated summary
router.get('/organizations/:orgId/meetings/:meetingId/ai-summary', getAISummary);

// Create todos from AI-detected action items
router.post('/organizations/:orgId/meetings/:meetingId/ai-summary/create-todos', createTodosFromAI);

// Create issues from AI-detected issues
router.post('/organizations/:orgId/meetings/:meetingId/ai-summary/create-issues', createIssuesFromAI);

// Download transcript in various formats
router.get('/organizations/:orgId/meetings/:meetingId/transcript/download', downloadTranscript);

// Delete transcript (soft or hard delete)
router.delete('/organizations/:orgId/meetings/:meetingId/transcript', deleteTranscript);

// Search across all transcripts in organization
router.get('/organizations/:orgId/transcripts/search', searchTranscripts);

export default router;