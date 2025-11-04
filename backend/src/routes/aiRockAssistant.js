import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  checkConfiguration,
  analyzeRock,
  suggestMilestones,
  checkAlignment,
  generateRock,
  applySuggestion,
  getSuggestionHistory,
  generateFromVision
} from '../controllers/aiRockAssistantController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Check if AI service is configured
router.get('/status', checkConfiguration);

// Analyze a Rock for SMART criteria
router.post('/analyze', analyzeRock);

// Generate milestone suggestions
router.post('/suggest-milestones', suggestMilestones);

// Check alignment with Company Rocks
router.post('/check-alignment', checkAlignment);

// Generate a complete SMART Rock from an idea
router.post('/generate', generateRock);

// Generate multiple SMART Rock options from a vision
router.post('/generate-from-vision', generateFromVision);

// Mark a suggestion as applied
router.put('/suggestions/:suggestionId/apply', applySuggestion);

// Get suggestion history
router.get('/suggestions', getSuggestionHistory);

export default router;