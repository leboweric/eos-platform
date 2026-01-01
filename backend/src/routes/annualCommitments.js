import express from 'express';
import { 
  getTeamCommitments, 
  upsertCommitment, 
  deleteCommitment,
  getUserCurrentCommitment,
  getOrganizationCommitments
} from '../controllers/annualCommitmentsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all commitments for an organization (across all teams)
router.get(
  '/organizations/:orgId/annual-commitments',
  getOrganizationCommitments
);

// Get commitments for a team/year
router.get(
  '/organizations/:orgId/teams/:teamId/annual-commitments',
  getTeamCommitments
);

// Create or update commitment
router.post(
  '/organizations/:orgId/teams/:teamId/annual-commitments',
  upsertCommitment
);

// Delete commitment
router.delete(
  '/organizations/:orgId/teams/:teamId/annual-commitments/:id',
  deleteCommitment
);

// Get user's current commitment for dashboard
router.get(
  '/organizations/:organizationId/users/:userId/annual-commitments/current',
  getUserCurrentCommitment
);

export default router;