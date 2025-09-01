import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { 
  getOrganization, 
  updateOrganization, 
  uploadLogo, 
  getLogo, 
  deleteLogo,
  upload 
} from '../controllers/organizationController.js';
import { query } from '../config/database.js';

const router = express.Router();

// Public routes (no authentication required)
// @route   GET /api/v1/organizations/:orgId/logo
// @desc    Get organization logo
// @access  Public (for display purposes)
router.get('/:orgId/logo', getLogo);

// Protected routes (authentication required)
router.use(authenticate);

// @route   GET /api/v1/organizations/current
// @desc    Get current organization details
// @access  Private
router.get('/current', getOrganization);

// @route   PUT /api/v1/organizations/current
// @desc    Update current organization details
// @access  Private (Admin only)
router.put('/current', updateOrganization);

// @route   POST /api/v1/organizations/current/logo
// @desc    Upload organization logo
// @access  Private (Admin only)
router.post('/current/logo', upload.single('logo'), uploadLogo);

// @route   DELETE /api/v1/organizations/current/logo
// @desc    Delete organization logo
// @access  Private (Admin only)
router.delete('/current/logo', deleteLogo);

// @route   GET /api/v1/organizations/:orgId/users
// @desc    Get all users in an organization
// @access  Private
router.get('/:orgId/users', async (req, res) => {
  try {
    const { orgId } = req.params;
    const result = await query(
      `SELECT 
        id, 
        email, 
        first_name, 
        last_name,
        CONCAT(first_name, ' ', last_name) as name,
        role,
        created_at
      FROM users 
      WHERE organization_id = $1
      ORDER BY first_name, last_name`,
      [orgId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching organization users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;

