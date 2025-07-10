import express from 'express';
import { getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment } from '../controllers/departmentController.js';
import { getDepartmentVTO } from '../controllers/vtoController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all departments for organization
router.get('/', getDepartments);

// Get single department
router.get('/:id', getDepartment);

// Create new department
router.post('/', createDepartment);

// Update department
router.put('/:id', updateDepartment);

// Delete department
router.delete('/:id', deleteDepartment);

// Get VTO for department
router.get('/:departmentId/vto', getDepartmentVTO);

// Get quarterly priorities for department
router.get('/:departmentId/rocks', (req, res, next) => {
  // Pass departmentId as query parameter to quarterly priorities controller
  req.query.departmentId = req.params.departmentId;
  next();
}, async (req, res) => {
  const { getRocks } = await import('../controllers/rocksController.js');
  return getRocks(req, res);
});

export default router;