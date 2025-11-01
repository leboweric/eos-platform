import express from 'express';
import { 
  getTeamSwotItems, 
  createSwotItem, 
  updateSwotItem, 
  deleteSwotItem 
} from '../controllers/swotItemsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all SWOT items for a team and year
router.get(
  '/organizations/:organizationId/teams/:teamId/swot-items',
  getTeamSwotItems
);

// Create a new SWOT item
router.post(
  '/organizations/:organizationId/teams/:teamId/swot-items',
  createSwotItem
);

// Update a SWOT item
router.put(
  '/organizations/:organizationId/teams/:teamId/swot-items/:itemId',
  updateSwotItem
);

// Delete a SWOT item (soft delete)
router.delete(
  '/organizations/:organizationId/teams/:teamId/swot-items/:itemId',
  deleteSwotItem
);

export default router;