/**
 * Documents Controller V2
 * Updated to support cloud storage providers (Google Drive, OneDrive, etc.)
 */

import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import { storageFactory } from '../services/storage/StorageFactory.js';

// Get all documents for an organization
export const getDocuments = async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user.id;
    const { department, search, favorites, folderId } = req.query;
    
    // Build query with filters - now includes cloud storage fields
    let queryText = `
      SELECT 
        d.id, d.title, d.description, d.file_name, d.file_size,
        d.mime_type, d.visibility, d.organization_id, d.department_id,
        d.uploaded_by, d.related_priority_id, d.created_at, d.updated_at, d.folder_id,
        d.storage_provider, d.external_id, d.external_url, d.external_thumbnail_url,
        u.first_name || ' ' || u.last_name as uploader_name,
        t.name as department_name,
        f.name as folder_name,
        CASE WHEN df.user_id IS NOT NULL THEN true ELSE false END as is_favorite,
        COUNT(DISTINCT dt.id) as tag_count,
        ARRAY_AGG(DISTINCT dt.tag_name) FILTER (WHERE dt.tag_name IS NOT NULL) as tags
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      LEFT JOIN teams t ON d.department_id = t.id
      LEFT JOIN document_folders f ON d.folder_id = f.id
      LEFT JOIN document_favorites df ON d.id = df.document_id AND df.user_id = $2
      LEFT JOIN document_tags dt ON d.id = dt.document_id
      WHERE d.organization_id = $1
    `;
    
    const params = [orgId, userId];
    let paramIndex = 3;
    
    // Add visibility filter
    queryText += ` AND (
      d.visibility = 'company' 
      OR (d.visibility = 'department' AND d.department_id IN (
        SELECT team_id FROM team_members WHERE user_id = $2
      ))
      OR (d.visibility = 'private' AND d.uploaded_by = $2)
    )`;
    
    // Add department filter
    if (department) {
      queryText += ` AND d.department_id = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }
    
    // Add search filter
    if (search) {
      queryText += ` AND (
        d.title ILIKE $${paramIndex} 
        OR d.description ILIKE $${paramIndex}
        OR EXISTS (
          SELECT 1 FROM document_tags dt2 
          WHERE dt2.document_id = d.id 
          AND dt2.tag_name ILIKE $${paramIndex}
        )
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Add favorites filter
    if (favorites === 'true') {
      queryText += ` AND df.user_id IS NOT NULL`;
    }
    
    // Add folder filter
    if (folderId) {
      if (folderId === 'null' || folderId === 'root') {
        queryText += ` AND d.folder_id IS NULL`;
      } else {
        queryText += ` AND d.folder_id = $${paramIndex}`;
        params.push(folderId);
        paramIndex++;
      }
    }
    
    queryText += ` GROUP BY d.id, u.first_name, u.last_name, t.name, f.name, df.user_id
                   ORDER BY d.created_at DESC`;
    
    const result = await query(queryText, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents'
    });
  }
};

