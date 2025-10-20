import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { getTemplate, preview, execute } from '../controllers/prioritiesImportController.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV files
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/csv' ||
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// All routes require authentication
router.use(authenticate);

// Get import template information
router.get('/template', getTemplate);

// Preview import (parse and analyze without saving)
router.post('/preview', upload.single('file'), preview);

// Execute import (actually save the data)
router.post('/execute', upload.single('file'), execute);

export default router;