import express from 'express';
import exportController from '../controllers/exportController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Export organization data
router.get('/organizations/:orgId/export/backup', 
  authenticate,
  exportController.exportOrganizationData
);

export default router;