// Upload a new document
export const uploadDocument = async (req, res) => {
  let tempFilePath = null;
  
  try {
    const { orgId } = req.params;
    const userId = req.user.id;
    const file = req.file;
    const { title, description, departmentId, visibility, relatedPriorityId, folderId } = req.body;
    
    // Parse tags from JSON string if provided
    let tags = [];
    if (req.body.tags) {
      try {
        tags = JSON.parse(req.body.tags);
      } catch (e) {
        console.error('Failed to parse tags:', e);
      }
    }
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }
    
    tempFilePath = file.path;
    
    // Get storage adapter for the organization
    const storageAdapter = await storageFactory.getAdapter(orgId);
    
    // Prepare file object for upload
    const fileBuffer = await fs.readFile(file.path);
    const fileObject = {
      buffer: fileBuffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    };
    
    // Prepare metadata
    const metadata = {
      organizationId: orgId,
      departmentId,
      uploadedBy: userId,
      relatedPriorityId,
      folderId,
      visibility: visibility || 'company',
      title,
      description
    };
    
    // Upload to storage provider
    const uploadResult = await storageAdapter.upload(fileObject, metadata);
    
    // If using external storage, we don't need to store file data in PostgreSQL
    const documentId = uuidv4();
    
    if (uploadResult.storage_provider === 'internal') {
      // Internal storage already handled the database insert
      // Just add tags if provided
      if (tags && Array.isArray(tags)) {
        for (const tag of tags) {
          if (tag.trim()) {
            await query(
              `INSERT INTO document_tags (document_id, tag_name) VALUES ($1, $2)`,
              [uploadResult.id, tag.trim()]
            );
          }
        }
      }
    } else {
      // External storage - save metadata to database
      const documentResult = await query(
        `INSERT INTO documents 
         (id, title, description, file_name, file_size, mime_type, visibility, 
          organization_id, department_id, uploaded_by, related_priority_id, folder_id,
          storage_provider, external_id, external_url, external_thumbnail_url, external_parent_folder_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING *`,
        [
          documentId,
          title,
          description,
          file.originalname,
          file.size,
          file.mimetype,
          visibility || 'company',
          orgId,
          departmentId || null,
          userId,
          relatedPriorityId || null,
          folderId || null,
          uploadResult.storage_provider,
          uploadResult.external_id,
          uploadResult.external_url,
          uploadResult.thumbnail_url,
          uploadResult.external_parent_folder_id || null
        ]
      );
      
      // Add tags if provided
      if (tags && Array.isArray(tags)) {
        for (const tag of tags) {
          if (tag.trim()) {
            await query(
              `INSERT INTO document_tags (document_id, tag_name) VALUES ($1, $2)`,
              [documentId, tag.trim()]
            );
          }
        }
      }
    }
    
    // Clean up temporary file
    await fs.unlink(file.path);
    tempFilePath = null;
    
    // Get the complete document with tags
    const completeDocument = await query(
      `SELECT 
        d.id, d.title, d.description, d.file_name, d.file_size,
        d.mime_type, d.visibility, d.organization_id, d.department_id,
        d.uploaded_by, d.related_priority_id, d.created_at, d.updated_at, d.folder_id,
        d.storage_provider, d.external_id, d.external_url, d.external_thumbnail_url,
        u.first_name || ' ' || u.last_name as uploader_name,
        t.name as department_name,
        f.name as folder_name,
        ARRAY_AGG(dt.tag_name) FILTER (WHERE dt.tag_name IS NOT NULL) as tags
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       LEFT JOIN teams t ON d.department_id = t.id
       LEFT JOIN document_folders f ON d.folder_id = f.id
       LEFT JOIN document_tags dt ON d.id = dt.document_id
       WHERE d.id = $1
       GROUP BY d.id, d.created_at, d.updated_at, u.first_name, u.last_name, t.name, f.name`,
      [uploadResult.storage_provider === 'internal' ? uploadResult.id : documentId]
    );
    
    res.json({
      success: true,
      data: completeDocument.rows[0]
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    
    // Clean up uploaded file if something failed
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload document'
    });
  }
};

// Download a document
export const downloadDocument = async (req, res) => {
  try {
    const { orgId, documentId } = req.params;
    const userId = req.user.id;
    
    // Get document details and check access
    const result = await query(
      `SELECT d.*, 
        CASE 
          WHEN d.visibility = 'company' THEN true
          WHEN d.visibility = 'department' AND EXISTS (
            SELECT 1 FROM team_members tm 
            WHERE tm.user_id = $3 AND tm.team_id = d.department_id
          ) THEN true
          WHEN d.visibility = 'private' AND d.uploaded_by = $3 THEN true
          ELSE false
        END as has_access
       FROM documents d
       WHERE d.id = $1 AND d.organization_id = $2`,
      [documentId, orgId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    const document = result.rows[0];
    
    if (!document.has_access) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Get storage adapter for the organization
    const storageAdapter = await storageFactory.getAdapter(orgId);
    
    // Download file based on storage provider
    if (document.storage_provider === 'internal' || !document.external_id) {
      // Internal storage - file data is in PostgreSQL
      if (!document.file_data) {
        return res.status(404).json({
          success: false,
          error: 'File data not found'
        });
      }
      
      res.setHeader('Content-Type', document.mime_type);
      res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);
      res.send(document.file_data);
    } else {
      // External storage - download from provider
      const fileData = await storageAdapter.download(document.external_id);
      
      res.setHeader('Content-Type', fileData.mimeType || document.mime_type);
      res.setHeader('Content-Disposition', `attachment; filename="${fileData.fileName || document.file_name}"`);
      res.send(fileData.buffer);
    }
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download document'
    });
  }
};

