import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all documents for an organization
export const getDocuments = async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user.id;
    const { department, search, favorites, folderId } = req.query;
    
    // Build query with filters
    // Exclude file_data from listings to avoid sending large binary data
    let queryText = `
      SELECT 
        d.id, d.title, d.description, d.file_name, d.file_size,
        d.mime_type, d.visibility, d.organization_id, d.department_id,
        d.uploaded_by, d.related_priority_id, d.created_at, d.updated_at, d.folder_id,
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
    
    // Add visibility filter - users can see company-wide, their department, and their own private docs
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
  try {
    const { orgId } = req.params;
    const userId = req.user.id;
    const file = req.file;
    const { title, description, departmentId, visibility, relatedPriorityId, folderId } = req.body;
    
    // Debug logging
    console.log('Upload request body:', req.body);
    console.log('Upload file:', req.file ? { name: req.file.originalname, size: req.file.size } : 'No file');
    
    // Parse tags from JSON string if provided
    let tags = [];
    if (req.body.tags) {
      try {
        tags = JSON.parse(req.body.tags);
      } catch (e) {
        // If parsing fails, treat as empty array
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
    
    // Read file data into buffer
    const fileData = await fs.readFile(file.path);
    
    // Create document record with file data in PostgreSQL
    const documentId = uuidv4();
    
    const documentResult = await query(
      `INSERT INTO documents 
       (id, title, description, file_name, file_data, file_size, 
        mime_type, visibility, organization_id, department_id, uploaded_by, related_priority_id, folder_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        documentId,
        title,
        description,
        file.originalname,
        fileData,
        file.size,
        file.mimetype,
        visibility || 'company',
        orgId,
        departmentId || null,
        userId,
        relatedPriorityId || null,
        folderId || null
      ]
    );
    
    // Clean up temporary file
    await fs.unlink(file.path);
    
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
    
    // Get the complete document with tags (excluding file_data)
    const completeDocument = await query(
      `SELECT 
        d.id, d.title, d.description, d.file_name, d.file_size,
        d.mime_type, d.visibility, d.organization_id, d.department_id,
        d.uploaded_by, d.related_priority_id, d.created_at, d.updated_at, d.folder_id,
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
      [documentId]
    );
    
    res.json({
      success: true,
      data: completeDocument.rows[0]
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    
    // Clean up uploaded file if database insert failed
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
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
    
    // Log access
    await query(
      `INSERT INTO document_access_log (document_id, user_id) VALUES ($1, $2)`,
      [documentId, userId]
    );
    
    // Check if we have file data in PostgreSQL
    if (!document.file_data) {
      return res.status(404).json({
        success: false,
        error: 'File data not found in database'
      });
    }
    
    // Set headers for download
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);
    res.setHeader('Content-Length', document.file_size || Buffer.byteLength(document.file_data));
    
    // Send the file data from PostgreSQL
    res.send(document.file_data);
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
    const { title, description, visibility, departmentId, tags, folderId } = req.body;
    
    // Check if user can update (must be uploader or admin)
    const accessCheck = await query(
      `SELECT d.*, u.role 
       FROM documents d
       JOIN users u ON u.id = $3
       WHERE d.id = $1 AND d.organization_id = $2`,
      [documentId, orgId, userId]
    );
    
    if (accessCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    const document = accessCheck.rows[0];
    if (document.uploaded_by !== userId && document.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only the uploader or admin can update this document'
      });
    }
    
    // Update document
    const updateResult = await query(
      `UPDATE documents 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           visibility = COALESCE($3, visibility),
           department_id = COALESCE($4, department_id),
           folder_id = COALESCE($5, folder_id),
           updated_at = NOW()
       WHERE id = $6 AND organization_id = $7
       RETURNING *`,
      [title, description, visibility, departmentId, folderId, documentId, orgId]
    );
    
    // Update tags if provided
    if (tags !== undefined) {
      // Delete existing tags
      await query(`DELETE FROM document_tags WHERE document_id = $1`, [documentId]);
      
      // Add new tags
      if (Array.isArray(tags)) {
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
    
    // Get updated document with tags
    const completeDocument = await query(
      `SELECT 
        d.*,
        ARRAY_AGG(dt.tag_name) FILTER (WHERE dt.tag_name IS NOT NULL) as tags
       FROM documents d
       LEFT JOIN document_tags dt ON d.id = dt.document_id
       WHERE d.id = $1
       GROUP BY d.id`,
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
    
    // Check if user can delete (must be uploader or admin)
    const accessCheck = await query(
      `SELECT d.*, u.role 
       FROM documents d
       JOIN users u ON u.id = $3
       WHERE d.id = $1 AND d.organization_id = $2`,
      [documentId, orgId, userId]
    );
    
    if (accessCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    const document = accessCheck.rows[0];
    if (document.uploaded_by !== userId && document.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only the uploader or admin can delete this document'
      });
    }
    
    // Delete document record (cascade will handle related records)
    // File data is stored in PostgreSQL, so it will be deleted automatically
    const result = await query(
      `DELETE FROM documents 
       WHERE id = $1 AND organization_id = $2`,
      [documentId, orgId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
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

// Toggle favorite status
export const toggleFavorite = async (req, res) => {
  try {
    const { orgId, documentId } = req.params;
    const userId = req.user.id;
    
    // Check if already favorited
    const existingFavorite = await query(
      `SELECT * FROM document_favorites WHERE user_id = $1 AND document_id = $2`,
      [userId, documentId]
    );
    
    if (existingFavorite.rows.length > 0) {
      // Remove favorite
      await query(
        `DELETE FROM document_favorites WHERE user_id = $1 AND document_id = $2`,
        [userId, documentId]
      );
      
      res.json({
        success: true,
        data: { is_favorite: false }
      });
    } else {
      // Add favorite
      await query(
        `INSERT INTO document_favorites (user_id, document_id) VALUES ($1, $2)`,
        [userId, documentId]
      );
      
      res.json({
        success: true,
        data: { is_favorite: true }
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

// Debug endpoint to check file paths
export const debugDocument = async (req, res) => {
  try {
    const { orgId, documentId } = req.params;
    
    const result = await query(
      `SELECT id, title, file_name, file_path, file_size 
       FROM documents 
       WHERE id = $1 AND organization_id = $2`,
      [documentId, orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found in database'
      });
    }
    
    const document = result.rows[0];
    const filePath = document.file_path;
    
    // Comprehensive path debugging
    const pathChecks = {
      stored_path: filePath,
      is_absolute: path.isAbsolute(filePath),
      current_dir: process.cwd(),
      dirname: __dirname,
      is_production: process.cwd() === '/app',
      paths_tested: []
    };
    
    // Test various path possibilities
    const pathsToTest = [
      { name: 'stored_path_as_is', path: filePath },
      { name: 'relative_to_cwd', path: path.join(process.cwd(), filePath) },
      { name: 'relative_to_dirname', path: path.join(__dirname, '../..', filePath) },
      { name: 'just_filename_in_uploads', path: path.join(__dirname, '../../uploads/documents', path.basename(filePath)) },
      { name: 'app_uploads_direct', path: '/app/uploads/documents/' + path.basename(filePath) },
      { name: 'backend_uploads_from_root', path: '/app/backend/uploads/documents/' + path.basename(filePath) }
    ];
    
    // If path starts with /app/, also test without it
    if (filePath.startsWith('/app/')) {
      const withoutApp = filePath.substring(5);
      pathsToTest.push(
        { name: 'without_app_prefix', path: withoutApp },
        { name: 'without_app_relative_to_dirname', path: path.join(__dirname, '../..', withoutApp) }
      );
    }
    
    // Test each path
    for (const testPath of pathsToTest) {
      const exists = await fs.access(testPath.path).then(() => true).catch(() => false);
      pathChecks.paths_tested.push({
        ...testPath,
        exists,
        resolved: path.resolve(testPath.path)
      });
    }
    
    // List actual directories to see structure
    try {
      // List /app directory
      const appFiles = await fs.readdir('/app').catch(() => []);
      pathChecks.app_directory_contents = appFiles;
      
      // List backend directory if exists
      const backendFiles = await fs.readdir('/app/backend').catch(() => []);
      pathChecks.backend_directory_contents = backendFiles.slice(0, 10);
      
      // Check for uploads directory in various locations
      const uploadsLocations = [
        '/app/uploads',
        '/app/backend/uploads',
        '/app/uploads/documents',
        '/app/backend/uploads/documents',
        path.join(__dirname, '../../uploads'),
        path.join(__dirname, '../../uploads/documents')
      ];
      
      pathChecks.uploads_directories = {};
      for (const loc of uploadsLocations) {
        const exists = await fs.access(loc).then(() => true).catch(() => false);
        if (exists) {
          const files = await fs.readdir(loc).catch(() => []);
          pathChecks.uploads_directories[loc] = {
            exists: true,
            file_count: files.length,
            sample_files: files.slice(0, 3)
          };
        } else {
          pathChecks.uploads_directories[loc] = { exists: false };
        }
      }
    } catch (e) {
      pathChecks.directory_scan_error = e.message;
    }
    
    res.json({
      success: true,
      document: document,
      path_info: pathChecks
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

