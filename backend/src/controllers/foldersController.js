import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// Get all folders for an organization
export const getFolders = async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const result = await query(
      `WITH RECURSIVE folder_tree AS (
        -- Base case: top-level folders
        SELECT 
          id, name, parent_folder_id, created_by, created_at,
          0 as level,
          ARRAY[name] as path
        FROM document_folders
        WHERE organization_id = $1 AND parent_folder_id IS NULL
        
        UNION ALL
        
        -- Recursive case: child folders
        SELECT 
          f.id, f.name, f.parent_folder_id, f.created_by, f.created_at,
          ft.level + 1,
          ft.path || f.name
        FROM document_folders f
        INNER JOIN folder_tree ft ON f.parent_folder_id = ft.id
      )
      SELECT 
        ft.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        COUNT(d.id) as document_count
      FROM folder_tree ft
      LEFT JOIN users u ON ft.created_by = u.id
      LEFT JOIN documents d ON d.folder_id = ft.id
      GROUP BY ft.id, ft.name, ft.parent_folder_id, ft.created_by, 
               ft.created_at, ft.level, ft.path, u.first_name, u.last_name
      ORDER BY ft.path`,
      [orgId]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch folders'
    });
  }
};

// Create a new folder (admin only)
export const createFolder = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { name, parentFolderId } = req.body;
    const userId = req.user.id;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can create folders'
      });
    }
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required'
      });
    }
    
    const folderId = uuidv4();
    
    const result = await query(
      `INSERT INTO document_folders (id, name, parent_folder_id, organization_id, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [folderId, name.trim(), parentFolderId || null, orgId, userId]
    );
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        error: 'A folder with this name already exists in this location'
      });
    }
    
    console.error('Error creating folder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create folder'
    });
  }
};

// Update folder (admin only)
export const updateFolder = async (req, res) => {
  try {
    const { orgId, folderId } = req.params;
    const { name } = req.body;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can update folders'
      });
    }
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required'
      });
    }
    
    const result = await query(
      `UPDATE document_folders 
       SET name = $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [name.trim(), folderId, orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Folder not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        error: 'A folder with this name already exists in this location'
      });
    }
    
    console.error('Error updating folder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update folder'
    });
  }
};

// Delete folder (admin only)
export const deleteFolder = async (req, res) => {
  try {
    const { orgId, folderId } = req.params;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can delete folders'
      });
    }
    
    // Check if folder has documents
    const docCheck = await query(
      `SELECT COUNT(*) as count FROM documents WHERE folder_id = $1`,
      [folderId]
    );
    
    if (parseInt(docCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete folder that contains documents. Please move or delete the documents first.'
      });
    }
    
    const result = await query(
      `DELETE FROM document_folders 
       WHERE id = $1 AND organization_id = $2`,
      [folderId, orgId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Folder not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Folder deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete folder'
    });
  }
};