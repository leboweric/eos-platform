import express from 'express';
import {
  getOrgSharedMetrics,
  createOrgSharedMetric,
  updateOrgSharedMetric,
  deleteOrgSharedMetric,
  getMetricSubscribers
} from '../controllers/orgSharedMetricsController.js';
import { authenticateToken, authorizeOwnerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin/owner authorization
router.use(authenticateToken);

// Get all organization-level shared metrics
router.get(
  '/:orgId/metrics',
  authorizeOwnerOrAdmin,
  getOrgSharedMetrics
);

// Create a new organization-level shared metric
router.post(
  '/:orgId/metrics',
  authorizeOwnerOrAdmin,
  createOrgSharedMetric
);

// Update an organization-level shared metric
router.put(
  '/:orgId/metrics/:metricId',
  authorizeOwnerOrAdmin,
  updateOrgSharedMetric
);

// Delete an organization-level shared metric
router.delete(
  '/:orgId/metrics/:metricId',
  authorizeOwnerOrAdmin,
  deleteOrgSharedMetric
);

// Get subscribers for a specific metric
router.get(
  '/:orgId/metrics/:metricId/subscribers',
  authorizeOwnerOrAdmin,
  getMetricSubscribers
);

export default router;
