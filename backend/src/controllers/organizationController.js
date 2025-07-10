import { query } from '../config/database.js';

// Get organization details
export const getOrganization = async (req, res) => {
  try {
    const { organizationId } = req.user;

    const result = await query(
      'SELECT id, name, slug, created_at FROM organizations WHERE id = $1',
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
    const { organizationId, role } = req.user;
    const { name } = req.body;

    // Only admins can update organization details
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can update organization details' });
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