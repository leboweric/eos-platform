import express from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import {
  getVTO,
  upsertCoreValue,
  deleteCoreValue,
  updateCoreFocus,
  updateTenYearTarget,
  updateMarketingStrategy,
  updateThreeYearPicture
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

// Core Focus (Hedgehog) endpoint
router.put('/core-focus', [
  body('purpose').notEmpty().withMessage('Purpose/Cause/Passion is required'),
  body('niche').notEmpty().withMessage('Niche is required'),
  body('hedgehogType').isIn(['purpose', 'cause', 'passion']).withMessage('Hedgehog type must be purpose, cause, or passion')
], updateCoreFocus);

// Ten Year Target endpoint
router.put('/ten-year-target', [
  body('targetDescription').notEmpty().withMessage('Target description is required'),
  body('targetYear').isInt().withMessage('Target year must be a valid year')
], updateTenYearTarget);

// Marketing Strategy endpoint
router.put('/marketing-strategy', [
  body('targetMarket').notEmpty().withMessage('Target market is required'),
  body('differentiator1').optional(),
  body('differentiator2').optional(),
  body('differentiator3').optional(),
  body('provenProcessExists').isBoolean().withMessage('Proven process must be true or false'),
  body('guaranteeExists').isBoolean().withMessage('Guarantee must be true or false')
], updateMarketingStrategy);

// Three Year Picture endpoint
router.put('/three-year-picture', [
  body('revenue').optional(),
  body('profit').optional(),
  body('measurables').optional().isArray(),
  body('lookLikeItems').optional().isArray()
], updateThreeYearPicture);

// TODO: Add endpoints for:
// - One Year Plan

export default router;