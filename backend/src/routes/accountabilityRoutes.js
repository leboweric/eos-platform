import express from 'express';
import { 
  getSeats, 
  getSeat, 
  createSeat, 
  updateSeat, 
  deleteSeat,
  updateResponsibilities,
  assignUser
} from '../controllers/accountabilityController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all seats for organization
router.get('/', getSeats);

// Get single seat
router.get('/:id', getSeat);

// Create new seat
router.post('/', createSeat);

// Update seat
router.put('/:id', updateSeat);

// Delete seat
router.delete('/:id', deleteSeat);

// Update seat responsibilities
router.put('/:id/responsibilities', updateResponsibilities);

// Assign user to seat
router.put('/:id/assign', assignUser);

export default router;