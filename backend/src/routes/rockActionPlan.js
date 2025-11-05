import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { generateActionPlan } from '../controllers/rockActionPlanController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// @route   POST /api/v1/organizations/:orgId/rocks/:rockId/action-plan
// @desc    Generate an AI-powered action plan for a Rock
// @access  Private
router.post('/', generateActionPlan);

export default router;

