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
import {
  startSection,
  endSection,
  updateSectionPause,
  getSectionConfig
} from '../controllers/meetingSessionController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Start a new meeting session
router.post('/start', (req, res, next) => {
  console.log('🚀🚀🚀 ROUTE /start HIT! 🚀🚀🚀');
  console.log('Route params:', req.params);
  console.log('Route body:', req.body);
  startSession(req, res, next);
});

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

// Section timing endpoints (Phase 2)
router.post('/:id/sections/start', startSection);
router.post('/:id/sections/end', endSection);
router.post('/:id/sections/pause-update', updateSectionPause);

// Get section configuration
router.get('/config/:organizationId/:teamId', getSectionConfig);

// End a session
router.post('/:id/end', endSession);

export default router;