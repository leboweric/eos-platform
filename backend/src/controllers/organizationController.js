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
      'SELECT id, name, slug, logo_url, logo_mime_type, logo_updated_at, logo_size, created_at, revenue_metric_type, revenue_metric_label, theme_primary_color, theme_secondary_color, theme_accent_color FROM organizations WHERE id = $1',
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
    const { name, revenueMetricType, revenueMetricLabel, logoSize, themePrimaryColor, themeSecondaryColor, themeAccentColor } = req.body;

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

    // Validate revenue metric type
    const validMetricTypes = ['revenue', 'aum', 'arr', 'custom'];
    if (revenueMetricType && !validMetricTypes.includes(revenueMetricType)) {
      return res.status(400).json({ error: 'Invalid revenue metric type' });
    }

    // If custom type, require a label
    if (revenueMetricType === 'custom' && !revenueMetricLabel) {
      return res.status(400).json({ error: 'Custom revenue metric label is required' });
    }

    // Build dynamic update query
    let updateFields = ['name = $1'];
    let values = [name.trim()];
    let paramCount = 1;

    if (revenueMetricType !== undefined) {
      paramCount++;
      updateFields.push(`revenue_metric_type = $${paramCount}`);
      values.push(revenueMetricType);
    }

    if (revenueMetricLabel !== undefined) {
      paramCount++;
      updateFields.push(`revenue_metric_label = $${paramCount}`);
      values.push(revenueMetricLabel);
    }

    // Add logo size if provided
    if (logoSize !== undefined) {
      // Validate logo size is between 25 and 200
      if (logoSize < 25 || logoSize > 200) {
        return res.status(400).json({ error: 'Logo size must be between 25 and 200' });
      }
      paramCount++;
      updateFields.push(`logo_size = $${paramCount}`);
      values.push(logoSize);
    }

    // Add color theme fields if provided
    if (themePrimaryColor !== undefined) {
      paramCount++;
      updateFields.push(`theme_primary_color = $${paramCount}`);
      values.push(themePrimaryColor);
    }

    if (themeSecondaryColor !== undefined) {
      paramCount++;
      updateFields.push(`theme_secondary_color = $${paramCount}`);
      values.push(themeSecondaryColor);
    }

    if (themeAccentColor !== undefined) {
      paramCount++;
      updateFields.push(`theme_accent_color = $${paramCount}`);
      values.push(themeAccentColor);
    }

    // Add organization ID as last parameter
    paramCount++;
    values.push(organizationId);

    // Update organization
    const result = await query(
      `UPDATE organizations 
       SET ${updateFields.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramCount} 
       RETURNING id, name, slug, revenue_metric_type, revenue_metric_label, logo_size, theme_primary_color, theme_secondary_color, theme_accent_color`,
      values
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