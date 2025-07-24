import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder
} from '../controllers/foldersController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Get all folders for an organization
router.get('/', getFolders);

// Create a new folder (admin only)
router.post('/', createFolder);

// Update a folder (admin only)
router.put('/:folderId', updateFolder);

// Delete a folder (admin only)
router.delete('/:folderId', deleteFolder);

export default router;