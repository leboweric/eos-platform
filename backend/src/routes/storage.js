import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getStorageQuota,
  testStorageConfig,
  updateStorageConfig
} from '../controllers/documentsControllerV2.js';
import { storageFactory } from '../services/storage/StorageFactory.js';
import { query } from '../config/database.js';

const router = express.Router({ mergeParams: true });

// Get current storage configuration
router.get('/config', authenticate, async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user.id;
    
    // Check if user is admin
    const adminCheck = await query(
      'SELECT role FROM users WHERE id = $1 AND organization_id = $2',
      [userId, orgId]
    );
    
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    // Get organization storage configuration
    const result = await query(
      'SELECT default_storage_provider, storage_config FROM organizations WHERE id = $1',
      [orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }
    
    const { default_storage_provider, storage_config } = result.rows[0];
    
    // Remove sensitive data before sending to frontend
    const sanitizedConfig = { ...storage_config };
    if (sanitizedConfig.service_account_key) {
      sanitizedConfig.service_account_key = '[CONFIGURED]';
    }
    if (sanitizedConfig.client_secret) {
      sanitizedConfig.client_secret = '[CONFIGURED]';
    }
    
    res.json({
      success: true,
      data: {
        provider: default_storage_provider || 'internal',
        config: sanitizedConfig
      }
    });
  } catch (error) {
    console.error('Error fetching storage config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch storage configuration'
    });
  }
});

// Get storage statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { orgId } = req.params;
    const stats = await storageFactory.getStorageStats(orgId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch storage statistics'
    });
  }
});

// Test storage configuration
router.post('/test', authenticate, testStorageConfig);

// Update storage configuration
router.put('/config', authenticate, updateStorageConfig);

// Get storage quota
router.get('/quota', authenticate, getStorageQuota);

// Get sync logs
router.get('/logs', authenticate, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { limit = 50 } = req.query;
    
    const result = await query(
      `SELECT * FROM cloud_storage_sync_log 
       WHERE organization_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [orgId, limit]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync logs'
    });
  }
});

export default router;