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
  uploadTodoAttachment,
  getTodoAttachments,
  deleteTodoAttachment,
  downloadTodoAttachment
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

export default router;
