import express from 'express';
import { getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment } from '../controllers/departmentController.js';
import { getDepartmentBusinessBlueprint } from '../controllers/businessBlueprintController.js';
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

// Get Business Blueprint for department
router.get('/:departmentId/business-blueprint', getDepartmentBusinessBlueprint);

// Get quarterly priorities for department
router.get('/:departmentId/quarterly-priorities', (req, res, next) => {
  // Pass departmentId as query parameter to quarterly priorities controller
  req.query.departmentId = req.params.departmentId;
  next();
}, async (req, res) => {
  const { getQuarterlyPriorities } = await import('../controllers/quarterlyPrioritiesController.js');
  return getQuarterlyPriorities(req, res);
});

export default router;