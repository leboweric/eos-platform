/**
 * Storage Factory
 * Creates and manages storage adapters based on organization configuration
 */

import { InternalStorageAdapter } from './InternalStorageAdapter.js';
import { GoogleDriveAdapter } from './GoogleDriveAdapter.js';
import { OneDriveAdapter } from './OneDriveAdapter.js';
import { query as dbQuery } from '../../config/database.js';

class StorageFactory {
  constructor() {
    // Cache adapters by organization ID to avoid recreating them
    this.adapterCache = new Map();
  }

  /**
   * Get storage adapter for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<StorageAdapter>} Configured storage adapter
   */
  async getAdapter(organizationId) {
    // Check cache first
    if (this.adapterCache.has(organizationId)) {
      return this.adapterCache.get(organizationId);
    }

    // Get organization storage configuration
    const config = await this.getOrganizationConfig(organizationId);
    
    // Create appropriate adapter
    const adapter = await this.createAdapter(config);
    
    // Cache for future use
    this.adapterCache.set(organizationId, adapter);
    
    return adapter;
  }

  /**
   * Get organization storage configuration from database
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Storage configuration
   */
  async getOrganizationConfig(organizationId) {
    try {
      const sql = `
        SELECT default_storage_provider, storage_config
        FROM organizations
        WHERE id = $1
      `;
      const result = await dbQuery(sql, [organizationId]);

      if (result.rows.length === 0) {
        throw new Error(`Organization ${organizationId} not found`);
      }

      const { default_storage_provider, storage_config } = result.rows[0];
      
      return {
        organizationId,
        provider: default_storage_provider || 'internal',
        ...storage_config
      };
    } catch (error) {
      console.error('Error fetching organization config:', error);
      // Fallback to internal storage if config fetch fails
      return {
        organizationId,
        provider: 'internal'
      };
    }
  }

  /**
   * Create storage adapter based on configuration
   * @param {Object} config - Storage configuration
   * @returns {Promise<StorageAdapter>} Initialized storage adapter
   */
  async createAdapter(config) {
    let adapter;

    switch (config.provider) {
      case 'internal':
        adapter = new InternalStorageAdapter(config);
        break;
      
      case 'google_drive':
        adapter = new GoogleDriveAdapter(config);
        break;
      
      case 'onedrive':
      case 'sharepoint':
        adapter = new OneDriveAdapter(config);
        break;
      
      case 'box':
        throw new Error('Box adapter not yet implemented');
        break;
      
      case 'dropbox':
        throw new Error('Dropbox adapter not yet implemented');
        break;
      
      default:
        console.warn(`Unknown storage provider: ${config.provider}, falling back to internal`);
        adapter = new InternalStorageAdapter(config);
    }

    // Initialize the adapter
    await adapter.initialize();
    
    return adapter;
  }

  /**
   * Clear adapter cache for an organization
   * @param {string} organizationId - Organization ID
   */
  clearCache(organizationId) {
    this.adapterCache.delete(organizationId);
  }

  /**
   * Clear all cached adapters
   */
  clearAllCache() {
    this.adapterCache.clear();
  }

  /**
   * Update organization storage configuration
   * @param {string} organizationId - Organization ID
   * @param {Object} newConfig - New storage configuration
   * @returns {Promise<boolean>} Success status
   */
  async updateOrganizationConfig(organizationId, newConfig) {
    try {
      const { provider, ...configData } = newConfig;
      
      // Validate the new configuration
      const testAdapter = await this.createAdapter({
        organizationId,
        provider,
        ...configData
      });
      
      const validation = await testAdapter.validateConfig();
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.message}`);
      }

      // Update database
      const sql = `
        UPDATE organizations
        SET 
          default_storage_provider = $1,
          storage_config = $2,
          updated_at = NOW()
        WHERE id = $3
      `;
      
      await dbQuery(sql, [provider, configData, organizationId]);
      
      // Clear cache to force reload with new config
      this.clearCache(organizationId);
      
      // Log the configuration change
      await this.logConfigChange(organizationId, provider, configData);
      
      return true;
    } catch (error) {
      console.error('Error updating organization config:', error);
      throw error;
    }
  }

  /**
   * Test storage configuration without saving
   * @param {Object} config - Storage configuration to test
   * @returns {Promise<Object>} Test results
   */
  async testConfiguration(config) {
    try {
      const adapter = await this.createAdapter(config);
      const validation = await adapter.validateConfig();
      
      // Try to perform basic operations
      const tests = {
        validation,
        operations: {}
      };

      // Test folder creation
      try {
        const folder = await adapter.createFolder('AXP Test Folder');
        tests.operations.createFolder = { success: true, folderId: folder.id };
        
        // Clean up test folder
        if (adapter.deleteFolder) {
          await adapter.deleteFolder(folder.id);
        }
      } catch (error) {
        tests.operations.createFolder = { success: false, error: error.message };
      }

      // Test quota check
      try {
        const quota = await adapter.getQuota();
        tests.operations.getQuota = { success: true, quota };
      } catch (error) {
        tests.operations.getQuota = { success: false, error: error.message };
      }

      return tests;
    } catch (error) {
      return {
        validation: { valid: false, message: error.message },
        operations: {}
      };
    }
  }

  /**
   * Migrate documents from one storage provider to another
   * @param {string} organizationId - Organization ID
   * @param {string} fromProvider - Source storage provider
   * @param {string} toProvider - Target storage provider
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} Migration results
   */
  async migrateStorage(organizationId, fromProvider, toProvider, options = {}) {
    // This would be a complex operation that:
    // 1. Gets all documents from source
    // 2. Downloads them
    // 3. Uploads to target
    // 4. Updates database records
    // 5. Handles errors and rollback
    
    throw new Error('Storage migration not yet implemented');
  }

  /**
   * Log storage configuration changes
   * @param {string} organizationId - Organization ID
   * @param {string} provider - Storage provider
   * @param {Object} config - Configuration (sensitive data removed)
   */
  async logConfigChange(organizationId, provider, config) {
    try {
      // Remove sensitive information
      const sanitizedConfig = { ...config };
      delete sanitizedConfig.client_secret;
      delete sanitizedConfig.service_account_key;
      
      const sql = `
        INSERT INTO cloud_storage_sync_log (
          organization_id, storage_provider, action, status, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `;
      
      await dbQuery(sql, [
        organizationId,
        provider,
        'config_change',
        'success',
        sanitizedConfig
      ]);
    } catch (error) {
      console.error('Error logging config change:', error);
    }
  }

  /**
   * Get storage statistics for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Storage statistics
   */
  async getStorageStats(organizationId) {
    try {
      const adapter = await this.getAdapter(organizationId);
      const quota = await adapter.getQuota();
      
      // Get document count by storage provider
      const sql = `
        SELECT 
          storage_provider,
          COUNT(*) as file_count,
          SUM(file_size) as total_size
        FROM documents
        WHERE organization_id = $1
        GROUP BY storage_provider
      `;
      
      const result = await dbQuery(sql, [organizationId]);
      
      return {
        quota,
        breakdown: result.rows,
        provider: adapter.provider
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storageFactory = new StorageFactory();