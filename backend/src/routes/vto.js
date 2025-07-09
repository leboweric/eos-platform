import express from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import {
  getVTO,
  upsertCoreValue,
  deleteCoreValue,
  updateCoreFocus
} from '../controllers/vtoController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Get complete VTO for a team
router.get('/', getVTO);

// Core Values endpoints
router.post('/core-values', [
  body('value').notEmpty().withMessage('Core value is required'),
  body('description').optional()
], upsertCoreValue);

router.delete('/core-values/:valueId', [
  param('valueId').isUUID().withMessage('Invalid value ID')
], deleteCoreValue);

// Core Focus endpoint
router.put('/core-focus', [
  body('purpose').notEmpty().withMessage('Purpose is required'),
  body('niche').notEmpty().withMessage('Niche is required')
], updateCoreFocus);

// TODO: Add endpoints for other VTO components:
// - Ten Year Target
// - Marketing Strategy
// - Three Year Picture
// - One Year Plan

export default router;