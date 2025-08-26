/**
 * OKR (Objectives and Key Results) Translator
 * Handles translation to/from OKR framework
 */

export class OKRTranslator {
  constructor() {
    this.frameworkName = 'OKR';
    this.terminology = {
      objective: 'Objective',
      objectives: 'Objectives', 
      key_result: 'Key Result',
      vision: 'Mission Statement',
      weekly_sync: 'Weekly Check-in',
      quarterly_review: 'Quarterly Business Review',
      annual_plan: 'Annual OKRs',
      long_term_goal: 'Strategic Objectives',
      mission: 'Purpose',
      scorecard: 'KPI Dashboard',
      issue: 'Blocker',
      todo: 'Action Item',
      process: 'Playbook',
      values: 'Principles',
      accountability: 'RACI Matrix'
    };
  }

  /**
   * Translate core objective data to OKR format
   */
  translateCore(universalObjective, customRules = null) {
    const isObjective = !universalObjective.parent_id;
    const isKeyResult = !isObjective;
    
    if (isObjective) {
      return this.translateToObjective(universalObjective);
    } else {
      return this.translateToKeyResult(universalObjective);
    }
  }

  translateToObjective(universalObjective) {
    return {
      id: universalObjective.id,
      objective: universalObjective.title,
      description: universalObjective.description,
      owner: universalObjective.owner_id,
      team: universalObjective.team_id,
      quarter: this.getQuarter(universalObjective.timeframe_start),
      year: new Date(universalObjective.timeframe_start).getFullYear(),
      type: universalObjective.framework_attributes?.type || 'committed', // committed vs aspirational
      keyResults: [], // Will be populated with child objectives
      score: this.calculateOKRScore(universalObjective),
      confidence: universalObjective.framework_attributes?.confidence || 0.7,
      status: this.translateOKRStatus(universalObjective),
      createdAt: universalObjective.created_at,
      updatedAt: universalObjective.updated_at
    };
  }

  translateToKeyResult(universalObjective) {
    return {
      id: universalObjective.id,
      keyResult: universalObjective.title,
      objectiveId: universalObjective.parent_id,
      owner: universalObjective.owner_id,
      startValue: universalObjective.framework_attributes?.start_value || 0,
      currentValue: universalObjective.current_value,
      targetValue: universalObjective.target_value,
      unit: universalObjective.framework_attributes?.unit || 'number',
      score: this.calculateKeyResultScore(universalObjective),
      confidence: universalObjective.framework_attributes?.confidence || 0.7,
      status: this.getKeyResultStatus(universalObjective),
      updateFrequency: universalObjective.framework_attributes?.update_frequency || 'weekly',
      lastUpdate: universalObjective.updated_at,
      trend: this.calculateTrend(universalObjective)
    };
  }

  /**
   * Get OKR-specific terminology
   */
  getTerminology(objectiveType) {
    return this.terminology[objectiveType] || objectiveType;
  }

  /**
   * Calculate progress in OKR style (0.0 to 1.0 scoring)
   */
  calculateProgress(universalObjective) {
    const { current_value, target_value, framework_attributes } = universalObjective;
    const startValue = framework_attributes?.start_value || 0;
    
    // OKR scoring formula: (current - start) / (target - start)
    let score = 0;
    if (target_value !== startValue) {
      score = (current_value - startValue) / (target_value - startValue);
    }
    
    // Clamp between 0 and 1
    score = Math.max(0, Math.min(1, score));
    
    // Determine grading
    let grade = 'Not Started';
    let color = 'gray';
    
    if (score >= 0.7) {
      grade = 'On Track';
      color = 'green';
    } else if (score >= 0.4) {
      grade = 'Behind';
      color = 'yellow'; 
    } else if (score > 0) {
      grade = 'At Risk';
      color = 'red';
    }
    
    return {
      score: parseFloat(score.toFixed(2)),
      percentage: Math.round(score * 100),
      grade,
      color,
      confidence: framework_attributes?.confidence || 0.7,
      lastUpdated: universalObjective.updated_at,
      updateFrequency: framework_attributes?.update_frequency || 'weekly',
      isStretched: framework_attributes?.type === 'aspirational'
    };
  }

  /**
   * Get visualization configuration for OKRs
   */
  getVisualizationConfig(universalObjective) {
    return {
      type: 'okr_tree',
      showConfidenceIndicator: true,
      showTrendLine: true,
      showScoringScale: true,
      progressDisplay: 'gradient_bar', // Shows 0.0 to 1.0 scale
      colorScheme: {
        notStarted: '#9ca3af',
        atRisk: '#ef4444',
        behind: '#f59e0b',
        onTrack: '#22c55e',
        achieved: '#3b82f6'
      },
      layout: 'tree_with_key_results',
      charts: ['progress_chart', 'confidence_trend', 'score_distribution']
    };
  }

