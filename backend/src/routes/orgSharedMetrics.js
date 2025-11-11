import express from 'express';
import {
  getOrgSharedMetrics,
  createOrgSharedMetric,
  updateOrgSharedMetric,
  deleteOrgSharedMetric,
  getMetricSubscribers
} from '../controllers/orgSharedMetricsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin/owner authorization
router.use(authenticate);
router.use(authorize('admin', 'owner'));

// Get all organization-level shared metrics
router.get(
  '/:orgId/metrics',
  getOrgSharedMetrics
);

// Create a new organization-level shared metric
router.post(
  '/:orgId/metrics',
  createOrgSharedMetric
);

// Update an organization-level shared metric
router.put(
  '/:orgId/metrics/:metricId',
  updateOrgSharedMetric
);

// Delete an organization-level shared metric
router.delete(
  '/:orgId/metrics/:metricId',
  deleteOrgSharedMetric
);

// Get subscribers for a specific metric
router.get(
  '/:orgId/metrics/:metricId/subscribers',
  getMetricSubscribers
);

export default router;
