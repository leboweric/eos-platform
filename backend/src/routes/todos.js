import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  archiveDoneTodos,
  uploadTodoAttachment,
  getTodoAttachments,
  deleteTodoAttachment,
  downloadTodoAttachment,
  getTodoUpdates,
  addTodoUpdate,
  deleteTodoUpdate
} from '../controllers/todosController.js';

const router = express.Router({ mergeParams: true });

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'todos');
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

// Get all todos
router.get('/', [
  query('status').optional().isIn(['incomplete', 'complete', 'cancelled']),
  query('assignedTo').optional().isUUID(),
  query('includeCompleted').optional().isBoolean()
], getTodos);

// Create a new todo
router.post('/', [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').optional(),
  body('assignedToId').optional().isUUID(),
  body('dueDate').optional().isISO8601(),
  body('teamId').optional().isUUID()
], createTodo);

// Archive done todos - MUST come before /:todoId routes
router.put('/archive-done', archiveDoneTodos);

// Update a todo
router.put('/:todoId', [
  param('todoId').isUUID(),
  body('title').optional().notEmpty(),
  body('description').optional(),
  body('assignedToId').optional().isUUID(),
  body('dueDate').optional().isISO8601(),
  body('status').optional().isIn(['incomplete', 'complete', 'cancelled'])
], updateTodo);

// Delete a todo
router.delete('/:todoId', [
  param('todoId').isUUID()
], deleteTodo);

// Upload attachment for a todo
router.post('/:todoId/attachments', [
  param('todoId').isUUID()
], upload.single('file'), uploadTodoAttachment);

// Get attachments for a todo  
router.get('/:todoId/attachments', [
  param('todoId').isUUID()
], getTodoAttachments);

// Download attachment
router.get('/:todoId/attachments/:attachmentId/download', [
  param('todoId').isUUID(),
  param('attachmentId').isUUID()
], downloadTodoAttachment);

// Delete an attachment
router.delete('/:todoId/attachments/:attachmentId', [
  param('todoId').isUUID(),
  param('attachmentId').isUUID()
], deleteTodoAttachment);

// Todo updates routes
router.get('/:todoId/updates', [
  param('todoId').isUUID()
], getTodoUpdates);

router.post('/:todoId/updates', [
  param('todoId').isUUID(),
  body('update_text').notEmpty().withMessage('Update text is required')
], addTodoUpdate);

router.delete('/:todoId/updates/:updateId', [
  param('todoId').isUUID(),
  param('updateId').isUUID()
], deleteTodoUpdate);

// Import routes
import { getImportTemplate, previewTodosImport, executeTodosImport } from '../controllers/todosImportController.js';

// Configure multer for Excel import (separate from file attachments)
const importUpload = multer({
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

/**
 * GET /api/v1/todos/import/template
 * Get the import template information
 */
router.get('/import/template', getImportTemplate);

/**
 * POST /api/v1/todos/import/preview
 * Preview Excel import without saving
 */
router.post('/import/preview', importUpload.single('file'), previewTodosImport);

/**
 * POST /api/v1/todos/import/execute
 * Execute the actual import
 */
router.post('/import/execute', importUpload.single('file'), executeTodosImport);

export default router;