  /**
   * Get UI components for OKR display
   */
  getUIComponents(universalObjective) {
    const isObjective = !universalObjective.parent_id;
    
    return {
      card: isObjective ? 'OKRObjectiveCard' : 'OKRKeyResultCard',
      detailView: isObjective ? 'OKRObjectiveDetail' : 'OKRKeyResultDetail',
      editForm: isObjective ? 'OKRObjectiveEditForm' : 'OKRKeyResultEditForm',
      progressIndicator: 'OKRScoreBar',
      confidenceSlider: 'OKRConfidenceSlider',
      trendChart: 'OKRTrendChart',
      statusBadge: 'OKRGradeBadge',
      tree: 'OKRTreeView'
    };
  }

  /**
   * Get validation rules for OKRs
   */
  getValidationRules(universalObjective) {
    const isObjective = !universalObjective.parent_id;
    
    if (isObjective) {
      return {
        maxObjectivesPerQuarter: 5,
        minKeyResults: 2,
        maxKeyResults: 5,
        requireOwner: true,
        requireDescription: true,
        allowedTypes: ['committed', 'aspirational'],
        quarterlyOrAnnual: true
      };
    } else {
      return {
        requireMeasurable: true,
        requireStartValue: true,
        requireTargetValue: true,
        requireUnit: true,
        targetMustExceedStart: true,
        requireUpdateFrequency: true,
        allowedUpdateFrequencies: ['daily', 'weekly', 'biweekly', 'monthly']
      };
    }
  }

  /**
   * Get available actions for OKR objectives
   */
  getAvailableActions(universalObjective) {
    const isObjective = !universalObjective.parent_id;
    const actions = ['edit', 'delete'];
    
    if (isObjective) {
      actions.push('add_key_result', 'update_confidence', 'change_type');
      if (universalObjective.status !== 'completed') {
        actions.push('score_objective', 'close_objective');
      }
    } else {
      actions.push('update_progress', 'update_confidence', 'add_note');
      if (universalObjective.status !== 'completed') {
        actions.push('check_in', 'mark_blocked', 'request_help');
      }
    }
    
    actions.push('view_history', 'export_data', 'share');
    
    return actions;
  }

  /**
   * Convert OKR data to universal format
   */
  toUniversal(okrData) {
    if (okrData.keyResults) {
      // It's an Objective
      return this.objectiveToUniversal(okrData);
    } else {
      // It's a Key Result
      return this.keyResultToUniversal(okrData);
    }
  }

  objectiveToUniversal(okrObjective) {
    return {
      title: okrObjective.objective,
      description: okrObjective.description,
      owner_id: okrObjective.owner,
      team_id: okrObjective.team,
      timeframe_start: this.getQuarterStart(okrObjective.quarter, okrObjective.year),
      timeframe_end: this.getQuarterEnd(okrObjective.quarter, okrObjective.year),
      timeframe_type: 'quarter',
      target_value: 1.0, // OKRs score to 1.0
      current_value: okrObjective.score || 0,
      progress_method: 'decimal',
      framework_type: 'okr',
      objective_type: 'objective',
      framework_attributes: {
        type: okrObjective.type,
        confidence: okrObjective.confidence,
        key_result_ids: okrObjective.keyResults?.map(kr => kr.id),
        grading_scale: '0_to_1'
      },
      status: this.mapOKRStatusToUniversal(okrObjective.status)
    };
  }

  keyResultToUniversal(keyResult) {
    return {
      title: keyResult.keyResult,
      description: `Target: ${keyResult.targetValue} ${keyResult.unit}`,
      owner_id: keyResult.owner,
      parent_id: keyResult.objectiveId,
      timeframe_start: keyResult.startDate,
      timeframe_end: keyResult.endDate,
      timeframe_type: 'quarter',
      target_value: keyResult.targetValue,
      current_value: keyResult.currentValue,
      progress_method: 'decimal',
      framework_type: 'okr',
      objective_type: 'key_result',
      framework_attributes: {
        start_value: keyResult.startValue,
        unit: keyResult.unit,
        confidence: keyResult.confidence,
        update_frequency: keyResult.updateFrequency,
        trend: keyResult.trend,
        check_ins: keyResult.checkIns || []
      },
      status: this.mapOKRStatusToUniversal(keyResult.status)
    };
  }

  /**
   * Calculate compatibility score for OKR framework
   */
  calculateCompatibility(objective) {
    let score = 0;
    const factors = [];
    
    // Check for measurable targets
    if (objective.target_value && typeof objective.target_value === 'number') {
      score += 30;
      factors.push('Quantifiable targets align with OKR methodology');
    }
    
    // Check for graduated progress tracking
    if (objective.progress_method === 'decimal' || objective.progress_method === 'percentage') {
      score += 25;
      factors.push('Graduated scoring compatible with OKR system');
    }
    
    // Check for hierarchical structure
    if (objective.parent_id || objective.framework_attributes?.child_objectives) {
      score += 20;
      factors.push('Hierarchical structure supports Objective/Key Result relationship');
    }
    
    // Check timeframe
    if (objective.timeframe_type === 'quarter' || objective.timeframe_type === 'year') {
      score += 15;
      factors.push('Timeframe aligns with OKR cycles');
    }
    
    // Check for clear ownership
    if (objective.owner_id) {
      score += 10;
      factors.push('Clear ownership defined');
    }
    
    return {
      score: score / 100,
      factors,
      compatible: score >= 60
    };
  }

