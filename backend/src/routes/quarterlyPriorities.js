import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getQuarterlyPriorities,
  createPriority,
  updatePriority,
  deletePriority,
  updatePredictions,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  addPriorityUpdate
} from '../controllers/quarterlyPrioritiesController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Get priorities for a quarter
router.get('/', getQuarterlyPriorities);

// Priority CRUD
router.post('/priorities', createPriority);
router.put('/priorities/:priorityId', updatePriority);
router.delete('/priorities/:priorityId', deletePriority);

// Predictions
router.put('/predictions', updatePredictions);

// Milestones
router.post('/priorities/:priorityId/milestones', createMilestone);
router.put('/priorities/:priorityId/milestones/:milestoneId', updateMilestone);
router.delete('/priorities/:priorityId/milestones/:milestoneId', deleteMilestone);

// Priority updates
router.post('/priorities/:priorityId/updates', addPriorityUpdate);

export default router;