/**
 * EOS (Entrepreneurial Operating System) Translator
 * Handles translation to/from EOS framework
 */

export class EOSTranslator {
  constructor() {
    this.frameworkName = 'EOS';
    this.terminology = {
      objective: 'Rock',
      objectives: 'Rocks',
      key_result: 'Measurable',
      vision: 'VTO (Vision/Traction Organizer)',
      weekly_sync: 'Level 10 Meeting',
      quarterly_review: 'Quarterly Pulsing',
      annual_plan: '1-Year Plan',
      long_term_goal: '3-Year Picture',
      mission: '10-Year Target',
      scorecard: 'Scorecard',
      issue: 'Issue',
      todo: 'To-Do',
      process: 'Core Process',
      values: 'Core Values',
      accountability: 'Accountability Chart'
    };
  }

  /**
   * Translate core objective data to EOS format
   */
  translateCore(universalObjective, customRules = null) {
    return {
      id: universalObjective.id,
      rockTitle: universalObjective.title,
      rockOwner: universalObjective.owner_id,
      team: universalObjective.team_id,
      quarter: this.getQuarter(universalObjective.timeframe_start),
      year: new Date(universalObjective.timeframe_start).getFullYear(),
      description: universalObjective.description,
      status: this.translateStatus(universalObjective),
      milestones: this.extractMilestones(universalObjective),
      accountabilityChartRole: universalObjective.framework_attributes?.accountability_chart_role,
      createdAt: universalObjective.created_at,
      updatedAt: universalObjective.updated_at
    };
  }

  /**
   * Get EOS-specific terminology
   */
  getTerminology(objectiveType) {
    return this.terminology[objectiveType] || objectiveType;
  }

  /**
   * Calculate progress in EOS style (binary completion)
   */
  calculateProgress(universalObjective) {
    const { current_value, target_value, progress_method, framework_attributes } = universalObjective;
    
    // EOS typically uses binary completion for Rocks
    if (progress_method === 'binary') {
      return {
        isComplete: current_value >= target_value,
        percentage: current_value >= target_value ? 100 : 0,
        status: current_value >= target_value ? 'Done' : 'On Track'
      };
    }
    
    // For milestones-based Rocks
    if (framework_attributes?.milestones) {
      const milestones = framework_attributes.milestones;
      const completed = milestones.filter(m => m.completed).length;
      const total = milestones.length;
      
      return {
        isComplete: completed === total,
        percentage: total > 0 ? (completed / total) * 100 : 0,
        milestonesComplete: `${completed}/${total}`,
        status: this.getMilestoneStatus(completed, total)
      };
    }
    
    // Fallback to percentage
    const percentage = target_value > 0 ? (current_value / target_value) * 100 : 0;
    return {
      isComplete: percentage >= 100,
      percentage: Math.min(percentage, 100),
      status: this.getPercentageStatus(percentage)
    };
  }

  /**
   * Get visualization configuration for EOS
   */
  getVisualizationConfig(universalObjective) {
    return {
      type: 'eos_rock_card',
      showMilestones: true,
      showAccountabilityChart: true,
      showQuarterlyPulsing: true,
      progressDisplay: 'binary_indicator', // Show as Done/Not Done
      colorScheme: {
        onTrack: '#22c55e',
        offTrack: '#ef4444',
        done: '#3b82f6'
      },
      layout: 'card_with_milestones'
    };
  }

  /**
   * Get UI components for EOS display
   */
  getUIComponents(universalObjective) {
    return {
      card: 'EOSRockCard',
      detailView: 'EOSRockDetail',
      editForm: 'EOSRockEditForm',
      progressIndicator: 'EOSBinaryProgress',
      milestoneList: 'EOSMilestoneChecklist',
      statusBadge: 'EOSStatusBadge'
    };
  }

  /**
   * Get validation rules for EOS
   */
  getValidationRules(universalObjective) {
    return {
      maxRocksPerPerson: 3,
      maxRocksPerQuarter: 7,
      requireOwner: true,
      requireQuarter: true,
      requireMilestones: false,
      milestoneMinimum: 0,
      allowedStatuses: ['on-track', 'off-track', 'done'],
      quarterlyOnly: true // Rocks are quarterly by definition
    };
  }

  /**
   * Get available actions for EOS objectives
   */
  getAvailableActions(universalObjective) {
    const actions = ['edit', 'delete', 'assign_owner'];
    
    if (universalObjective.status !== 'completed') {
      actions.push('mark_complete', 'mark_off_track', 'add_milestone');
    } else {
      actions.push('reopen');
    }
    
    if (universalObjective.framework_attributes?.milestones?.length > 0) {
      actions.push('update_milestones');
    }
    
    actions.push('discuss_in_l10', 'add_to_issues_list');
    
    return actions;
  }

