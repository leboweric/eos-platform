/**
 * Translation Engine - Core of the Adaptive Framework Technology
 * Patent Pending Serial No. 63/870,133
 * 
 * This engine enables real-time translation between business frameworks
 * (EOS, OKR, 4DX, Scaling Up) without data migration or loss.
 */

import { pool } from '../config/database.js';
import { EOSTranslator } from './translators/eosTranslator.js';
import { OKRTranslator } from './translators/okrTranslator.js';
import { FourDXTranslator } from './translators/fourDXTranslator.js';
import { ScalingUpTranslator } from './translators/scalingUpTranslator.js';

export class TranslationEngine {
  constructor(organizationId) {
    this.organizationId = organizationId;
    this.translators = {
      eos: new EOSTranslator(),
      okr: new OKRTranslator(),
      '4dx': new FourDXTranslator(),
      scaling_up: new ScalingUpTranslator()
    };
    this.frameworkConfig = null;
    this.mappingRules = null;
  }

  /**
   * Initialize the engine with organization-specific configurations
   */
  async initialize() {
    // Load framework configuration
    const configResult = await pool.query(
      `SELECT * FROM framework_configurations 
       WHERE organization_id = $1 
       AND (department_id IS NULL OR department_id = $2)
       ORDER BY department_id DESC NULLS LAST
       LIMIT 1`,
      [this.organizationId, this.departmentId]
    );
    this.frameworkConfig = configResult.rows[0];

    // Load custom mapping rules
    const mappingResult = await pool.query(
      `SELECT * FROM framework_mappings 
       WHERE organization_id = $1 
       AND is_active = true
       ORDER BY priority DESC`,
      [this.organizationId]
    );
    this.mappingRules = mappingResult.rows;
  }

  /**
   * Translate a universal objective to a specific framework representation
   */
  async translateObjective(universalObjective, targetFramework, options = {}) {
    const translator = this.translators[targetFramework];
    if (!translator) {
      throw new Error(`Unsupported framework: ${targetFramework}`);
    }

    // Get custom mapping rules if they exist
    const customRules = this.getCustomRules(
      universalObjective.framework_type, 
      targetFramework,
      'goals'
    );

    // Perform translation
    const translated = {
      // Core translation
      ...translator.translateCore(universalObjective, customRules),
      
      // Terminology
      terminology: translator.getTerminology(universalObjective.objective_type),
      
      // Progress calculation
      progress: translator.calculateProgress(universalObjective),
      
      // Visualization configuration
      visualization: translator.getVisualizationConfig(universalObjective),
      
      // UI components
      components: translator.getUIComponents(universalObjective),
      
      // Business rules and validations
      validations: translator.getValidationRules(universalObjective),
      
      // Actions available
      actions: translator.getAvailableActions(universalObjective)
    };

    // Apply organization-specific overrides
    if (customRules?.overrides) {
      Object.assign(translated, customRules.overrides);
    }

    // Track translation for analytics
    if (!options.skipTracking) {
      await this.trackTranslation(universalObjective, targetFramework);
    }

    return translated;
  }

  /**
   * Translate an entire dataset from one framework to another
   */
  async bulkTranslate(objectives, sourceFramework, targetFramework) {
    const results = [];
    
    for (const objective of objectives) {
      try {
        // Ensure objective is in universal format
        const universal = sourceFramework === 'universal' 
          ? objective
          : await this.toUniversalFormat(objective, sourceFramework);
        
        // Translate to target framework
        const translated = await this.translateObjective(
          universal, 
          targetFramework,
          { skipTracking: true }
        );
        
        results.push({
          success: true,
          original: objective,
          translated
        });
      } catch (error) {
        results.push({
          success: false,
          original: objective,
          error: error.message
        });
      }
    }
    
    // Bulk track translations
    await this.bulkTrackTranslations(results, sourceFramework, targetFramework);
    
    return results;
  }

