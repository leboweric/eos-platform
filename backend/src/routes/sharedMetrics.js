import express from 'express';
import {
  getSharedMetrics,
  shareMetric,
  unshareMetric,
  subscribeToMetric,
  unsubscribeFromMetric,
  getTeamSubscriptions,
  syncMetricScores
} from '../controllers/sharedMetricsController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all shared metrics in the organization
router.get('/organizations/:orgId/shared-metrics', getSharedMetrics);

// Share/unshare a metric
router.post('/organizations/:orgId/teams/:teamId/scorecard/metrics/:metricId/share', shareMetric);
router.delete('/organizations/:orgId/teams/:teamId/scorecard/metrics/:metricId/share', unshareMetric);

// Subscribe/unsubscribe to shared metrics
router.post('/organizations/:orgId/teams/:teamId/metric-subscriptions', subscribeToMetric);
router.delete('/organizations/:orgId/teams/:teamId/metric-subscriptions/:subscriptionId', unsubscribeFromMetric);
router.get('/organizations/:orgId/teams/:teamId/metric-subscriptions', getTeamSubscriptions);

// Sync scores from source to subscribed metrics
router.post('/organizations/:orgId/shared-metrics/:metricId/sync', syncMetricScores);

export default router;