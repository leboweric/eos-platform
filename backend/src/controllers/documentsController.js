import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all documents for an organization
export const getDocuments = async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user.id;
    const { category, department, search, favorites } = req.query;
    
    // Build query with filters
    let queryText = `
      SELECT 
        d.*,
        u.first_name || ' ' || u.last_name as uploader_name,
        t.name as department_name,
        CASE WHEN df.user_id IS NOT NULL THEN true ELSE false END as is_favorite,
        COUNT(DISTINCT dt.id) as tag_count,
        ARRAY_AGG(DISTINCT dt.tag_name) FILTER (WHERE dt.tag_name IS NOT NULL) as tags
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      LEFT JOIN teams t ON d.department_id = t.id
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
    
    // Add category filter
    if (category) {
      queryText += ` AND d.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
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
    
    queryText += ` GROUP BY d.id, u.first_name, u.last_name, t.name, df.user_id
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
    const { title, description, category, departmentId, visibility, relatedPriorityId, tags } = req.body;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    if (!title || !category) {
      return res.status(400).json({
        success: false,
        error: 'Title and category are required'
      });
    }
    
    // Create document record
    const documentId = uuidv4();
    const filePath = file.path.replace(/\\/g, '/');
    
    const documentResult = await query(
      `INSERT INTO documents 
       (id, title, description, category, file_name, file_path, file_size, 
        mime_type, visibility, organization_id, department_id, uploaded_by, related_priority_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        documentId,
        title,
        description,
        category,
        file.originalname,
        filePath,
        file.size,
        file.mimetype,
        visibility || 'company',
        orgId,
        departmentId || null,
        userId,
        relatedPriorityId || null
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
    
    // Get the complete document with tags
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
       GROUP BY d.id, u.first_name, u.last_name, t.name`,
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
    
    // Check if file exists
    const filePath = document.file_path;
    
    // Handle different path scenarios
    let absolutePath = filePath;
    
    // In production (Railway), the app runs in /app directory
    // and files are stored with absolute paths like /app/uploads/documents/...
    if (process.cwd() === '/app' && filePath.startsWith('/app/')) {
      // We're in production and have an absolute path - use it as is
      absolutePath = filePath;
    } else if (filePath.startsWith('/app/')) {
      // We're in development but have a production path - strip /app and resolve
      const relativePath = filePath.substring(5); // Remove '/app/'
      absolutePath = path.join(__dirname, '../..', relativePath);
    } else if (!path.isAbsolute(filePath)) {
      // Relative path - resolve it relative to the project root
      absolutePath = path.join(__dirname, '../..', filePath);
    }
    // If it's already an absolute path (local development), use as is
    
    try {
      await fs.access(absolutePath);
    } catch (error) {
      console.error('File not found:', absolutePath);
      console.error('Original path:', filePath);
      console.error('Current directory:', process.cwd());
      console.error('__dirname:', __dirname);
      
      // Try one more time with just the filename in the uploads directory
      const filename = path.basename(filePath);
      const fallbackPath = path.join(__dirname, '../../uploads/documents', filename);
      
      try {
        await fs.access(fallbackPath);
        absolutePath = fallbackPath;
      } catch (fallbackError) {
        return res.status(404).json({
          success: false,
          error: 'File not found on server'
        });
      }
    }
    
    // Set headers for download
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);
    res.setHeader('Content-Length', document.file_size || 0);
    
    // Stream the file
    const fileStream = createReadStream(absolutePath);
    fileStream.pipe(res);
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
    const { title, description, category, visibility, departmentId, tags } = req.body;
    
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
           category = COALESCE($3, category),
           visibility = COALESCE($4, visibility),
           department_id = COALESCE($5, department_id),
           updated_at = NOW()
       WHERE id = $6 AND organization_id = $7
       RETURNING *`,
      [title, description, category, visibility, departmentId, documentId, orgId]
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
    const result = await query(
      `DELETE FROM documents 
       WHERE id = $1 AND organization_id = $2 
       RETURNING file_path`,
      [documentId, orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    // Delete the actual file
    const filePath = result.rows[0].file_path;
    
    // Handle different path scenarios (same logic as download)
    let absolutePath = filePath;
    
    if (process.cwd() === '/app' && filePath.startsWith('/app/')) {
      // We're in production and have an absolute path - use it as is
      absolutePath = filePath;
    } else if (filePath.startsWith('/app/')) {
      // We're in development but have a production path - strip /app and resolve
      const relativePath = filePath.substring(5); // Remove '/app/'
      absolutePath = path.join(__dirname, '../..', relativePath);
    } else if (!path.isAbsolute(filePath)) {
      // Relative path - resolve it relative to the project root
      absolutePath = path.join(__dirname, '../..', filePath);
    }
    
    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      console.error('Error deleting file:', error);
      console.error('Attempted path:', absolutePath);
      
      // Try with just the filename in the uploads directory
      const filename = path.basename(filePath);
      const fallbackPath = path.join(__dirname, '../../uploads/documents', filename);
      
      try {
        await fs.unlink(fallbackPath);
      } catch (fallbackError) {
        console.error('Error deleting file at fallback path:', fallbackError);
        // Continue even if file deletion fails
      }
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

// Get document categories with counts
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
    
    // Check different path possibilities
    const pathChecks = {
      stored_path: filePath,
      is_absolute: path.isAbsolute(filePath),
      resolved_path: !path.isAbsolute(filePath) ? path.join(__dirname, '../..', filePath) : filePath,
      current_dir: process.cwd(),
      dirname: __dirname,
      uploads_dir_exists: false,
      file_exists: false
    };
    
    // Check if uploads directory exists
    try {
      const uploadsDir = path.join(__dirname, '../../uploads/documents');
      await fs.access(uploadsDir);
      pathChecks.uploads_dir_exists = true;
      pathChecks.uploads_dir_path = uploadsDir;
      
      // List files in uploads directory
      const files = await fs.readdir(uploadsDir);
      pathChecks.files_in_uploads = files.slice(0, 5); // First 5 files
    } catch (e) {
      pathChecks.uploads_dir_error = e.message;
    }
    
    // Check if the file exists at resolved path
    try {
      await fs.access(pathChecks.resolved_path);
      pathChecks.file_exists = true;
    } catch (e) {
      pathChecks.file_error = e.message;
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

export const getCategories = async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user.id;
    
    const result = await query(
      `SELECT 
        category,
        COUNT(*) as count
       FROM documents d
       WHERE d.organization_id = $1
         AND (
           d.visibility = 'company' 
           OR (d.visibility = 'department' AND d.department_id IN (
             SELECT team_id FROM team_members WHERE user_id = $2
           ))
           OR (d.visibility = 'private' AND d.uploaded_by = $2)
         )
       GROUP BY category
       ORDER BY 
         CASE category
           WHEN 'strategy' THEN 1
           WHEN 'blueprints' THEN 2
           WHEN 'policies' THEN 3
           WHEN 'templates' THEN 4
           WHEN 'meeting_notes' THEN 5
           WHEN 'reports' THEN 6
           WHEN 'training' THEN 7
         END`,
      [orgId, userId]
    );
    
    // Category display names
    const categoryNames = {
      strategy: 'Strategy Documents',
      blueprints: 'Blueprints & Plans',
      policies: 'Policies & Procedures',
      templates: 'Templates & Forms',
      meeting_notes: 'Meeting Notes',
      reports: 'Reports & Analytics',
      training: 'Training Materials'
    };
    
    const categories = result.rows.map(row => ({
      ...row,
      display_name: categoryNames[row.category] || row.category
    }));
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
};