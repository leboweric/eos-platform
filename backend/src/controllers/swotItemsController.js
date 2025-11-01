import db from '../config/database.js';

// Get all SWOT items for a team and year
export const getTeamSwotItems = async (req, res) => {
  try {
    const { organizationId, teamId } = req.params;
    const { year } = req.query;

    // Default to next year if not specified
    const targetYear = year ? parseInt(year) : new Date().getFullYear() + 1;

    const result = await db.query(
      `SELECT 
        si.id,
        si.organization_id,
        si.team_id,
        si.year,
        si.category,
        si.content,
        si.display_order,
        si.created_by,
        si.created_at,
        si.updated_at,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM swot_items si
      LEFT JOIN users u ON si.created_by = u.id
      WHERE si.organization_id = $1 
        AND si.team_id = $2 
        AND si.year = $3
        AND si.deleted_at IS NULL
      ORDER BY si.category, si.display_order, si.created_at`,
      [organizationId, teamId, targetYear]
    );

    // Group by category
    const grouped = {
      strength: [],
      weakness: [],
      opportunity: [],
      threat: []
    };

    result.rows.forEach(item => {
      if (grouped[item.category]) {
        grouped[item.category].push(item);
      }
    });

    res.json(grouped);
  } catch (error) {
    console.error('Error fetching SWOT items:', error);
    res.status(500).json({ error: 'Failed to fetch SWOT items' });
  }
};

// Create a new SWOT item
export const createSwotItem = async (req, res) => {
  try {
    const { organizationId, teamId } = req.params;
    const { year, category, content } = req.body;
    const userId = req.user.id;

    // Validate category
    const validCategories = ['strength', 'weakness', 'opportunity', 'threat'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Get next display order
    const orderResult = await db.query(
      `SELECT COALESCE(MAX(display_order), -1) + 1 as next_order
       FROM swot_items
       WHERE organization_id = $1 
         AND team_id = $2 
         AND year = $3 
         AND category = $4
         AND deleted_at IS NULL`,
      [organizationId, teamId, year, category]
    );

    const displayOrder = orderResult.rows[0].next_order;

    const result = await db.query(
      `INSERT INTO swot_items 
        (organization_id, team_id, year, category, content, display_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [organizationId, teamId, year, category, content, displayOrder, userId]
    );

    // Get created_by name
    const itemWithName = await db.query(
      `SELECT 
        si.*,
        u.first_name || ' ' || u.last_name as created_by_name
       FROM swot_items si
       LEFT JOIN users u ON si.created_by = u.id
       WHERE si.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(itemWithName.rows[0]);
  } catch (error) {
    console.error('Error creating SWOT item:', error);
    res.status(500).json({ error: 'Failed to create SWOT item' });
  }
};

// Update a SWOT item
export const updateSwotItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { content } = req.body;

    const result = await db.query(
      `UPDATE swot_items 
       SET content = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [content, itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SWOT item not found' });
    }

    // Get created_by name
    const itemWithName = await db.query(
      `SELECT 
        si.*,
        u.first_name || ' ' || u.last_name as created_by_name
       FROM swot_items si
       LEFT JOIN users u ON si.created_by = u.id
       WHERE si.id = $1`,
      [result.rows[0].id]
    );

    res.json(itemWithName.rows[0]);
  } catch (error) {
    console.error('Error updating SWOT item:', error);
    res.status(500).json({ error: 'Failed to update SWOT item' });
  }
};

// Delete a SWOT item (soft delete)
export const deleteSwotItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const result = await db.query(
      `UPDATE swot_items 
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SWOT item not found' });
    }

    res.json({ message: 'SWOT item deleted successfully' });
  } catch (error) {
    console.error('Error deleting SWOT item:', error);
    res.status(500).json({ error: 'Failed to delete SWOT item' });
  }
};