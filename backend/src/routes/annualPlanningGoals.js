import express from 'express';
import { 
  getPlanningGoals, 
  savePlanningGoals, 
  publishToVTO 
} from '../controllers/annualPlanningGoalsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get planning goals for a team and year
router.get(
  '/organizations/:organizationId/teams/:teamId/annual-planning-goals',
  getPlanningGoals
);

// Save/update planning goals
router.put(
  '/organizations/:organizationId/teams/:teamId/annual-planning-goals',
  savePlanningGoals
);

// Publish planning goals to VTO (January operation - for future use)
router.post(
  '/organizations/:organizationId/teams/:teamId/annual-planning-goals/publish',
  publishToVTO
);

export default router;