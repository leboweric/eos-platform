import { query } from '../config/database.js';
import { generateRockActionPlan } from '../services/openaiService.js';

/**
 * Generate an action plan for a Rock
 * @route POST /api/v1/organizations/:orgId/rocks/:rockId/action-plan
 */
export const generateActionPlan = async (req, res) => {
  try {
    const { orgId, rockId } = req.params;
    const userId = req.user.id;

    console.log(`[Action Plan] Generating plan for Rock ${rockId} in org ${orgId}`);

    // Fetch the Rock details
    const rockResult = await query(
      `SELECT 
        r.id,
        r.title,
        r.description,
        r.due_date,
        r.owner_id,
        r.quarter,
        r.year,
        u.first_name || ' ' || u.last_name as owner_name,
        u.email as owner_email,
        t.name as team_name
      FROM quarterly_priorities r
      LEFT JOIN users u ON r.owner_id = u.id
      LEFT JOIN teams t ON r.team_id = t.id
      WHERE r.id = $1 AND r.organization_id = $2`,
      [rockId, orgId]
    );

    if (rockResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Rock not found'
      });
    }

    const rock = rockResult.rows[0];

    // Fetch milestones for this Rock
    const milestonesResult = await query(
      `SELECT 
        id,
        title,
        due_date,
        completed,
        owner_id,
        status
      FROM priority_milestones
      WHERE priority_id = $1
      ORDER BY due_date ASC`,
      [rockId]
    );

    const milestones = milestonesResult.rows;

    console.log(`[Action Plan] Found ${milestones.length} milestones for Rock`);

    // Fetch VTO context for strategic alignment
    console.log(`[Action Plan] Fetching VTO context for org ${orgId}`);
    
    // Get the org-level business blueprint (VTO)
    const vtoResult = await query(
      'SELECT id FROM business_blueprints WHERE organization_id = $1 AND team_id IS NULL',
      [orgId]
    );
    
    let vtoContext = null;
    if (vtoResult.rows.length > 0) {
      const vtoId = vtoResult.rows[0].id;
      
      // Fetch all VTO components in parallel
      const [coreValues, coreFocus, marketingStrategy, threeYearPicture, oneYearPlan] = await Promise.all([
        query('SELECT value_text, description FROM core_values WHERE vto_id = $1 ORDER BY sort_order', [vtoId]),
        query('SELECT purpose_cause_passion, niche FROM core_focus WHERE vto_id = $1', [vtoId]),
        query('SELECT target_market, three_uniques, proven_process, guarantee, differentiator_1, differentiator_2, differentiator_3, differentiator_4, differentiator_5 FROM marketing_strategies WHERE vto_id = $1', [vtoId]),
        query('SELECT future_date, revenue_target, profit_target, vision_description, what_does_it_look_like, what_does_it_look_like_completions FROM three_year_pictures WHERE vto_id = $1', [vtoId]),
        query('SELECT planning_year, goals FROM annual_planning_goals WHERE organization_id = $1 ORDER BY planning_year DESC LIMIT 1', [orgId])
      ]);
      
      vtoContext = {
        coreValues: coreValues.rows.map(v => ({
          value: v.value_text,
          description: v.description
        })),
        coreFocus: coreFocus.rows[0] || null,
        marketingStrategy: marketingStrategy.rows[0] || null,
        threeYearPicture: threeYearPicture.rows[0] || null,
        oneYearPlan: oneYearPlan.rows[0] || null
      };
      
      console.log(`[Action Plan] VTO context loaded successfully`);
    } else {
      console.log(`[Action Plan] No VTO found for organization`);
    }

    // Generate the action plan using AI
    const actionPlan = await generateRockActionPlan({
      rock: {
        title: rock.title,
        description: rock.description,
        dueDate: rock.due_date,
        quarter: rock.quarter,
        year: rock.year,
        ownerName: rock.owner_name,
        teamName: rock.team_name
      },
      milestones: milestones.map(m => ({
        title: m.title,
        description: m.description,
        dueDate: m.due_date,
        completed: m.completed
      })),
      vtoContext: vtoContext
    });

    console.log(`[Action Plan] Generated plan successfully`);

    res.json({
      success: true,
      data: {
        rockId: rock.id,
        rockTitle: rock.title,
        actionPlan: actionPlan,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Action Plan] Error generating action plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate action plan',
      message: error.message
    });
  }
};

