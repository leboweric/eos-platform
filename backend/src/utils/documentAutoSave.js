import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Automatically save an attachment to the documents repository
 * @param {Object} params - Parameters for saving the document
 * @param {Buffer} params.fileData - The file data buffer
 * @param {string} params.fileName - Original filename
 * @param {number} params.fileSize - File size in bytes
 * @param {string} params.mimeType - MIME type of the file
 * @param {string} params.orgId - Organization ID
 * @param {string} params.uploadedBy - User ID who uploaded the file
 * @param {string} params.sourceType - Source type ('issue', 'todo', 'priority')
 * @param {string} params.sourceId - ID of the source item
 * @param {string} params.sourceTitle - Title/description of the source item
 * @param {string} params.teamId - Team/Department ID (optional)
 * @param {string} params.visibility - Visibility level (optional, defaults to 'company')
 * @returns {Promise<Object>} The created document record
 */
export const autoSaveToDocuments = async (params) => {
  const {
    fileData,
    fileName,
    fileSize,
    mimeType,
    orgId,
    uploadedBy,
    sourceType,
    sourceId,
    sourceTitle,
    teamId = null,
    visibility = 'company'
  } = params;

  try {
    // Create a descriptive title for the document
    const documentTitle = `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} Attachment: ${fileName}`;
    const description = `Automatically uploaded from ${sourceType}: "${sourceTitle}"`;
    
    // Check if we need to create an auto-upload folder
    let folderId = null;
    const folderName = `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} Attachments`;
    
    // Check if folder exists
    const folderCheck = await db.query(
      `SELECT id FROM document_folders 
       WHERE organization_id = $1 
       AND name = $2 
       AND parent_folder_id IS NULL`,
      [orgId, folderName]
    );
    
    if (folderCheck.rows.length === 0) {
      // Create the folder
      const folderResult = await db.query(
        `INSERT INTO document_folders 
         (id, name, organization_id, created_by, visibility)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [uuidv4(), folderName, orgId, uploadedBy, 'company']
      );
      folderId = folderResult.rows[0].id;
    } else {
      folderId = folderCheck.rows[0].id;
    }
    
    // Determine department_id based on visibility and teamId
    const departmentId = (visibility === 'department' && teamId) ? teamId : null;
    
    // Insert the document with the file data
    const documentId = uuidv4();
    const result = await db.query(
      `INSERT INTO documents 
       (id, title, description, file_name, file_data, file_size, mime_type, 
        visibility, organization_id, department_id, uploaded_by, 
        folder_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, title, file_name, file_size, mime_type, created_at`,
      [
        documentId,
        documentTitle,
        description,
        fileName,
        fileData,
        fileSize,
        mimeType,
        visibility,
        orgId,
        departmentId,
        uploadedBy,
        folderId
      ]
    );
    
    // Create a link record to track the source
    await db.query(
      `INSERT INTO document_source_links 
       (id, document_id, source_type, source_id, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [uuidv4(), documentId, sourceType, sourceId]
    );
    
    console.log(`Document auto-saved: ${documentTitle} from ${sourceType} ${sourceId}`);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error auto-saving document:', error);
    // Don't throw error - we don't want to fail the main operation if auto-save fails
    return null;
  }
};

/**
 * Get or create the auto-upload folder for a specific source type
 * @param {string} orgId - Organization ID
 * @param {string} sourceType - Source type ('issue', 'todo', 'priority')
 * @param {string} uploadedBy - User ID who is uploading
 * @returns {Promise<string>} Folder ID
 */
export const getAutoUploadFolder = async (orgId, sourceType, uploadedBy) => {
  const folderName = `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} Attachments`;
  
  try {
    // Check if folder exists
    const folderCheck = await db.query(
      `SELECT id FROM document_folders 
       WHERE organization_id = $1 
       AND name = $2 
       AND parent_folder_id IS NULL`,
      [orgId, folderName]
    );
    
    if (folderCheck.rows.length > 0) {
      return folderCheck.rows[0].id;
    }
    
    // Create the folder if it doesn't exist
    const folderResult = await db.query(
      `INSERT INTO document_folders 
       (id, name, organization_id, created_by, visibility, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [uuidv4(), folderName, orgId, uploadedBy, 'company']
    );
    
    return folderResult.rows[0].id;
  } catch (error) {
    console.error('Error getting/creating auto-upload folder:', error);
    return null;
  }
};