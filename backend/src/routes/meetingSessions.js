import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  startSession,
  pauseSession,
  resumeSession,
  getSessionStatus,
  updateSessionSection,
  endSession,
  getActiveSession,
  saveTimerState
} from '../controllers/meetingSessionsController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Start a new meeting session
router.post('/start', startSession);

// Get active session for a team
router.get('/active', getActiveSession);

// Pause a session
router.post('/:id/pause', pauseSession);

// Resume a session
router.post('/:id/resume', resumeSession);

// Get session status
router.get('/:id/status', getSessionStatus);

// Update current section
router.patch('/:id/section', updateSessionSection);

// Auto-save timer state
router.post('/:id/save-state', saveTimerState);

// End a session
router.post('/:id/end', endSession);

export default router;