import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getOrganization, updateOrganization } from '../controllers/organizationController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// @route   GET /api/v1/organizations/current
// @desc    Get current organization details
// @access  Private
router.get('/current', getOrganization);

// @route   PUT /api/v1/organizations/current
// @desc    Update current organization details
// @access  Private (Admin only)
router.put('/current', updateOrganization);

export default router;