  /**
   * Score organization fit for OKRs
   */
  async scoreOrganizationFit(metrics) {
    let score = 0;
    const pros = [];
    const cons = [];
    
    // Company size (OKRs work well for larger companies)
    if (metrics.employee_count > 50) {
      score += 25;
      pros.push('Company size suitable for OKR implementation');
    } else {
      score += 10;
      cons.push('Smaller companies may find OKRs overly complex');
    }
    
    // Distributed teams
    if (metrics.is_distributed) {
      score += 20;
      pros.push('OKRs excellent for aligning distributed teams');
    }
    
    // Tech-savvy culture
    if (metrics.industry === 'technology' || metrics.industry === 'software') {
      score += 20;
      pros.push('Tech companies typically succeed with OKRs');
    }
    
    // Growth focus
    if (metrics.is_startup || metrics.objectives_per_person > 3) {
      score += 15;
      pros.push('OKRs support ambitious growth targets');
    }
    
    // Need for transparency
    if (metrics.department_count > 3) {
      score += 20;
      pros.push('OKRs provide transparency across departments');
    }
    
    return {
      score,
      pros,
      cons,
      recommendation: score >= 70 ? 'Highly Recommended' : score >= 50 ? 'Recommended' : 'Consider Alternatives'
    };
  }

  /**
   * Validate OKR objective or key result
   */
  validate(objective) {
    const errors = [];
    const warnings = [];
    const isObjective = !objective.parent_id;
    
    if (isObjective) {
      // Validate Objective
      if (!objective.description || objective.description.length < 10) {
        errors.push('Objectives should have clear, inspiring descriptions');
      }
      
      // Check for key results (would need to query in practice)
      warnings.push('Ensure objective has 2-5 measurable key results');
      
    } else {
      // Validate Key Result
      if (!objective.target_value || typeof objective.target_value !== 'number') {
        errors.push('Key Results must have quantifiable targets');
      }
      
      if (!objective.framework_attributes?.unit) {
        warnings.push('Specify unit of measurement for clarity');
      }
      
      if (!objective.framework_attributes?.start_value && objective.framework_attributes?.start_value !== 0) {
        errors.push('Key Results need a starting baseline value');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Helper methods
  
  calculateOKRScore(objective) {
    // Average score of all key results
    // In practice, would need to fetch and calculate from child objectives
    return objective.current_value || 0;
  }

  calculateKeyResultScore(objective) {
    const { current_value, target_value, framework_attributes } = objective;
    const startValue = framework_attributes?.start_value || 0;
    
    if (target_value === startValue) return 0;
    return Math.max(0, Math.min(1, (current_value - startValue) / (target_value - startValue)));
  }

  translateOKRStatus(objective) {
    const score = this.calculateOKRScore(objective);
    if (score >= 0.7) return 'on-track';
    if (score >= 0.4) return 'behind';
    if (score > 0) return 'at-risk';
    return 'not-started';
  }

  getKeyResultStatus(objective) {
    const score = this.calculateKeyResultScore(objective);
    if (score >= 1) return 'achieved';
    if (score >= 0.7) return 'on-track';
    if (score >= 0.4) return 'behind';
    if (score > 0) return 'at-risk';
    return 'not-started';
  }

  calculateTrend(objective) {
    // Would analyze historical data in practice
    // For now, return a simple indicator
    const score = this.calculateKeyResultScore(objective);
    const daysElapsed = Math.floor((Date.now() - new Date(objective.timeframe_start)) / (1000 * 60 * 60 * 24));
    const totalDays = Math.floor((new Date(objective.timeframe_end) - new Date(objective.timeframe_start)) / (1000 * 60 * 60 * 24));
    const expectedProgress = daysElapsed / totalDays;
    
    if (score > expectedProgress + 0.1) return 'ahead';
    if (score < expectedProgress - 0.1) return 'behind';
    return 'on-pace';
  }

  getQuarter(date) {
    const month = new Date(date).getMonth();
    return Math.floor(month / 3) + 1;
  }

  getQuarterStart(quarter, year) {
    const month = (quarter - 1) * 3;
    return new Date(year, month, 1);
  }

  getQuarterEnd(quarter, year) {
    const month = quarter * 3;
    return new Date(year, month, 0);
  }

  mapOKRStatusToUniversal(okrStatus) {
    const mapping = {
      'achieved': 'completed',
      'on-track': 'active',
      'behind': 'active',
      'at-risk': 'at_risk',
      'not-started': 'planned'
    };
    return mapping[okrStatus] || 'active';
  }
}