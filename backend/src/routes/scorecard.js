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
  checkDuplicateScorecard,
  updateMetricOrder
} from '../controllers/scorecardController.js';
import {
  importMonthlyScorecard,
  uploadMiddleware
} from '../controllers/scorecardImportController.js';
import {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  updateGroupOrder,
  moveMetricToGroup
} from '../controllers/scorecardGroupsController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Get complete scorecard
router.get('/', getScorecard);

// Metrics CRUD
router.post('/metrics', createMetric);
router.put('/metrics/reorder', updateMetricOrder);
router.put('/metrics/move-to-group', moveMetricToGroup);
router.put('/metrics/:metricId', updateMetric);
router.delete('/metrics/:metricId', deleteMetric);
router.get('/metrics/:metricId/history', getMetricHistory);

// Score management
router.put('/scores', updateScore);

// Import scorecard from CSV
router.post('/import/monthly', uploadMiddleware, importMonthlyScorecard);

// Diagnostic endpoint (for debugging)
router.get('/find', findScorecardData);
router.get('/check-duplicates', checkDuplicateScorecard);

// Groups management
router.get('/groups', getGroups);
router.post('/groups', createGroup);
router.put('/groups/reorder', updateGroupOrder);
router.put('/groups/:groupId', updateGroup);
router.delete('/groups/:groupId', deleteGroup);

export default router;