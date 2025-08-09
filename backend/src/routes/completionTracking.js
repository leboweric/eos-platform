import express from 'express';
import { authenticate } from '../middleware/auth.js';
import completionTrackingController from '../controllers/completionTrackingController.js';

const router = express.Router();

// Get all completion states for an organization
router.get('/organizations/:orgId/completion-states', authenticate, completionTrackingController.getCompletionStates);

// Toggle 3-year picture item completion
router.put('/organizations/:orgId/three-year-items/:itemIndex/toggle', authenticate, completionTrackingController.toggleThreeYearItem);

// Toggle 1-year plan goal completion
router.put('/organizations/:orgId/one-year-goals/:goalIndex/toggle', authenticate, completionTrackingController.toggleOneYearGoal);

export default router;