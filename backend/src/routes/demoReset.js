import express from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Track last reset time in memory (could also use database)
let lastResetTime = null;
const RESET_COOLDOWN_HOURS = 24; // Only allow reset once per day

// Manual reset endpoint (protected - admin only)
router.post('/reset', authenticate, async (req, res) => {
  try {
    // Check if user is admin of the demo org
    const { user } = req;
    
    // Only allow specific admin or system admin to reset
    if (user.email !== 'demo@acme.com' && user.email !== 'eric.lebow@eosworldwide.com') {
      return res.status(403).json({
        success: false,
        message: 'Only authorized users can reset the demo organization'
      });
    }
    
    // Check cooldown
    if (lastResetTime) {
      const hoursSinceReset = (Date.now() - lastResetTime) / (1000 * 60 * 60);
      if (hoursSinceReset < RESET_COOLDOWN_HOURS) {
        const hoursRemaining = Math.ceil(RESET_COOLDOWN_HOURS - hoursSinceReset);
        return res.status(429).json({
          success: false,
          message: `Demo can only be reset once per day. Please wait ${hoursRemaining} more hour(s).`
        });
      }
    }
    
    // Perform reset
    await resetDemoOrganization();
    lastResetTime = Date.now();
    
    res.json({
      success: true,
      message: 'Demo organization has been reset successfully',
      nextResetAvailable: new Date(lastResetTime + (RESET_COOLDOWN_HOURS * 60 * 60 * 1000))
    });
    
  } catch (error) {
    console.error('Error resetting demo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset demo organization'
    });
  }
});

// Get reset status
router.get('/status', async (req, res) => {
  const canReset = !lastResetTime || 
    (Date.now() - lastResetTime) >= (RESET_COOLDOWN_HOURS * 60 * 60 * 1000);
  
  res.json({
    canReset,
    lastResetTime: lastResetTime ? new Date(lastResetTime) : null,
    nextResetAvailable: lastResetTime 
      ? new Date(lastResetTime + (RESET_COOLDOWN_HOURS * 60 * 60 * 1000))
      : new Date()
  });
});

async function resetDemoOrganization() {
  // Import the reset function from the script
  const { default: resetDemoOrg } = await import('../scripts/resetDemoOrg.js');
  
  // Run the reset
  await resetDemoOrg();
}

export default router;