  /**
   * Convert framework-specific data to universal format
   */
  async toUniversalFormat(frameworkData, sourceFramework) {
    const translator = this.translators[sourceFramework];
    if (!translator) {
      throw new Error(`Unsupported framework: ${sourceFramework}`);
    }

    return translator.toUniversal(frameworkData);
  }

  /**
   * Get custom mapping rules for a specific translation
   */
  getCustomRules(sourceFramework, targetFramework, businessArea) {
    if (!this.mappingRules) return null;

    const rule = this.mappingRules.find(r => 
      r.source_framework === sourceFramework &&
      r.target_framework === targetFramework &&
      r.business_area === businessArea
    );

    return rule?.mapping_rules || null;
  }

  /**
   * Calculate framework compatibility score
   */
  async calculateCompatibilityScore(objectives, targetFramework) {
    let totalScore = 0;
    let count = 0;

    for (const objective of objectives) {
      const translator = this.translators[targetFramework];
      const score = translator.calculateCompatibility(objective);
      totalScore += score;
      count++;
    }

    return {
      score: count > 0 ? totalScore / count : 0,
      framework: targetFramework,
      sampleSize: count,
      recommendation: this.getRecommendation(totalScore / count)
    };
  }

  /**
   * Get recommendation based on compatibility score
   */
  getRecommendation(score) {
    if (score >= 0.8) return 'Highly Compatible - Seamless transition';
    if (score >= 0.6) return 'Compatible - Minor adjustments needed';
    if (score >= 0.4) return 'Partially Compatible - Significant changes required';
    return 'Low Compatibility - Consider alternative framework';
  }

  /**
   * Track translation for performance analytics
   */
  async trackTranslation(objective, targetFramework) {
    try {
      await pool.query(
        `INSERT INTO objective_history 
         (objective_id, snapshot_data, framework_type, change_type, changed_by)
         VALUES ($1, $2, $3, 'framework_translation', $4)`,
        [
          objective.id,
          JSON.stringify(objective),
          targetFramework,
          this.userId
        ]
      );
    } catch (error) {
      console.error('Failed to track translation:', error);
    }
  }

  /**
   * Bulk track translations for analytics
   */
  async bulkTrackTranslations(results, sourceFramework, targetFramework) {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    try {
      await pool.query(
        `INSERT INTO framework_performance_metrics 
         (organization_id, framework_type, measurement_period_start, measurement_period_end,
          objectives_total, objectives_completed)
         VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE, $3, $4)
         ON CONFLICT (organization_id, framework_type, measurement_period_start, department_id)
         DO UPDATE SET 
           objectives_total = framework_performance_metrics.objectives_total + EXCLUDED.objectives_total,
           objectives_completed = framework_performance_metrics.objectives_completed + EXCLUDED.objectives_completed`,
        [
          this.organizationId,
          targetFramework,
          results.length,
          successful
        ]
      );
    } catch (error) {
      console.error('Failed to track bulk translations:', error);
    }
  }

  /**
   * Validate that an objective can be translated to target framework
   */
  async validateTranslation(objective, targetFramework) {
    const translator = this.translators[targetFramework];
    if (!translator) {
      return {
        valid: false,
        errors: [`Framework ${targetFramework} is not supported`]
      };
    }

    return translator.validate(objective);
  }

  /**
   * Get all available frameworks for translation
   */
  getAvailableFrameworks() {
    return Object.keys(this.translators);
  }

  /**
   * Get translation preview without persisting
   */
  async previewTranslation(objective, targetFramework) {
    return await this.translateObjective(
      objective, 
      targetFramework, 
      { skipTracking: true }
    );
  }

