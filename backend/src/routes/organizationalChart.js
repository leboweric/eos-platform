import express from 'express';
import { body, param, query as queryValidator } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  getOrganizationalCharts,
  getOrganizationalChart,
  createOrganizationalChart,
  updateOrganizationalChart,
  deleteOrganizationalChart,
  addPosition,
  updatePosition,
  deletePosition,
  assignPositionHolder,
  removePositionHolder
} from '../controllers/organizationalChartController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Chart routes
router.get('/', [
  queryValidator('includeShared').optional().isBoolean().withMessage('includeShared must be a boolean')
], validateRequest, getOrganizationalCharts);

router.get('/:chartId', [
  param('chartId').isUUID().withMessage('Invalid chart ID')
], validateRequest, getOrganizationalChart);

router.post('/', [
  body('name').notEmpty().withMessage('Chart name is required'),
  body('description').optional(),
  body('teamId').optional().isUUID().withMessage('Invalid team ID'),
  body('departmentId').optional().isUUID().withMessage('Invalid department ID'),
  body('isTemplate').optional().isBoolean().withMessage('isTemplate must be a boolean')
], validateRequest, createOrganizationalChart);

router.put('/:chartId', [
  param('chartId').isUUID().withMessage('Invalid chart ID'),
  body('name').notEmpty().withMessage('Chart name is required'),
  body('description').optional()
], validateRequest, updateOrganizationalChart);

router.delete('/:chartId', [
  param('chartId').isUUID().withMessage('Invalid chart ID')
], validateRequest, deleteOrganizationalChart);

// Position routes
router.post('/:chartId/positions', [
  param('chartId').isUUID().withMessage('Invalid chart ID'),
  body('title').notEmpty().withMessage('Position title is required'),
  body('description').optional(),
  body('parentPositionId').optional().isUUID().withMessage('Invalid parent position ID'),
  body('positionType').optional().isIn(['leadership', 'management', 'individual_contributor']).withMessage('Invalid position type'),
  body('skills').optional().isArray().withMessage('Skills must be an array'),
  body('skills.*.skillId').isUUID().withMessage('Invalid skill ID'),
  body('skills.*.importanceLevel').isIn(['required', 'preferred', 'nice_to_have']).withMessage('Invalid importance level'),
  body('responsibilities').optional().isArray().withMessage('Responsibilities must be an array'),
  body('responsibilities.*.responsibility').notEmpty().withMessage('Responsibility text is required'),
  body('responsibilities.*.priority').isIn(['critical', 'high', 'medium', 'low']).withMessage('Invalid priority')
], validateRequest, addPosition);

router.put('/:chartId/positions/:positionId', [
  param('chartId').isUUID().withMessage('Invalid chart ID'),
  param('positionId').isUUID().withMessage('Invalid position ID'),
  body('title').notEmpty().withMessage('Position title is required'),
  body('description').optional(),
  body('positionType').optional().isIn(['leadership', 'management', 'individual_contributor']).withMessage('Invalid position type')
], validateRequest, updatePosition);

router.delete('/:chartId/positions/:positionId', [
  param('chartId').isUUID().withMessage('Invalid chart ID'),
  param('positionId').isUUID().withMessage('Invalid position ID')
], validateRequest, deletePosition);

// Position holder routes
router.post('/:chartId/positions/:positionId/assign', [
  param('chartId').isUUID().withMessage('Invalid chart ID'),
  param('positionId').isUUID().withMessage('Invalid position ID'),
  body('userId').optional().isUUID().withMessage('Invalid user ID'),
  body('externalName').optional().notEmpty().withMessage('External name is required'),
  body('externalEmail').optional().isEmail().withMessage('Invalid email address'),
  body('startDate').optional().isISO8601().withMessage('Invalid start date')
], validateRequest, assignPositionHolder);

router.delete('/:chartId/positions/:positionId/holder', [
  param('chartId').isUUID().withMessage('Invalid chart ID'),
  param('positionId').isUUID().withMessage('Invalid position ID')
], validateRequest, removePositionHolder);

export default router;