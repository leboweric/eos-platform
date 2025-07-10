import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createClientOrganization,
  getClientOrganizations,
  switchToClientOrganization,
  getClientDashboard
} from '../controllers/eosiController.js';

const router = express.Router();

// All routes require authentication and EOSI status
router.use(authenticate);

// EOSI routes
router.post('/organizations', createClientOrganization);
router.get('/organizations', getClientOrganizations);
router.post('/organizations/:organizationId/switch', switchToClientOrganization);
router.get('/organizations/:organizationId/dashboard', getClientDashboard);

export default router;