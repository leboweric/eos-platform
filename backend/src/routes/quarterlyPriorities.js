import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';
import {
  getQuarterlyPriorities,
  getCurrentPriorities,
  createPriority,
  updatePriority,
  deletePriority,
  archivePriority,
  getArchivedPriorities,
  updatePredictions,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  addPriorityUpdate,
  cleanupTestPriorities
} from '../controllers/quarterlyPrioritiesController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Get priorities for a quarter
router.get('/', getQuarterlyPriorities);

// Get current priorities (simplified - no quarter logic)
router.get('/current', getCurrentPriorities);

// Get archived priorities
router.get('/archived', getArchivedPriorities);

// Priority CRUD
router.post('/priorities', createPriority);
router.put('/priorities/:priorityId', updatePriority);
router.delete('/priorities/:priorityId', deletePriority);
router.put('/priorities/:priorityId/archive', archivePriority);

// Predictions
router.put('/predictions', updatePredictions);

// Milestones
router.post('/priorities/:priorityId/milestones', createMilestone);
router.put('/priorities/:priorityId/milestones/:milestoneId', updateMilestone);
router.delete('/priorities/:priorityId/milestones/:milestoneId', deleteMilestone);

// Priority updates
router.post('/priorities/:priorityId/updates', addPriorityUpdate);

// Admin cleanup function
router.post('/cleanup-test-priorities', cleanupTestPriorities);

// Debug endpoint (only in development)
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/milestone-sync', async (req, res) => {
    try {
      const { orgId } = req.params;
      const milestones = await query('SELECT id, title, priority_id FROM priority_milestones WHERE priority_id IN (SELECT id FROM quarterly_priorities WHERE organization_id = $1)', [orgId]);
      const priorities = await query('SELECT id, title FROM quarterly_priorities WHERE organization_id = $1', [orgId]);
      
      res.json({
        milestones: milestones.rows,
        priorities: priorities.rows,
        counts: {
          milestones: milestones.rows.length,
          priorities: priorities.rows.length
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

export default router;