  /**
   * Handle hybrid framework setup
   */
  async translateForHybrid(objective) {
    if (!this.frameworkConfig?.allow_hybrid) {
      throw new Error('Hybrid frameworks not enabled for this organization');
    }

    const config = this.frameworkConfig;
    let result = { ...objective };

    // Apply different framework rules based on business area
    if (objective.business_area === 'goals' && config.goal_setting_framework) {
      result = await this.translateObjective(objective, config.goal_setting_framework);
    } else if (objective.business_area === 'meetings' && config.meeting_framework) {
      result = await this.translateObjective(objective, config.meeting_framework);
    } else if (objective.business_area === 'metrics' && config.metrics_framework) {
      result = await this.translateObjective(objective, config.metrics_framework);
    }

    return result;
  }

  /**
   * Perform intelligent framework recommendation based on organization data
   */
  async recommendFramework() {
    // Gather organization metrics
    const metrics = await this.gatherOrganizationMetrics();
    
    // Score each framework
    const scores = {};
    for (const [framework, translator] of Object.entries(this.translators)) {
      scores[framework] = await translator.scoreOrganizationFit(metrics);
    }

    // Sort by score
    const sortedFrameworks = Object.entries(scores)
      .sort((a, b) => b[1].score - a[1].score);

    return {
      recommended: sortedFrameworks[0][0],
      scores: Object.fromEntries(sortedFrameworks),
      reasoning: this.generateRecommendationReasoning(sortedFrameworks[0], metrics),
      alternativeOptions: sortedFrameworks.slice(1, 3).map(([fw, score]) => ({
        framework: fw,
        score: score.score,
        pros: score.pros,
        cons: score.cons
      }))
    };
  }

  /**
   * Gather metrics for framework recommendation
   */
  async gatherOrganizationMetrics() {
    const result = await pool.query(
      `SELECT 
        COUNT(DISTINCT u.id) as employee_count,
        COUNT(DISTINCT t.id) as team_count,
        COUNT(DISTINCT d.id) as department_count,
        o.industry,
        o.created_at,
        AVG(
          CASE 
            WHEN uo.status = 'completed' THEN 1 
            ELSE 0 
          END
        ) as completion_rate,
        COUNT(uo.id) / NULLIF(COUNT(DISTINCT u.id), 0) as objectives_per_person
      FROM organizations o
      LEFT JOIN users u ON u.organization_id = o.id
      LEFT JOIN teams t ON t.organization_id = o.id
      LEFT JOIN departments d ON d.organization_id = o.id
      LEFT JOIN universal_objectives uo ON uo.organization_id = o.id
      WHERE o.id = $1
      GROUP BY o.id, o.industry, o.created_at`,
      [this.organizationId]
    );

    const metrics = result.rows[0];
    
    // Calculate additional metrics
    metrics.organization_age_months = 
      Math.floor((Date.now() - new Date(metrics.created_at)) / (1000 * 60 * 60 * 24 * 30));
    
    metrics.is_distributed = metrics.department_count > 3;
    metrics.is_large = metrics.employee_count > 100;
    metrics.is_startup = metrics.organization_age_months < 24;
    
    return metrics;
  }

  /**
   * Generate reasoning for framework recommendation
   */
  generateRecommendationReasoning(topChoice, metrics) {
    const [framework, scoreData] = topChoice;
    const reasons = [];

    // Add specific reasons based on metrics
    if (framework === 'eos' && metrics.employee_count >= 10 && metrics.employee_count <= 250) {
      reasons.push('Your company size (10-250 employees) is ideal for EOS');
    }
    if (framework === 'okr' && metrics.is_distributed) {
      reasons.push('OKRs work well for distributed teams like yours');
    }
    if (framework === '4dx' && metrics.completion_rate < 0.5) {
      reasons.push('4DX can help improve your execution with focus on fewer goals');
    }
    if (framework === 'scaling_up' && metrics.is_startup) {
      reasons.push('Scaling Up is designed for fast-growth companies like yours');
    }

    // Add score-based reasoning
    reasons.push(...scoreData.pros);

    return {
      summary: `${framework.toUpperCase()} is recommended based on your organization profile`,
      reasons,
      confidence: scoreData.score / 100,
      considerations: scoreData.cons
    };
  }
}

export default TranslationEngine;