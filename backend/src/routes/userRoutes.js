import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getOrganizationUsers,
  inviteUser,
  acceptInvitation,
  removeUser,
  getPendingInvitations,
  cancelInvitation
} from '../controllers/userController.js';

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

// Cancel invitation (admin only)
router.delete('/invitations/:invitationId', cancelInvitation);

// Remove user from organization (admin only)
router.delete('/:userId', removeUser);

export default router;