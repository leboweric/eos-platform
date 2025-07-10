import express from 'express';
import { 
  getQuarterlyPriorities, 
  getQuarterlyPriority, 
  createQuarterlyPriority, 
  updateQuarterlyPriority, 
  deleteQuarterlyPriority,
  updateQuarterlyPriorityStatus
} from '../controllers/quarterlyPrioritiesController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Get all quarterly priorities (with optional department filter)
router.get('/', getQuarterlyPriorities);

// Get single quarterly priority
router.get('/:id', getQuarterlyPriority);

// Create new quarterly priority
router.post('/', createQuarterlyPriority);

// Update quarterly priority
router.put('/:id', updateQuarterlyPriority);

// Update quarterly priority status
router.patch('/:id/status', updateQuarterlyPriorityStatus);

// Delete quarterly priority
router.delete('/:id', deleteQuarterlyPriority);

export default router;
