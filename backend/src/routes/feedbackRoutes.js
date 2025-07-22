import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { submitFeedback } from '../controllers/feedbackController.js';

const router = express.Router();

// All feedback routes require authentication
router.use(authenticate);

// Submit feedback (ticket or enhancement)
router.post('/submit', [
  body('type').isIn(['ticket', 'enhancement']).withMessage('Type must be either "ticket" or "enhancement"'),
  body('subject').notEmpty().trim().withMessage('Subject is required'),
  body('message').notEmpty().trim().withMessage('Message is required'),
  body('pageUrl').optional().isURL({ require_protocol: false, require_host: false })
], validateRequest, submitFeedback);

export default router;