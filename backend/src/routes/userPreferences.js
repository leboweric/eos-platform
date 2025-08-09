import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getUserPreferences,
  updateUserPreferences,
  getUIState,
  updateUIState,
  deleteUIState
} from '../controllers/userPreferencesController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// User preferences
router.get('/preferences', getUserPreferences);
router.put('/preferences', updateUserPreferences);

// UI state management
router.get('/ui-state/:stateKey', getUIState);
router.put('/ui-state/:stateKey', updateUIState);
router.delete('/ui-state/:stateKey', deleteUIState);

export default router;