import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getMeetingHistory,
  getMeetingSnapshot,
  createMeetingSnapshot,
  updateMeetingNotes,
  exportMeetingHistoryCSV
} from '../controllers/meetingHistoryController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Get paginated list of archived meetings
// GET /api/v1/organizations/:orgId/meeting-history
router.get('/', getMeetingHistory);

// Get detailed snapshot for specific meeting
// GET /api/v1/organizations/:orgId/meeting-history/:id
router.get('/:id', getMeetingSnapshot);

// Create snapshot when meeting concludes
// POST /api/v1/organizations/:orgId/meeting-history/:meetingId/snapshot
router.post('/:meetingId/snapshot', createMeetingSnapshot);

// Update notes in meeting snapshot
// PUT /api/v1/organizations/:orgId/meeting-history/:id/notes
router.put('/:id/notes', updateMeetingNotes);

// Export meeting history to CSV
// GET /api/v1/organizations/:orgId/meeting-history/export/csv
router.get('/export/csv', exportMeetingHistoryCSV);

export default router;