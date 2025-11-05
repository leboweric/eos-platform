import { query } from '../config/database.js';
import { generateVtoSuggestion } from '../services/openaiService.js';

/**
 * Generate AI suggestions for a 3-Year Picture "What does it look like?" bullet
 * Uses VTO context (Core Values, Core Focus, targets, etc.) to generate strategic suggestions
 */
export const generateBulletSuggestion = async (req, res) => {
  try {
    const { orgId } = req.params;
    const organizationId = orgId;
    const { currentText, bulletIndex } = req.body;

    console.log(`[AI VTO Suggestion] Generating suggestion for org ${organizationId}, bullet index ${bulletIndex}`);

    // 1. Fetch VTO context for the organization
    const vtoContext = await fetchVtoContext(organizationId);
    
    if (!vtoContext.vtoId) {
      return res.status(404).json({
        success: false,
        error: 'No VTO found for this organization'
      });
    }

    console.log('[AI VTO Suggestion] VTO context loaded successfully');

    // 2. Generate AI suggestions using OpenAI
    const suggestions = await generateVtoSuggestion(vtoContext, currentText);

    console.log(`[AI VTO Suggestion] Generated ${suggestions.length} suggestions`);

    res.json({
      success: true,
      suggestions,
      context: {
        hasVto: true,
        coreValuesCount: vtoContext.coreValues.length,
        hasCoreFocus: !!vtoContext.coreFocus
      }
    });

  } catch (error) {
    console.error('[AI VTO Suggestion] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate suggestions',
      message: error.message
    });
  }
};

/**
 * Fetch VTO context for generating suggestions
 */
async function fetchVtoContext(organizationId) {
  // Get VTO ID from business_blueprints (org-level, team_id IS NULL)
  const blueprintResult = await query(
    `SELECT id FROM business_blueprints 
     WHERE organization_id = $1 AND team_id IS NULL 
     LIMIT 1`,
    [organizationId]
  );

  if (blueprintResult.rows.length === 0) {
    return { vtoId: null };
  }

  const vtoId = blueprintResult.rows[0].id;

  // Fetch Core Values
  const coreValuesResult = await query(
    `SELECT value_text, description 
     FROM core_values 
     WHERE vto_id = $1 
     ORDER BY sort_order`,
    [vtoId]
  );

  // Fetch Core Focus
  const coreFocusResult = await query(
    `SELECT purpose_cause_passion, niche 
     FROM core_focus 
     WHERE vto_id = $1 
     LIMIT 1`,
    [vtoId]
  );

  // Fetch Marketing Strategy
  const marketingResult = await query(
    `SELECT target_market, three_uniques 
     FROM marketing_strategies 
     WHERE vto_id = $1 
     LIMIT 1`,
    [vtoId]
  );

  // Fetch 3-Year Picture
  const threeYearResult = await query(
    `SELECT revenue_target, profit_target, future_date, what_does_it_look_like 
     FROM three_year_pictures 
     WHERE vto_id = $1 
     LIMIT 1`,
    [vtoId]
  );

  return {
    vtoId,
    coreValues: coreValuesResult.rows.map(row => ({
      value: row.value_text,
      description: row.description
    })),
    coreFocus: coreFocusResult.rows[0] || null,
    marketing: marketingResult.rows[0] || null,
    threeYearPicture: threeYearResult.rows[0] || null
  };
}