  /**
   * Convert EOS data to universal format
   */
  toUniversal(eosData) {
    return {
      title: eosData.rockTitle || eosData.title,
      description: eosData.description,
      owner_id: eosData.rockOwner || eosData.owner_id,
      team_id: eosData.team_id,
      timeframe_start: this.getQuarterStart(eosData.quarter, eosData.year),
      timeframe_end: this.getQuarterEnd(eosData.quarter, eosData.year),
      timeframe_type: 'quarter',
      target_value: 100,
      current_value: eosData.isComplete ? 100 : 0,
      progress_method: 'binary',
      framework_type: 'eos',
      objective_type: 'rock',
      framework_attributes: {
        status: eosData.status,
        milestones: eosData.milestones || [],
        accountability_chart_role: eosData.accountabilityChartRole,
        quarterly_pulsing_notes: eosData.quarterlyPulsingNotes
      },
      status: this.mapEOSStatusToUniversal(eosData.status)
    };
  }

  /**
   * Calculate compatibility score for EOS framework
   */
  calculateCompatibility(objective) {
    let score = 0;
    const factors = [];
    
    // Check if objective fits quarterly timeframe
    if (objective.timeframe_type === 'quarter') {
      score += 30;
      factors.push('Quarterly timeframe matches EOS Rocks');
    }
    
    // Check if binary completion makes sense
    if (objective.progress_method === 'binary' || !objective.progress_method) {
      score += 25;
      factors.push('Binary completion aligns with EOS methodology');
    }
    
    // Check for clear ownership
    if (objective.owner_id) {
      score += 20;
      factors.push('Clear ownership required by EOS');
    }
    
    // Check team assignment
    if (objective.team_id) {
      score += 15;
      factors.push('Team accountability supported');
    }
    
    // Check for measurable outcome
    if (objective.target_value) {
      score += 10;
      factors.push('Measurable outcome defined');
    }
    
    return {
      score: score / 100,
      factors,
      compatible: score >= 60
    };
  }

  /**
   * Score organization fit for EOS
   */
  async scoreOrganizationFit(metrics) {
    let score = 0;
    const pros = [];
    const cons = [];
    
    // Company size (EOS sweet spot: 10-250 employees)
    if (metrics.employee_count >= 10 && metrics.employee_count <= 250) {
      score += 30;
      pros.push('Ideal company size for EOS (10-250 employees)');
    } else if (metrics.employee_count < 10) {
      score += 10;
      cons.push('Company may be too small for full EOS implementation');
    } else {
      score += 15;
      cons.push('Large company may need modified EOS approach');
    }
    
    // Team structure
    if (metrics.team_count >= 3 && metrics.team_count <= 10) {
      score += 20;
      pros.push('Team structure aligns well with EOS Accountability Chart');
    }
    
    // Growth stage
    if (!metrics.is_startup && metrics.organization_age_months > 24) {
      score += 20;
      pros.push('Established company ready for EOS structure');
    }
    
    // Execution challenges
    if (metrics.completion_rate < 0.7) {
      score += 20;
      pros.push('EOS can help improve execution discipline');
    }
    
    // Industry fit
    if (['professional_services', 'manufacturing', 'construction', 'technology'].includes(metrics.industry)) {
      score += 10;
      pros.push('Industry commonly successful with EOS');
    }
    
    return {
      score,
      pros,
      cons,
      recommendation: score >= 70 ? 'Highly Recommended' : score >= 50 ? 'Recommended' : 'Consider Alternatives'
    };
  }

  /**
   * Validate EOS objective
   */
  validate(objective) {
    const errors = [];
    const warnings = [];
    
    // Required fields for EOS
    if (!objective.owner_id) {
      errors.push('EOS Rocks must have an owner');
    }
    
    if (!objective.timeframe_type || objective.timeframe_type !== 'quarter') {
      warnings.push('EOS Rocks are typically quarterly objectives');
    }
    
    // Check Rock limits
    // This would need to query the database in practice
    // For now, we'll just add a warning
    warnings.push('Ensure owner has no more than 3 Rocks this quarter');
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Helper methods
  
  translateStatus(universalObjective) {
    if (universalObjective.status === 'completed') return 'done';
    if (universalObjective.current_value < universalObjective.target_value * 0.7) return 'off-track';
    return 'on-track';
  }

  extractMilestones(universalObjective) {
    return universalObjective.framework_attributes?.milestones || [];
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
    return new Date(year, month, 0); // Last day of quarter
  }

  getMilestoneStatus(completed, total) {
    if (completed === total) return 'Done';
    if (completed / total < 0.25) return 'Off Track';
    return 'On Track';
  }

  getPercentageStatus(percentage) {
    if (percentage >= 100) return 'Done';
    if (percentage < 70) return 'Off Track';
    return 'On Track';
  }

  mapEOSStatusToUniversal(eosStatus) {
    const mapping = {
      'done': 'completed',
      'on-track': 'active',
      'off-track': 'at_risk'
    };
    return mapping[eosStatus] || 'active';
  }
}