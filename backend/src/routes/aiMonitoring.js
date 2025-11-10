import express from 'express';
import aiMonitoringController from '../controllers/aiMonitoringController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get AI health metrics
router.get(
  '/organizations/:orgId/ai-monitoring/health',
  authenticate,
  aiMonitoringController.getAIHealthMetrics
);

// Cleanup stuck transcripts
router.post(
  '/organizations/:orgId/ai-monitoring/cleanup',
  authenticate,
  aiMonitoringController.cleanupStuckTranscripts
);

export default router;
