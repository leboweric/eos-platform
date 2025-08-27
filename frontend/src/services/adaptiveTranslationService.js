/**
 * Adaptive Translation Service
 * Handles framework translations and adaptations
 * Patent Pending Serial No. 63/870,133
 */

import api from './api';

class AdaptiveTranslationService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Translate a universal objective to a specific framework
   */
  async translateObjective(universalObjective, targetFramework) {
    const cacheKey = `${universalObjective.id}-${targetFramework}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await api.post('/api/v1/adaptive/translate', {
        objective: universalObjective,
        targetFramework,
        options: {
          includeVisualization: true,
          includeValidation: true
        }
      });

      const translated = response.data;
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: translated,
        timestamp: Date.now()
      });

      return translated;
    } catch (error) {
      console.error('Translation service error:', error);
      
      // Fallback to client-side translation
      return this.clientSideTranslate(universalObjective, targetFramework);
    }
  }

  /**
   * Client-side fallback translation
   */
  clientSideTranslate(objective, targetFramework) {
    // Basic client-side translation logic
    const translated = { ...objective };
    
    switch(targetFramework) {
      case 'eos':
        return this.translateToEOS(translated);
      case 'okr':
        return this.translateToOKR(translated);
      case '4dx':
        return this.translateTo4DX(translated);
      case 'scaling_up':
        return this.translateToScalingUp(translated);
      default:
        return translated;
    }
  }

  translateToEOS(objective) {
    return {
      ...objective,
      framework_type: 'eos',
      displayName: 'Rock',
      status: this.getEOSStatus(objective),
      progress: objective.current_value >= objective.target_value ? 100 : 0,
      framework_attributes: {
        ...objective.framework_attributes,
        milestones: objective.framework_attributes?.milestones || [],
        accountability_chart_role: objective.framework_attributes?.role,
        status: objective.current_value >= objective.target_value ? 'done' : 'on-track'
      }
    };
  }

  translateToOKR(objective) {
    const score = this.calculateOKRScore(objective);
    
    return {
      ...objective,
      framework_type: 'okr',
      displayName: objective.parent_id ? 'Key Result' : 'Objective',
      score,
      framework_attributes: {
        ...objective.framework_attributes,
        confidence: objective.framework_attributes?.confidence || 0.7,
        type: objective.framework_attributes?.type || 'committed',
        start_value: objective.framework_attributes?.start_value || 0,
        update_frequency: 'weekly',
        grading_scale: '0_to_1'
      }
    };
  }

  translateTo4DX(objective) {
    return {
      ...objective,
      framework_type: '4dx',
      displayName: 'WIG',
      framework_attributes: {
        ...objective.framework_attributes,
        lead_measures: objective.framework_attributes?.lead_measures || [],
        lag_measures: objective.framework_attributes?.lag_measures || [],
        scoreboard_type: 'team',
        commitment_tracking: true
      }
    };
  }

  translateToScalingUp(objective) {
    return {
      ...objective,
      framework_type: 'scaling_up',
      displayName: 'Priority',
      framework_attributes: {
        ...objective.framework_attributes,
        theme: objective.framework_attributes?.theme || `Q${this.getQuarter()} Focus`,
        critical_number: objective.target_value,
        celebration_planned: false
      }
    };
  }

  /**
   * Get framework recommendation for an organization
   */
  async getFrameworkRecommendation(organizationId) {
    try {
      const response = await api.get(`/api/v1/adaptive/recommend/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('Recommendation service error:', error);
      return null;
    }
  }

  /**
   * Bulk translate objectives
   */
  async bulkTranslate(objectives, targetFramework) {
    try {
      const response = await api.post('/api/v1/adaptive/bulk-translate', {
        objectives,
        targetFramework
      });
      return response.data;
    } catch (error) {
      console.error('Bulk translation error:', error);
      // Fallback to individual translations
      return Promise.all(
        objectives.map(obj => this.translateObjective(obj, targetFramework))
      );
    }
  }

  /**
   * Switch organization framework
   */
  async switchFramework(organizationId, newFramework, options = {}) {
    try {
      const response = await api.post('/api/v1/adaptive/switch-framework', {
        organizationId,
        newFramework,
        preserveHistory: options.preserveHistory !== false,
        hybridConfig: options.hybridConfig
      });
      
      // Clear cache after framework switch
      this.clearCache();
      
      return response.data;
    } catch (error) {
      console.error('Framework switch error:', error);
      throw error;
    }
  }

  /**
   * Get available frameworks
   */
  async getAvailableFrameworks() {
    try {
      const response = await api.get('/api/v1/adaptive/frameworks');
      return response.data;
    } catch (error) {
      console.error('Get frameworks error:', error);
      // Return default frameworks
      return [
        { id: 'eos', name: 'EOS', description: 'Entrepreneurial Operating System' },
        { id: 'okr', name: 'OKRs', description: 'Objectives and Key Results' },
        { id: '4dx', name: '4DX', description: '4 Disciplines of Execution' },
        { id: 'scaling_up', name: 'Scaling Up', description: 'Rockefeller Habits' }
      ];
    }
  }

  /**
   * Preview framework translation
   */
  async previewTranslation(objectives, targetFramework) {
    try {
      const response = await api.post('/api/v1/adaptive/preview', {
        objectives,
        targetFramework
      });
      return response.data;
    } catch (error) {
      console.error('Preview error:', error);
      return objectives.map(obj => this.clientSideTranslate(obj, targetFramework));
    }
  }

  // Helper methods
  
  getEOSStatus(objective) {
    if (objective.current_value >= objective.target_value) return 'done';
    if (objective.current_value < objective.target_value * 0.3) return 'off-track';
    return 'on-track';
  }

  calculateOKRScore(objective) {
    const start = objective.framework_attributes?.start_value || 0;
    const current = objective.current_value || 0;
    const target = objective.target_value || 100;
    
    if (target === start) return 0;
    return Math.max(0, Math.min(1, (current - start) / (target - start)));
  }

  getQuarter() {
    return Math.ceil((new Date().getMonth() + 1) / 3);
  }

  clearCache() {
    this.cache.clear();
  }
}

export const translationService = new AdaptiveTranslationService();
export default translationService;