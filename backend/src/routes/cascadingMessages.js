import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createCascadingMessage,
  getCascadingMessages,
  markMessageAsRead,
  getAvailableTeams
} from '../controllers/cascadingMessagesController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticateToken);

// Create a cascading message
router.post('/', createCascadingMessage);

// Get cascading messages for a team
router.get('/', getCascadingMessages);

// Get available teams to cascade to
router.get('/available-teams', getAvailableTeams);

// Mark a message as read
router.put('/:messageId/read', markMessageAsRead);

export default router;