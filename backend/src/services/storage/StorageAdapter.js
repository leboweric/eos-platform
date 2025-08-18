/**
 * Base Storage Adapter Class
 * Provides a common interface for different storage providers (internal, Google Drive, OneDrive, etc.)
 */

export class StorageAdapter {
  constructor(config = {}) {
    this.config = config;
    this.provider = 'base';
  }

  /**
   * Initialize the storage adapter (authenticate, setup connections, etc.)
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Upload a file to the storage provider
   * @param {Object} file - File object with buffer, mimetype, originalname
   * @param {Object} metadata - Additional metadata (folder, permissions, etc.)
   * @returns {Promise<Object>} Upload result with external_id, external_url, etc.
   */
  async upload(file, metadata = {}) {
    throw new Error('upload() must be implemented by subclass');
  }

  /**
   * Download a file from the storage provider
   * @param {string} externalId - External file ID
   * @returns {Promise<Buffer>} File buffer
   */
  async download(externalId) {
    throw new Error('download() must be implemented by subclass');
  }

  /**
   * Delete a file from the storage provider
   * @param {string} externalId - External file ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(externalId) {
    throw new Error('delete() must be implemented by subclass');
  }

  /**
   * Get file metadata from the storage provider
   * @param {string} externalId - External file ID
   * @returns {Promise<Object>} File metadata
   */
  async getMetadata(externalId) {
    throw new Error('getMetadata() must be implemented by subclass');
  }

  /**
   * Update file permissions in the storage provider
   * @param {string} externalId - External file ID
   * @param {Object} permissions - Permission settings
   * @returns {Promise<Object>} Updated permissions
   */
  async updatePermissions(externalId, permissions) {
    throw new Error('updatePermissions() must be implemented by subclass');
  }

  /**
   * Create a folder in the storage provider
   * @param {string} folderName - Folder name
   * @param {string} parentFolderId - Parent folder ID (optional)
   * @returns {Promise<Object>} Folder creation result
   */
  async createFolder(folderName, parentFolderId = null) {
    throw new Error('createFolder() must be implemented by subclass');
  }

  /**
   * List files in a folder
   * @param {string} folderId - Folder ID
   * @param {Object} options - List options (pagination, filters, etc.)
   * @returns {Promise<Array>} List of files
   */
  async listFiles(folderId, options = {}) {
    throw new Error('listFiles() must be implemented by subclass');
  }

  /**
   * Move a file to a different folder
   * @param {string} externalId - External file ID
   * @param {string} newFolderId - New folder ID
   * @returns {Promise<Object>} Move result
   */
  async moveFile(externalId, newFolderId) {
    throw new Error('moveFile() must be implemented by subclass');
  }

  /**
   * Copy a file
   * @param {string} externalId - External file ID
   * @param {Object} options - Copy options (new name, folder, etc.)
   * @returns {Promise<Object>} Copy result
   */
  async copyFile(externalId, options = {}) {
    throw new Error('copyFile() must be implemented by subclass');
  }

  /**
   * Generate a shareable link for a file
   * @param {string} externalId - External file ID
   * @param {Object} options - Sharing options (expiry, permissions, etc.)
   * @returns {Promise<string>} Shareable URL
   */
  async generateShareLink(externalId, options = {}) {
    throw new Error('generateShareLink() must be implemented by subclass');
  }

  /**
   * Get storage quota information
   * @returns {Promise<Object>} Quota info (used, total, remaining)
   */
  async getQuota() {
    throw new Error('getQuota() must be implemented by subclass');
  }

  /**
   * Search for files
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async search(query, options = {}) {
    throw new Error('search() must be implemented by subclass');
  }

  /**
   * Get a thumbnail URL for a file
   * @param {string} externalId - External file ID
   * @param {Object} options - Thumbnail options (size, format)
   * @returns {Promise<string>} Thumbnail URL
   */
  async getThumbnail(externalId, options = {}) {
    throw new Error('getThumbnail() must be implemented by subclass');
  }

  /**
   * Validate the storage configuration
   * @returns {Promise<Object>} Validation result
   */
  async validateConfig() {
    throw new Error('validateConfig() must be implemented by subclass');
  }

  /**
   * Map AXP visibility to provider-specific permissions
   * @param {string} visibility - AXP visibility level (company, department, private)
   * @param {Object} context - Additional context (team, user, etc.)
   * @returns {Object} Provider-specific permissions
   */
  mapPermissions(visibility, context = {}) {
    // Default implementation - subclasses can override
    switch (visibility) {
      case 'company':
        return { type: 'domain', role: 'reader' };
      case 'department':
        return { type: 'group', role: 'reader', groupId: context.departmentId };
      case 'private':
        return { type: 'user', role: 'owner', userId: context.userId };
      default:
        return { type: 'private' };
    }
  }

  /**
   * Handle provider-specific errors
   * @param {Error} error - Original error
   * @returns {Error} Standardized error
   */
  handleError(error) {
    // Default error handling - subclasses can override
    const standardError = new Error();
    standardError.provider = this.provider;
    standardError.originalError = error;
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      standardError.message = 'Storage provider connection failed';
      standardError.code = 'CONNECTION_FAILED';
    } else if (error.code === 401 || error.code === 'UNAUTHENTICATED') {
      standardError.message = 'Storage provider authentication failed';
      standardError.code = 'AUTH_FAILED';
    } else if (error.code === 403 || error.code === 'PERMISSION_DENIED') {
      standardError.message = 'Storage provider permission denied';
      standardError.code = 'PERMISSION_DENIED';
    } else if (error.code === 404 || error.code === 'NOT_FOUND') {
      standardError.message = 'File not found in storage provider';
      standardError.code = 'FILE_NOT_FOUND';
    } else if (error.code === 507 || error.code === 'QUOTA_EXCEEDED') {
      standardError.message = 'Storage quota exceeded';
      standardError.code = 'QUOTA_EXCEEDED';
    } else {
      standardError.message = error.message || 'Storage operation failed';
      standardError.code = 'STORAGE_ERROR';
    }
    
    return standardError;
  }

  /**
   * Log storage operation for audit trail
   * @param {string} action - Action performed
   * @param {Object} details - Operation details
   */
  async logOperation(action, details) {
    // This could be overridden to log to a specific service
    console.log(`[${this.provider}] ${action}:`, details);
  }
}