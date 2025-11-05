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
  updateThreeYearPicture,
  updateOneYearPlan,
  toggleOneYearGoalCompletion,
  toggleThreeYearItemCompletion
} from '../controllers/businessBlueprintController.js';
import { generateBulletSuggestion, generateGoalSuggestion } from '../controllers/aiVtoSuggestionsController.js';

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

// One Year Plan endpoint
router.put('/one-year-plan', [
  body('revenue').optional(),
  body('profit').optional(),
  body('targetDate').isISO8601().withMessage('Target date must be a valid date'),
  body('goals').optional().isArray(),
  body('measurables').optional()
], updateOneYearPlan);

// Toggle 1-year goal completion
router.put('/one-year-goals/:goalId/toggle', toggleOneYearGoalCompletion);

// Toggle 3-year picture item completion
router.put('/three-year-items/toggle', toggleThreeYearItemCompletion);

// AI Suggestion for 3-Year Picture bullets
router.post('/ai-suggest-bullet', [
  body('currentText').optional(),
  body('bulletIndex').optional()
], generateBulletSuggestion);

// AI Suggestion for 1-Year Goals
router.post('/ai-suggest-goal', [
  body('currentText').optional(),
  body('goalIndex').optional()
], generateGoalSuggestion);

export default router;