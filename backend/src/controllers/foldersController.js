import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// Get all folders for an organization
export const getFolders = async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user.id;
    
    const result = await query(
      `WITH RECURSIVE folder_tree AS (
        -- Base case: top-level folders
        SELECT 
          f.id, f.name, f.parent_folder_id, f.created_by, f.created_at,
          f.visibility, f.department_id, f.owner_id,
          0 as level,
          ARRAY[f.name]::varchar[] as path
        FROM document_folders f
        LEFT JOIN team_members tm ON f.department_id = tm.team_id AND tm.user_id = $2
        WHERE f.organization_id = $1 
          AND f.parent_folder_id IS NULL
          AND (
            f.visibility = 'company' OR
            (f.visibility = 'department' AND tm.user_id IS NOT NULL) OR
            (f.visibility = 'personal' AND f.owner_id = $2)
          )
        
        UNION ALL
        
        -- Recursive case: child folders
        SELECT 
          f.id, f.name, f.parent_folder_id, f.created_by, f.created_at,
          f.visibility, f.department_id, f.owner_id,
          ft.level + 1,
          ft.path || f.name::varchar
        FROM document_folders f
        INNER JOIN folder_tree ft ON f.parent_folder_id = ft.id
      )
      SELECT 
        ft.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        t.name as department_name,
        o.first_name || ' ' || o.last_name as owner_name,
        COUNT(d.id) as document_count
      FROM folder_tree ft
      LEFT JOIN users u ON ft.created_by = u.id
      LEFT JOIN teams t ON ft.department_id = t.id
      LEFT JOIN users o ON ft.owner_id = o.id
      LEFT JOIN documents d ON d.folder_id = ft.id
      GROUP BY ft.id, ft.name, ft.parent_folder_id, ft.created_by, 
               ft.created_at, ft.visibility, ft.department_id, ft.owner_id,
               ft.level, ft.path, u.first_name, u.last_name, 
               t.name, o.first_name, o.last_name
      ORDER BY ft.visibility, ft.path`,
      [orgId, userId]
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

// Create a new folder
export const createFolder = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { name, parentFolderId, visibility, departmentId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required'
      });
    }
    
    if (!visibility) {
      return res.status(400).json({
        success: false,
        error: 'Visibility is required (company, department, or personal)'
      });
    }
    
    // Check permissions based on visibility
    if (visibility === 'company' || visibility === 'department') {
      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only admins can create company or department folders'
        });
      }
      
      if (visibility === 'department' && !departmentId) {
        return res.status(400).json({
          success: false,
          error: 'Department ID is required for department folders'
        });
      }
    }
    
    const folderId = uuidv4();
    
    const result = await query(
      `INSERT INTO document_folders 
       (id, name, parent_folder_id, organization_id, created_by, visibility, department_id, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        folderId, 
        name.trim(), 
        parentFolderId || null, 
        orgId, 
        userId,
        visibility,
        visibility === 'department' ? departmentId : null,
        visibility === 'personal' ? userId : null
      ]
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

// Update folder
export const updateFolder = async (req, res) => {
  try {
    const { orgId, folderId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required'
      });
    }
    
    // Get folder details to check permissions
    const folderCheck = await query(
      `SELECT visibility, owner_id FROM document_folders WHERE id = $1 AND organization_id = $2`,
      [folderId, orgId]
    );
    
    if (folderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Folder not found'
      });
    }
    
    const folder = folderCheck.rows[0];
    
    // Check permissions
    if (folder.visibility === 'company' || folder.visibility === 'department') {
      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only admins can update company or department folders'
        });
      }
    } else if (folder.visibility === 'personal') {
      if (folder.owner_id !== userId && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'You can only update your own personal folders'
        });
      }
    }
    
    const result = await query(
      `UPDATE document_folders 
       SET name = $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [name.trim(), folderId, orgId]
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
    
    console.error('Error updating folder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update folder'
    });
  }
};

// Delete folder
export const deleteFolder = async (req, res) => {
  try {
    const { orgId, folderId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get folder details to check permissions
    const folderCheck = await query(
      `SELECT visibility, owner_id FROM document_folders WHERE id = $1 AND organization_id = $2`,
      [folderId, orgId]
    );
    
    if (folderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Folder not found'
      });
    }
    
    const folder = folderCheck.rows[0];
    
    // Check permissions
    if (folder.visibility === 'company' || folder.visibility === 'department') {
      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only admins can delete company or department folders'
        });
      }
    } else if (folder.visibility === 'personal') {
      if (folder.owner_id !== userId && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own personal folders'
        });
      }
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
    
    // Check if folder has subfolders
    const subfolderCheck = await query(
      `SELECT COUNT(*) as count FROM document_folders WHERE parent_folder_id = $1`,
      [folderId]
    );
    
    if (parseInt(subfolderCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete folder that contains subfolders. Please delete the subfolders first.'
      });
    }
    
    const result = await query(
      `DELETE FROM document_folders 
       WHERE id = $1 AND organization_id = $2`,
      [folderId, orgId]
    );
    
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