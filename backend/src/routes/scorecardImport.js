import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { preview, execute, getHistory } from '../controllers/scorecardImportController.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV files
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// All routes require authentication
router.use(authenticate);

// Preview import without saving
router.post('/preview', upload.single('file'), preview);

// Execute import
router.post('/execute', upload.single('file'), execute);

// Get import history
router.get('/history/:organizationId', getHistory);

export default router;