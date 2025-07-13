import { query } from '../config/database.js';
import multer from 'multer';
import sharp from 'sharp';

// Configure multer for memory storage
const storage = multer.memoryStorage();
export const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for logos
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get organization details
export const getOrganization = async (req, res) => {
  try {
    const { organizationId } = req.user;

    const result = await query(
      'SELECT id, name, slug, logo_url, logo_mime_type, logo_updated_at, created_at FROM organizations WHERE id = $1',
      [organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Failed to get organization details' });
  }
};

// Update organization details
export const updateOrganization = async (req, res) => {
  try {
    const { organizationId, role, is_consultant, id: userId } = req.user;
    const { name } = req.body;

    // Check permissions: admin or consultant with access to this organization
    let hasPermission = role === 'admin';
    
    if (!hasPermission && is_consultant) {
      // Check if consultant has access to this organization
      const accessCheck = await query(
        'SELECT 1 FROM consultant_organizations WHERE consultant_user_id = $1 AND organization_id = $2',
        [userId, organizationId]
      );
      hasPermission = accessCheck.rows.length > 0;
    }

    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to update this organization' });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    // Update organization name
    const result = await query(
      'UPDATE organizations SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, slug',
      [name.trim(), organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Organization updated successfully'
    });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
};

// Upload organization logo
export const uploadLogo = async (req, res) => {
  try {
    const { organizationId, role, is_consultant, id: userId } = req.user;

    // Check permissions: admin or consultant with access to this organization
    let hasPermission = role === 'admin';
    
    if (!hasPermission && is_consultant) {
      // Check if consultant has access to this organization
      const accessCheck = await query(
        'SELECT 1 FROM consultant_organizations WHERE consultant_user_id = $1 AND organization_id = $2',
        [userId, organizationId]
      );
      hasPermission = accessCheck.rows.length > 0;
    }

    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to update this organization' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No logo file uploaded' });
    }

    // Process the image - resize and optimize
    const processedImage = await sharp(req.file.buffer)
      .resize(400, 400, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .png({ quality: 90 })
      .toBuffer();

    // Store the logo as base64 in the database
    const result = await query(
      `UPDATE organizations 
       SET logo_data = $1, 
           logo_mime_type = $2, 
           logo_updated_at = NOW(),
           updated_at = NOW() 
       WHERE id = $3 
       RETURNING id, logo_mime_type, logo_updated_at`,
      [processedImage, 'image/png', organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logoUpdatedAt: result.rows[0].logo_updated_at
      }
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
};

// Get organization logo
export const getLogo = async (req, res) => {
  try {
    const { orgId } = req.params;

    const result = await query(
      'SELECT logo_data, logo_mime_type FROM organizations WHERE id = $1',
      [orgId]
    );

    if (result.rows.length === 0 || !result.rows[0].logo_data) {
      return res.status(404).json({ error: 'Logo not found' });
    }

    const { logo_data, logo_mime_type } = result.rows[0];

    // Set cache headers and CORS headers
    res.set({
      'Content-Type': logo_mime_type || 'image/png',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Cross-Origin-Resource-Policy': 'cross-origin' // Allow cross-origin access
    });

    res.send(logo_data);
  } catch (error) {
    console.error('Get logo error:', error);
    res.status(500).json({ error: 'Failed to get logo' });
  }
};

// Delete organization logo
export const deleteLogo = async (req, res) => {
  try {
    const { organizationId, role, is_consultant, id: userId } = req.user;

    // Check permissions: admin or consultant with access to this organization
    let hasPermission = role === 'admin';
    
    if (!hasPermission && is_consultant) {
      // Check if consultant has access to this organization
      const accessCheck = await query(
        'SELECT 1 FROM consultant_organizations WHERE consultant_user_id = $1 AND organization_id = $2',
        [userId, organizationId]
      );
      hasPermission = accessCheck.rows.length > 0;
    }

    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to update this organization' });
    }

    const result = await query(
      `UPDATE organizations 
       SET logo_data = NULL, 
           logo_url = NULL,
           logo_mime_type = NULL, 
           logo_updated_at = NOW(),
           updated_at = NOW() 
       WHERE id = $1 
       RETURNING id`,
      [organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      success: true,
      message: 'Logo deleted successfully'
    });
  } catch (error) {
    console.error('Delete logo error:', error);
    res.status(500).json({ error: 'Failed to delete logo' });
  }
};