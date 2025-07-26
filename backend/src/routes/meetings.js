import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { concludeMeeting } from '../controllers/meetingsController.js';

const router = express.Router();

// Conclude a meeting and send summary
router.post('/conclude', authenticate, concludeMeeting);

export default router;