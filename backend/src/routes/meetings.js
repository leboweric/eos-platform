import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { createMeeting, concludeMeeting } from '../controllers/meetingsController.js';

const router = express.Router({ mergeParams: true });

// Create a new meeting
router.post('/', authenticate, createMeeting);

// Conclude a meeting and send summary
router.post('/conclude', authenticate, concludeMeeting);

export default router;