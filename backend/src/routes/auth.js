import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/v1/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('organizationName').trim().isLength({ min: 1 })
], register);

// @route   POST /api/v1/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], login);

// @route   POST /api/v1/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', refreshToken);

// @route   POST /api/v1/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticate, logout);

// @route   GET /api/v1/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticate, getProfile);

// @route   PUT /api/v1/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  authenticate,
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('email').optional().isEmail().normalizeEmail()
], updateProfile);

// @route   PUT /api/v1/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', [
  authenticate,
  body('currentPassword').exists(),
  body('newPassword').isLength({ min: 6 })
], changePassword);

// @route   POST /api/v1/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], forgotPassword);

// @route   POST /api/v1/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', [
  body('token').exists().trim(),
  body('password').isLength({ min: 6 })
], resetPassword);

export default router;

