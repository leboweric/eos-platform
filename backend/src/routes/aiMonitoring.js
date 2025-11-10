import express from 'express';
import aiMonitoringController from '../controllers/aiMonitoringController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All AI monitoring routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Get AI health metrics (platform-wide)
router.get('/health', aiMonitoringController.getAIHealthMetrics);

// Cleanup stuck transcripts (platform-wide)
router.post('/cleanup', aiMonitoringController.cleanupStuckTranscripts);

export default router;
