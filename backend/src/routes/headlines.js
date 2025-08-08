import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import {
  getHeadlines,
  createHeadline,
  updateHeadline,
  deleteHeadline,
  archiveHeadlines
} from '../controllers/headlinesController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Get all headlines
router.get('/', [
  query('teamId').optional().isUUID(),
  query('includeArchived').optional().isBoolean()
], getHeadlines);

// Create a new headline
router.post('/', [
  body('type').notEmpty().isIn(['customer', 'employee']),
  body('text').notEmpty().withMessage('Headline text is required'),
  body('teamId').optional().isUUID()
], createHeadline);

// Archive headlines - MUST come before /:headlineId routes
router.put('/archive', [
  body('teamId').optional().isUUID()
], archiveHeadlines);

// Update a headline
router.put('/:headlineId', [
  param('headlineId').isUUID(),
  body('text').notEmpty().withMessage('Headline text is required')
], updateHeadline);

// Delete a headline
router.delete('/:headlineId', [
  param('headlineId').isUUID()
], deleteHeadline);

export default router;