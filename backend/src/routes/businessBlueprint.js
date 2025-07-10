import express from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import {
  getVTO,
  upsertCoreValue,
  deleteCoreValue,
  updateCoreFocus,
  updateTenYearTarget,
  updateMarketingStrategy
} from '../controllers/businessBlueprintController.js';

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

// Ten Year Target endpoint
router.put('/ten-year-target', [
  body('targetDescription').notEmpty().withMessage('Target description is required'),
  body('targetYear').isInt().withMessage('Target year must be a valid year')
], updateTenYearTarget);

// Marketing Strategy endpoint
router.put('/marketing-strategy', [
  body('targetMarket').notEmpty().withMessage('Target market is required'),
  body('threeUniques').notEmpty().withMessage('Three uniques are required'),
  body('provenProcess').notEmpty().withMessage('Proven process is required')
], updateMarketingStrategy);

// TODO: Add endpoints for:
// - Three Year Picture
// - One Year Plan

export default router;