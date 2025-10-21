import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { getImportTemplate, previewTodosImport, executeTodosImport } from '../controllers/todosImportController.js';

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
      'text/csv', // .csv
      'application/octet-stream' // Sometimes Excel files come as this
    ];
    
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file'), false);
    }
  }
});

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/v1/todos/import/template
 * Get the import template information
 */
router.get('/template', getImportTemplate);

/**
 * POST /api/v1/todos/import/preview
 * Preview Excel import without saving
 */
router.post('/preview', upload.single('file'), previewTodosImport);

/**
 * POST /api/v1/todos/import/execute
 * Execute the actual import
 */
router.post('/execute', upload.single('file'), executeTodosImport);

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