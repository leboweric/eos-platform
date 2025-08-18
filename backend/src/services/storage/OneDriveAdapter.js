/**
 * OneDrive/SharePoint Storage Adapter
 * Stores files in organization's Microsoft 365 storage
 */

import { StorageAdapter } from './StorageAdapter.js';
import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication } from '@azure/msal-node';
import 'isomorphic-fetch';
import stream from 'stream';
import { query as dbQuery } from '../../config/database.js';

export class OneDriveAdapter extends StorageAdapter {
  constructor(config = {}) {
    super(config);
    this.provider = config.provider || 'onedrive'; // Can be 'onedrive' or 'sharepoint'
    this.graphClient = null;
    this.msalClient = null;
    this.accessToken = null;
  }

  async initialize() {
    try {
      // Configure MSAL for app-only authentication
      const msalConfig = {
        auth: {
          clientId: this.config.client_id,
          authority: `https://login.microsoftonline.com/${this.config.tenant_id}`,
          clientSecret: this.config.client_secret
        }
      };

      this.msalClient = new ConfidentialClientApplication(msalConfig);

      // Get access token
      const tokenResponse = await this.msalClient.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default']
      });

      this.accessToken = tokenResponse.accessToken;

      // Initialize Graph client
      this.graphClient = Client.init({
        authProvider: (done) => {
          done(null, this.accessToken);
        }
      });

      // Test the connection
      await this.graphClient.api('/me/drive').get().catch(() => {
        // For app-only auth, /me won't work, try sites or drives
        return this.graphClient.api(`/drives/${this.config.drive_id}`).get();
      });

