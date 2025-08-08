import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createCascadingMessage,
  getCascadingMessages,
  markMessageAsRead,
  getAvailableTeams
} from '../controllers/cascadingMessagesController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Create a cascading message
router.post('/', createCascadingMessage);

// Get cascading messages for a team
router.get('/', getCascadingMessages);

// Get available teams to cascade to
router.get('/available-teams', getAvailableTeams);

// Mark a message as read
router.put('/:messageId/read', markMessageAsRead);

export default router;