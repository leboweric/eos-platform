/**
 * Internal Storage Adapter
 * Stores files in PostgreSQL database (current implementation)
 */

import { StorageAdapter } from './StorageAdapter.js';
import { query } from '../../config/database.js';
import crypto from 'crypto';

export class InternalStorageAdapter extends StorageAdapter {
  constructor(config = {}) {
    super(config);
    this.provider = 'internal';
  }

  async initialize() {
    // Check database connection
    try {
      await query('SELECT 1');
      return true;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async upload(file, metadata = {}) {
    try {
      const {
        organizationId,
        departmentId,
        uploadedBy,
        relatedPriorityId,
        folderId,
        visibility = 'company',
        title,
        description
      } = metadata;

      // Generate a unique internal ID
      const internalId = crypto.randomUUID();

      // Store file in database
      const query = `
        INSERT INTO documents (
          id, title, description, file_name, file_data, file_size, 
          mime_type, visibility, organization_id, department_id, 
          uploaded_by, related_priority_id, folder_id, storage_provider,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
        ) RETURNING *
      `;

      const values = [
        internalId,
        title || file.originalname,
        description || null,
        file.originalname,
        file.buffer,
        file.size,
        file.mimetype,
        visibility,
        organizationId,
        departmentId || null,
        uploadedBy,
        relatedPriorityId || null,
        folderId || null,
        'internal'
      ];

      const result = await query(query, values);
      const document = result.rows[0];

      await this.logOperation('upload', { 
        documentId: document.id, 
        fileName: file.originalname,
        size: file.size 
      });

      return {
        id: document.id,
        external_id: document.id, // For internal storage, external_id is same as id
        external_url: `/api/v1/documents/${document.id}/download`,
        storage_provider: 'internal',
        file_name: document.file_name,
        file_size: document.file_size,
        mime_type: document.mime_type
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async download(externalId) {
    try {
      const query = 'SELECT file_data, file_name, mime_type FROM documents WHERE id = $1';
      const result = await query(query, [externalId]);

      if (result.rows.length === 0) {
        const error = new Error('File not found');
        error.code = 'NOT_FOUND';
        throw error;
      }

      const document = result.rows[0];
      
      await this.logOperation('download', { 
        documentId: externalId,
        fileName: document.file_name 
      });

      return {
        buffer: document.file_data,
        fileName: document.file_name,
        mimeType: document.mime_type
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async delete(externalId) {
    try {
      const query = 'DELETE FROM documents WHERE id = $1 RETURNING file_name';
      const result = await query(query, [externalId]);

      if (result.rows.length === 0) {
        const error = new Error('File not found');
        error.code = 'NOT_FOUND';
        throw error;
      }

      await this.logOperation('delete', { 
        documentId: externalId,
        fileName: result.rows[0].file_name 
      });

      return true;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMetadata(externalId) {
    try {
      const query = `
        SELECT id, title, description, file_name, file_size, mime_type, 
               visibility, created_at, updated_at, uploaded_by
        FROM documents 
        WHERE id = $1
      `;
      const result = await query(query, [externalId]);

      if (result.rows.length === 0) {
        const error = new Error('File not found');
        error.code = 'NOT_FOUND';
        throw error;
      }

      return result.rows[0];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updatePermissions(externalId, permissions) {
    try {
      const { visibility } = permissions;
      
      const query = `
        UPDATE documents 
        SET visibility = $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING visibility
      `;
      const result = await query(query, [visibility, externalId]);

      if (result.rows.length === 0) {
        const error = new Error('File not found');
        error.code = 'NOT_FOUND';
        throw error;
      }

      await this.logOperation('updatePermissions', { 
        documentId: externalId,
        visibility 
      });

      return { visibility: result.rows[0].visibility };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createFolder(folderName, parentFolderId = null) {
    try {
      const query = `
        INSERT INTO document_folders (name, parent_folder_id, created_at)
        VALUES ($1, $2, NOW())
        RETURNING *
      `;
      const result = await query(query, [folderName, parentFolderId]);
      
      await this.logOperation('createFolder', { 
        folderId: result.rows[0].id,
        folderName 
      });

      return result.rows[0];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async listFiles(folderId, options = {}) {
    try {
      const { limit = 100, offset = 0 } = options;
      
      const query = `
        SELECT id, title, file_name, file_size, mime_type, created_at
        FROM documents
        WHERE folder_id = $1 OR ($1 IS NULL AND folder_id IS NULL)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await query(query, [folderId, limit, offset]);
      
      return result.rows;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async moveFile(externalId, newFolderId) {
    try {
      const query = `
        UPDATE documents 
        SET folder_id = $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING file_name, folder_id
      `;
      const result = await query(query, [newFolderId, externalId]);

      if (result.rows.length === 0) {
        const error = new Error('File not found');
        error.code = 'NOT_FOUND';
        throw error;
      }

      await this.logOperation('moveFile', { 
        documentId: externalId,
        newFolderId 
      });

      return result.rows[0];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async copyFile(externalId, options = {}) {
    try {
      // Get original file
      const selectQuery = `
        SELECT * FROM documents WHERE id = $1
      `;
      const selectResult = await db.query(selectQuery, [externalId]);

      if (selectResult.rows.length === 0) {
        const error = new Error('File not found');
        error.code = 'NOT_FOUND';
        throw error;
      }

      const original = selectResult.rows[0];
      const newId = crypto.randomUUID();
      const newName = options.newName || `Copy of ${original.file_name}`;

      // Create copy
      const insertQuery = `
        INSERT INTO documents (
          id, title, description, file_name, file_data, file_size, 
          mime_type, visibility, organization_id, department_id, 
          uploaded_by, related_priority_id, folder_id, storage_provider,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
        ) RETURNING id, file_name
      `;

      const insertValues = [
        newId,
        `Copy of ${original.title}`,
        original.description,
        newName,
        original.file_data,
        original.file_size,
        original.mime_type,
        original.visibility,
        original.organization_id,
        original.department_id,
        original.uploaded_by,
        original.related_priority_id,
        options.folderId || original.folder_id,
        'internal'
      ];

      const insertResult = await db.query(insertQuery, insertValues);
      
      await this.logOperation('copyFile', { 
        originalId: externalId,
        newId: insertResult.rows[0].id 
      });

      return insertResult.rows[0];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async generateShareLink(externalId, options = {}) {
    // For internal storage, generate a secure download link
    // In production, this would include authentication tokens
    const baseUrl = process.env.API_URL || 'https://api.axplatform.app';
    return `${baseUrl}/api/v1/documents/${externalId}/download`;
  }

  async getQuota() {
    try {
      // Calculate total storage used by organization
      const query = `
        SELECT 
          COUNT(*) as file_count,
          COALESCE(SUM(file_size), 0) as total_size
        FROM documents
        WHERE organization_id = $1
      `;
      
      const result = await query(query, [this.config.organizationId]);
      const { file_count, total_size } = result.rows[0];
      
      // Internal storage has no hard limit, but we can set soft limits
      const totalQuota = 10 * 1024 * 1024 * 1024; // 10GB default
      
      return {
        used: parseInt(total_size),
        total: totalQuota,
        remaining: totalQuota - parseInt(total_size),
        fileCount: parseInt(file_count),
        unlimited: true // Can be configured per organization
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async search(query, options = {}) {
    try {
      const { limit = 50 } = options;
      
      const searchQuery = `
        SELECT id, title, file_name, file_size, mime_type, created_at
        FROM documents
        WHERE organization_id = $1
          AND (title ILIKE $2 OR file_name ILIKE $2 OR description ILIKE $2)
        ORDER BY created_at DESC
        LIMIT $3
      `;
      
      const searchPattern = `%${query}%`;
      const result = await query(searchQuery, [
        this.config.organizationId,
        searchPattern,
        limit
      ]);
      
      return result.rows;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getThumbnail(externalId, options = {}) {
    // For internal storage, we could generate thumbnails on-the-fly
    // or return a placeholder based on file type
    const query = 'SELECT mime_type FROM documents WHERE id = $1';
    const result = await db.query(query, [externalId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    // Return placeholder thumbnail URL based on mime type
    const mimeType = result.rows[0].mime_type;
    if (mimeType.startsWith('image/')) {
      return `/api/v1/documents/${externalId}/thumbnail`;
    }
    
    // Return generic icon for non-image files
    return `/assets/file-icons/${this.getFileIcon(mimeType)}`;
  }

  async validateConfig() {
    try {
      // Validate database connection
      await query('SELECT 1');
      
      // Check if documents table exists
      const tableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'documents'
        )
      `);
      
      if (!tableCheck.rows[0].exists) {
        throw new Error('Documents table does not exist');
      }
      
      return {
        valid: true,
        provider: 'internal',
        message: 'Internal storage is properly configured'
      };
    } catch (error) {
      return {
        valid: false,
        provider: 'internal',
        message: error.message,
        error: error
      };
    }
  }

  // Helper method to get file icon based on mime type
  getFileIcon(mimeType) {
    if (mimeType.includes('pdf')) return 'pdf.svg';
    if (mimeType.includes('word')) return 'word.svg';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'excel.svg';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'powerpoint.svg';
    if (mimeType.startsWith('image/')) return 'image.svg';
    if (mimeType.startsWith('video/')) return 'video.svg';
    if (mimeType.startsWith('audio/')) return 'audio.svg';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive.svg';
    return 'file.svg';
  }
}