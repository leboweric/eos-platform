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
      `SELECT 
        o.id, o.name, o.slug, o.logo_url, o.logo_mime_type, o.logo_updated_at, o.logo_size, o.created_at, 
        o.revenue_metric_type, o.revenue_metric_label, o.theme_primary_color, o.theme_secondary_color, o.theme_accent_color, 
        o.scorecard_time_period_preference, o.rock_display_preference,
        b.primary_color AS branding_primary_color, b.logo_url AS branding_logo_url
      FROM organizations o
      LEFT JOIN organization_branding b ON o.id = b.organization_id
      WHERE o.id = $1`,
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
    const { name, revenueMetricType, revenueMetricLabel, logoSize, themePrimaryColor, themeSecondaryColor, themeAccentColor, scorecardTimePeriodPreference, rockDisplayPreference } = req.body;

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

    // Validate scorecard time period preference
    const validTimePeriods = ['13_week_rolling', 'current_quarter', 'last_4_weeks'];
    if (scorecardTimePeriodPreference && !validTimePeriods.includes(scorecardTimePeriodPreference)) {
      return res.status(400).json({ error: 'Invalid scorecard time period preference. Must be one of: 13_week_rolling, current_quarter, last_4_weeks' });
    }

    // Validate rock display preference
    const validRockDisplays = ['grouped_by_type', 'grouped_by_owner'];
    if (rockDisplayPreference && !validRockDisplays.includes(rockDisplayPreference)) {
      return res.status(400).json({ error: 'Invalid rock display preference. Must be one of: grouped_by_type, grouped_by_owner' });
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

    // Add scorecard time period preference if provided
    if (scorecardTimePeriodPreference !== undefined) {
      paramCount++;
      updateFields.push(`scorecard_time_period_preference = $${paramCount}`);
      values.push(scorecardTimePeriodPreference);
    }

    // Add rock display preference if provided
    if (rockDisplayPreference !== undefined) {
      paramCount++;
      updateFields.push(`rock_display_preference = $${paramCount}`);
      values.push(rockDisplayPreference);
    }

    // Add organization ID as last parameter
    paramCount++;
    values.push(organizationId);

    // Update organization
    const result = await query(
      `UPDATE organizations 
       SET ${updateFields.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramCount} 
       RETURNING id, name, slug, revenue_metric_type, revenue_metric_label, logo_size, theme_primary_color, theme_secondary_color, theme_accent_color, scorecard_time_period_preference, rock_display_preference`,
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

    // Set comprehensive CORS and cache headers
    res.set({
      'Content-Type': logo_mime_type || 'image/png',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*', // Allow all origins for public logos
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cross-Origin-Resource-Policy': 'cross-origin'
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