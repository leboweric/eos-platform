/**
 * Google Drive Storage Adapter
 * Stores files in organization's Google Drive
 */

import { StorageAdapter } from './StorageAdapter.js';
import { google } from 'googleapis';
import stream from 'stream';
import db from '../../config/database.js';

export class GoogleDriveAdapter extends StorageAdapter {
  constructor(config = {}) {
    super(config);
    this.provider = 'google_drive';
    this.drive = null;
    this.auth = null;
  }

  async initialize() {
    try {
      // Create JWT client for service account authentication
      this.auth = new google.auth.JWT({
        email: this.config.service_account_email,
        key: this.config.service_account_key,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive.metadata'
        ],
        // Impersonate the admin user if provided
        subject: this.config.admin_email || this.config.service_account_email
      });

      // Initialize Drive API
      this.drive = google.drive({ version: 'v3', auth: this.auth });

      // Test the connection
      await this.drive.files.list({ 
        pageSize: 1,
        fields: 'files(id, name)'
      });

      await this.logOperation('initialize', { 
        provider: 'google_drive',
        organizationId: this.config.organizationId 
      });

      return true;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async upload(file, metadata = {}) {
    try {
      const {
        folderId,
        visibility = 'company',
        title,
        description,
        mimeType
      } = metadata;

      // Determine parent folder
      const parentFolderId = await this.getOrCreateFolder(metadata);

      // Prepare file metadata for Google Drive
      const fileMetadata = {
        name: title || file.originalname,
        parents: [parentFolderId],
        description: description || `Uploaded from AXP Platform`
      };

      // Convert buffer to stream
      const bufferStream = new stream.PassThrough();
      bufferStream.end(file.buffer);

      // Upload file to Google Drive
      const media = {
        mimeType: file.mimetype || mimeType || 'application/octet-stream',
        body: bufferStream
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink, thumbnailLink, size, mimeType'
      });

      const googleFile = response.data;

      // Set permissions based on visibility
      await this.setFilePermissions(googleFile.id, visibility, metadata);

      // Store metadata in database
      await this.saveFileMetadata({
        ...metadata,
        external_id: googleFile.id,
        external_url: googleFile.webViewLink,
        external_thumbnail_url: googleFile.thumbnailLink,
        external_parent_folder_id: parentFolderId,
        file_name: file.originalname,
        file_size: file.size || googleFile.size,
        mime_type: googleFile.mimeType
      });

      await this.logOperation('upload', { 
        fileId: googleFile.id,
        fileName: file.originalname,
        size: file.size 
      });

      return {
        id: googleFile.id,
        external_id: googleFile.id,
        external_url: googleFile.webViewLink,
        download_url: googleFile.webContentLink,
        thumbnail_url: googleFile.thumbnailLink,
        storage_provider: 'google_drive',
        file_name: file.originalname,
        file_size: file.size,
        mime_type: googleFile.mimeType
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async download(externalId) {
    try {
      // Get file metadata
      const metaResponse = await this.drive.files.get({
        fileId: externalId,
        fields: 'name, mimeType'
      });

      // Download file content
      const response = await this.drive.files.get({
        fileId: externalId,
        alt: 'media'
      }, {
        responseType: 'arraybuffer'
      });

      await this.logOperation('download', { 
        fileId: externalId,
        fileName: metaResponse.data.name 
      });

      return {
        buffer: Buffer.from(response.data),
        fileName: metaResponse.data.name,
        mimeType: metaResponse.data.mimeType
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async delete(externalId) {
    try {
      await this.drive.files.delete({
        fileId: externalId
      });

      await this.logOperation('delete', { fileId: externalId });
      return true;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMetadata(externalId) {
    try {
      const response = await this.drive.files.get({
        fileId: externalId,
        fields: 'id, name, description, size, mimeType, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink, parents, permissions'
      });

      return {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description,
        size: response.data.size,
        mimeType: response.data.mimeType,
        createdAt: response.data.createdTime,
        modifiedAt: response.data.modifiedTime,
        viewUrl: response.data.webViewLink,
        downloadUrl: response.data.webContentLink,
        thumbnailUrl: response.data.thumbnailLink,
        parents: response.data.parents,
        permissions: response.data.permissions
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updatePermissions(externalId, permissions) {
    try {
      const { visibility, specificUsers = [], specificGroups = [] } = permissions;

      // Remove existing permissions (except owner)
      const existingPermissions = await this.drive.permissions.list({
        fileId: externalId
      });

      for (const permission of existingPermissions.data.permissions) {
        if (permission.role !== 'owner') {
          await this.drive.permissions.delete({
            fileId: externalId,
            permissionId: permission.id
          });
        }
      }

      // Apply new permissions
      await this.setFilePermissions(externalId, visibility, { 
        specificUsers, 
        specificGroups 
      });

      await this.logOperation('updatePermissions', { 
        fileId: externalId,
        visibility 
      });

      return { visibility, updated: true };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createFolder(folderName, parentFolderId = null) {
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : [this.config.root_folder_id]
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, webViewLink'
      });

      await this.logOperation('createFolder', { 
        folderId: response.data.id,
        folderName 
      });

      return {
        id: response.data.id,
        name: response.data.name,
        url: response.data.webViewLink
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async listFiles(folderId, options = {}) {
    try {
      const { limit = 100, pageToken } = options;
      
      const query = folderId 
        ? `'${folderId}' in parents and trashed = false`
        : `'${this.config.root_folder_id}' in parents and trashed = false`;

      const response = await this.drive.files.list({
        q: query,
        pageSize: limit,
        pageToken: pageToken,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink)'
      });

      return {
        files: response.data.files.map(file => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          createdAt: file.createdTime,
          modifiedAt: file.modifiedTime,
          viewUrl: file.webViewLink,
          thumbnailUrl: file.thumbnailLink
        })),
        nextPageToken: response.data.nextPageToken
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async moveFile(externalId, newFolderId) {
    try {
      // Get current parents
      const file = await this.drive.files.get({
        fileId: externalId,
        fields: 'parents'
      });

      // Remove from current parents
      const previousParents = file.data.parents ? file.data.parents.join(',') : '';

      // Move to new folder
      const response = await this.drive.files.update({
        fileId: externalId,
        addParents: newFolderId,
        removeParents: previousParents,
        fields: 'id, parents'
      });

      await this.logOperation('moveFile', { 
        fileId: externalId,
        newFolderId 
      });

      return {
        id: response.data.id,
        parents: response.data.parents
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async copyFile(externalId, options = {}) {
    try {
      const { newName, folderId } = options;

      const requestBody = {};
      if (newName) requestBody.name = newName;
      if (folderId) requestBody.parents = [folderId];

      const response = await this.drive.files.copy({
        fileId: externalId,
        requestBody,
        fields: 'id, name, webViewLink'
      });

      await this.logOperation('copyFile', { 
        originalId: externalId,
        newId: response.data.id 
      });

      return {
        id: response.data.id,
        name: response.data.name,
        url: response.data.webViewLink
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async generateShareLink(externalId, options = {}) {
    try {
      const { expirationTime, allowDownload = true } = options;

      // Create a shareable link
      await this.drive.permissions.create({
        fileId: externalId,
        requestBody: {
          type: 'anyone',
          role: 'reader',
          allowFileDiscovery: false,
          expirationTime: expirationTime
        }
      });

      // Get the shareable link
      const file = await this.drive.files.get({
        fileId: externalId,
        fields: 'webViewLink'
      });

      return file.data.webViewLink;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getQuota() {
    try {
      const response = await this.drive.about.get({
        fields: 'storageQuota'
      });

      const quota = response.data.storageQuota;
      
      return {
        used: parseInt(quota.usage || 0),
        total: parseInt(quota.limit || 0),
        remaining: parseInt(quota.limit || 0) - parseInt(quota.usage || 0),
        unlimited: !quota.limit,
        usageInDrive: parseInt(quota.usageInDrive || 0),
        usageInTrash: parseInt(quota.usageInTrash || 0)
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async search(query, options = {}) {
    try {
      const { limit = 50, mimeType, modifiedAfter } = options;
      
      let q = `fullText contains '${query}' and trashed = false`;
      if (mimeType) q += ` and mimeType = '${mimeType}'`;
      if (modifiedAfter) q += ` and modifiedTime > '${modifiedAfter}'`;

      const response = await this.drive.files.list({
        q,
        pageSize: limit,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink)'
      });

      return response.data.files.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        createdAt: file.createdTime,
        modifiedAt: file.modifiedTime,
        viewUrl: file.webViewLink,
        thumbnailUrl: file.thumbnailLink
      }));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getThumbnail(externalId, options = {}) {
    try {
      const file = await this.drive.files.get({
        fileId: externalId,
        fields: 'thumbnailLink'
      });

      return file.data.thumbnailLink;
    } catch (error) {
      // Return null if no thumbnail available
      return null;
    }
  }

  async validateConfig() {
    try {
      // Test authentication
      await this.initialize();
      
      // Test root folder access
      if (this.config.root_folder_id) {
        await this.drive.files.get({
          fileId: this.config.root_folder_id,
          fields: 'id, name'
        });
      }

      // Test create permission
      const testFolder = await this.createFolder('AXP_Test_' + Date.now());
      
      // Clean up test folder
      await this.drive.files.delete({
        fileId: testFolder.id
      });

      return {
        valid: true,
        provider: 'google_drive',
        message: 'Google Drive configuration is valid'
      };
    } catch (error) {
      return {
        valid: false,
        provider: 'google_drive',
        message: error.message,
        error: error
      };
    }
  }

  // Helper methods

  async getOrCreateFolder(metadata) {
    const { relatedPriorityId, departmentId, folderId } = metadata;
    
    if (folderId) return folderId;
    
    let parentId = this.config.root_folder_id;
    
    // Create hierarchical folder structure if configured
    if (this.config.folder_structure === 'hierarchical') {
      // Create year-quarter folder for priorities
      if (relatedPriorityId) {
        const date = new Date();
        const year = date.getFullYear();
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const quarterFolder = await this.findOrCreateFolder(
          `${year}-Q${quarter}`,
          parentId
        );
        parentId = quarterFolder.id;
      }
      
      // Create department folder
      if (departmentId) {
        const deptFolder = await this.findOrCreateFolder(
          `Department-${departmentId}`,
          parentId
        );
        parentId = deptFolder.id;
      }
    }
    
    return parentId;
  }

  async findOrCreateFolder(folderName, parentId) {
    // Check if folder exists
    const query = `name = '${folderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    
    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id, name)'
    });

    if (response.data.files.length > 0) {
      return response.data.files[0];
    }

    // Create folder if it doesn't exist
    return await this.createFolder(folderName, parentId);
  }

  async setFilePermissions(fileId, visibility, context = {}) {
    const permissions = this.mapPermissions(visibility, context);
    
    switch (visibility) {
      case 'company':
        // Share with entire domain
        if (this.config.domain) {
          await this.drive.permissions.create({
            fileId: fileId,
            requestBody: {
              type: 'domain',
              domain: this.config.domain,
              role: 'reader'
            }
          });
        }
        break;
        
      case 'department':
        // Share with specific group
        if (context.departmentEmail) {
          await this.drive.permissions.create({
            fileId: fileId,
            requestBody: {
              type: 'group',
              emailAddress: context.departmentEmail,
              role: 'reader'
            }
          });
        }
        break;
        
      case 'private':
        // Only owner has access (default)
        break;
        
      case 'public':
        // Anyone with link
        await this.drive.permissions.create({
          fileId: fileId,
          requestBody: {
            type: 'anyone',
            role: 'reader'
          }
        });
        break;
    }

    // Add specific users if provided
    if (context.specificUsers) {
      for (const email of context.specificUsers) {
        await this.drive.permissions.create({
          fileId: fileId,
          requestBody: {
            type: 'user',
            emailAddress: email,
            role: 'reader'
          }
        });
      }
    }
  }

  async saveFileMetadata(metadata) {
    // Save file metadata to database
    const query = `
      INSERT INTO documents (
        title, file_name, file_size, mime_type, 
        storage_provider, external_id, external_url, 
        external_thumbnail_url, external_parent_folder_id,
        visibility, organization_id, department_id, 
        uploaded_by, related_priority_id, folder_id,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
        $11, $12, $13, $14, $15, NOW(), NOW()
      ) RETURNING id
    `;

    const values = [
      metadata.title || metadata.file_name,
      metadata.file_name,
      metadata.file_size,
      metadata.mime_type,
      'google_drive',
      metadata.external_id,
      metadata.external_url,
      metadata.external_thumbnail_url,
      metadata.external_parent_folder_id,
      metadata.visibility || 'company',
      metadata.organizationId,
      metadata.departmentId || null,
      metadata.uploadedBy,
      metadata.relatedPriorityId || null,
      metadata.folderId || null
    ];

    const result = await db.query(query, values);
    return result.rows[0].id;
  }

  handleError(error) {
    const standardError = super.handleError(error);
    
    // Handle Google Drive specific errors
    if (error.code === 404) {
      standardError.message = 'File not found in Google Drive';
      standardError.code = 'FILE_NOT_FOUND';
    } else if (error.code === 403) {
      standardError.message = 'Permission denied. Check Google Drive permissions.';
      standardError.code = 'PERMISSION_DENIED';
    } else if (error.code === 401) {
      standardError.message = 'Google Drive authentication failed. Check service account credentials.';
      standardError.code = 'AUTH_FAILED';
    }
    
    return standardError;
  }
}