import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/database.js';

const router = express.Router();

// Temporary endpoint to reset admin password
// DELETE THIS FILE AFTER USE!
router.post('/reset-admin-password', async (req, res) => {
  try {
    const email = 'admin@sentientwealth.com';
    const newPassword = 'TempPass123!';
    
    // Generate hash for new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password
    const result = await db.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email, first_name, last_name',
      [hashedPassword, email]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      message: 'Password reset successfully',
      user: result.rows[0].email,
      newPassword: newPassword,
      warning: 'CHANGE THIS PASSWORD IMMEDIATELY!'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;