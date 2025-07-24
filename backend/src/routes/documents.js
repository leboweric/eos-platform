import express from 'express';
import { authenticate } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  getDocuments,
  uploadDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
  toggleFavorite,
  debugDocument
} from '../controllers/documentsController.js';

const router = express.Router({ mergeParams: true });

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create upload directory if it doesn't exist
// In production, use /app/uploads for Railway volume persistence
const uploadDir = process.env.NODE_ENV === 'production' 
  ? '/app/uploads/documents'
  : path.join(__dirname, '..', '..', 'uploads', 'documents');
  
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
    fileSize: 50 * 1024 * 1024 // 50MB limit for documents
  }
});

// All routes require authentication
router.use(authenticate);

// Get all documents with filtering
router.get('/', getDocuments);

// Upload a new document
router.post('/', upload.single('file'), uploadDocument);

// Download a document
router.get('/:documentId/download', downloadDocument);

// Debug document paths (temporary)
router.get('/:documentId/debug', debugDocument);

// Update document metadata
router.put('/:documentId', updateDocument);

// Delete a document
router.delete('/:documentId', deleteDocument);

// Toggle favorite status
router.post('/:documentId/favorite', toggleFavorite);

export default router;