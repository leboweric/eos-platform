import express from 'express';
import multer from 'multer';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getTemplate, preview, execute } from '../controllers/issuesImportController.js';

const router = express.Router();

// Configure multer for Excel file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel files
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream' // Sometimes Excel files come as this
    ];
    
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload an Excel file (.xlsx or .xls)'), false);
    }
  }
});

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/v1/issues/import/template
 * Get the import template information
 */
router.get('/template', getTemplate);

/**
 * POST /api/v1/issues/import/preview
 * Preview Excel import without saving
 * Requires: manager role or higher
 */
router.post('/preview', 
  requireRole(['admin', 'manager']),
  upload.single('file'),
  preview
);

/**
 * POST /api/v1/issues/import/execute
 * Execute the actual import
 * Requires: manager role or higher
 */
router.post('/execute',
  requireRole(['admin', 'manager']),
  upload.single('file'),
  execute
);

// Error handler for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  next(error);
});

export default router;