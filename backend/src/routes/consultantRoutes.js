// This file should be renamed to consultantRoutes.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createClientOrganization,
  getClientOrganizations,
  switchToClientOrganization,
  getClientDashboard
} from '../controllers/consultantController.js';

const router = express.Router();

// All routes require authentication and Consultant status
router.use(authenticate);

// Consultant routes
router.post('/organizations', createClientOrganization);
router.get('/organizations', getClientOrganizations);
router.post('/organizations/:organizationId/switch', switchToClientOrganization);
router.get('/organizations/:organizationId/dashboard', getClientDashboard);

export default router;