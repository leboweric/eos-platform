import express from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  getOrganizationUsers,
  inviteUser,
  createUser,
  acceptInvitation,
  removeUser,
  getPendingInvitations,
  cancelInvitation,
  getUserDepartments
} from '../controllers/userController.js';
import {
  getUserSkills,
  upsertUserSkill,
  removeUserSkill
} from '../controllers/skillsController.js';

const router = express.Router();

// Public route for accepting invitations (no auth required)
router.post('/accept-invitation', acceptInvitation);

// Protected routes (require authentication)
router.use(authenticate);

// Get all users in organization
router.get('/organization', getOrganizationUsers);

// Get pending invitations
router.get('/invitations', getPendingInvitations);

// Invite a new user (admin only)
router.post('/invite', inviteUser);

// Create a new user directly (consultant only)
router.post('/create', createUser);

// Cancel invitation (admin only)
router.delete('/invitations/:invitationId', cancelInvitation);

// Remove user from organization (admin only)
router.delete('/:userId', removeUser);

// User skills routes
router.get('/:userId/skills', [
  param('userId').isUUID().withMessage('Invalid user ID')
], validateRequest, getUserSkills);

router.post('/:userId/skills', [
  param('userId').isUUID().withMessage('Invalid user ID'),
  body('skillId').isUUID().withMessage('Invalid skill ID'),
  body('proficiencyLevel').isInt({ min: 1, max: 5 }).withMessage('Proficiency level must be between 1 and 5')
], validateRequest, upsertUserSkill);

router.delete('/:userId/skills/:skillId', [
  param('userId').isUUID().withMessage('Invalid user ID'),
  param('skillId').isUUID().withMessage('Invalid skill ID')
], validateRequest, removeUserSkill);

// Get user's available departments
router.get('/departments', getUserDepartments);

export default router;