      await this.logOperation('initialize', { 
        provider: this.provider,
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

      // Determine upload path
      const folderPath = await this.getOrCreateFolder(metadata);
      const fileName = title || file.originalname;
      
      let uploadUrl;
      if (this.provider === 'sharepoint' && this.config.site_id) {
        uploadUrl = `/sites/${this.config.site_id}/drive/root:${folderPath}/${fileName}:/content`;
      } else {
        uploadUrl = `/drives/${this.config.drive_id}/root:${folderPath}/${fileName}:/content`;
      }

      // Upload file to OneDrive/SharePoint
      const uploadResponse = await this.graphClient
        .api(uploadUrl)
        .put(file.buffer);

      const uploadedFile = uploadResponse;

      // Set permissions based on visibility
      await this.setFilePermissions(uploadedFile.id, visibility, metadata);

      // Get the web URL
      const fileDetailsUrl = this.provider === 'sharepoint' && this.config.site_id
        ? `/sites/${this.config.site_id}/drive/items/${uploadedFile.id}`
        : `/drives/${this.config.drive_id}/items/${uploadedFile.id}`;

      const fileDetails = await this.graphClient
        .api(fileDetailsUrl)
        .select('id,name,size,webUrl,@microsoft.graph.downloadUrl,thumbnails')
        .expand('thumbnails')
        .get();

      // Store metadata in database
      await this.saveFileMetadata({
        ...metadata,
        external_id: fileDetails.id,
        external_url: fileDetails.webUrl,
        external_thumbnail_url: fileDetails.thumbnails?.[0]?.large?.url,
        external_parent_folder_id: folderPath,
        file_name: file.originalname,
        file_size: file.size || fileDetails.size,
        mime_type: file.mimetype || mimeType
      });

      await this.logOperation('upload', { 
        fileId: fileDetails.id,
        fileName: file.originalname,
        size: file.size 
      });

      return {
        id: fileDetails.id,
        external_id: fileDetails.id,
        external_url: fileDetails.webUrl,
        download_url: fileDetails['@microsoft.graph.downloadUrl'],
        thumbnail_url: fileDetails.thumbnails?.[0]?.large?.url,
        storage_provider: this.provider,
        file_name: file.originalname,
        file_size: file.size || fileDetails.size,
        mime_type: file.mimetype
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async download(externalId) {
    try {
      // Get file metadata and download URL
      const fileUrl = this.provider === 'sharepoint' && this.config.site_id
        ? `/sites/${this.config.site_id}/drive/items/${externalId}`
        : `/drives/${this.config.drive_id}/items/${externalId}`;

      const fileDetails = await this.graphClient
        .api(fileUrl)
        .select('name,@microsoft.graph.downloadUrl,file')
        .get();

      // Download file content
      const response = await fetch(fileDetails['@microsoft.graph.downloadUrl']);
      const buffer = await response.arrayBuffer();

      await this.logOperation('download', { 
        fileId: externalId,
        fileName: fileDetails.name 
      });

      return {
        buffer: Buffer.from(buffer),
        fileName: fileDetails.name,
        mimeType: fileDetails.file?.mimeType || 'application/octet-stream'
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async delete(externalId) {
    try {
      const deleteUrl = this.provider === 'sharepoint' && this.config.site_id
        ? `/sites/${this.config.site_id}/drive/items/${externalId}`
        : `/drives/${this.config.drive_id}/items/${externalId}`;

      await this.graphClient
        .api(deleteUrl)
        .delete();

      await this.logOperation('delete', { fileId: externalId });
      return true;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMetadata(externalId) {
    try {
      const fileUrl = this.provider === 'sharepoint' && this.config.site_id
        ? `/sites/${this.config.site_id}/drive/items/${externalId}`
        : `/drives/${this.config.drive_id}/items/${externalId}`;

      const fileDetails = await this.graphClient
        .api(fileUrl)
        .select('id,name,description,size,file,createdDateTime,lastModifiedDateTime,webUrl,@microsoft.graph.downloadUrl,thumbnails,permissions')
        .expand('thumbnails,permissions')
        .get();

      return {
        id: fileDetails.id,
        name: fileDetails.name,
        description: fileDetails.description,
        size: fileDetails.size,
        mimeType: fileDetails.file?.mimeType,
        createdAt: fileDetails.createdDateTime,
        modifiedAt: fileDetails.lastModifiedDateTime,
        viewUrl: fileDetails.webUrl,
        downloadUrl: fileDetails['@microsoft.graph.downloadUrl'],
        thumbnailUrl: fileDetails.thumbnails?.[0]?.large?.url,
        permissions: fileDetails.permissions
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updatePermissions(externalId, permissions) {
    try {
      const { visibility, specificUsers = [], specificGroups = [] } = permissions;

      // Get existing permissions
      const permissionsUrl = this.provider === 'sharepoint' && this.config.site_id
        ? `/sites/${this.config.site_id}/drive/items/${externalId}/permissions`
        : `/drives/${this.config.drive_id}/items/${externalId}/permissions`;

      const existingPermissions = await this.graphClient
        .api(permissionsUrl)
        .get();

      // Remove existing sharing permissions (keep inherited)
      for (const permission of existingPermissions.value) {
        if (!permission.inheritedFrom) {
          await this.graphClient
            .api(`${permissionsUrl}/${permission.id}`)
            .delete()
            .catch(() => {}); // Ignore errors for system permissions
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
      const parentPath = parentFolderId || this.config.root_folder_path || '/';
      
      const createFolderUrl = this.provider === 'sharepoint' && this.config.site_id
        ? `/sites/${this.config.site_id}/drive/root:${parentPath}:/children`
        : `/drives/${this.config.drive_id}/root:${parentPath}:/children`;

      const driveItem = {
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      };

      const folder = await this.graphClient
        .api(createFolderUrl)
        .post(driveItem);

      await this.logOperation('createFolder', { 
        folderId: folder.id,
        folderName 
      });

      return {
        id: folder.id,
        name: folder.name,
        url: folder.webUrl
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async listFiles(folderId, options = {}) {
    try {
      const { limit = 100, skipToken } = options;
      
      let listUrl;
      if (folderId) {
        listUrl = this.provider === 'sharepoint' && this.config.site_id
          ? `/sites/${this.config.site_id}/drive/items/${folderId}/children`
          : `/drives/${this.config.drive_id}/items/${folderId}/children`;
      } else {
        const rootPath = this.config.root_folder_path || '/';
        listUrl = this.provider === 'sharepoint' && this.config.site_id
          ? `/sites/${this.config.site_id}/drive/root:${rootPath}:/children`
          : `/drives/${this.config.drive_id}/root:${rootPath}:/children`;
      }

      let request = this.graphClient
        .api(listUrl)
        .top(limit)
        .select('id,name,size,file,createdDateTime,lastModifiedDateTime,webUrl,thumbnails')
        .expand('thumbnails');

      if (skipToken) {
        request = request.skipToken(skipToken);
      }

      const response = await request.get();

      return {
        files: response.value.map(file => ({
          id: file.id,
          name: file.name,
          mimeType: file.file?.mimeType,
          size: file.size,
          createdAt: file.createdDateTime,
          modifiedAt: file.lastModifiedDateTime,
          viewUrl: file.webUrl,
          thumbnailUrl: file.thumbnails?.[0]?.large?.url,
          isFolder: !!file.folder
        })),
        nextPageToken: response['@odata.nextLink']?.split('skiptoken=')[1]
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async moveFile(externalId, newFolderId) {
    try {
      const moveUrl = this.provider === 'sharepoint' && this.config.site_id
        ? `/sites/${this.config.site_id}/drive/items/${externalId}`
        : `/drives/${this.config.drive_id}/items/${externalId}`;

      const patchBody = {
        parentReference: {
          id: newFolderId
        }
      };

      const response = await this.graphClient
        .api(moveUrl)
        .patch(patchBody);

      await this.logOperation('moveFile', { 
        fileId: externalId,
        newFolderId 
      });

      return {
        id: response.id,
        parentId: response.parentReference?.id
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async copyFile(externalId, options = {}) {
    try {
      const { newName, folderId } = options;

      const copyUrl = this.provider === 'sharepoint' && this.config.site_id
        ? `/sites/${this.config.site_id}/drive/items/${externalId}/copy`
        : `/drives/${this.config.drive_id}/items/${externalId}/copy`;

      const copyBody = {};
      if (newName) copyBody.name = newName;
      if (folderId) {
        copyBody.parentReference = {
          id: folderId
        };
      }

      // Copy operation is async in Graph API
      const response = await this.graphClient
        .api(copyUrl)
        .post(copyBody);

      // Poll for completion (simplified - in production, use proper async handling)
      await new Promise(resolve => setTimeout(resolve, 2000));

      await this.logOperation('copyFile', { 
        originalId: externalId,
        newName 
      });

      return {
        operationUrl: response.headers.location,
        message: 'Copy operation initiated'
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async generateShareLink(externalId, options = {}) {
    try {
      const { type = 'view', expirationDateTime, password, scope = 'anonymous' } = options;

      const createLinkUrl = this.provider === 'sharepoint' && this.config.site_id
        ? `/sites/${this.config.site_id}/drive/items/${externalId}/createLink`
        : `/drives/${this.config.drive_id}/items/${externalId}/createLink`;

      const linkBody = {
        type: type, // 'view', 'edit', 'embed'
        scope: scope, // 'anonymous', 'organization'
      };

      if (expirationDateTime) linkBody.expirationDateTime = expirationDateTime;
      if (password) linkBody.password = password;

      const response = await this.graphClient
        .api(createLinkUrl)
        .post(linkBody);

      return response.link.webUrl;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getQuota() {
    try {
      const driveUrl = this.provider === 'sharepoint' && this.config.site_id
        ? `/sites/${this.config.site_id}/drive`
        : `/drives/${this.config.drive_id}`;

      const drive = await this.graphClient
        .api(driveUrl)
        .select('quota')
        .get();

      const quota = drive.quota;
      
      return {
        used: quota.used || 0,
        total: quota.total || 0,
        remaining: quota.remaining || 0,
        deleted: quota.deleted || 0,
        state: quota.state, // 'normal', 'nearing', 'critical', 'exceeded'
        unlimited: quota.total === null
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async search(query, options = {}) {
    try {
      const { limit = 50, fileType } = options;
      
      let searchUrl = `/search/query`;
      
      const searchBody = {
        requests: [{
          entityTypes: ['driveItem'],
          query: {
            queryString: query
          },
          from: 0,
          size: limit
        }]
      };

      // Add file type filter if specified
      if (fileType) {
        searchBody.requests[0].query.queryString += ` filetype:${fileType}`;
      }

      const response = await this.graphClient
        .api(searchUrl)
        .post(searchBody);

      const hits = response.value[0]?.hitsContainers[0]?.hits || [];

      return hits.map(hit => ({
        id: hit.resource.id,
        name: hit.resource.name,
        mimeType: hit.resource.file?.mimeType,
        size: hit.resource.size,
        createdAt: hit.resource.createdDateTime,
        modifiedAt: hit.resource.lastModifiedDateTime,
        viewUrl: hit.resource.webUrl,
        summary: hit.summary
      }));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getThumbnail(externalId, options = {}) {
    try {
      const { size = 'large' } = options; // 'small', 'medium', 'large'

      const thumbnailUrl = this.provider === 'sharepoint' && this.config.site_id
        ? `/sites/${this.config.site_id}/drive/items/${externalId}/thumbnails/0/${size}`
        : `/drives/${this.config.drive_id}/items/${externalId}/thumbnails/0/${size}`;

      const thumbnail = await this.graphClient
        .api(thumbnailUrl)
        .get();

      return thumbnail.url;
    } catch (error) {
      // Return null if no thumbnail available
      return null;
    }
  }

  async validateConfig() {
    try {
      // Test authentication
      await this.initialize();
      
      // Test drive access
      const driveUrl = this.provider === 'sharepoint' && this.config.site_id
        ? `/sites/${this.config.site_id}/drive`
        : `/drives/${this.config.drive_id}`;

      await this.graphClient.api(driveUrl).get();

      // Test create permission
      const testFolder = await this.createFolder('AXP_Test_' + Date.now());
      
      // Clean up test folder
      await this.delete(testFolder.id);

      return {
        valid: true,
        provider: this.provider,
        message: `${this.provider === 'sharepoint' ? 'SharePoint' : 'OneDrive'} configuration is valid`
      };
    } catch (error) {
      return {
        valid: false,
        provider: this.provider,
        message: error.message,
        error: error
      };
    }
  }

  // Helper methods

  async getOrCreateFolder(metadata) {
    const { relatedPriorityId, departmentId } = metadata;
    
    let folderPath = this.config.root_folder_path || '/AXP Platform';
    
    // Create hierarchical folder structure if configured
    if (this.config.folder_structure === 'hierarchical') {
      // Add year-quarter folder for priorities
      if (relatedPriorityId) {
        const date = new Date();
        const year = date.getFullYear();
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        folderPath += `/${year}-Q${quarter}`;
        await this.ensureFolderExists(folderPath);
      }
      
      // Add department folder
      if (departmentId) {
        folderPath += `/Department-${departmentId}`;
        await this.ensureFolderExists(folderPath);
      }
    }
    
    return folderPath;
  }

  async ensureFolderExists(folderPath) {
    // Split path and create folders recursively
    const parts = folderPath.split('/').filter(p => p);
    let currentPath = '';
    
    for (const part of parts) {
      currentPath += `/${part}`;
      
      try {
        // Check if folder exists
        const checkUrl = this.provider === 'sharepoint' && this.config.site_id
          ? `/sites/${this.config.site_id}/drive/root:${currentPath}`
          : `/drives/${this.config.drive_id}/root:${currentPath}`;

        await this.graphClient.api(checkUrl).get();
      } catch (error) {
        if (error.statusCode === 404) {
          // Folder doesn't exist, create it
          const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
          await this.createFolder(part, parentPath);
        }
      }
    }
  }

  async setFilePermissions(fileId, visibility, context = {}) {
    const inviteUrl = this.provider === 'sharepoint' && this.config.site_id
      ? `/sites/${this.config.site_id}/drive/items/${fileId}/invite`
      : `/drives/${this.config.drive_id}/items/${fileId}/invite`;

    switch (visibility) {
      case 'company':
        // Share with entire organization
        try {
          await this.graphClient
            .api(inviteUrl)
            .post({
              requireSignIn: true,
              sendInvitation: false,
              roles: ['read'],
              recipients: [{
                email: 'everyone@' + this.config.domain
              }]
            });
        } catch (error) {
          // Fallback to creating org-wide link
          await this.generateShareLink(fileId, { scope: 'organization' });
        }
        break;
        
      case 'department':
        // Share with specific group
        if (context.departmentEmail || context.departmentGroupId) {
          await this.graphClient
            .api(inviteUrl)
            .post({
              requireSignIn: true,
              sendInvitation: false,
              roles: ['read'],
              recipients: [{
                email: context.departmentEmail,
                objectId: context.departmentGroupId
              }]
            });
        }
        break;
        
      case 'private':
        // Only owner has access (default)
        break;
        
      case 'public':
        // Anyone with link
        await this.generateShareLink(fileId, { scope: 'anonymous' });
        break;
    }

    // Add specific users if provided
    if (context.specificUsers && context.specificUsers.length > 0) {
      await this.graphClient
        .api(inviteUrl)
        .post({
          requireSignIn: true,
          sendInvitation: true,
          roles: ['read'],
          recipients: context.specificUsers.map(email => ({ email }))
        });
    }
  }

  async saveFileMetadata(metadata) {
    // Save file metadata to database
    const sql = `
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
      this.provider,
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

    const result = await dbQuery(sql, values);
    return result.rows[0].id;
  }

  handleError(error) {
    const standardError = super.handleError(error);
    
    // Handle Microsoft Graph specific errors
    if (error.statusCode === 404) {
      standardError.message = `File not found in ${this.provider === 'sharepoint' ? 'SharePoint' : 'OneDrive'}`;
      standardError.code = 'FILE_NOT_FOUND';
    } else if (error.statusCode === 403) {
      standardError.message = `Permission denied. Check ${this.provider === 'sharepoint' ? 'SharePoint' : 'OneDrive'} permissions.`;
      standardError.code = 'PERMISSION_DENIED';
    } else if (error.statusCode === 401) {
      standardError.message = `${this.provider === 'sharepoint' ? 'SharePoint' : 'OneDrive'} authentication failed. Check app registration and permissions.`;
      standardError.code = 'AUTH_FAILED';
    } else if (error.statusCode === 507) {
      standardError.message = 'Storage quota exceeded';
      standardError.code = 'QUOTA_EXCEEDED';
    }
    
    return standardError;
  }
}