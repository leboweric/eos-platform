import express from 'express';
import { body, param, query as queryValidator } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  getOrganizationSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  getUserSkills,
  upsertUserSkill,
  removeUserSkill
} from '../controllers/skillsController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Organization skill routes
router.get('/', [
  queryValidator('category').optional().isIn(['technical', 'leadership', 'communication', 'analytical', 'other']).withMessage('Invalid category')
], validateRequest, getOrganizationSkills);

router.post('/', [
  body('name').notEmpty().withMessage('Skill name is required'),
  body('category').isIn(['technical', 'leadership', 'communication', 'analytical', 'other']).withMessage('Invalid category'),
  body('description').optional()
], validateRequest, createSkill);

router.put('/:skillId', [
  param('skillId').isUUID().withMessage('Invalid skill ID'),
  body('name').notEmpty().withMessage('Skill name is required'),
  body('category').isIn(['technical', 'leadership', 'communication', 'analytical', 'other']).withMessage('Invalid category'),
  body('description').optional()
], validateRequest, updateSkill);

router.delete('/:skillId', [
  param('skillId').isUUID().withMessage('Invalid skill ID')
], validateRequest, deleteSkill);

export default router;