import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  checkUserLeadershipTeam
} from '../controllers/teamsController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Team routes
router.get('/', getTeams);
router.get('/:teamId', getTeam);
router.post('/', createTeam);
router.put('/:teamId', updateTeam);
router.delete('/:teamId', deleteTeam);

// Team members routes
router.get('/:teamId/members', getTeamMembers);
router.post('/:teamId/members', addTeamMember);
router.delete('/:teamId/members/:userId', removeTeamMember);

// Leadership team check
router.get('/check-leadership/:userId', checkUserLeadershipTeam);

export default router;
