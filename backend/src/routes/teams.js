import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  checkUserLeadershipTeam
} from '../controllers/teamsController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticateToken);

// Team routes
router.get('/', getTeams);
router.get('/:teamId', getTeam);
router.post('/', createTeam);
router.put('/:teamId', updateTeam);
router.delete('/:teamId', deleteTeam);

// Leadership team check
router.get('/check-leadership/:userId', checkUserLeadershipTeam);

export default router;
