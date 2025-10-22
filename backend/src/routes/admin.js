import express from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';
import { 
  downloadTemplate, 
  previewImport, 
  bulkImport 
} from '../controllers/bulkImportController.js';
import { getActiveMeetings } from '../controllers/adminController.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel files only
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  }
});

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Active meetings dashboard
router.get('/active-meetings', getActiveMeetings);

// Bulk user import routes
router.get('/users/bulk-import/template', downloadTemplate);
router.post('/users/bulk-import/preview', upload.single('file'), previewImport);
router.post('/users/bulk-import', upload.single('file'), bulkImport);

export default router;