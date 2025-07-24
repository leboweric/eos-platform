import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
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
  cleanupTestPriorities,
  uploadPriorityAttachment,
  getPriorityAttachments,
  downloadPriorityAttachment,
  deletePriorityAttachment
} from '../controllers/quarterlyPrioritiesController.js';

const router = express.Router({ mergeParams: true });

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'priorities');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

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

// Priority attachments
router.post('/priorities/:priorityId/attachments', upload.single('file'), uploadPriorityAttachment);
router.get('/priorities/:priorityId/attachments', getPriorityAttachments);
router.get('/priorities/:priorityId/attachments/:attachmentId/download', downloadPriorityAttachment);
router.delete('/priorities/:priorityId/attachments/:attachmentId', deletePriorityAttachment);

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