// Update document metadata
export const updateDocument = async (req, res) => {
  try {
    const { orgId, documentId } = req.params;
    const userId = req.user.id;
    const { title, description, visibility, departmentId, tags } = req.body;
    
    // Check if user has permission to update
    const checkResult = await query(
      `SELECT * FROM documents 
       WHERE id = $1 AND organization_id = $2 
       AND (uploaded_by = $3 OR EXISTS (
         SELECT 1 FROM users WHERE id = $3 AND role = 'admin' AND organization_id = $2
       ))`,
      [documentId, orgId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }
    
    const document = checkResult.rows[0];
    
    // Update document metadata
    const updateResult = await query(
      `UPDATE documents 
       SET title = $1, description = $2, visibility = $3, department_id = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [title, description, visibility, departmentId, documentId]
    );
    
    // Update permissions in cloud storage if using external storage
    if (document.storage_provider !== 'internal' && document.external_id) {
      const storageAdapter = await storageFactory.getAdapter(orgId);
      await storageAdapter.updatePermissions(document.external_id, { visibility });
    }
    
    // Update tags
    if (tags !== undefined) {
      // Delete existing tags
      await query('DELETE FROM document_tags WHERE document_id = $1', [documentId]);
      
      // Insert new tags
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          if (tag.trim()) {
            await query(
              'INSERT INTO document_tags (document_id, tag_name) VALUES ($1, $2)',
              [documentId, tag.trim()]
            );
          }
        }
      }
    }
    
    // Get updated document with tags
    const completeDocument = await query(
      `SELECT 
        d.*, 
        u.first_name || ' ' || u.last_name as uploader_name,
        t.name as department_name,
        ARRAY_AGG(dt.tag_name) FILTER (WHERE dt.tag_name IS NOT NULL) as tags
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       LEFT JOIN teams t ON d.department_id = t.id
       LEFT JOIN document_tags dt ON d.id = dt.document_id
       WHERE d.id = $1
       GROUP BY d.id, d.created_at, d.updated_at, u.first_name, u.last_name, t.name`,
      [documentId]
    );
    
    res.json({
      success: true,
      data: completeDocument.rows[0]
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update document'
    });
  }
};

// Delete a document
export const deleteDocument = async (req, res) => {
  try {
    const { orgId, documentId } = req.params;
    const userId = req.user.id;
    
    // Check if user has permission to delete
    const checkResult = await query(
      `SELECT * FROM documents 
       WHERE id = $1 AND organization_id = $2 
       AND (uploaded_by = $3 OR EXISTS (
         SELECT 1 FROM users WHERE id = $3 AND role = 'admin' AND organization_id = $2
       ))`,
      [documentId, orgId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }
    
    const document = checkResult.rows[0];
    
    // Delete from cloud storage if using external storage
    if (document.storage_provider !== 'internal' && document.external_id) {
      const storageAdapter = await storageFactory.getAdapter(orgId);
      await storageAdapter.delete(document.external_id);
    }
    
    // Delete from database (cascades to tags and favorites)
    await query('DELETE FROM documents WHERE id = $1', [documentId]);
    
    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document'
    });
  }
};

// Toggle document favorite
export const toggleFavorite = async (req, res) => {
  try {
    const { orgId, documentId } = req.params;
    const userId = req.user.id;
    
    // Check if document exists and user has access
    const checkResult = await query(
      `SELECT * FROM documents 
       WHERE id = $1 AND organization_id = $2`,
      [documentId, orgId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    // Check if already favorited
    const favoriteCheck = await query(
      'SELECT * FROM document_favorites WHERE document_id = $1 AND user_id = $2',
      [documentId, userId]
    );
    
    if (favoriteCheck.rows.length > 0) {
      // Remove favorite
      await query(
        'DELETE FROM document_favorites WHERE document_id = $1 AND user_id = $2',
        [documentId, userId]
      );
      
      res.json({
        success: true,
        is_favorite: false
      });
    } else {
      // Add favorite
      await query(
        'INSERT INTO document_favorites (document_id, user_id) VALUES ($1, $2)',
        [documentId, userId]
      );
      
      res.json({
        success: true,
        is_favorite: true
      });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle favorite'
    });
  }
};

// Get storage quota for organization
export const getStorageQuota = async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Get storage adapter for the organization
    const storageAdapter = await storageFactory.getAdapter(orgId);
    
    // Get quota information
    const quota = await storageAdapter.getQuota();
    
    // Get breakdown by storage provider
    const breakdown = await query(
      `SELECT 
        storage_provider,
        COUNT(*) as file_count,
        SUM(file_size) as total_size
       FROM documents
       WHERE organization_id = $1
       GROUP BY storage_provider`,
      [orgId]
    );
    
    res.json({
      success: true,
      data: {
        quota,
        breakdown: breakdown.rows,
        provider: storageAdapter.provider
      }
    });
  } catch (error) {
    console.error('Error getting storage quota:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get storage quota'
    });
  }
};

// Test storage configuration
export const testStorageConfig = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { provider, config } = req.body;
    
    // Test the configuration
    const testConfig = {
      organizationId: orgId,
      provider,
      ...config
    };
    
    const testResult = await storageFactory.testConfiguration(testConfig);
    
    res.json({
      success: true,
      data: testResult
    });
  } catch (error) {
    console.error('Error testing storage config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update organization storage configuration
export const updateStorageConfig = async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user.id;
    const { provider, config } = req.body;
    
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
    
    // Update configuration
    await storageFactory.updateOrganizationConfig(orgId, {
      provider,
      ...config
    });
    
    res.json({
      success: true,
      message: 'Storage configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating storage config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Export for backward compatibility
export const debugDocument = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Debug endpoint - V2 controller with cloud storage support' 
  });
};