import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getScorecard,
  createMetric,
  updateMetric,
  deleteMetric,
  updateScore,
  findScorecardData,
  getMetricHistory,
  checkDuplicateScorecard
} from '../controllers/scorecardController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Get complete scorecard
router.get('/', getScorecard);

// Metrics CRUD
router.post('/metrics', createMetric);
router.put('/metrics/:metricId', updateMetric);
router.delete('/metrics/:metricId', deleteMetric);
router.get('/metrics/:metricId/history', getMetricHistory);

// Score management
router.put('/scores', updateScore);

// Diagnostic endpoint (for debugging)
router.get('/find', findScorecardData);
router.get('/check-duplicates', checkDuplicateScorecard);

export default router;