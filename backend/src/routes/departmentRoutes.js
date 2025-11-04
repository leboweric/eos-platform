import express from 'express';
import { getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment, addDepartmentMember, removeDepartmentMember } from '../controllers/departmentController.js';
import { getDepartmentBusinessBlueprint } from '../controllers/businessBlueprintController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Log all requests to department routes
router.use((req, res, next) => {
  console.log('🔥 DEPARTMENT ROUTE HIT:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    params: req.params,
    body: req.body
  });
  next();
});

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

// Add member to department
router.post('/:id/members', (req, res, next) => {
  console.log('🎯 ADD MEMBER ROUTE MATCHED:', { id: req.params.id, body: req.body });
  next();
}, addDepartmentMember);

// Remove member from department
router.delete('/:id/members/:userId', (req, res, next) => {
  console.log('🎯 REMOVE MEMBER ROUTE MATCHED:', { id: req.params.id, userId: req.params.userId });
  next();
}, removeDepartmentMember);

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