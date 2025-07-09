import express from 'express';
import { 
  getRocks, 
  getRock, 
  createRock, 
  updateRock, 
  deleteRock,
  updateRockStatus
} from '../controllers/rocksController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticateToken);

// Get all rocks (with optional department filter)
router.get('/', getRocks);

// Get single rock
router.get('/:id', getRock);

// Create new rock
router.post('/', createRock);

// Update rock
router.put('/:id', updateRock);

// Update rock status
router.patch('/:id/status', updateRockStatus);

// Delete rock
router.delete('/:id', deleteRock);

export default router;
